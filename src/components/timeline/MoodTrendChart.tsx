import { useMemo } from 'react';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong } from '@/components/icons/FreudIcons';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import type { Lang } from '@/i18n/types';

interface MoodDataPoint {
  date: string;
  level: number;
}

interface MoodTrendChartProps {
  data: MoodDataPoint[];
  lang: Lang;
  t: { timeline: { moodTrendTitle: string; moodTrendSubtitle: string; moodTrendEmpty: string } };
}

const moodIcons = [FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong];

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

const MoodTrendChart = ({ data, lang, t }: MoodTrendChartProps) => {
  const sorted = useMemo(
    () => [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data],
  );

  if (sorted.length < 2) {
    return (
      <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5">
        <h2 className="text-sm font-semibold text-foreground">{t.timeline.moodTrendTitle}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t.timeline.moodTrendEmpty}</p>
      </div>
    );
  }

  const locale = getDateLocale(lang);

  return (
    <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{t.timeline.moodTrendTitle}</h2>
        <p className="text-xs text-muted-foreground">{t.timeline.moodTrendSubtitle}</p>
      </div>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <AreaChart data={sorted} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => format(parseISO(v), 'MMM d', { locale })}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={<CustomYTick />} width={32} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  if (!payload?.[0]) return '';
                  return format(parseISO(payload[0].payload.date), 'PPP', { locale });
                }}
              />
            }
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
