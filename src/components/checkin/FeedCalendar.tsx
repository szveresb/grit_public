import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday, isFuture } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { getMoonPhase } from '@/lib/moon-phase';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { FChevronLeft, FChevronRight, FBookOpen, FEye, FClipboardCheck, FPlus } from '@/components/icons/FreudIcons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface CalendarFeedItem {
  id: string;
  type: 'journal' | 'observation' | 'questionnaire';
  title: string;
  date: string;
  detail?: string;
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

const iconFor = (type: CalendarFeedItem['type']) => {
  switch (type) {
    case 'journal': return <FBookOpen className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'observation': return <FEye className="h-3.5 w-3.5 text-accent-foreground/60 shrink-0" />;
    case 'questionnaire': return <FClipboardCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
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
      <div className="grid grid-cols-7 gap-1">
        {t.timeline.dayNames.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1.5">{d}</div>
        ))}
        {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}

        <TooltipProvider delayDuration={300}>
          {days.map(day => {
            const dayItems = getItemsForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);
            const moon = getMoonPhase(day);
            const isKeyPhase = moon.index === 0 || moon.index === 4;

            return (
              <Tooltip key={day.toISOString()}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelectDate(isSelected ? null : day)}
                    className={`relative flex flex-col items-center justify-center p-1.5 text-center rounded-2xl transition-all min-h-[3.2rem]
                      ${isSelected ? 'bg-primary text-primary-foreground shadow-md' : today ? 'bg-accent' : 'hover:bg-accent/50'}
                    `}
                  >
                    <span className="text-sm leading-none">{format(day, 'd')}</span>
                    <span className={`text-[0.55rem] leading-none mt-0.5 ${isKeyPhase ? 'opacity-90' : 'opacity-40'}`}>
                      {moon.emoji}
                    </span>
                    {dayItems.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayItems.some(i => i.type === 'journal') && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />}
                        {dayItems.some(i => i.type === 'observation') && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/60' : 'bg-accent-foreground/60'}`} />}
                        {dayItems.some(i => i.type === 'questionnaire') && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/40' : 'bg-muted-foreground'}`} />}
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>{lang === 'en' ? moon.nameEn : moon.nameHu}</p>
                  {dayItems.length > 0 && (
                    <p className="text-muted-foreground">{dayItems.length} {lang === 'en' ? (dayItems.length === 1 ? 'entry' : 'entries') : 'bejegyzés'}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Moon legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-border/50">
        <span className="text-xs text-muted-foreground">{lang === 'en' ? 'Moon' : 'Hold'}:</span>
        <span className="text-xs">🌑 {lang === 'en' ? 'New' : 'Új'}</span>
        <span className="text-xs">🌓 {lang === 'en' ? '1st Q' : '1. n.'}</span>
        <span className="text-xs">🌕 {lang === 'en' ? 'Full' : 'Teli'}</span>
        <span className="text-xs">🌗 {lang === 'en' ? 'Last Q' : 'Utolsó n.'}</span>
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
                className={`flex items-start gap-3 p-3 border border-border rounded-2xl ${item.type === 'journal' ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
                onClick={() => item.type === 'journal' && onEntryClick?.(item.type, item.id)}
              >
                {iconFor(item.type)}
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
