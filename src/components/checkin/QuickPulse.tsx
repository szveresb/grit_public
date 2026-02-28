import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const moodIcons = [
  // Struggling: wilting leaf
  <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 22V8" /><path d="M12 8c-3-4-8-3-8 1 0 3 4 5 8 3" /><path d="M12 12c2 3 3 6 2 8" /></svg>,
  // Uneasy: a gentle breeze / swaying reed
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 22c0 0-1-4 0-10s-2-8-2-8" /><path d="M12 12c3-2 6-1 7 1" /><path d="M12 16c-3-1-5 0-6 2" /></svg>,
  // Okay: still water / calm circle
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="w-6 h-6"><ellipse cx="12" cy="12" rx="9" ry="6" /><path d="M6 12c2 1.5 4 2 6 2s4-.5 6-2" /></svg>,
  // Good: unfurling leaf
  <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 22V10" /><path d="M12 10c4-6 9-4 9 0s-4 6-9 4" /><path d="M12 14c-3-1-5 0-6 2" /></svg>,
  // Strong: full bamboo stalk with leaves
  <svg key="4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 22V3" /><path d="M12 6h-1" /><path d="M12 12h-1" /><path d="M12 18h-1" /><path d="M12 5c3-2 6-1 7 1" /><path d="M12 9c-3-1-6 0-7 2" /><path d="M12 15c3-1 5 0 6 2" /></svg>,
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
