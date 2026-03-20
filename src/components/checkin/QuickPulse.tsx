import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { friendlyDbError } from '@/lib/db-error';
import {
  FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong,
} from '@/components/icons/FreudIcons';
import StanceBanner from '@/components/premium/StanceBanner';
import SubjectSelector from '@/components/observations/SubjectSelector';

const moodIcons = [
  <FMoodStruggling key="0" className="w-6 h-6" />,
  <FMoodUneasy key="1" className="w-6 h-6" />,
  <FMoodOkay key="2" className="w-6 h-6" />,
  <FMoodGood key="3" className="w-6 h-6" />,
  <FMoodStrong key="4" className="w-6 h-6" />,
];

export interface MoodSelection {
  impact_level: number;
  emotional_state: string;
}

interface QuickPulseProps {
  onPulseSaved?: () => void;
  onMoodSelected?: (mood: MoodSelection) => void;
  compact?: boolean;
}

const QuickPulse = ({ onPulseSaved, onMoodSelected, compact = false }: QuickPulseProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { subjectType, selectedSubjectId, selectedSubjectName, setSubjectType, setSelectedSubjectId, setSelectedSubjectName, resetToSelf } = useStance();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showStancePicker, setShowStancePicker] = useState(false);

  const moodLabels = [
    t.checkIn.moodStruggling,
    t.checkIn.moodUneasy,
    t.checkIn.moodOkay,
    t.checkIn.moodGood,
    t.checkIn.moodStrong,
  ];

  const handleMoodTap = async (index: number) => {
    if (!user || saving) return;
    const level = index + 1;
    const label = moodLabels[index];

    setSaving(true);
    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      level,
      label,
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      subject_type: subjectType,
    };
    if (subjectType === 'relative' && selectedSubjectId) {
      insertPayload.subject_id = selectedSubjectId;
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
          {t.checkIn.quickPulseTitle}
        </h2>
      )}

      <StanceBanner
        subjectType={subjectType}
        subjectName={selectedSubjectName}
        onSwitch={() => setShowStancePicker((v) => !v)}
        compact
      />

      {showStancePicker && (
        <div className="animate-fade-in">
          <SubjectSelector
            subjectType={subjectType}
            onSubjectTypeChange={(type) => {
              setSubjectType(type);
              if (type === 'self') resetToSelf();
              setShowStancePicker(false);
            }}
            selectedSubjectId={selectedSubjectId}
            onSubjectIdChange={(id) => {
              setSelectedSubjectId(id);
              setShowStancePicker(false);
            }}
            onSubjectNameChange={(name) => setSelectedSubjectName(name)}
          />
        </div>
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
    </div>
  );
};

export default QuickPulse;
