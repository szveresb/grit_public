import { useMemo, useState } from 'react';
import { getISOWeek, parseISO, startOfWeek, subWeeks, isAfter, format } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { useLanguage } from '@/hooks/useLanguage';
import { FTimeline, FChevronDown, FChevronUp } from '@/components/icons/FreudIcons';

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
}

interface WeekBucket {
  weekNum: number;
  weekStart: Date;
  counts: Record<string, number>;
  details: Record<string, { date: string; narrative?: string | null; intensity: number }[]>;
}

const PatternChart = ({ logs, conceptMap }: PatternChartProps) => {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState<string | null>(null); // "cid-weekIdx"

  const { weeks, flaggedConcepts, maxCount } = useMemo(() => {
    const now = new Date();
    const buckets: WeekBucket[] = [];
    for (let i = 7; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      buckets.push({ weekNum: getISOWeek(ws), weekStart: ws, counts: {}, details: {} });
    }
    const cutoff = buckets[0].weekStart;

    for (const log of logs) {
      const d = parseISO(log.logged_at);
      if (!isAfter(d, cutoff) && format(d, 'yyyy-MM-dd') !== format(cutoff, 'yyyy-MM-dd')) continue;
      const wn = getISOWeek(d);
      const bucket = buckets.find(b => b.weekNum === wn);
      if (bucket) {
        bucket.counts[log.concept_id] = (bucket.counts[log.concept_id] || 0) + 1;
        if (!bucket.details[log.concept_id]) bucket.details[log.concept_id] = [];
        bucket.details[log.concept_id].push({ date: log.logged_at, narrative: log.user_narrative, intensity: log.intensity });
      }
    }

    const conceptHits = new Set<string>();
    let max = 1;
    for (const b of buckets) {
      for (const [cid, count] of Object.entries(b.counts)) {
        if (count >= 3) conceptHits.add(cid);
        if (count > max) max = count;
      }
    }

    return { weeks: buckets, flaggedConcepts: Array.from(conceptHits), maxCount: max };
  }, [logs]);

  if (flaggedConcepts.length === 0) return null;

  const locale = getDateLocale(lang);

  const toggleExpand = (key: string) => setExpanded(prev => prev === key ? null : key);

  return (
    <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FTimeline className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t.timeline.patternChartTitle}</h2>
          <p className="text-xs text-muted-foreground">{t.timeline.patternChartSubtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        {flaggedConcepts.map(cid => {
          const concept = conceptMap[cid];
          const name = concept ? (lang === 'en' ? concept.name_en : concept.name_hu) : '—';
          return (
            <div key={cid} className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">{name}</span>
              <div className="flex items-end gap-1">
                {weeks.map((w, wi) => {
                  const count = w.counts[cid] || 0;
                  const heightPct = count > 0 ? Math.max(20, (count / maxCount) * 100) : 0;
                  const isHot = count >= 3;
                  const expandKey = `${cid}-${wi}`;
                  const isExpanded = expanded === expandKey;
                  const details = w.details[cid] || [];

                  return (
                    <div key={wi} className="flex flex-col items-center flex-1 gap-0.5">
                      <div className="w-full h-12 flex items-end justify-center">
                        {count > 0 && (
                          <button
                            onClick={() => toggleExpand(expandKey)}
                            className={`w-full max-w-[28px] rounded-t-lg transition-all cursor-pointer hover:opacity-80 ${isHot ? 'bg-primary ring-2 ring-primary/30' : 'bg-primary/40'} ${isExpanded ? 'ring-2 ring-accent-foreground/40' : ''}`}
                            style={{ height: `${heightPct}%` }}
                            title={t.timeline.timesPerWeek.replace('{count}', String(count))}
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground leading-none">
                        {t.timeline.weekLabel.replace('{n}', String(w.weekNum))}
                      </span>

                      {/* Expanded detail panel */}
                      {isExpanded && details.length > 0 && (
                        <div className="absolute left-0 right-0 z-10 mt-1">
                          {/* Rendered below in a separate row */}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Expanded detail row — shown below the bar chart for the active week */}
              {weeks.map((w, wi) => {
                const expandKey = `${cid}-${wi}`;
                if (expanded !== expandKey) return null;
                const details = w.details[cid] || [];
                if (details.length === 0) return null;
                return (
                  <div key={expandKey} className="bg-accent/30 border border-border/50 rounded-2xl p-3 space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {t.timeline.weekLabel.replace('{n}', String(w.weekNum))} — {t.timeline.timesPerWeek.replace('{count}', String(details.length))}
                      </span>
                      <button onClick={() => setExpanded(null)} className="text-muted-foreground hover:text-foreground">
                        <FChevronUp className="h-3 w-3" />
                      </button>
                    </div>
                    {details.sort((a, b) => a.date.localeCompare(b.date)).map((d, di) => (
                      <div key={di} className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground shrink-0 tabular-nums">{format(parseISO(d.date), 'MMM d', { locale })}</span>
                        <span className="text-muted-foreground shrink-0">({d.intensity}/5)</span>
                        {d.narrative && <span className="text-foreground italic">{d.narrative}</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PatternChart;
