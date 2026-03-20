import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { buildCategories, CONSENT_KEYS } from './consentCategories';
import ConsentSummary from './ConsentSummary';
import { toast } from 'sonner';
import { FShield } from '@/components/icons/FreudIcons';

const ConsentDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const categories = buildCategories(t);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_consents')
      .select('consent_key, granted')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        (data ?? []).forEach((r: any) => { map[r.consent_key] = r.granted; });
        setConsents(map);
        setLoaded(true);
      });
  }, [user]);

  const handleToggle = async (key: string, granted: boolean) => {
    if (!user) return;
    setConsents((prev) => ({ ...prev, [key]: granted }));
    const { error } = await supabase.from('user_consents').upsert(
      { user_id: user.id, consent_key: key, granted, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,consent_key' }
    );
    if (error) toast.error(error.message);
  };

  if (!loaded) return null;

  return (
    <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FShield className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t.consent.dashboardTitle}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{t.consent.dashboardDesc}</p>
      <ConsentSummary categories={categories} consents={consents} onToggle={handleToggle} />
    </div>
  );
};

export default ConsentDashboard;
