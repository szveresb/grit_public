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
import { FBookOpen, FSave } from '@/components/icons/FreudIcons';
import type { JournalEntry } from '@/types/journal';

interface Props {
  entryId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const EntryReflectDialog = ({ entryId, onClose, onSaved }: Props) => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entryId || !user) { setEntry(null); return; }
    setLoading(true);
    supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) { console.error(error); onClose(); return; }
        setEntry(data as JournalEntry);
        // Pre-fill with existing reflection if any
        setComment(data?.reflection ?? '');
        setLoading(false);
      });
  }, [entryId, user]);

  const handleSave = async () => {
    if (!entry || !comment.trim()) return;
    setSaving(true);
    const existing = entry.reflection ? entry.reflection + '\n\n---\n\n' : '';
    const newReflection = existing + `**${format(new Date(), 'yyyy-MM-dd')}** — ${comment.trim()}`;

    const { error } = await supabase
      .from('journal_entries')
      .update({ reflection: newReflection })
      .eq('id', entry.id);

    if (error) { toast.error(friendlyDbError(error)); setSaving(false); return; }
    toast.success(t.checkIn.commentSaved);
    setSaving(false);
    onSaved?.();
    onClose();
  };

  if (!entryId) return null;

  return (
    <Dialog open={!!entryId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FBookOpen className="h-4 w-4 text-primary" />
            {t.checkIn.reflectDialogTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{t.loading}</div>
        ) : entry && (
          <div className="space-y-4">
            {/* Read-only original entry */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{entry.title}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(entry.entry_date), 'MMM d, yyyy', { locale: getDateLocale(lang) })}
                </span>
              </div>
              {entry.event_description && (
                <p className="text-sm text-foreground/80 leading-relaxed">{entry.event_description}</p>
              )}
              {entry.emotional_state && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{t.journal.cardFeeling}:</span> {entry.emotional_state}
                </p>
              )}
              {entry.impact_level && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{t.journal.cardImpact}:</span> {entry.impact_level}/5
                </p>
              )}
              {entry.self_anchor && (
                <p className="text-sm italic text-foreground/70 leading-relaxed">{entry.self_anchor}</p>
              )}
              {entry.free_text && (
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{entry.free_text}</p>
              )}
            </div>

            {/* Existing reflections */}
            {entry.reflection && (
              <div className="bg-primary/5 rounded-2xl p-3 space-y-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  {t.journal.cardSavedReflection}
                </span>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{entry.reflection}</p>
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

export default EntryReflectDialog;
