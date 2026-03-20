import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { FEye, FHeart, FUser, FUsers, FSparkles } from '@/components/icons/FreudIcons';
import { useStance } from '@/hooks/useStance';
import { useLanguage } from '@/hooks/useLanguage';
import SubjectSelector from '@/components/observations/SubjectSelector';

const RoleIndicator = () => {
  const { t } = useLanguage();
  const { subjectType, selectedSubjectName, setSubjectType, setSelectedSubjectId, setSelectedSubjectName, resetToSelf } = useStance();
  const [showPicker, setShowPicker] = useState(false);

  const isObserver = subjectType === 'relative';

  return (
    <>
      <div className="fixed bottom-5 left-5 z-40">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="focus:outline-none"
        >
          <Badge
            variant="outline"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest backdrop-blur rounded-full cursor-pointer transition-colors ${
              isObserver
                ? 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                : 'bg-card/80 border-border text-muted-foreground'
            }`}
          >
            {isObserver ? <FUsers className="h-3 w-3" /> : <FUser className="h-3 w-3" />}
            {isObserver
              ? (selectedSubjectName ?? t.subjects.otherLabel)
              : t.subjects.selfLabel}
            {isObserver && <FSparkles className="h-2.5 w-2.5 text-amber-500" />}
          </Badge>
        </button>
      </div>

      {showPicker && (
        <div className="fixed bottom-14 left-5 z-50 w-80 bg-card border border-border rounded-2xl shadow-xl p-4 animate-fade-in">
          <SubjectSelector
            subjectType={subjectType}
            onSubjectTypeChange={(type) => {
              setSubjectType(type);
              if (type === 'self') resetToSelf();
              setShowPicker(false);
            }}
            selectedSubjectId={null}
            onSubjectIdChange={(id) => {
              setSelectedSubjectId(id);
              setShowPicker(false);
            }}
            onSubjectNameChange={(name) => setSelectedSubjectName(name)}
          />
        </div>
      )}
    </>
  );
};

export default RoleIndicator;
