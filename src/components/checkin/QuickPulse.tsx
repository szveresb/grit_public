import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const moodEmojis = ['😣', '😟', '😐', '🙂', '💪'];

interface QuickPulseProps {
  onPulseSaved?: () => void;
  onGoDeeper?: () => void;
  compact?: boolean;
}

const QuickPulse = ({ onPulseSaved, onGoDeeper, compact = false }: QuickPulseProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const moodLabels = [
    t.checkIn.moodStruggling,
    t.checkIn.moodUneasy,
    t.checkIn.moodOkay,
    t.checkIn.moodGood,
    t.checkIn.moodStrong,
  ];

  const handleMoodTap = async (index: number) => {
    if (!user || saving) return;
    setSaving(true);
    const impact = index + 1;
    const label = moodLabels[index];

    const { error } = await supabase.from('journal_entries').insert({
      user_id: user.id,
      title: label,
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      impact_level: impact,
      emotional_state: label,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.checkIn.pulseSaved);
      setSaved(true);
      onPulseSaved?.();
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {!compact && (
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t.checkIn.quickPulseTitle}
        </h2>
      )}
      <div className="flex justify-center gap-3">
        {moodEmojis.map((emoji, i) => (
          <button
            key={i}
            onClick={() => handleMoodTap(i)}
            disabled={saving}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all hover:scale-105 hover:shadow-md ${
              saved ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'
            } border-border bg-card/60 backdrop-blur`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className="text-[10px] font-medium text-muted-foreground">{moodLabels[i]}</span>
          </button>
        ))}
      </div>
      {onGoDeeper && (
        <button
          onClick={onGoDeeper}
          className="text-xs text-primary hover:text-primary/80 transition-colors mx-auto block"
        >
          {t.checkIn.goDeeper} →
        </button>
      )}
    </div>
  );
};

export default QuickPulse;
