import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { FUser, FUsers, FTimeline, FSparkles } from '@/components/icons/FreudIcons';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import type { Lang, Dictionary } from '@/i18n/types';
import type { MoodComparisonPoint } from '@/hooks/useMoodComparisonData';
import type { SupportedSubject } from '@/hooks/useStance';
import { FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong } from '@/components/icons/FreudIcons';

interface MoodComparisonChartProps {
  data: MoodComparisonPoint[];
  lang: Lang;
  t: Dictionary;
  subjects: SupportedSubject[];
  selectedSubjectIds: string[];
  onSelectedSubjectIdsChange: (ids: string[]) => void;
  subjectHasData: Record<string, boolean>;
}

const colorsPalette = [
  '#EF4444', // Red
  '#F59E0B', // Yellow/Orange
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
];

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

const MoodComparisonChart = ({
  data,
  lang,
  t,
  subjects,
  selectedSubjectIds,
  onSelectedSubjectIdsChange,
  subjectHasData,
}: MoodComparisonChartProps) => {
  const locale = getDateLocale(lang);
  const labels = t.timeline.moodLabels;

  const chartConfig = useMemo(() => {
    const config: any = {
      self: { label: t.subjects.selfLabel, color: 'hsl(var(--primary))' },
    };
    subjects.forEach((s, index) => {
      config[s.id] = {
        label: s.name,
        color: colorsPalette[index % colorsPalette.length],
      };
    });
    return config;
  }, [subjects, t]);

  const YTick = makeYTick(labels);

  return (
    <div className="surface-card p-5 space-y-6 animate-fade-in relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <FSparkles className="h-32 w-32 rotate-12" />
      </div>

      <div className="flex flex-col gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              {t.timeline.compareSubjectsTitle || 'Compare Mood Trends'}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t.timeline.compareSubjectsSubtitle || 'Compare daily average mood trends of selected observed people.'}
          </p>
        </div>

        {/* Multi-subject selector pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {/* User Self (always visible) */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-primary bg-primary/10 text-primary cursor-default">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>{t.subjects.selfLabel}</span>
          </div>

          {/* Observed Subjects */}
          {subjects.map((s, index) => {
            const isSelected = selectedSubjectIds.includes(s.id);
            const color = colorsPalette[index % colorsPalette.length];
            const hasData = subjectHasData[s.id];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onSelectedSubjectIdsChange(selectedSubjectIds.filter((id) => id !== s.id));
                  } else {
                    onSelectedSubjectIdsChange([...selectedSubjectIds, s.id]);
                  }
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  isSelected
                    ? `bg-opacity-10 border-opacity-40 text-foreground`
                    : 'bg-background hover:bg-muted/40 border-border text-muted-foreground'
                } ${!hasData ? 'border-dashed opacity-60' : ''}`}
                style={
                  isSelected
                    ? {
                        backgroundColor: `${color}15`,
                        borderColor: color,
                        color: color,
                      }
                    : undefined
                }
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isSelected ? color : 'hsl(var(--muted-foreground))' }}
                />
                <span>{s.name}</span>
                {!hasData && (
                  <span className="text-[10px] italic font-normal text-muted-foreground ml-1">
                    {t.timeline.noDataMarker || '(no data)'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <LineChart data={data} margin={{ top: 20, right: 10, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => format(new Date(v), 'MMM d', { locale })}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />

          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={<YTick />}
            axisLine={false}
            tickLine={false}
            width={25}
          />

          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const p = payload[0].payload as MoodComparisonPoint;
              const dateStr = format(parseISO(p.date), 'PPP', { locale });

              return (
                <div className="rounded-2xl border border-border bg-popover/95 backdrop-blur-sm p-3.5 shadow-xl text-xs space-y-2 min-w-[180px]">
                  <p className="font-bold text-foreground border-b border-border/50 pb-1.5 mb-1.5">{dateStr}</p>

                  {/* Self Line */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{t.subjects.selfLabel}</span>
                    </div>
                    <span className="font-bold">
                      {p.self !== null && p.self !== undefined ? `${(p.self as number).toFixed(1)}/5` : '—'}
                    </span>
                  </div>

                  {/* Selected Subjects Lines */}
                  {subjects
                    .filter((s) => selectedSubjectIds.includes(s.id))
                    .map((s) => {
                      const color = colorsPalette[subjects.indexOf(s) % colorsPalette.length];
                      const val = p[s.id];
                      return (
                        <div key={s.id} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-muted-foreground">{s.name}</span>
                          </div>
                          <span className="font-bold">
                            {val !== null && val !== undefined ? `${Number(val).toFixed(1)}/5` : '—'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              );
            }}
          />

          {/* User Line (Self) */}
          <Line
            type="monotone"
            dataKey="self"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            activeDot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
            connectNulls={true}
            animationDuration={1000}
          />

          {/* Selected Observed Subjects Lines */}
          {subjects
            .filter((s) => selectedSubjectIds.includes(s.id))
            .map((s, index) => {
              const color = colorsPalette[subjects.indexOf(s) % colorsPalette.length];
              return (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.id}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: color, strokeWidth: 1.5, stroke: 'hsl(var(--background))' }}
                  activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                  connectNulls={true}
                  animationDuration={1000}
                />
              );
            })}
        </LineChart>
      </ChartContainer>

      {/* Chart Legend */}
      <div className="flex flex-wrap items-center justify-start gap-4 pt-2 border-t border-border/40 text-[11px] text-muted-foreground z-10 relative">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
          <span className="font-medium text-foreground">{t.subjects.selfLabel}</span>
        </div>
        {subjects
          .filter((s) => selectedSubjectIds.includes(s.id))
          .map((s) => {
            const color = colorsPalette[subjects.indexOf(s) % colorsPalette.length];
            const hasData = subjectHasData[s.id];
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                <span className="font-medium text-foreground">{s.name}</span>
                {!hasData && (
                  <span className="text-[10px] text-muted-foreground italic">
                    {t.timeline.noDataMarker || '(no data)'}
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default MoodComparisonChart;
