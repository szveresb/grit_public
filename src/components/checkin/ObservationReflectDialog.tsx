import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/db-error';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { FEye, FSave } from '@/components/icons/FreudIcons';

interface ObsRow {
  id: string;
  concept_id: string;
  intensity: number;
  logged_at: string;
  user_narrative: string | null;
  context_modifier: string | null;
  frequency: string | null;
}

interface ConceptRow {
  id: string;
  name_hu: string;
  name_en: string;
  category_id: string;
}

interface CategoryRow {
  id: string;
  name_hu: string;
  name_en: string;
}

interface Props {
  observationId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const ObservationReflectDialog = ({ observationId, onClose, onSaved }: Props) => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [obs, setObs] = useState<ObsRow | null>(null);
  const [concept, setConcept] = useState<ConceptRow | null>(null);
  const [category, setCategory] = useState<CategoryRow | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!observationId || !user) { setObs(null); return; }
    setLoading(true);

    supabase
      .from('observation_logs')
      .select('*')
      .eq('id', observationId)
      .eq('user_id', user.id)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { console.error(error); onClose(); return; }
        const obsData = data as ObsRow;
        setObs(obsData);
        setComment('');

        // Fetch concept + category
        const { data: conceptData } = await supabase
          .from('observation_concepts')
          .select('id, name_hu, name_en, category_id')
          .eq('id', obsData.concept_id)
          .single();

        if (conceptData) {
          const c = conceptData as ConceptRow;
          setConcept(c);
          const { data: catData } = await supabase
            .from('observation_categories')
            .select('id, name_hu, name_en')
            .eq('id', c.category_id)
            .single();
          if (catData) setCategory(catData as CategoryRow);
        }

        setLoading(false);
      });
  }, [observationId, user]);

  const handleSave = async () => {
    if (!obs || !comment.trim()) return;
    setSaving(true);
    const existing = obs.user_narrative ? obs.user_narrative + '\n\n---\n\n' : '';
    const newNarrative = existing + `**${format(new Date(), 'yyyy-MM-dd')}** — ${comment.trim()}`;

    const { error } = await supabase
      .from('observation_logs')
      .update({ user_narrative: newNarrative })
      .eq('id', obs.id);

    if (error) { toast.error(friendlyDbError(error)); setSaving(false); return; }
    toast.success(t.checkIn.commentSaved);
    setSaving(false);
    onSaved?.();
    onClose();
  };

  if (!observationId) return null;

  const conceptName = concept ? (lang === 'en' ? concept.name_en : concept.name_hu) : '';
  const categoryName = category ? (lang === 'en' ? category.name_en : category.name_hu) : '';

  return (
    <Dialog open={!!observationId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FEye className="h-4 w-4 text-primary" />
            {t.checkIn.reflectDialogTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{t.loading}</div>
        ) : obs && (
          <div className="space-y-4">
            {/* Read-only observation detail */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{conceptName || t.observations.tabObservations}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(obs.logged_at), 'MMM d, yyyy', { locale: getDateLocale(lang) })}
                </span>
              </div>
              {categoryName && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{t.observations.chooseDomain}:</span> {categoryName}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{t.observations.intensity}:</span> {obs.intensity}/5
              </p>
              {obs.frequency && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{t.observations.frequency}:</span> {obs.frequency}
                </p>
              )}
              {obs.context_modifier && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{t.observations.context}:</span> {obs.context_modifier}
                </p>
              )}
            </div>

            {/* Existing narrative */}
            {obs.user_narrative && (
              <div className="bg-primary/5 rounded-2xl p-3 space-y-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  {t.journal.cardSavedReflection}
                </span>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{obs.user_narrative}</p>
              </div>
            )}

            {/* Comment input */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground italic">{t.checkIn.reflectDialogHint}</p>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={t.checkIn.reflectPlaceholder}
                className="rounded-2xl min-h-[100px] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} className="rounded-2xl">{t.cancel}</Button>
              <Button onClick={handleSave} disabled={saving || !comment.trim()} className="rounded-2xl gap-1.5">
                <FSave className="h-3.5 w-3.5" />
                {saving ? t.saving : t.checkIn.addComment}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ObservationReflectDialog;
