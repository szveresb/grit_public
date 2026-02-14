import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, BookOpen, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineItem {
  id: string;
  type: 'journal' | 'questionnaire';
  title: string;
  date: string;
  detail?: string;
}

const Timeline = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [journalRes, responseRes] = await Promise.all([
        supabase.from('journal_entries').select('id, title, entry_date, impact_level').eq('user_id', user.id),
        supabase.from('questionnaire_responses').select('id, questionnaire_id, completed_at, questionnaires(title)').eq('user_id', user.id),
      ]);

      const journalItems: TimelineItem[] = (journalRes.data ?? []).map(j => ({
        id: j.id, type: 'journal', title: j.title,
        date: j.entry_date,
        detail: j.impact_level ? `Impact: ${j.impact_level}/5` : undefined,
      }));

      const qItems: TimelineItem[] = (responseRes.data ?? []).map((r: any) => ({
        id: r.id, type: 'questionnaire',
        title: r.questionnaires?.title ?? 'Questionnaire',
        date: r.completed_at.split('T')[0],
      }));

      setItems([...journalItems, ...qItems].sort((a, b) => b.date.localeCompare(a.date)));
    };
    fetchAll();
  }, [user]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  const getItemsForDate = (date: Date) =>
    items.filter(item => isSameDay(parseISO(item.date), date));

  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Timeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">Calendar view of journal entries and self-check completions.</p>
        </div>

        {/* Calendar */}
        <div className="border border-border rounded-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-xs font-mono text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map(day => {
              const dayItems = getItemsForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={`relative p-2 text-center text-sm rounded-sm transition-colors
                    ${isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'bg-accent' : 'hover:bg-muted'}
                  `}
                >
                  {format(day, 'd')}
                  {dayItems.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {dayItems.some(i => i.type === 'journal') && <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />}
                      {dayItems.some(i => i.type === 'questionnaire') && <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-primary-foreground/70' : 'bg-muted-foreground'}`} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day details */}
        {selectedDate && (
          <div className="border border-border rounded-sm p-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries on this day.</p>
            ) : selectedItems.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 border border-border rounded-sm">
                {item.type === 'journal' ? <BookOpen className="h-4 w-4 text-primary mt-0.5" /> : <ClipboardCheck className="h-4 w-4 text-muted-foreground mt-0.5" />}
                <div>
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground capitalize">{item.type === 'journal' ? 'Journal' : 'Self-Check'}</span>
                  {item.detail && <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full timeline list */}
        <div className="border border-border rounded-sm p-4 space-y-2">
          <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">All Activity</h2>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : items.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              {item.type === 'journal' ? <BookOpen className="h-3.5 w-3.5 text-primary" /> : <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="text-sm flex-1">{item.title}</span>
              <span className="text-xs text-muted-foreground">{format(parseISO(item.date), 'MMM d')}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Timeline;
