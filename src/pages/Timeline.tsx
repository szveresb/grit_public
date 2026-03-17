import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { FChevronLeft, FChevronRight, FBookOpen, FClipboardCheck, FEye, FTrendingUp } from '@/components/icons/FreudIcons';
import { Button } from '@/components/ui/button';
import PatternChart from '@/components/timeline/PatternChart';

interface TimelineItem { id: string; type: 'journal' | 'questionnaire' | 'observation'; title: string; date: string; detail?: string; }
interface PatternNudge { name: string; count: number; }
interface ObsLog { concept_id: string; logged_at: string; intensity: number; user_narrative?: string | null; }
interface ConceptEntry { id: string; name_hu: string; name_en: string; }

const Timeline = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [nudges, setNudges] = useState<PatternNudge[]>([]);
  const [obsLogs, setObsLogs] = useState<ObsLog[]>([]);
  const [conceptMap, setConceptMap] = useState<Record<string, ConceptEntry>>({});

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [journalRes, responseRes, obsRes] = await Promise.all([
        supabase.from('journal_entries').select('id, title, entry_date, impact_level').eq('user_id', user.id),
        supabase.from('questionnaire_responses').select('id, questionnaire_id, completed_at, questionnaires(title)').eq('user_id', user.id),
        supabase.from('observation_logs').select('id, intensity, frequency, logged_at, concept_id').eq('user_id', user.id),
      ]);
      const journalItems: TimelineItem[] = (journalRes.data ?? []).map(j => ({ id: j.id, type: 'journal', title: j.title, date: j.entry_date, detail: j.impact_level ? `${t.journal.cardImpact}: ${j.impact_level}/5` : undefined }));
      const qItems: TimelineItem[] = (responseRes.data ?? []).map((r: any) => ({ id: r.id, type: 'questionnaire', title: r.questionnaires?.title ?? t.nav.selfChecks, date: r.completed_at.split('T')[0] }));

      let obsItems: TimelineItem[] = [];
      const obsData = obsRes.data ?? [];
      if (obsData.length > 0) {
        const conceptIds = [...new Set(obsData.map(o => o.concept_id))];
        const { data: concepts } = await supabase.from('observation_concepts').select('id, name_hu, name_en').in('id', conceptIds);
        const conMap = Object.fromEntries((concepts ?? []).map(c => [c.id, c]));
        setConceptMap(conMap);
        setObsLogs(obsData.map(o => ({ concept_id: o.concept_id, logged_at: o.logged_at, intensity: o.intensity })));

        obsItems = obsData.map(o => {
          const concept = conMap[o.concept_id];
          const name = concept ? (lang === 'en' ? concept.name_en : concept.name_hu) : t.observations.tabObservations;
          return { id: o.id, type: 'observation' as const, title: name, date: o.logged_at, detail: `${t.observations.intensity}: ${o.intensity}/5` };
        });

        // Current-week nudges
        const now = new Date();
        const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekObs = obsData.filter(o => o.logged_at >= weekStart && o.logged_at <= weekEnd);
        const countByConceptId: Record<string, number> = {};
        weekObs.forEach(o => { countByConceptId[o.concept_id] = (countByConceptId[o.concept_id] || 0) + 1; });
        const detectedNudges: PatternNudge[] = [];
        for (const [cid, count] of Object.entries(countByConceptId)) {
          if (count >= 3) {
            const concept = conMap[cid];
            const name = concept ? (lang === 'en' ? concept.name_en : concept.name_hu) : '';
            if (name) detectedNudges.push({ name, count });
          }
        }
        setNudges(detectedNudges);
      }

      setItems([...journalItems, ...qItems, ...obsItems].sort((a, b) => b.date.localeCompare(a.date)));
    };
    fetchAll();
  }, [user]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  const getItemsForDate = (date: Date) => items.filter(item => isSameDay(parseISO(item.date), date));
  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.timeline.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.timeline.subtitle}</p>
        </div>

        {/* Pattern nudges */}
        {nudges.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-3xl p-4 flex items-start gap-3">
            <FTrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              {nudges.map(n => (
                <p key={n.name} className="text-sm text-foreground">
                  {t.timeline.patternNudge.replace('{name}', n.name).replace('{count}', String(n.count))}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 8-week pattern frequency chart */}
        <PatternChart logs={obsLogs} conceptMap={conceptMap} />

        {/* Calendar */}
        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}>
              <FChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: getDateLocale(lang) })}</span>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}>
              <FChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {t.timeline.dayNames.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {days.map(day => {
              const dayItems = getItemsForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              return (
                <button key={day.toISOString()} onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={`relative p-2 text-center text-sm rounded-2xl transition-all
                    ${isSelected ? 'bg-primary text-primary-foreground shadow-md' : isToday ? 'bg-accent' : 'hover:bg-accent/50'}
                  `}>
                  {format(day, 'd')}
                  {dayItems.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {dayItems.some(i => i.type === 'journal') && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />}
                      {dayItems.some(i => i.type === 'questionnaire') && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/70' : 'bg-muted-foreground'}`} />}
                      {dayItems.some(i => i.type === 'observation') && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/50' : 'bg-accent-foreground/60'}`} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 space-y-3 animate-fade-in">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{format(selectedDate, 'EEEE, MMMM d, yyyy', { locale: getDateLocale(lang) })}</h2>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.timeline.noEntriesOnDay}</p>
            ) : selectedItems.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 border border-border rounded-2xl">
                {item.type === 'journal' ? <FBookOpen className="h-4 w-4 text-primary mt-0.5" /> : item.type === 'observation' ? <FEye className="h-4 w-4 text-accent-foreground/60 mt-0.5" /> : <FClipboardCheck className="h-4 w-4 text-muted-foreground mt-0.5" />}
                <div>
                  <span className="text-sm font-semibold">{item.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground capitalize">{item.type === 'journal' ? t.timeline.journalLabel : item.type === 'observation' ? t.observations.tabObservations : t.timeline.selfCheckLabel}</span>
                  {item.detail && <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{t.timeline.allActivity}</h2>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.timeline.noActivity}</p>
          ) : items.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
              {item.type === 'journal' ? <FBookOpen className="h-3.5 w-3.5 text-primary" /> : item.type === 'observation' ? <FEye className="h-3.5 w-3.5 text-accent-foreground/60" /> : <FClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="text-sm flex-1">{item.title}</span>
              <span className="text-xs text-muted-foreground">{format(parseISO(item.date), 'MMM d', { locale: getDateLocale(lang) })}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Timeline;
