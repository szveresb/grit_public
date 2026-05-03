import { useMemo } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { FUser, FUsers, FTimeline, FSparkles } from '@/components/icons/FreudIcons';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import type { Lang, Dictionary } from '@/i18n/types';
import type { CorrelationPoint } from '@/hooks/useDualPerspectiveData';

interface CorrelationChartProps {
  data: CorrelationPoint[];
  lang: Lang;
  t: Dictionary;
  relativeName: string;
}

const dualChartConfig = {
  self: { label: 'My Mood', color: 'hsl(var(--primary))' },
  relative: { label: 'Their Intensity', color: 'hsl(var(--destructive))' },
};

const CorrelationChart = ({ data, lang, t, relativeName }: CorrelationChartProps) => {
  const locale = getDateLocale(lang);

  const hasData = useMemo(() => {
    return data.some(p => p.selfMood !== null || p.relativeIntensity !== null);
  }, [data]);

  if (!hasData) {
    return (
      <div className="surface-card p-6 text-center space-y-3">
        <FTimeline className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">{t.timeline.noPatterns}</p>
      </div>
    );
  }

  // Pre-process for rendering (converting nulls to undefined so they don't break the lines)
  const chartData = useMemo(() => {
    return data.map(p => ({
      ...p,
      ts: parseISO(p.date).getTime(),
      displaySelf: p.selfMood ?? undefined,
      displayRelative: p.relativeIntensity ?? undefined,
    }));
  }, [data]);

  return (
    <div className="surface-card p-5 space-y-6 animate-fade-in relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <FSparkles className="h-32 w-32 rotate-12" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">{t.timeline.correlationTitle || 'Dual Perspective Analysis'}</h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-md">
            {t.timeline.correlationSubtitle || 'Correlating your well-being with observed interpersonal patterns.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-primary/5 border border-primary/10">
            <FUser className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{t.subjects.selfCardTitle}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-destructive/5 border border-destructive/10">
            <FUsers className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">{relativeName}</span>
          </div>
        </div>
      </div>

      <ChartContainer config={dualChartConfig} className="h-[280px] w-full">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 10, bottom: 20, left: 0 }}
        >
          <defs>
            <linearGradient id="relativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
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
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={25}
          />
          
          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const p = payload[0].payload as typeof chartData[0];
              const dateStr = format(parseISO(p.date), 'PPP', { locale });
              
              return (
                <div className="rounded-2xl border border-border bg-popover/95 backdrop-blur-sm p-3 shadow-xl text-xs space-y-2 min-w-[160px]">
                  <p className="font-bold text-foreground border-b border-border/50 pb-1.5 mb-1.5">{dateStr}</p>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{t.subjects.selfCardTitle}</span>
                    </div>
                    <span className="font-bold">{p.selfMood ? `${p.selfMood.toFixed(1)}/5` : '—'}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">{relativeName}</span>
                    </div>
                    <span className="font-bold">{p.relativeIntensity ? `${p.relativeIntensity.toFixed(1)}/5` : '—'}</span>
                  </div>

                  {p.observationCount > 0 && (
                    <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      {p.observationCount} {p.observationCount === 1 ? t.timeline.observationCountSingle || 'observation' : t.timeline.observationCountPlural || 'observations'}
                    </p>
                  )}
                </div>
              );
            }}
          />

          {/* Area for Supported Person (Atmosphere/Background) */}
          <Area
            type="monotone"
            dataKey="displayRelative"
            fill="url(#relativeGradient)"
            stroke="hsl(var(--destructive))"
            strokeWidth={1}
            strokeDasharray="2 2"
            connectNulls={true}
            animationDuration={1500}
          />

          {/* Line for Self (Regulation/Path) */}
          <Line
            type="monotone"
            dataKey="displaySelf"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            activeDot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
            connectNulls={true}
            animationDuration={1000}
          />
        </ComposedChart>
      </ChartContainer>
      
      {/* Visual Insight / Legend Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="p-3 rounded-2xl bg-primary/5 space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary/70">{t.timeline.regulationLabel || 'Emotional Regulation'}</p>
          <p className="text-xs text-foreground/80 leading-relaxed">
            {t.timeline.regulationDesc || 'The blue line represents your daily average mood level. Drops may indicate periods of higher perceived stress or struggle.'}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-destructive/5 space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-destructive/70">{t.timeline.environmentLabel || 'Interpersonal Intensity'}</p>
          <p className="text-xs text-foreground/80 leading-relaxed">
            {t.timeline.environmentDesc || 'The red area represents the intensity of observations logged for others. Spikes suggest more frequent or severe conflict patterns.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CorrelationChart;
