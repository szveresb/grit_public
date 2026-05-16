import { useMemo, useState, useCallback } from 'react';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Brush } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong, FSparkles } from '@/components/icons/FreudIcons';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import type { Lang, Dictionary } from '@/i18n/types';

interface MoodDataPoint {
  date: string;
  level: number;
}

interface AggregatedPoint {
  ts: number;
  date: string;
  level: number;
  count: number;
}

interface MoodTrendChartProps {
  data: MoodDataPoint[];
  lang: Lang;
  isPremium?: boolean;
  onPremiumClick?: () => void;
  t: Dictionary;
  compact?: boolean;
}

type RangePreset = '7d' | '30d' | 'all';

const moodIcons = [FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong];

const makeYTick = (labels: readonly string[]) => ({ x, y, payload }: any) => {
  const idx = (payload.value as number) - 1;
  const Icon = moodIcons[idx];
  const label = labels[idx];
  if (!Icon) return null;
  return (
    <g transform={`translate(${x - 16},${y - 10})`}>
      <title>{label}</title>
      <Icon width={20} height={20} className="text-primary" />
    </g>
  );
};

const chartConfig = {
  level: { label: 'Mood', color: 'hsl(var(--primary))' },
};

function aggregateByDay(data: MoodDataPoint[]): AggregatedPoint[] {
  const buckets: Record<string, number[]> = {};
  for (const d of data) {
    const key = d.date.slice(0, 10);
    (buckets[key] ??= []).push(d.level);
  }
  return Object.entries(buckets)
    .map(([date, levels]) => ({
      ts: parseISO(date).getTime(),
      date,
      level: Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10,
      count: levels.length,
    }))
    .sort((a, b) => a.ts - b.ts);
}

const MoodTrendChart = ({ data, lang, isPremium = false, onPremiumClick, t, compact = false }: MoodTrendChartProps) => {
  const aggregated = useMemo(() => aggregateByDay(data), [data]);
  const strokeColor = 'hsl(var(--primary))';
  const [preset, setPreset] = useState<RangePreset>('all');

  const filtered = useMemo(() => {
    if (preset === 'all' || aggregated.length === 0) return aggregated;
    const days = preset === '7d' ? 7 : 30;
    const cutoff = subDays(new Date(), days).getTime();
    const result = aggregated.filter(p => p.ts >= cutoff);
    // Fall back to all if filter leaves < 2 points
    return result.length >= 2 ? result : aggregated;
  }, [aggregated, preset]);

  // Brush indices synced to preset
  const defaultBrushIndices = useMemo(() => {
    return { startIndex: 0, endIndex: filtered.length - 1 };
  }, [filtered]);

  // Reset brush when preset changes
  const handlePreset = useCallback((p: RangePreset) => {
    setPreset(p);
  }, []);

  if (aggregated.length < 2) {
    return (
      <div className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{t.timeline.moodTrendTitle}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t.timeline.moodTrendEmpty}</p>
      </div>
    );
  }

  const locale = getDateLocale(lang);
  const labels = t.timeline.moodLabels;

  const visibleSpan = filtered.length >= 2
    ? differenceInDays(new Date(filtered[filtered.length - 1].ts), new Date(filtered[0].ts))
    : 0;
  
  const dayAbbr = t.timeline.dayNames;
  
  const shortDayTick = (v: number) => {
    const d = new Date(v);
    return `${dayAbbr[d.getDay()]} ${d.getDate()}`;
  };
  
  const tickFormatter = visibleSpan > 90
    ? (v: number) => format(new Date(v), 'MMM yyyy', { locale })
    : visibleSpan > 14
      ? (v: number) => format(new Date(v), 'MMM d', { locale })
      : shortDayTick;

  const isDense = filtered.length > 30;
  const YTick = makeYTick(labels);

  return (
    <div className="surface-card p-5 space-y-2">
      {/* Header with preset toggle */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{t.timeline.moodTrendTitle}</h2>
          <p className="text-xs text-muted-foreground">{t.timeline.moodTrendSubtitle}</p>
        </div>
        <div
          role="radiogroup"
          aria-label={t.timeline.rangeLabel}
          className="inline-flex shrink-0 rounded-full bg-muted/60 p-0.5 border border-border/60"
        >
          {(['7d', '30d', 'all'] as RangePreset[]).map(p => {
            const active = preset === p;
            return (
              <button
                key={p}
                role="radio"
                aria-checked={active}
                onClick={() => handlePreset(p)}
                className={`px-3 py-1 text-xs rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.timeline.presets[p]}
              </button>
            );
          })}
        </div>
      </div>

      <ChartContainer config={chartConfig} className={compact ? "h-[180px] w-full" : "h-[240px] w-full"}>
        <AreaChart
          key={preset}
          data={filtered}
          margin={{ top: 8, right: 8, bottom: 24, left: 4 }}
        >
          <defs>
            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={tickFormatter}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={<YTick />} width={32} />
          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const p = payload[0].payload as AggregatedPoint;
              const moodIdx = Math.round(p.level) - 1;
              const moodLabel = labels[moodIdx] ?? '';
              return (
                <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-md text-sm">
                  <p className="font-medium text-foreground">{format(parseISO(p.date), 'PPP', { locale })}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {moodLabel} ({p.level % 1 === 0 ? p.level : p.level.toFixed(1)}/5)
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {p.count} {p.count === 1 ? t.timeline.entry : t.timeline.entries}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="level"
            stroke={strokeColor}
            strokeWidth={2.5}
            fill="url(#moodGradient)"
            dot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: strokeColor }}
          />
          {filtered.length > 3 && isPremium && (
            <Brush
              dataKey="ts"
              height={20}
              stroke="hsl(var(--primary))"
              fill="hsl(var(--muted))"
              tickFormatter={(v: number) => format(new Date(v), 'MM/dd', { locale })}
              travellerWidth={8}
            />
          )}
        </AreaChart>
      </ChartContainer>

      {/* Legend + interaction hint */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
              {t.timeline.legendDot}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 rounded-full bg-primary" aria-hidden />
              {t.timeline.legendTrend}
            </span>
          </div>
          <span className="italic">
            {isDense ? t.timeline.hintDense : t.timeline.hintHover}
          </span>
        </div>
      )}

      {/* Premium upsell for timeline slider */}
      {filtered.length > 3 && !isPremium && !compact && (
        <button
          onClick={onPremiumClick}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-2xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-[0.98]"
        >
          <FSparkles className="h-3.5 w-3.5" />
          <span className="font-medium">{t.timeline.timelineSlider}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-800/40 text-[10px] font-semibold uppercase tracking-wider">{t.ui.premiumBadge}</span>
        </button>
      )}
    </div>
  );
};

export default MoodTrendChart;
