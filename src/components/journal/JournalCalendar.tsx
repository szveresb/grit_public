import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { getMoonPhase } from '@/lib/moon-phase';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { FChevronLeft, FChevronRight } from '@/components/icons/FreudIcons';
import type { JournalEntry } from '@/types/journal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  entries: JournalEntry[];
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

const JournalCalendar = ({ entries, currentMonth, onMonthChange, selectedDate, onSelectDate }: Props) => {
  const { t, lang } = useLanguage();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  const entryMap = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    entries.forEach(e => {
      const key = e.entry_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [entries]);

  const getEntriesForDate = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return entryMap.get(key) ?? [];
  };

  return (
    <div className="surface-card p-5">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
          <FChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: getDateLocale(lang) })}</span>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
          <FChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {t.timeline.dayNames.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
        ))}

        {/* Empty cells for offset */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}

        {/* Day cells */}
        <TooltipProvider delayDuration={300}>
          {days.map(day => {
            const dayEntries = getEntriesForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);
            const moon = getMoonPhase(day);
            const isKeyPhase = moon.index === 0 || moon.index === 4; // new/full moon

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

                    {/* Moon phase indicator */}
                    <span className={`text-[0.55rem] leading-none mt-0.5 ${isKeyPhase ? 'opacity-90' : 'opacity-40'}`}>
                      {moon.emoji}
                    </span>

                    {/* Entry dots */}
                    {dayEntries.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEntries.slice(0, 3).map((_, i) => (
                          <span key={i} className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
                        ))}
                        {dayEntries.length > 3 && (
                          <span className={`text-[0.5rem] leading-none ${isSelected ? 'text-primary-foreground' : 'text-primary'}`}>+</span>
                        )}
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>{lang === 'en' ? moon.nameEn : moon.nameHu}</p>
                  {dayEntries.length > 0 && (
                    <p className="text-muted-foreground">{dayEntries.length} {dayEntries.length === 1 ? (lang === 'en' ? 'entry' : 'bejegyzés') : (lang === 'en' ? 'entries' : 'bejegyzés')}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Moon phase legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">{lang === 'en' ? 'Moon phases' : 'Holdfázisok'}:</span>
        <span className="text-xs">🌑 {lang === 'en' ? 'New' : 'Új'}</span>
        <span className="text-xs">🌓 {lang === 'en' ? 'First Q' : '1. negyed'}</span>
        <span className="text-xs">🌕 {lang === 'en' ? 'Full' : 'Teli'}</span>
        <span className="text-xs">🌗 {lang === 'en' ? 'Last Q' : 'Utolsó n.'}</span>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="mt-4 pt-3 border-t border-border/50 space-y-2 animate-fade-in">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {format(selectedDate, 'EEEE, MMMM d', { locale: getDateLocale(lang) })}
            <span className="ml-2 normal-case">{getMoonPhase(selectedDate).emoji}</span>
          </h3>
          {getEntriesForDate(selectedDate).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.timeline.noEntriesOnDay}</p>
          ) : (
            getEntriesForDate(selectedDate).map(entry => (
              <div key={entry.id} className="flex items-start gap-3 p-3 border border-border rounded-2xl">
                <div className="flex-1">
                  <span className="text-sm font-semibold">{entry.title}</span>
                  {entry.impact_level && (
                    <span className="ml-2 text-xs text-muted-foreground">{t.journal.cardImpact}: {entry.impact_level}/5</span>
                  )}
                  {entry.emotional_state && (
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.emotional_state}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default JournalCalendar;
