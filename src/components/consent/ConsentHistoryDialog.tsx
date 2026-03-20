import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { FCheck, FClose, FClock } from '@/components/icons/FreudIcons';
import { buildCategories } from './consentCategories';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface HistoryEntry {
  id: string;
  consent_key: string;
  granted: boolean;
  changed_at: string;
  scope_snapshot: Record<string, boolean> | null;
}

const ConsentHistoryDialog = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const categories = buildCategories(t);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryLabel = (key: string) =>
    categories.find((c) => c.key === key)?.title ?? key;

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from('consent_history_logs')
      .select('id, consent_key, granted, changed_at, scope_snapshot')
      .eq('user_id', user.id)
      .order('changed_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setEntries((data as HistoryEntry[]) ?? []);
        setLoading(false);
      });
  }, [open, user]);

  const locale = getDateLocale(lang);

  // Group by date
  const grouped = entries.reduce<Record<string, HistoryEntry[]>>((acc, e) => {
    const day = e.changed_at.slice(0, 10);
    (acc[day] ??= []).push(e);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md rounded-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FClock className="h-4 w-4 text-primary" />
            {t.consent.historyTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t.loading}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t.consent.historyEmpty}</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([day, items]) => (
              <div key={day}>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {format(new Date(day), 'PPP', { locale })}
                </p>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 text-sm"
                    >
                      {item.granted ? (
                        <FCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                      ) : (
                        <FClose className="h-3.5 w-3.5 text-destructive shrink-0" />
                      )}
                      <span className="text-foreground">{categoryLabel(item.consent_key)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {format(new Date(item.changed_at), 'HH:mm', { locale })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ConsentHistoryDialog;
