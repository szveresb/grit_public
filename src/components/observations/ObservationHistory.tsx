import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface LogEntry {
  id: string;
  intensity: number;
  frequency: string | null;
  context_modifier: string | null;
  user_narrative: string | null;
  logged_at: string;
  concept: {
    name_hu: string;
    name_en: string;
    category: {
      name_hu: string;
      name_en: string;
    };
  };
}

const ObservationHistory = ({ refreshKey }: { refreshKey?: number }) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const fetchLogs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('observation_logs')
      .select('id, intensity, frequency, context_modifier, user_narrative, logged_at, concept_id')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) { setLogs([]); return; }

    // Fetch concepts and categories for the logs
    const conceptIds = [...new Set(data.map(d => d.concept_id))];
    const { data: concepts } = await supabase
      .from('observation_concepts')
      .select('id, name_hu, name_en, category_id')
      .in('id', conceptIds);

    const categoryIds = [...new Set((concepts ?? []).map(c => c.category_id))];
    const { data: categories } = await supabase
      .from('observation_categories')
      .select('id, name_hu, name_en')
      .in('id', categoryIds);

    const catMap = Object.fromEntries((categories ?? []).map(c => [c.id, c]));
    const conMap = Object.fromEntries((concepts ?? []).map(c => [c.id, { ...c, category: catMap[c.category_id] }]));

    setLogs(data.map(d => ({ ...d, concept: conMap[d.concept_id] })) as LogEntry[]);
  };

  useEffect(() => { fetchLogs(); }, [user, refreshKey]);

  const name = (item: { name_hu: string; name_en: string }) => lang === 'en' ? item.name_en : item.name_hu;

  const freqLabels: Record<string, string> = {
    once: t.observations.freqOnce,
    sometimes: t.observations.freqSometimes,
    often: t.observations.freqOften,
    constant: t.observations.freqConstant,
  };

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{t.observations.noLogs}</p>;
  }

  // Group by date
  const grouped = logs.reduce<Record<string, LogEntry[]>>((acc, log) => {
    const key = log.logged_at;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.observations.recentObservations}</h3>
      {Object.entries(grouped).map(([date, entries]) => (
        <div key={date} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{format(new Date(date), 'yyyy. MM. dd.')}</p>
          {entries.map(entry => (
            <Collapsible key={entry.id}>
              <CollapsibleTrigger className="w-full bg-card/60 backdrop-blur border border-border rounded-3xl p-4 flex items-center justify-between text-left hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {entry.intensity}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold block truncate">{entry.concept ? name(entry.concept) : '—'}</span>
                    <span className="text-[10px] text-muted-foreground">{entry.concept?.category ? name(entry.concept.category) : ''}</span>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-3 pt-1 space-y-1">
                {entry.frequency && <p className="text-xs text-muted-foreground">{t.observations.frequency}: {freqLabels[entry.frequency] ?? entry.frequency}</p>}
                {entry.context_modifier && <p className="text-xs text-muted-foreground">{t.observations.context}: {entry.context_modifier}</p>}
                {entry.user_narrative && <p className="text-xs text-foreground/80 italic mt-1">"{entry.user_narrative}"</p>}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      ))}
    </div>
  );
};

export default ObservationHistory;
