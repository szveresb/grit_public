import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { getDateLocale } from '@/lib/date-locale';
import type { Dictionary, Lang } from '@/i18n/types';
import { FUser, FUsers, FSparkles } from '@/components/icons/FreudIcons';

interface PulseRow {
  id: string;
  level: number;
  label: string;
  created_at: string | null;
}

interface ObsRow {
  id: string;
  intensity: number;
  user_narrative: string | null;
  context_modifier: string | null;
  frequency: string | null;
  created_at: string;
  concept_id: string;
  concept_name?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null | undefined;
  relativeId: string | null;
  relativeName: string;
  date: string | null;
  t: Dictionary;
  lang: Lang;
}

const DayDetailsSheet = ({
  open,
  onOpenChange,
  userId,
  relativeId,
  relativeName,
  date,
  t,
  lang,
}: Props) => {
  const locale = getDateLocale(lang);
  const [pulses, setPulses] = useState<PulseRow[]>([]);
  const [obs, setObs] = useState<ObsRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !date || !userId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const pulsePromise = supabase
        .from('mood_pulses')
        .select('id, level, label, created_at')
        .eq('user_id', userId)
        .eq('subject_type', 'self')
        .eq('entry_date', date)
        .order('created_at');

      const obsPromise = relativeId
        ? supabase
            .from('observation_logs')
            .select('id, intensity, user_narrative, context_modifier, frequency, created_at, concept_id')
            .eq('user_id', userId)
            .eq('subject_type', 'relative')
            .eq('subject_id', relativeId)
            .eq('logged_at', date)
            .order('created_at')
        : Promise.resolve({ data: [] as any[] });

      const [pulseRes, obsRes] = await Promise.all([pulsePromise, obsPromise]);
      if (cancelled) return;

      const obsRows = (obsRes.data ?? []) as ObsRow[];
      const conceptIds = Array.from(new Set(obsRows.map((r) => r.concept_id)));
      const conceptMap: Record<string, { name_hu: string; name_en: string }> = {};
      if (conceptIds.length > 0) {
        const { data: cRows } = await supabase
          .from('observation_concepts')
          .select('id, name_hu, name_en')
          .in('id', conceptIds);
        (cRows ?? []).forEach((c: any) => {
          conceptMap[c.id] = { name_hu: c.name_hu, name_en: c.name_en };
        });
      }
      if (cancelled) return;

      const enriched = obsRows.map((r) => ({
        ...r,
        concept_name:
          lang === 'hu'
            ? conceptMap[r.concept_id]?.name_hu ?? r.concept_id
            : conceptMap[r.concept_id]?.name_en ?? r.concept_id,
      }));

      setPulses((pulseRes.data ?? []) as PulseRow[]);
      setObs(enriched);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, date, userId, relativeId, lang]);

  const avgMood =
    pulses.length > 0 ? pulses.reduce((s, p) => s + p.level, 0) / pulses.length : null;
  const avgIntensity =
    obs.length > 0 ? obs.reduce((s, o) => s + o.intensity, 0) / obs.length : null;

  const dateLabel = date ? format(parseISO(date), 'PPP', { locale }) : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{dateLabel}</SheetTitle>
          <SheetDescription className="text-xs">
            {t.timeline.dual.scatterTitle}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="surface-card p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <FUser className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t.timeline.dual.scatterAxisSelf}
              </span>
            </div>
            <p className="text-xl font-semibold tabular-nums text-foreground">
              {avgMood == null ? '—' : `${avgMood.toFixed(1)}/5`}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {pulses.length}{' '}
              {pulses.length === 1
                ? t.timeline.observationCountSingle
                : t.timeline.observationCountPlural}
            </p>
          </div>
          <div className="surface-card p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <FUsers className="h-3.5 w-3.5 text-destructive" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                {relativeName}
              </span>
            </div>
            <p className="text-xl font-semibold tabular-nums text-foreground">
              {avgIntensity == null ? '—' : `${avgIntensity.toFixed(1)}/5`}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {obs.length}{' '}
              {obs.length === 1
                ? t.timeline.observationCountSingle
                : t.timeline.observationCountPlural}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FUser className="h-3.5 w-3.5" /> {t.timeline.dual.scatterAxisSelf}
              </h3>
              {pulses.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">—</p>
              ) : (
                <ul className="space-y-1.5">
                  {pulses.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-muted/20 border border-border/40"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{p.label}</p>
                        {p.created_at && (
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {format(parseISO(p.created_at), 'p', { locale })}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
                        {p.level}/5
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FUsers className="h-3.5 w-3.5" /> {relativeName}
              </h3>
              {obs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">—</p>
              ) : (
                <ul className="space-y-1.5">
                  {obs.map((o) => (
                    <li
                      key={o.id}
                      className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground truncate">
                          {o.concept_name}
                        </p>
                        <span className="text-sm font-semibold text-destructive tabular-nums shrink-0">
                          {o.intensity}/5
                        </span>
                      </div>
                      {o.user_narrative && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {o.user_narrative}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                        {o.context_modifier && (
                          <span className="px-2 py-0.5 rounded-full bg-background border border-border/50">
                            {o.context_modifier}
                          </span>
                        )}
                        {o.frequency && (
                          <span className="px-2 py-0.5 rounded-full bg-background border border-border/50">
                            {o.frequency}
                          </span>
                        )}
                        <span className="ml-auto tabular-nums">
                          {format(parseISO(o.created_at), 'p', { locale })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5 pt-2 border-t border-border/40">
              <FSparkles className="h-3 w-3" /> {t.timeline.dual.disclaimer}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DayDetailsSheet;