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

function readCache(userId: string): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId) return null;
    return parsed.consents;
  } catch { return null; }
}

function writeCache(userId: string, consents: Record<string, boolean>, lastUpdated: string | null) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, consents, lastUpdated, ts: Date.now() }));
}

export const ConsentProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchConsents = useCallback(async () => {
    if (!user) { setConsents({}); setLoaded(true); return; }

    // Try cache first
    const cached = readCache(user.id);
    if (cached) {
      setConsents(cached);
      setLoaded(true);
    }

    const { data } = await supabase
      .from('user_consents')
      .select('consent_key, granted, updated_at')
      .eq('user_id', user.id);

    if (data && data.length > 0) {
      const map: Record<string, boolean> = {};
      let maxDate = '';
      data.forEach((r: any) => {
        map[r.consent_key] = r.granted;
        if (r.updated_at > maxDate) maxDate = r.updated_at;
      });
      setConsents(map);
      setLastUpdated(maxDate || null);
      writeCache(user.id, map, maxDate);
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
    <ConsentContext.Provider value={{ consents, loaded, hasConsent, refresh: fetchConsents, lastUpdated }}>
      {children}
    </ConsentContext.Provider>
  );
};

export const useConsent = () => {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider');
  return ctx;
};
