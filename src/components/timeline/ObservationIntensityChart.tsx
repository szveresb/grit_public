import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { FTimeline, FSparkles } from '@/components/icons/FreudIcons';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { toast } from 'sonner';
import type { Lang, Dictionary } from '@/i18n/types';
import type { ObservationIntensityPoint, ConceptMetadata } from '@/hooks/useObservationIntensityComparisonData';

interface ObservationIntensityChartProps {
  data: ObservationIntensityPoint[];
  concepts: ConceptMetadata[];
  selectedConceptIds: string[];
  onSelectedConceptIdsChange: (ids: string[]) => void;
  conceptHasData: Record<string, boolean>;
  lang: Lang;
  t: Dictionary;
}

const colorsPalette = [
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#10B981', // Green
];

const ObservationIntensityChart = ({
  data,
  concepts,
  selectedConceptIds,
  onSelectedConceptIdsChange,
  conceptHasData,
  lang,
  t,
}: ObservationIntensityChartProps) => {
  const locale = getDateLocale(lang);

  const chartConfig = useMemo(() => {
    const config: any = {};
    concepts.forEach((c, index) => {
      config[c.id] = {
        label: lang === 'en' ? c.name_en : c.name_hu,
        color: colorsPalette[index % colorsPalette.length],
      };
    });
    return config;
  }, [concepts, lang]);

  const handleChipClick = (conceptId: string) => {
    const isSelected = selectedConceptIds.includes(conceptId);
    if (isSelected) {
      onSelectedConceptIdsChange(selectedConceptIds.filter((id) => id !== conceptId));
    } else {
      if (selectedConceptIds.length >= 3) {
        toast.warning(
          t.timeline.observationIntensityTitleSelectLimit || 
          (lang === 'en' ? 'Up to 3 concepts can be selected.' : 'Legfeljebb 3 fogalom választható ki.')
        );
        return;
      }
      onSelectedConceptIdsChange([...selectedConceptIds, conceptId]);
    }
  };

  const hasDataToDraw = useMemo(() => {
    return selectedConceptIds.some((id) => data.some((p) => p[id] !== null));
  }, [data, selectedConceptIds]);

  // Compute trendlines for selected concepts using simple linear regression
  const chartData = useMemo(() => {
    const updatedData = data.map((p) => ({ ...p }));

    selectedConceptIds.forEach((conceptId) => {
      const validPoints: { x: number; y: number }[] = [];
      updatedData.forEach((p, index) => {
        const val = p[conceptId];
        if (val !== null && val !== undefined) {
          validPoints.push({ x: index, y: Number(val) });
        }
      });

      // We need at least 2 points to compute a trendline
      if (validPoints.length >= 2) {
        const xs = validPoints.map((pt) => pt.x);
        const ys = validPoints.map((pt) => pt.y);
        
        const n = xs.length;
        let sx = 0, sy = 0, sxx = 0, sxy = 0;
        for (let i = 0; i < n; i++) {
          sx += xs[i];
          sy += ys[i];
          sxx += xs[i] * xs[i];
          sxy += xs[i] * ys[i];
        }
        
        const denom = n * sxx - sx * sx;
        if (denom !== 0) {
          const slope = (n * sxy - sx * sy) / denom;
          const intercept = (sy - slope * sx) / n;

          updatedData.forEach((p, index) => {
            const trendVal = slope * index + intercept;
            // Clamp trendline values to the fixed YAxis bounds [1, 5]
            p[`${conceptId}_trend`] = Math.min(Math.max(trendVal, 1), 5);
          });
        }
      }
    });

    return updatedData;
  }, [data, selectedConceptIds]);

  if (concepts.length === 0) {
    return (
      <div className="surface-card p-5 space-y-2 border border-border/50 rounded-2xl shadow-sm">
        <h2 className="text-sm font-bold text-foreground">
          {t.timeline.observationIntensityTitle || (lang === 'en' ? 'Observation Intensity Comparison' : 'Megfigyelések Intenzitása')}
        </h2>
        <p className="text-xs text-muted-foreground animate-fade-in">
          {t.timeline.observationIntensityEmpty || (lang === 'en' ? 'No observations in the active range.' : 'Nincs elég megfigyelési adat a kiválasztott időszakban.')}
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card p-5 space-y-5 animate-fade-in relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <FSparkles className="h-32 w-32 rotate-12" />
      </div>

      <div className="flex flex-col gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              {t.timeline.observationIntensityTitle || (lang === 'en' ? 'Observation Intensity Comparison' : 'Megfigyelések Intenzitása')}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t.timeline.observationIntensitySubtitle || 
             (lang === 'en' 
              ? 'Compare intensity trends of different observed concepts over time.' 
              : 'Különböző megfigyelt fogalmak intenzitásának összehasonlítása az időben.')}
          </p>
        </div>

        {/* Concept Multi-select Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {concepts.map((c, index) => {
            const isSelected = selectedConceptIds.includes(c.id);
            const color = colorsPalette[concepts.indexOf(c) % colorsPalette.length];
            const hasData = conceptHasData[c.id];
            const name = lang === 'en' ? c.name_en : c.name_hu;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleChipClick(c.id)}
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
                <span>{name}</span>
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

      {selectedConceptIds.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center border border-dashed border-border/60 rounded-2xl bg-muted/5">
          <p className="text-xs text-muted-foreground italic">
            {t.timeline.observationIntensitySelectPrompt || 
             (lang === 'en' ? 'Select at least one concept from the list above.' : 'Válassz legalább egy fogalmat a fenti listából.')}
          </p>
        </div>
      ) : !hasDataToDraw ? (
        <div className="h-[200px] flex items-center justify-center border border-dashed border-border/60 rounded-2xl bg-muted/5">
          <p className="text-xs text-muted-foreground italic text-center px-4">
            {t.timeline.observationIntensityEmpty || 
             (lang === 'en' 
              ? 'Not enough observation data in the active range to draw the chart.' 
              : 'Nincs elég megfigyelési adat a kiválasztott időszakban a grafikon kirajzolásához.')}
          </p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <LineChart data={chartData} margin={{ top: 20, right: 10, bottom: 10, left: 0 }}>
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
              tick={({ x, y, payload }) => (
                <text x={x - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[10px] font-medium font-mono">
                  {payload.value}
                </text>
              )}
              axisLine={false}
              tickLine={false}
              width={25}
            />

            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const p = payload[0].payload as ObservationIntensityPoint;
                const dateStr = format(parseISO(p.date), 'PPP', { locale });

                return (
                  <div className="rounded-2xl border border-border bg-popover/95 backdrop-blur-sm p-3.5 shadow-xl text-xs space-y-2 min-w-[180px]">
                    <p className="font-bold text-foreground border-b border-border/50 pb-1.5 mb-1.5">{dateStr}</p>
                    {concepts
                      .filter((c) => selectedConceptIds.includes(c.id))
                      .map((c) => {
                        const color = colorsPalette[concepts.indexOf(c) % colorsPalette.length];
                        const val = p[c.id];
                        const name = lang === 'en' ? c.name_en : c.name_hu;
                        return (
                          <div key={c.id} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-muted-foreground truncate max-w-[120px]">{name}</span>
                            </div>
                            <span className="font-bold">
                              {val !== null && val !== undefined ? `${val}/5` : '—'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                );
              }}
            />

            {concepts
              .filter((c) => selectedConceptIds.includes(c.id))
              .map((c) => {
                const color = colorsPalette[concepts.indexOf(c) % colorsPalette.length];
                const hasTrend = chartData.some((p) => p[`${c.id}_trend`] !== undefined);
                
                return [
                  // 1. Light Trendline (dashed, thin line)
                  hasTrend && (
                    <Line
                      key={`${c.id}_trend`}
                      type="monotone"
                      dataKey={`${c.id}_trend`}
                      stroke={color}
                      strokeWidth={1.5}
                      strokeOpacity={0.4}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={false}
                      connectNulls={true}
                      animationDuration={1000}
                    />
                  ),
                  // 2. Data Dots (transparent line, only dots visible)
                  <Line
                    key={c.id}
                    type="monotone"
                    dataKey={c.id}
                    stroke="transparent"
                    dot={{ r: 4, fill: color, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: color, strokeWidth: 0 }}
                    connectNulls={false}
                    animationDuration={1000}
                  />
                ];
              })}
          </LineChart>
        </ChartContainer>
      )}

      {/* Chart Legend & Helper */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground z-10 relative">
        {selectedConceptIds.length > 0 && hasDataToDraw && (
          <div className="flex flex-wrap items-center justify-start gap-4">
            {concepts
              .filter((c) => selectedConceptIds.includes(c.id))
              .map((c) => {
                const color = colorsPalette[concepts.indexOf(c) % colorsPalette.length];
                const name = lang === 'en' ? c.name_en : c.name_hu;
                return (
                  <div key={c.id} className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                    <span className="font-medium text-foreground">{name}</span>
                  </div>
                );
              })}
          </div>
        )}
        <p className="italic">
          {t.timeline.observationIntensityHelper || 
           (lang === 'en' 
            ? 'Select up to 3 concepts to compare their intensities. Gaps represent days with no logged entries.' 
            : 'Válassz ki legfeljebb 3 fogalmat az intenzitásuk összehasonlításához. A hiányzó napokon nem történt bejegyzés.')}
        </p>
      </div>
    </div>
  );
};

export default ObservationIntensityChart;
