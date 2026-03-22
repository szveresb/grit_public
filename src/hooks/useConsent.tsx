import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CONSENT_KEYS, type ConsentKey } from '@/components/consent/consentCategories';

const CACHE_KEY = 'grit_consent_v1';

interface ConsentState {
  consents: Record<string, boolean>;
  loaded: boolean;
  hasConsent: (key: ConsentKey) => boolean;
  refresh: () => Promise<void>;
  lastUpdated: string | null;
  consentCompleted: boolean;
  setConsentCompleted: (v: boolean) => void;
}

const ConsentContext = createContext<ConsentState | undefined>(undefined);

interface CacheData { consents: Record<string, boolean>; consentCompleted: boolean; }

const hasCompletedConsentSet = (consentMap: Record<string, boolean>) =>
  CONSENT_KEYS.every((key) => Object.prototype.hasOwnProperty.call(consentMap, key));

function readCache(userId: string): CacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId) return null;
    return { consents: parsed.consents ?? {}, consentCompleted: parsed.consentCompleted ?? false };
  } catch { return null; }
}

function writeCache(userId: string, consents: Record<string, boolean>, lastUpdated: string | null, consentCompleted: boolean) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, consents, lastUpdated, consentCompleted, ts: Date.now() }));
}

export const ConsentProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [consentCompleted, setConsentCompleted] = useState(false);

  // Reset loaded when user identity changes so ProtectedRoute shows
  // the loading screen instead of prematurely redirecting to /consent.
  const prevUserId = useRef<string | null>(null);
  useEffect(() => {
    const uid = user?.id ?? null;
    if (uid !== prevUserId.current) {
      prevUserId.current = uid;
      // Only reset when switching *to* a real user – avoids keeping
      // loaded=false forever for logged-out visitors hitting public pages.
      if (uid) {
        setLoaded(false);
      }
    }
  }, [user]);

  const fetchConsents = useCallback(async () => {
    if (!user) { setConsents({}); setLoaded(true); setConsentCompleted(false); return; }

    // Try cache first
    const cached = readCache(user.id);
    if (cached) {
      setConsents(cached.consents);
      setConsentCompleted(hasCompletedConsentSet(cached.consents));
      setLoaded(true);
    }

    // Fetch consents + profile consent_completed in parallel
    const [consentsRes, profileRes] = await Promise.all([
      supabase
        .from('user_consents')
        .select('consent_key, granted, updated_at')
        .eq('user_id', user.id),
      supabase
        .from('profiles')
        .select('consent_completed')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const map: Record<string, boolean> = {};
    let maxDate = '';

    if (consentsRes.data && consentsRes.data.length > 0) {
      consentsRes.data.forEach((r: any) => {
        map[r.consent_key] = r.granted;
        if (r.updated_at > maxDate) maxDate = r.updated_at;
      });
    }

    const consentIsComplete = hasCompletedConsentSet(map);
    setConsents(map);
    setLastUpdated(maxDate || null);
    setConsentCompleted(consentIsComplete);
    writeCache(user.id, map, maxDate || null, consentIsComplete);

    // Heal stale profile flag when all consent cards are already decided.
    if (consentIsComplete && profileRes.data && !profileRes.data.consent_completed) {
      await supabase
        .from('profiles')
        .update({ consent_completed: true })
        .eq('user_id', user.id);
    }

    setLoaded(true);
  }, [user]);

  useEffect(() => { fetchConsents(); }, [fetchConsents]);

  // Listen for realtime changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('consent-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_consents',
        filter: `user_id=eq.${user.id}`,
      }, () => { fetchConsents(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConsents]);

  const hasConsent = useCallback((key: ConsentKey) => consents[key] === true, [consents]);

  return (
    <ConsentContext.Provider value={{ consents, loaded, hasConsent, refresh: fetchConsents, lastUpdated, consentCompleted, setConsentCompleted }}>
      {children}
    </ConsentContext.Provider>
  );
};

export const useConsent = () => {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider');
  return ctx;
};
