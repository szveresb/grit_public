import { FTimeline, FChevronUp, FArrowUp, FArrowDown, FArrowRight } from '@/components/icons/FreudIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { safeFormat } from '@/lib/date-safe';
import { useLanguage } from '@/hooks/useLanguage';

interface ObsLog {
  concept_id: string;
  logged_at: string;
  intensity: number;
  user_narrative?: string | null;
}

interface ConceptMap {
  [id: string]: { name_hu: string; name_en: string };
}

interface PatternPulseChartProps {
  logs: ObsLog[];
  conceptMap: ConceptMap;
}

interface WeekBucket {
  weekNum: number;
  weekStart: Date;
  counts: Record<string, number>;
  details: Record<string, { date: string; narrative?: string | null; intensity: number }[]>;
}

const PULSE_COLORS = [
  'bg-primary',
  'bg-accent',
  'bg-destructive',
  'bg-secondary',
];

const PatternPulseChart = ({ logs, conceptMap }: PatternPulseChartProps) => {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { weeks, flaggedConcepts, maxCount } = useMemo(() => {
    const now = new Date();
    const buckets: WeekBucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      buckets.push({ weekNum: getISOWeek(ws), weekStart: ws, counts: {}, details: {} });
    }
    const cutoff = buckets[0].weekStart;

    for (const log of logs) {
      const d = parseISO(log.logged_at);
      if (!isAfter(d, cutoff) && safeFormat(d, 'yyyy-MM-dd') !== safeFormat(cutoff, 'yyyy-MM-dd')) continue;
      const wn = getISOWeek(d);
      const bucket = buckets.find(b => b.weekNum === wn);
      if (bucket) {
        bucket.counts[log.concept_id] = (bucket.counts[log.concept_id] || 0) + 1;
        if (!bucket.details[log.concept_id]) bucket.details[log.concept_id] = [];
        bucket.details[log.concept_id].push({
          date: log.logged_at,
          narrative: log.user_narrative,
          intensity: log.intensity,
        });
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

  const locale = getDateLocale(lang);
  
  const getTrend = (cid: string) => {
    const sum1 = weeks.slice(0, 6).reduce((acc, w) => acc + (w.counts[cid] || 0), 0);
    const sum2 = weeks.slice(6, 12).reduce((acc, w) => acc + (w.counts[cid] || 0), 0);
    if (sum2 > sum1) return { icon: <FArrowUp className="h-3 w-3 text-primary animate-pulse" />, label: 'increasing' };
    if (sum2 < sum1) return { icon: <FArrowDown className="h-3 w-3 text-muted-foreground opacity-70" />, label: 'decreasing' };
    return { icon: <FArrowRight className="h-3 w-3 text-muted-foreground opacity-50" />, label: 'stable' };
  };

  if (flaggedConcepts.length === 0) {
    return (
      <div className="surface-card p-6 text-center space-y-3">
        <FTimeline className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">{t.timeline.noPatterns}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {flaggedConcepts.map((cid, ci) => {
        const concept = conceptMap[cid];
        const name = concept ? (lang === 'en' ? concept.name_en : concept.name_hu) : '—';
        const colorClass = PULSE_COLORS[ci % PULSE_COLORS.length];

        return (
          <motion.div
            key={cid}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.08, duration: 0.3 }}
            className="surface-card p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FTimeline className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground">{name}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/30 border border-border/40">
                {getTrend(cid).icon}
              </div>
            </div>

            {/* Week grid with pulse dots */}
            <div className="flex items-end gap-1.5">
              {weeks.map((w, wi) => {
                const count = w.counts[cid] || 0;
                const isHot = count >= 3;
                const expandKey = `${cid}-${wi}`;
                const isExpanded = expanded === expandKey;
                const dotSize = count > 0
                  ? Math.max(12, Math.min(36, (count / maxCount) * 36))
                  : 0;

                return (
                  <div key={wi} className="flex flex-col items-center flex-1 gap-1">
                    {/* Dot area */}
                    <div className="w-full h-10 flex items-center justify-center">
                      {count > 0 && (
                        <button
                          onClick={() => setExpanded(prev => prev === expandKey ? null : expandKey)}
                          className="relative flex items-center justify-center"
                          title={t.timeline.pulseDotLabel
                            .replace('{count}', String(count))
                            .replace('{week}', String(w.weekNum))}
                        >
                          {/* Pulse ring for hot weeks */}
                          {isHot && (
                            <span
                              className={`absolute rounded-full ${colorClass} opacity-30 animate-ping`}
                              style={{ width: dotSize + 8, height: dotSize + 8 }}
                            />
                          )}
                          {/* Solid dot */}
                          <span
                            className={`relative rounded-full transition-all duration-200 ${
                              isHot ? colorClass : 'bg-muted-foreground/40'
                            } ${isExpanded ? 'ring-2 ring-foreground/30' : ''}`}
                            style={{ width: dotSize, height: dotSize }}
                          />
                          {/* Count label inside large dots */}
                          {dotSize >= 20 && (
                            <span className="absolute text-[9px] font-bold text-primary-foreground">
                              {count}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                    {/* Week label */}
                    <span className="text-[10px] text-muted-foreground leading-none tabular-nums">
                      {t.timeline.weekLabel.replace('{n}', String(w.weekNum))}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Connecting trend line */}
            <div className="w-full h-px bg-border/50 -mt-2" />

            {/* Expanded detail panels */}
            <AnimatePresence>
              {weeks.map((w, wi) => {
                const expandKey = `${cid}-${wi}`;
                if (expanded !== expandKey) return null;
                const details = w.details[cid] || [];
                if (details.length === 0) return null;
                return (
                  <motion.div
                    key={expandKey}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-accent/30 border border-border/50 rounded-2xl p-3 space-y-1.5">
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
                          <span className="text-muted-foreground shrink-0 tabular-nums">
                            {safeFormat(d.date, 'MMM d', lang)}
                          </span>
                          <span className="text-muted-foreground shrink-0">({d.intensity}/5)</span>
                          {d.narrative && <span className="text-foreground italic">{d.narrative}</span>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

export default PatternPulseChart;
