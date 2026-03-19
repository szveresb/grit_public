import { useMemo, useState, useCallback } from 'react';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Brush } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong } from '@/components/icons/FreudIcons';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import type { Lang } from '@/i18n/types';

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
  t: { timeline: { moodTrendTitle: string; moodTrendSubtitle: string; moodTrendEmpty: string } };
}

type RangePreset = '7d' | '30d' | 'all';

const moodIcons = [FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong];
const moodLabelsHu = ['Küzdelmes', 'Bizonytalan', 'Rendben', 'Jó', 'Erős'];
const moodLabelsEn = ['Struggling', 'Uneasy', 'Okay', 'Good', 'Strong'];

const presetLabels: Record<RangePreset, { hu: string; en: string }> = {
  '7d': { hu: '7 nap', en: '7 days' },
  '30d': { hu: '30 nap', en: '30 days' },
  all: { hu: 'Mind', en: 'All' },
};

const CustomYTick = ({ x, y, payload }: any) => {
  const idx = (payload.value as number) - 1;
  const Icon = moodIcons[idx];
  if (!Icon) return null;
  return (
    <g transform={`translate(${x - 16},${y - 10})`}>
      <Icon width={20} height={20} className="text-primary" />
    </g>
  );
};

const chartConfig = {
  level: { label: 'Mood', color: 'hsl(var(--bamboo-sage))' },
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

const MoodTrendChart = ({ data, lang, t }: MoodTrendChartProps) => {
  const aggregated = useMemo(() => aggregateByDay(data), [data]);
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

  const [brushRange, setBrushRange] = useState(defaultBrushIndices);

  // Reset brush when preset changes
  const handlePreset = useCallback((p: RangePreset) => {
    setPreset(p);
    // brush will reset via key change
  }, []);

  if (aggregated.length < 2) {
    return (
      <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5">
        <h2 className="text-sm font-semibold text-foreground">{t.timeline.moodTrendTitle}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t.timeline.moodTrendEmpty}</p>
      </div>
    );
  }

  const locale = getDateLocale(lang);
  const labels = lang === 'hu' ? moodLabelsHu : moodLabelsEn;

  const visibleSpan = filtered.length >= 2
    ? differenceInDays(new Date(filtered[filtered.length - 1].ts), new Date(filtered[0].ts))
    : 0;
  const dayAbbr = lang === 'hu'
    ? ['Va', 'Hé', 'Ke', 'Sz', 'Cs', 'Pé', 'Szo']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const shortDayTick = (v: number) => {
    const d = new Date(v);
    return `${dayAbbr[d.getDay()]} ${d.getDate()}`;
  };
  const tickFormatter = visibleSpan > 90
    ? (v: number) => format(new Date(v), 'MMM yyyy', { locale })
    : visibleSpan > 14
      ? (v: number) => format(new Date(v), 'MMM d', { locale })
      : shortDayTick;
  const entriesLabel = lang === 'hu' ? 'bejegyzés' : 'entries';
  const entryLabel = lang === 'hu' ? 'bejegyzés' : 'entry';

  return (
    <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 space-y-2">
      {/* Header with preset toggle */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t.timeline.moodTrendTitle}</h2>
          <p className="text-xs text-muted-foreground">{t.timeline.moodTrendSubtitle}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {(['7d', '30d', 'all'] as RangePreset[]).map(p => (
            <button
              key={p}
              onClick={() => handlePreset(p)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                preset === p
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {presetLabels[p][lang]}
            </button>
          ))}
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[240px] w-full">
        <AreaChart
          key={preset}
          data={filtered}
          margin={{ top: 8, right: 8, bottom: 24, left: 4 }}
        >
          <defs>
            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--bamboo-leaf))" stopOpacity={0.4} />
              <stop offset="50%" stopColor="hsl(var(--bamboo-sage))" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(var(--bamboo-sage-light))" stopOpacity={0.05} />
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
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={<CustomYTick />} width={32} />
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
                    {p.count} {p.count === 1 ? entryLabel : entriesLabel}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="level"
            stroke="hsl(var(--bamboo-leaf))"
            strokeWidth={2.5}
            fill="url(#moodGradient)"
            dot={{ r: 4, fill: 'hsl(var(--bamboo-sage))', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: 'hsl(var(--bamboo-leaf))' }}
          />
          {filtered.length > 3 && (
            <Brush
              dataKey="ts"
              height={20}
              stroke="hsl(var(--bamboo-sage))"
              fill="hsl(var(--muted))"
              tickFormatter={(v: number) => format(new Date(v), 'MM/dd', { locale })}
              travellerWidth={8}
            />
          )}
        </AreaChart>
      </ChartContainer>
    </div>
  );
};

export default MoodTrendChart;
