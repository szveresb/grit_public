import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useConsent } from '@/hooks/useConsent';
import { supabase } from '@/integrations/supabase/client';
import { buildCategories } from './consentCategories';
import ConsentCard from './ConsentCard';
import ConsentHistoryDialog from './ConsentHistoryDialog';
import { toast } from 'sonner';
import { FShield, FClock } from '@/components/icons/FreudIcons';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';

const ConsentDashboard = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { consents, loaded, lastUpdated, refresh } = useConsent();
  const categories = buildCategories(t);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleToggle = async (key: string, granted: boolean) => {
    if (!user) return;
    const { error } = await supabase.from('user_consents').upsert(
      { user_id: user.id, consent_key: key, granted, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,consent_key' }
    );
    if (error) toast.error(error.message);
    else refresh();
  };

  if (!loaded) return null;

  const locale = getDateLocale(lang);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FShield className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t.consent.dashboardTitle}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.consent.dashboardDesc}</p>

        <div className="space-y-3">
          {categories.map((cat) => (
            <ConsentCard
              key={cat.key}
              category={cat}
              granted={consents[cat.key] ?? false}
              onToggle={handleToggle}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FClock className="h-3 w-3" />
              {t.consent.lastUpdated.replace('{date}', format(new Date(lastUpdated), 'PPP', { locale }))}
            </span>
          )}
          <button
            onClick={() => setHistoryOpen(true)}
            className="text-xs font-semibold text-primary hover:underline ml-auto"
          >
            {t.consent.viewHistory}
          </button>
        </div>
      </div>

      <ConsentHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
};

export default ConsentDashboard;
