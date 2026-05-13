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
}

const CorrelationScatter = ({ stats, t, lang }: Props) => {
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
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                fontSize: 11,
              }}
              formatter={(value: any, name: any) => [Number(value).toFixed(1), name]}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload;
                if (!p?.date) return '';
                return format(parseISO(p.date), 'PPP', { locale });
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