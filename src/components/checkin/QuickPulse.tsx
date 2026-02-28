import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const moodIcons = [
  // Struggling: a single drop (tear)
  <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 2c0 0-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" /><path d="M10 15.5a2 2 0 0 0 4 0" /></svg>,
  // Uneasy: a wave / ripple
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6"><path d="M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></svg>,
  // Okay: a horizontal line (balance)
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6"><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>,
  // Good: a rising curve
  <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M4 18c2-3 5-8 8-8s6 3 8 1" /><path d="M18 7v4h4" /></svg>,
  // Strong: a mountain peak
  <svg key="4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 4l7 16H5L12 4z" /><path d="M9 14l3-4 3 4" /></svg>,
];

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
        {moodIcons.map((icon, i) => {
          const opacityLevels = ['opacity-30', 'opacity-50', 'opacity-70', 'opacity-85', 'opacity-100'];
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => handleMoodTap(i)}
                disabled={saving}
                className={`flex items-center justify-center w-14 h-14 rounded-2xl border transition-all hover:scale-105 hover:shadow-md ${
                  saved ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'
                } border-border bg-card/60 backdrop-blur`}
              >
                <span className={`text-primary ${opacityLevels[i]}`}>{icon}</span>
              </button>
              <span className="text-[10px] font-medium text-muted-foreground">{moodLabels[i]}</span>
            </div>
          );
        })}
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
