import { useMemo } from 'react';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import type { Dictionary, Lang } from '@/i18n/types';
import type { DualStats } from '@/hooks/useDualPerspectiveData';

interface Props {
  stats: DualStats;
  t: Dictionary;
  lang: Lang;
  onPointClick?: (date: string) => void;
}

const CorrelationScatter = ({ stats, t, lang, onPointClick }: Props) => {
  const locale = getDateLocale(lang);
  const points = stats.scatter;

  const regressionLine = useMemo(() => {
    if (!stats.regression) return null;
    const { slope, intercept } = stats.regression;
    return [
      { x: 1, y: Math.max(0.5, Math.min(5.5, slope * 1 + intercept)) },
      { x: 5, y: Math.max(0.5, Math.min(5.5, slope * 5 + intercept)) },
    ];
  }, [stats.regression]);

  if (points.length < 3) return null;

  return (
    <div className="surface-card p-5 space-y-4 animate-fade-in">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground">{t.timeline.dual.scatterTitle}</h3>
        <p className="text-xs text-muted-foreground">{t.timeline.dual.scatterSubtitle}</p>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 16, bottom: 28, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis
              type="number"
              dataKey="x"
              name={t.timeline.dual.scatterAxisSelf}
              domain={[0.5, 5.5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              label={{
                value: t.timeline.dual.scatterAxisSelf,
                position: 'insideBottom',
                offset: -10,
                style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={t.timeline.dual.scatterAxisRelative}
              domain={[0.5, 5.5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              label={{
                value: t.timeline.dual.scatterAxisRelative,
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
              }}
            />
            <ZAxis type="number" dataKey="z" range={[40, 220]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const p = payload[0].payload as {
                  x: number;
                  y: number;
                  z: number;
                  date?: string;
                };
                if (!p?.date) return null;
                return (
                  <div className="rounded-2xl border border-border bg-popover/95 backdrop-blur-sm p-3 shadow-xl text-xs space-y-2 min-w-[180px]">
                    <p className="font-bold text-foreground border-b border-border/50 pb-1.5 mb-1.5">
                      {format(parseISO(p.date), 'PPP', { locale })}
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground">{t.timeline.dual.scatterAxisSelf}</span>
                      </div>
                      <span className="font-bold tabular-nums">{p.x.toFixed(1)}/5</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        <span className="text-muted-foreground">{t.timeline.dual.scatterAxisRelative}</span>
                      </div>
                      <span className="font-bold tabular-nums">{p.y.toFixed(1)}/5</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-1.5 mt-1 border-t border-border/50 tabular-nums">
                      {p.z}{' '}
                      {p.z === 1
                        ? t.timeline.observationCountSingle || 'observation'
                        : t.timeline.observationCountPlural || 'observations'}
                    </p>
                  </div>
                );
              }}
            />
            <Scatter
              data={points.map((p) => ({
                x: p.selfMood,
                y: p.relativeIntensity,
                z: p.observationCount,
                date: p.date,
              }))}
              fill="hsl(var(--primary))"
              fillOpacity={0.55}
              cursor={onPointClick ? 'pointer' : 'default'}
              onClick={(payload: any) => {
                const date = payload?.payload?.date ?? payload?.date;
                if (date && onPointClick) onPointClick(date);
              }}
            />
            {regressionLine && (
              <Scatter
                data={regressionLine}
                line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                shape={() => null as any}
                legendType="none"
              />
            )}
            <ReferenceLine
              segment={[
                { x: 1, y: 1 },
                { x: 5, y: 5 },
              ]}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="2 4"
              ifOverflow="hidden"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CorrelationScatter;