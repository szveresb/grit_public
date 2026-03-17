import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { FBookOpen, FClipboardCheck, FEye } from '@/components/icons/FreudIcons';

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
}

const DOT_GAP = 56; // px per entry group
const MIN_SCALE = 1;
const MAX_SCALE = 3;

const iconFor = (type: string, selected: boolean) => {
  const cls = `h-4 w-4 ${selected ? 'text-primary-foreground' : type === 'journal' ? 'text-primary' : type === 'observation' ? 'text-accent-foreground/60' : 'text-muted-foreground'}`;
  if (type === 'journal') return <FBookOpen className={cls} />;
  if (type === 'observation') return <FEye className={cls} />;
  return <FClipboardCheck className={cls} />;
};

const dotBg = (type: string) => {
  if (type === 'journal') return 'bg-primary';
  if (type === 'observation') return 'bg-accent-foreground/60';
  return 'bg-muted-foreground';
};

const HorizontalTimeline = ({ items, lang, t }: Props) => {
  const locale = getDateLocale(lang as any);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);

  // Group items by date
  const grouped = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const item of items) {
      const key = item.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()); // sorted desc from items
  }, [items]);

  // Reverse so oldest is on the left (items come sorted newest-first)
  const groupedLTR = useMemo(() => [...grouped].reverse(), [grouped]);

  // Detect month boundaries for separators
  const monthBoundaries = useMemo(() => {
    const set = new Set<number>();
    let prevMonth = '';
    groupedLTR.forEach(([dateKey], idx) => {
      const m = dateKey.slice(0, 7);
      if (prevMonth && m !== prevMonth) set.add(idx);
      prevMonth = m;
    });
    return set;
  }, [groupedLTR]);

  // Pinch-to-zoom handlers
  const getTouchDist = (e: React.TouchEvent) => {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { startDist: getTouchDist(e), startScale: scale };
    }
  }, [scale]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dist = getTouchDist(e);
      const ratio = dist / pinchRef.current.startDist;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchRef.current.startScale * ratio));
      setScale(newScale);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  // Find the selected item for detail card
  const selectedItem = selectedId ? items.find(i => i.id === selectedId) : null;

  const trackWidth = Math.max(groupedLTR.length * DOT_GAP, 400);

  return (
    <div className="space-y-3">
      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="overflow-x-auto overflow-y-hidden pb-2"
        style={{ touchAction: scale > 1 ? 'pan-x pan-y' : 'manipulation', scrollbarWidth: 'none', msOverflowStyle: 'none' } as any}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <style>{`.timeline-scroll::-webkit-scrollbar { display: none; }`}</style>
        <div
          className="timeline-scroll relative"
          style={{ width: `${trackWidth * scale}px`, minHeight: 80, transform: `scaleX(1)`, transformOrigin: 'left center' }}
        >
          {/* Horizontal line */}
          <div className="absolute left-0 right-0 top-[24px] h-px bg-border" />

          {/* Date groups */}
          <div className="relative flex" style={{ gap: `${(DOT_GAP - 24) * scale}px`, paddingLeft: 12, paddingRight: 12 }}>
            {groupedLTR.map(([dateKey, dayItems], groupIdx) => {
              const isMonthBoundary = monthBoundaries.has(groupIdx);
              return (
                <div key={dateKey} className="relative flex flex-col items-center" style={{ minWidth: 24 }}>
                  {/* Month separator */}
                  {isMonthBoundary && (
                    <div className="absolute -left-3 top-0 bottom-0 w-px bg-primary/20" />
                  )}

                  {/* Entry dots stacked vertically at this date position */}
                  <div className="flex flex-col items-center gap-1">
                    {dayItems.map(item => {
                      const isSelected = selectedId === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedId(isSelected ? null : item.id)}
                          className={`relative flex items-center justify-center rounded-full transition-all duration-200
                            ${isSelected
                              ? 'h-7 w-7 ' + dotBg(item.type) + ' ring-2 ring-primary/30 shadow-md scale-110'
                              : 'h-5 w-5 ' + dotBg(item.type) + ' hover:scale-125 hover:shadow-sm'
                            }`}
                          title={item.title}
                        >
                          {isSelected ? (
                            iconFor(item.type, true)
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-primary-foreground/80" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Date label below */}
                  <span className="mt-2 text-[9px] text-muted-foreground whitespace-nowrap leading-none">
                    {format(parseISO(dateKey), 'MMM d', { locale })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Zoom hint for mobile */}
      <p className="text-[10px] text-muted-foreground text-center md:hidden">
        {lang === 'hu' ? 'Csippentsd két ujjal a nagyításhoz' : 'Pinch to zoom'}
      </p>

      {/* Detail card */}
      {selectedItem && (
        <div className="bg-card/80 backdrop-blur border border-border rounded-2xl p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{iconFor(selectedItem.type, false)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{selectedItem.title}</span>
                <span className="text-[10px] text-muted-foreground capitalize shrink-0">
                  {selectedItem.type === 'journal' ? t.timeline.journalLabel : selectedItem.type === 'observation' ? t.observations.tabObservations : t.timeline.selfCheckLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(parseISO(selectedItem.date.slice(0, 10)), 'EEEE, MMM d', { locale })}
              </p>
              {selectedItem.detail && (
                <p className="text-xs text-muted-foreground mt-1">{selectedItem.detail}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HorizontalTimeline;
