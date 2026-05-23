import React, { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isToday, startOfDay } from 'date-fns';
import { friendlyDbError } from '@/lib/db-error';
import {
  FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong,
} from '@/components/icons/FreudIcons';
import { FCalendar } from '@/components/icons/FreudIcons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { getDateLocale } from '@/lib/date-locale';

const moodIcons = [FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong];

export interface MoodSelection {
  impact_level: number;
  emotional_state: string;
}

interface QuickPulseProps {
  key?: React.Key;
  onPulseSaved?: () => void;
  onMoodSelected?: (mood: MoodSelection) => void;
  compact?: boolean;
  subjectId?: string | null;
}

const QuickPulse = ({
  onPulseSaved,
  onMoodSelected,
  compact = false,
  subjectId = null,
}: QuickPulseProps) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { activeSubject, subjectType, selectedSubjectId } = useStance();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [entryDate, setEntryDate] = useState<Date>(() => startOfDay(new Date()));
  const [dateOpen, setDateOpen] = useState(false);
  const dateLabelId = useId();
  const [managedTitle, setManagedTitle] = useState<string | null>(null);
  const [managedLabels, setManagedLabels] = useState<string[] | null>(null);
  const effectiveSubjectId = subjectId ?? selectedSubjectId;
  const effectiveSubjectType = effectiveSubjectId ? 'relative' : subjectType;

  useEffect(() => {
    supabase.from('landing_sections').select('title, title_localized, config')
      .eq('section_key', 'mood_preview').eq('is_active', true).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        const title = (lang === 'en' && d.title_localized?.en) || d.title;
        const labels = lang === 'en' ? (d.config?.mood_labels_en ?? []) : (d.config?.mood_labels ?? []);
        if (title) setManagedTitle(title);
        if (labels.length === 5) setManagedLabels(labels);
      });
  }, [lang]);

  const isObserved = activeSubject.type === 'relative';
  const observedLabels = [
    t.checkIn.moodStrugglingObserved,
    t.checkIn.moodUneasyObserved,
    t.checkIn.moodOkayObserved,
    t.checkIn.moodGoodObserved,
    t.checkIn.moodStrongObserved,
  ];
  const selfLabels = [
    t.checkIn.moodStruggling,
    t.checkIn.moodUneasy,
    t.checkIn.moodOkay,
    t.checkIn.moodGood,
    t.checkIn.moodStrong,
  ];
  const fallbackLabels = isObserved
    ? [
        ...observedLabels,
      ]
    : [
        ...selfLabels,
      ];
  const moodLabels = isObserved ? observedLabels : (managedLabels ?? fallbackLabels);
  const supportedName = activeSubject.type === 'relative' ? activeSubject.name.trim() : '';
  const profilePulseTitle = activeSubject.type === 'relative'
    ? (
        supportedName
          ? t.checkIn.quickPulseTitleSupported.replace('{name}', supportedName)
          : t.checkIn.quickPulseTitleSupportedFallback
      )
    : t.checkIn.quickPulseTitleSelf;
  const pulseTitle = user ? profilePulseTitle : (managedTitle ?? t.checkIn.quickPulseTitle);

  const handleMoodTap = async (index: number) => {
    if (!user || saving) return;
    const level = index + 1;
    const label = moodLabels[index];

    if (!navigator.onLine) {
      toast.info(t.pwa.syncPending, {
        description: t.errors.offlineDescription,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return;
    }

    setSaving(true);
    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      level,
      label,
      entry_date: format(entryDate, 'yyyy-MM-dd'),
      subject_type: effectiveSubjectType,
    };
    if (effectiveSubjectType === 'relative' && effectiveSubjectId) {
      insertPayload.subject_id = effectiveSubjectId;
    }

    const { error } = await (supabase.from as any)('mood_pulses').insert(insertPayload);

    if (error) {
      toast.error(friendlyDbError(error));
    } else {
      toast.success(t.checkIn.pulseSaved);
      setSaved(true);
      onPulseSaved?.();
      if (onMoodSelected) {
        onMoodSelected({ impact_level: level, emotional_state: label });
      }
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {!compact && (
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {pulseTitle}
        </h2>
      )}

      {user && (
        <div className="flex items-center justify-center gap-2">
          <span
            id={dateLabelId}
            className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {t.checkIn.pulseDateLabel}
          </span>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-labelledby={dateLabelId}
                aria-label={`${t.checkIn.pulseDateLabel}: ${
                  isToday(entryDate)
                    ? t.checkIn.pulseDateToday
                    : format(entryDate, 'PPP', { locale: getDateLocale(lang) })
                }`}
                aria-haspopup="dialog"
                aria-expanded={dateOpen}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card/60 text-xs font-medium text-foreground hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <FCalendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                {isToday(entryDate)
                  ? t.checkIn.pulseDateToday
                  : format(entryDate, 'PPP', { locale: getDateLocale(lang) })}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={entryDate}
                onSelect={(d) => {
                  if (d) {
                    setEntryDate(startOfDay(d));
                    setDateOpen(false);
                  }
                }}
                disabled={(d) => d > new Date()}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="flex justify-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 overflow-hidden">
        {moodIcons.map((Icon, i) => {
          const opacityLevels = ['opacity-30', 'opacity-50', 'opacity-70', 'opacity-85', 'opacity-100'];
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => handleMoodTap(i)}
                disabled={saving}
                aria-label={moodLabels[i]}
                className={`flex items-center justify-center w-11 sm:w-12 md:w-14 h-11 sm:h-12 md:h-14 rounded-2xl border transition-all hover:scale-105 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  saved ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'
                } border-border bg-card/60 backdrop-blur`}
              >
                <span className={`text-primary ${opacityLevels[i]}`} aria-hidden="true">
                  <Icon className="w-6 h-6" />
                </span>
              </button>
              <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">{moodLabels[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickPulse;
