import { useMemo } from 'react';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong } from '@/components/icons/FreudIcons';
import { format, parseISO, differenceInDays } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import type { Lang } from '@/i18n/types';

interface MoodDataPoint {
  date: string;
  level: number;
}

interface AggregatedPoint {
  ts: number;      // epoch ms for true time scale
  date: string;    // ISO date string
  level: number;   // daily mean
  count: number;   // entries that day
}

interface MoodTrendChartProps {
  data: MoodDataPoint[];
  lang: Lang;
  t: { timeline: { moodTrendTitle: string; moodTrendSubtitle: string; moodTrendEmpty: string } };
}

const moodIcons = [FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong];
const moodLabelsHu = ['Küzdelmes', 'Bizonytalan', 'Rendben', 'Jó', 'Erős'];
const moodLabelsEn = ['Struggling', 'Uneasy', 'Okay', 'Good', 'Strong'];

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
  level: { label: 'Mood', color: 'hsl(var(--primary))' },
};

function aggregateByDay(data: MoodDataPoint[]): AggregatedPoint[] {
  const buckets: Record<string, number[]> = {};
  for (const d of data) {
    const key = d.date.slice(0, 10); // YYYY-MM-DD
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
  const totalSpanDays = differenceInDays(
    new Date(aggregated[aggregated.length - 1].ts),
    new Date(aggregated[0].ts),
  );

  // Choose tick format based on span
  const tickFormat = totalSpanDays > 90 ? 'MMM yyyy' : totalSpanDays > 14 ? 'MMM d' : 'EEE d';
  const entriesLabel = lang === 'hu' ? 'bejegyzés' : 'entries';
  const entryLabel = lang === 'hu' ? 'bejegyzés' : 'entry';

  return (
    <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{t.timeline.moodTrendTitle}</h2>
        <p className="text-xs text-muted-foreground">{t.timeline.moodTrendSubtitle}</p>
      </div>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <AreaChart data={aggregated} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => format(new Date(v), tickFormat, { locale })}
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
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            fill="url(#moodGradient)"
            dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
};

export default MoodTrendChart;
