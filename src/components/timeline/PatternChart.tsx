import { useMemo } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { FTimeline, FArrowRight } from '@/components/icons/FreudIcons';
import { Button } from '@/components/ui/button';

interface ObsLog {
  concept_id: string;
  logged_at: string;
  intensity: number;
  user_narrative?: string | null;
}

interface ConceptMap {
  [id: string]: { name_hu: string; name_en: string };
}

interface PatternChartProps {
  logs: ObsLog[];
  conceptMap: ConceptMap;
  compact?: boolean;
  rangeStart?: Date;
  rangeEnd?: Date;
}

const PatternChart = ({ logs, conceptMap, compact = false, rangeStart, rangeEnd }: PatternChartProps) => {
  const { t, lang, localePath } = useLanguage();

  // Calculate cumulative concept occurrence counts in the selected range
  const conceptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const startISO = rangeStart ? format(rangeStart, 'yyyy-MM-dd') : null;
    const endISO = rangeEnd ? format(rangeEnd, 'yyyy-MM-dd') : null;

    for (const log of logs) {
      if (startISO && log.logged_at < startISO) continue;
      if (endISO && log.logged_at > endISO) continue;
      counts[log.concept_id] = (counts[log.concept_id] ?? 0) + 1;
    }

    return Object.entries(counts)
      .map(([id, count]) => {
        const concept = conceptMap[id];
        const name = concept ? (lang === 'en' ? concept.name_en : concept.name_hu) : '';
        return { id, name, count };
      })
      .filter((c) => c.name && c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [logs, conceptMap, rangeStart, rangeEnd, lang]);

  // Max occurrence count to scale the progress bars
  const maxCount = useMemo(() => {
    return conceptCounts.length > 0 ? Math.max(...conceptCounts.map((c) => c.count)) : 1;
  }, [conceptCounts]);

  // If no concepts are flagged or logged, hide the chart completely
  if (conceptCounts.length === 0) return null;

  // Show up to 5 concepts in the right rail preview
  const displayConcepts = conceptCounts.slice(0, 5);

  return (
    <div className="surface-card p-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <FTimeline className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
            {t.timeline.patternChartTitle}
          </h2>
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-0.5 rounded-full">
          {t.timeline.patternChartPeriod30}
        </span>
      </div>

      {/* Horizontal Progress Bars */}
      <div className="space-y-3.5">
        {displayConcepts.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-foreground truncate max-w-[140px]" title={c.name}>
              {c.name}
            </span>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <div className="w-full max-w-[100px] sm:max-w-[120px] h-1.5 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(c.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-foreground min-w-[16px] text-right tabular-nums">
                {c.count}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Link to Full Analysis */}
      <div className="border-t border-border/40 pt-3 flex justify-end">
        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/10 gap-1 text-[10px] uppercase tracking-wider font-semibold h-7 px-2">
          <Link to={localePath('/timeline')}>
            {t.timeline.patternChartViewFullAnalysis}
            <FArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default PatternChart;
