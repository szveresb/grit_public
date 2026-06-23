import { useState, useMemo } from 'react';
import { format, parseISO, subDays, isSameDay } from 'date-fns';
import { FBookOpen, FClipboardCheck, FEye, FChevronRight, FChevronLeft } from '@/components/icons/FreudIcons';
import { getDateLocale } from '@/lib/date-locale';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface TimelineItem {
  id: string;
  type: 'journal' | 'questionnaire' | 'observation';
  title: string;
  date: string;
  detail?: string;
}

interface Props {
  items: TimelineItem[];
  lang: string;
  t: any;
  selectedDate?: string | null;
  onDateSelect?: (date: string) => void;
}

const dotBg = (type: string) => {
  if (type === 'journal') return 'bg-primary';
  if (type === 'observation') return 'bg-orange-500';
  return 'bg-purple-600';
};

const iconFor = (type: string) => {
  const cls = "h-3.5 w-3.5 text-white";
  if (type === 'journal') return <FBookOpen className={cls} />;
  if (type === 'observation') return <FEye className={cls} />;
  return <FClipboardCheck className={cls} />;
};

const HorizontalTimeline = ({ items, lang, t, selectedDate, onDateSelect }: Props) => {
  const locale = getDateLocale(lang as any);
  const { localePath } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Compute 7 days to display based on pagination offset
  const displayDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      return subDays(new Date(), (6 - i) - (weekOffset * 7));
    });
  }, [weekOffset]);

  const selectedItem = selectedId ? items.find(i => i.id === selectedId) : null;

  return (
    <div className="space-y-4">
      {/* Header and Pagination Controls */}
      <div className="flex items-center justify-between">
        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">{t.timeline.journalLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
            <span className="text-[10px] font-medium text-muted-foreground">{t.timeline.questionnaireLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span className="text-[10px] font-medium text-muted-foreground">{t.observations.tabObservations}</span>
          </div>
        </div>

        {/* Pagination Chevrons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Előző hét"
          >
            <FChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset(prev => Math.min(0, prev + 1))}
            disabled={weekOffset === 0}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-35"
            title="Következő hét"
          >
            <FChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Matrix Table container */}
      <div className="flex w-full overflow-x-auto pb-1 select-none">
        <div className="flex w-full min-w-[500px]">
          {/* Row Labels (Left Column) */}
          <div className="w-24 shrink-0 flex flex-col justify-end text-left pr-4">
            <div className="h-10" /> {/* header spacer */}
            <div className="h-10 flex items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {t.timeline.journalLabel}
            </div>
            <div className="h-10 flex items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {t.timeline.questionnaireLabel}
            </div>
            <div className="h-10 flex items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {t.observations.tabObservations}
            </div>
          </div>

          {/* Grid Columns (Days) */}
          <div className="flex-1 grid grid-cols-7 gap-1">
            {displayDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const isSelectedCol = selectedDate ? isSameDay(day, parseISO(selectedDate)) : false;
              
              const dayName = format(day, 'EEEEEE', { locale }); // "H", "K"
              const dayLabel = format(day, 'MMM d', { locale }); // "jún. 20."

              return (
                <div
                  key={dateKey}
                  onClick={() => onDateSelect?.(dateKey)}
                  className={cn(
                    "flex flex-col items-center py-2 px-1 rounded-2xl transition-all cursor-pointer border border-transparent",
                    isSelectedCol
                      ? "bg-muted/60 border-border/60 shadow-sm"
                      : "hover:bg-muted/30"
                  )}
                >
                  {/* Column Header */}
                  <div className="h-10 flex flex-col items-center justify-center text-center leading-none mb-1">
                    <span className="text-[10px] font-bold text-foreground capitalize">
                      {dayName}
                    </span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap">
                      {dayLabel}
                    </span>
                  </div>

                  {/* Row Cells */}
                  {([ 'journal', 'questionnaire', 'observation' ] as const).map((type) => {
                    const cellItems = items.filter(
                      (item) => item.date.slice(0, 10) === dateKey && item.type === type
                    );
                    const hasItem = cellItems.length > 0;

                    return (
                      <div key={type} className="h-10 flex items-center justify-center w-full">
                        {hasItem ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); // Avoid triggering column selection
                              setSelectedId(selectedId === cellItems[0].id ? null : cellItems[0].id);
                            }}
                            className={cn(
                              "h-5 w-5 rounded-full flex items-center justify-center transition-transform hover:scale-125 hover:shadow-sm",
                              dotBg(type),
                              selectedId === cellItems[0].id && "ring-2 ring-primary/40 scale-110 shadow"
                            )}
                            title={cellItems[0].title}
                          >
                            {iconFor(type)}
                          </button>
                        ) : (
                          <div className="h-1 w-1 rounded-full bg-border/40" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Card below matrix */}
      {selectedItem && (
        <div className="bg-card/85 backdrop-blur border border-border rounded-2xl p-4 animate-fade-in relative">
          <div className="flex items-start gap-3">
            <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0", dotBg(selectedItem.type))}>
              {iconFor(selectedItem.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{selectedItem.title}</span>
                <span className="text-[10px] text-muted-foreground capitalize shrink-0 font-medium">
                  {selectedItem.type === 'journal' ? t.timeline.journalLabel : selectedItem.type === 'observation' ? t.observations.tabObservations : t.timeline.questionnaireLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(parseISO(selectedItem.date), 'EEEE, MMMM d.', { locale })}
              </p>
              {selectedItem.detail && (
                <p className="text-xs text-foreground/90 mt-2 leading-relaxed whitespace-pre-wrap">{selectedItem.detail}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HorizontalTimeline;
