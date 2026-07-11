import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FChevronDown } from '@/components/icons/FreudIcons';
import { useConceptResolver } from '@/hooks/useConceptResolver';

interface LogEntry {
  id: string;
  intensity: number;
  frequency: string | null;
  context_modifier: string | null;
  user_narrative: string | null;
  logged_at: string;
  concept_id: string;
}

const ObservationHistory = ({ refreshKey }: { refreshKey?: number }) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { subjectType, selectedSubjectId } = useStance();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { resolver, isLoading: isResolverLoading } = useConceptResolver();

  const fetchLogs = async () => {
    if (!user) return;
    const isObserver = subjectType === 'relative' && !!selectedSubjectId;
    let query = supabase
      .from('observation_logs')
      .select('id, intensity, frequency, context_modifier, user_narrative, logged_at, concept_id')
      .eq('user_id', user.id);

    if (isObserver) {
      query = query.eq('subject_type', 'relative').eq('subject_id', selectedSubjectId);
    } else {
      query = query.eq('subject_type', 'self');
    }

    const { data } = await query
      .order('logged_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) { setLogs([]); return; }
    setLogs(data as LogEntry[]);
  };

  useEffect(() => {
    fetchLogs();
  }, [user, refreshKey, subjectType, selectedSubjectId]);

  const freqLabels: Record<string, string> = {
    once: t.observations.freqOnce,
    sometimes: t.observations.freqSometimes,
    often: t.observations.freqOften,
    constant: t.observations.freqConstant,
  };

  if (isResolverLoading) {
    return (
      <div className="text-center py-8 flex flex-col items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-muted-foreground">{t.loading}</span>
      </div>
    );
  }

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
          {entries.map(entry => {
            const resolved = resolver?.resolve(entry.concept_id);
            const conceptName = resolved
              ? (lang === 'en' ? resolved.name_en : resolved.name_hu)
              : '—';
            const categoryName = resolved
              ? (lang === 'en' ? resolved.category.name_en : resolved.category.name_hu)
              : '';
            const canonicalName = resolved
              ? (lang === 'en' ? resolved.resolvedNameEn : resolved.resolvedNameHu)
              : '';
            const showMapping = resolved && resolved.source_type !== 'canonical';

            return (
              <Collapsible key={entry.id}>
                <CollapsibleTrigger className="w-full surface-card p-4 flex items-center justify-between text-left hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {entry.intensity}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold block truncate">{conceptName}</span>
                      <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
                        <span>{categoryName}</span>
                        {showMapping && (
                          <span className="text-muted-foreground/60 italic">
                            ({t.observations.mappedTo.replace('{name}', canonicalName)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <FChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-3 pt-1 space-y-1">
                  {entry.frequency && <p className="text-xs text-muted-foreground">{t.observations.frequency}: {freqLabels[entry.frequency] ?? entry.frequency}</p>}
                  {entry.context_modifier && <p className="text-xs text-muted-foreground">{t.observations.context}: {entry.context_modifier}</p>}
                  {entry.user_narrative && <p className="text-xs text-foreground/80 italic mt-1">"{entry.user_narrative}"</p>}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default ObservationHistory;
