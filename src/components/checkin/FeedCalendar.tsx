import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday, isFuture } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { getMoonPhase } from '@/lib/moon-phase';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { FChevronLeft, FChevronRight, FBookOpen, FEye, FClipboardCheck, FPlus, FUsers } from '@/components/icons/FreudIcons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface CalendarFeedItem {
  id: string;
  type: 'journal' | 'observation' | 'questionnaire';
  title: string;
  date: string;
  detail?: string;
  impactLevel?: number;
  subjectType?: 'self' | 'relative';
}

interface Props {
  items: CalendarFeedItem[];
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  onEntryClick?: (type: CalendarFeedItem['type'], dbId: string) => void;
  onCreateEntry?: (date: Date) => void;
}

const getHeatmapColor = (avgImpact: number | null) => {
  if (avgImpact === null) return '';
  if (avgImpact >= 4.5) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  if (avgImpact >= 3.5) return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/20';
  if (avgImpact >= 2.5) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/20';
  if (avgImpact >= 1.5) return 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/20';
  return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/20';
};

const FeedCalendar = ({ items, currentMonth, onMonthChange, selectedDate, onSelectDate, onEntryClick, onCreateEntry }: Props) => {
  const { t, lang } = useLanguage();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  const entryMap = useMemo(() => {
    const map = new Map<string, CalendarFeedItem[]>();
    items.forEach(item => {
      const key = item.date.slice(0, 10); // yyyy-MM-dd
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [items]);

  const getItemsForDate = (date: Date) => entryMap.get(format(date, 'yyyy-MM-dd')) ?? [];

  const getAvgImpactForDate = (date: Date) => {
    const dayItems = getItemsForDate(date);
    const impacts = dayItems.filter(i => i.impactLevel !== undefined).map(i => i.impactLevel as number);
    if (impacts.length === 0) return null;
    return impacts.reduce((a, b) => a + b, 0) / impacts.length;
  };

  const iconFor = (item: CalendarFeedItem) => {
    switch (item.type) {
      case 'journal': return <FBookOpen className="h-3.5 w-3.5 text-primary shrink-0" />;
      case 'observation':
        return item.subjectType === 'relative'
          ? <FUsers className="h-3.5 w-3.5 text-amber-600/70 dark:text-amber-400/70 shrink-0" />
          : <FEye className="h-3.5 w-3.5 text-accent-foreground/60 shrink-0" />;
      case 'questionnaire': return <FClipboardCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
          <FChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: getDateLocale(lang) })}</span>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
          <FChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {t.timeline.dayNames.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1.5">{d}</div>
        ))}
        {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}

        <TooltipProvider delayDuration={300}>
          {days.map(day => {
            const dayItems = getItemsForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);
            const future = isFuture(day);
            const moon = getMoonPhase(day);
            const isKeyPhase = moon.index === 0 || moon.index === 4;
            const avgImpact = getAvgImpactForDate(day);

            const heatmapClass = getHeatmapColor(avgImpact);

            return (
              <Tooltip key={day.toISOString()}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !future && onSelectDate(isSelected ? null : day)}
                    disabled={future}
                    className={`relative flex flex-col items-center justify-center p-1 sm:p-1.5 text-center rounded-xl sm:rounded-2xl transition-all min-h-[2.8rem] sm:min-h-[3.2rem] border
                      ${future ? 'opacity-30 cursor-not-allowed border-transparent' : isSelected ? 'bg-primary text-primary-foreground shadow-md border-primary' : today ? 'bg-accent border-transparent' : `${heatmapClass || 'hover:bg-accent/50 border-transparent'}`}
                    `}
                  >
                    <span className="text-xs sm:text-sm leading-none">{format(day, 'd')}</span>
                    <span className={`text-[0.55rem] leading-none mt-0.5 ${isKeyPhase ? 'opacity-90' : 'opacity-40'}`}>
                      {moon.emoji}
                    </span>
                    {dayItems.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayItems.some(i => i.type === 'journal') && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />}
                        {dayItems.some(i => i.type === 'observation' && i.subjectType !== 'relative') && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/60' : 'bg-accent-foreground/60'}`} />}
                        {dayItems.some(i => i.type === 'observation' && i.subjectType === 'relative') && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500/70'}`} />}
                        {dayItems.some(i => i.type === 'questionnaire') && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/40' : 'bg-muted-foreground'}`} />}
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>{t.moon.phases[moon.nameEn.toLowerCase().replace(' phase', '').replace(' ', '') as keyof typeof t.moon.phases] || (lang === 'en' ? moon.nameEn : moon.nameHu)}</p>
                  {dayItems.length > 0 && (
                    <p className="text-muted-foreground">{dayItems.length} {dayItems.length === 1 ? t.moon.counts.entry : t.moon.counts.entries}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Moon legend */}
      <div className="flex items-center gap-x-4 gap-y-2 flex-wrap pt-2 border-t border-border/50">
        <span className="text-xs text-muted-foreground whitespace-nowrap">{t.moon.title}:</span>
        <span className="text-xs whitespace-nowrap">🌑 {t.moon.phases.new}</span>
        <span className="text-xs whitespace-nowrap">🌓 {t.moon.phases.firstQ}</span>
        <span className="text-xs whitespace-nowrap">🌕 {t.moon.phases.full}</span>
        <span className="text-xs whitespace-nowrap">🌗 {t.moon.phases.lastQ}</span>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="space-y-2 animate-fade-in pt-2 border-t border-border/50">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {format(selectedDate, 'EEEE, MMMM d', { locale: getDateLocale(lang) })}
              <span className="ml-2 normal-case">{getMoonPhase(selectedDate).emoji}</span>
            </h3>
            {onCreateEntry && (
              <Button variant="ghost" size="sm" className="rounded-2xl text-xs gap-1.5" onClick={() => onCreateEntry(selectedDate)}>
                <FPlus className="h-3.5 w-3.5" /> {t.journal.newEntry}
              </Button>
            )}
          </div>
          {getItemsForDate(selectedDate).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.timeline.noEntriesOnDay}</p>
          ) : (
            getItemsForDate(selectedDate).map(item => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 border border-border rounded-2xl ${(item.type === 'journal' || item.type === 'observation') ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
                onClick={() => (item.type === 'journal' || item.type === 'observation') && onEntryClick?.(item.type, item.id)}
              >
                {iconFor(item)}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">{item.title}</span>
                  {item.detail && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.detail}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FeedCalendar;
