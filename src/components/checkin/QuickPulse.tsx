import React, { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isToday, parseISO, startOfDay } from 'date-fns';
import { friendlyDbError } from '@/lib/db-error';
import {
  FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong,
  FCalendar, FChevronDown, FCheck,
} from '@/components/icons/FreudIcons';
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
  entryDate?: Date;
  onEntryDateChange?: (date: Date) => void;
}

const QuickPulse = ({
  onPulseSaved,
  onMoodSelected,
  compact = false,
  subjectId = null,
  entryDate: controlledDate,
  onEntryDateChange,
}: QuickPulseProps) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { activeSubject, subjectType, selectedSubjectId } = useStance();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [internalDate, setInternalDate] = useState<Date>(() => startOfDay(new Date()));
  const entryDate = controlledDate ?? internalDate;
  const setEntryDate = (d: Date) => {
    const normalized = startOfDay(d);
    if (onEntryDateChange) onEntryDateChange(normalized);
    else setInternalDate(normalized);
  };
  const [dateOpen, setDateOpen] = useState(false);
  const dateLabelId = useId();
  const [managedTitle, setManagedTitle] = useState<string | null>(null);
  const [managedLabels, setManagedLabels] = useState<string[] | null>(null);
  const [existingPulse, setExistingPulse] = useState<{ id: string; level: number; label: string; created_at: string } | null>(null);
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

  // Load any existing pulse for the chosen date + subject so the user can edit/remove it.
  useEffect(() => {
    if (!user) {
      setExistingPulse(null);
      return;
    }
    let cancelled = false;
    const dateStr = format(entryDate, 'yyyy-MM-dd');
    let query = (supabase.from as any)('mood_pulses')
      .select('id, level, label, created_at')
      .eq('user_id', user.id)
      .eq('entry_date', dateStr)
      .eq('subject_type', effectiveSubjectType);
    if (effectiveSubjectType === 'relative' && effectiveSubjectId) {
      query = query.eq('subject_id', effectiveSubjectId);
    } else {
      query = query.is('subject_id', null);
    }
    query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: { id: string; level: number; label: string; created_at: string } | null }) => {
        if (cancelled) return;
        setExistingPulse(data ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, entryDate, effectiveSubjectType, effectiveSubjectId, saved]);

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

    const isUpdate = !!existingPulse;
    let resultId: string | undefined;
    let error: unknown = null;

    if (isUpdate && existingPulse) {
      const { data, error: updErr } = await (supabase.from as any)('mood_pulses')
        .update({ level, label })
        .eq('id', existingPulse.id)
        .select('id')
        .single();
      error = updErr;
      resultId = (data as { id?: string } | null)?.id;
    } else {
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
      const { data, error: insErr } = await (supabase.from as any)('mood_pulses')
        .insert(insertPayload)
        .select('id')
        .single();
      error = insErr;
      resultId = (data as { id?: string } | null)?.id;
    }

    if (error) {
      toast.error(friendlyDbError(error));
    } else {
      if (resultId) setExistingPulse({ id: resultId, level, label, created_at: new Date().toISOString() });
      toast.success(isUpdate ? t.checkIn.pulseUpdated : t.checkIn.pulseSaved, {
        duration: 5000,
        action: !isUpdate && resultId
          ? {
              label: t.checkIn.pulseUndo,
              onClick: async () => {
                const { error: delErr } = await (supabase.from as any)('mood_pulses')
                  .delete()
                  .eq('id', resultId);
                if (delErr) {
                  toast.error(friendlyDbError(delErr));
                } else {
                  toast.success(t.checkIn.pulseUndone);
                  setSaved(false);
                  setExistingPulse(null);
                  onPulseSaved?.();
                }
              },
            }
          : undefined,
      });
      setSaved(true);
      onPulseSaved?.();
      if (onMoodSelected) {
        onMoodSelected({ impact_level: level, emotional_state: label });
      }
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!user || saving || !existingPulse) return;
    setSaving(true);
    const { error } = await (supabase.from as any)('mood_pulses')
      .delete()
      .eq('id', existingPulse.id);
    if (error) {
      toast.error(friendlyDbError(error));
    } else {
      toast.success(t.checkIn.pulseRemoved);
      setExistingPulse(null);
      onPulseSaved?.();
    }
    setSaving(false);
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {user && (
          <div className="flex items-center justify-center gap-2">
            <span id={dateLabelId} className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t.checkIn.pulseDateLabel}
            </span>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-labelledby={dateLabelId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card/60 text-xs font-medium text-foreground hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                      setEntryDate(d);
                      setDateOpen(false);
                    }
                  }}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="flex justify-center gap-1.5 sm:gap-2 overflow-hidden">
          {moodIcons.map((Icon, i) => {
            const opacityLevels = ['opacity-30', 'opacity-50', 'opacity-70', 'opacity-85', 'opacity-100'];
            const isSelected = existingPulse?.level === i + 1;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => handleMoodTap(i)}
                  disabled={saving}
                  aria-label={moodLabels[i]}
                  aria-pressed={isSelected}
                  className={`flex items-center justify-center w-11 h-11 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${
                    saved ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'
                  } ${isSelected ? 'border-primary ring-2 ring-primary/40 bg-primary/5' : 'border-border bg-card/60'} backdrop-blur`}
                >
                  <span className={`text-primary ${opacityLevels[i]}`} aria-hidden="true">
                    <Icon className="w-6 h-6" />
                  </span>
                </button>
                <span className="text-[9px] font-medium text-muted-foreground">{moodLabels[i]}</span>
              </div>
            );
          })}
        </div>

        {existingPulse && user && (
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <span>{t.checkIn.pulseExistingHint}</span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="underline underline-offset-2 hover:text-foreground transition-colors disabled:opacity-50"
            >
              {t.checkIn.pulseRemove}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
      {/* Left zone: Date selection */}
      <div className="lg:col-span-3 lg:border-r lg:border-border/50 lg:pr-6 flex flex-col justify-center items-center lg:items-start gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t.checkIn.pulseDateLabel}
        </span>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-border bg-card/40 text-xs font-semibold text-foreground hover:border-primary/50 transition-colors focus-visible:outline-none"
            >
              <FCalendar className="w-4 h-4 text-primary" />
              <div className="text-left leading-tight">
                <p className="font-bold text-foreground capitalize text-[11px] sm:text-xs">
                  {isToday(entryDate)
                    ? t.checkIn.pulseDateToday
                    : format(entryDate, 'EEEE', { locale: getDateLocale(lang) })}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {format(entryDate, 'yyyy. MMMM d.', { locale: getDateLocale(lang) })}
                </p>
              </div>
              <FChevronDown className="w-3 h-3 text-muted-foreground/60 ml-1" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={entryDate}
              onSelect={(d) => {
                if (d) {
                  setEntryDate(d);
                  setDateOpen(false);
                }
              }}
              disabled={(d) => d > new Date()}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Middle zone: Mood check-in buttons */}
      <div className="lg:col-span-6 flex flex-col items-center justify-center gap-3">
        <h3 className="text-xs font-bold text-foreground tracking-wide">
          {pulseTitle}
        </h3>
        <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 overflow-hidden w-full">
          {moodIcons.map((Icon, i) => {
            const opacityLevels = ['opacity-30', 'opacity-50', 'opacity-70', 'opacity-85', 'opacity-100'];
            const isSelected = existingPulse?.level === i + 1;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1 max-w-[64px]">
                <button
                  type="button"
                  onClick={() => handleMoodTap(i)}
                  disabled={saving}
                  aria-label={moodLabels[i]}
                  aria-pressed={isSelected}
                  className={`flex items-center justify-center w-11 sm:w-12 h-11 sm:h-12 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${
                    saved ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'
                  } ${isSelected ? 'border-primary ring-2 ring-primary/40 bg-primary/5' : 'border-border bg-card/60'} backdrop-blur`}
                >
                  <span className={`text-primary ${opacityLevels[i]}`} aria-hidden="true">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </span>
                </button>
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{moodLabels[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right zone: Status summary / modify */}
      <div className="lg:col-span-3 lg:border-l lg:border-border/50 lg:pl-6 flex flex-col justify-center items-center text-center gap-2 h-full py-2">
        {existingPulse ? (
          <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center gap-1 w-full max-w-[200px]">
            <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase tracking-wider">
              <FCheck className="w-3.5 h-3.5" />
              <span>Mentve</span>
            </div>
            <p className="text-xs font-semibold text-foreground leading-tight">
              {lang === 'hu' ? `Ma ${existingPulse.label.toLowerCase()} vagy.` : `You are ${existingPulse.label.toLowerCase()} today.`}
            </p>
            {existingPulse.created_at && (
              <p className="text-[10px] text-muted-foreground">
                {format(parseISO(existingPulse.created_at), 'HH:mm')} - Napolózva
              </p>
            )}
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="text-[10px] underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors mt-1 font-medium"
            >
              {t.checkIn.pulseRemove}
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 flex flex-col items-center justify-center gap-1 w-full max-w-[200px] min-h-[96px]">
            <p className="text-xs text-muted-foreground font-medium">
              {lang === 'hu' ? 'Nincs még mai bejegyzésed.' : 'No entry logged for today.'}
            </p>
            <p className="text-[9px] text-muted-foreground/80 leading-normal">
              {lang === 'hu' ? 'Válassz ki egy hangulatot a naplózáshoz.' : 'Choose a mood icon to log.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickPulse;
