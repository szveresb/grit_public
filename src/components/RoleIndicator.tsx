import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { FUser, FUsers, FSparkles } from '@/components/icons/FreudIcons';
import { useStance } from '@/hooks/useStance';
import { useLanguage } from '@/hooks/useLanguage';
import SubjectSelector from '@/components/observations/SubjectSelector';

const RoleIndicator = () => {
  const { t } = useLanguage();
  const { subjectType, selectedSubjectName, subjectColor, setSubjectType, setSelectedSubjectId, setSelectedSubjectName, resetToSelf } = useStance();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const isObserver = subjectType === 'relative';

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  return (
    <div ref={pickerRef} className="fixed bottom-5 left-5 z-40">
      <button
        onClick={() => setShowPicker((v) => !v)}
        className="focus:outline-none"
      >
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest backdrop-blur rounded-full cursor-pointer transition-colors"
          style={isObserver && subjectColor ? {
            backgroundColor: subjectColor.bg,
            borderColor: subjectColor.border,
            color: subjectColor.text,
          } : undefined}
        >
          {isObserver ? <FUsers className="h-3 w-3" /> : <FUser className="h-3 w-3" />}
          <span className="max-w-[120px] truncate">
            {isObserver
              ? (selectedSubjectName ?? t.subjects.otherLabel)
              : t.subjects.selfLabel}
          </span>
          {isObserver && <FSparkles className="h-2.5 w-2.5" />}
        </Badge>
      </button>

      {showPicker && (
        <div className="absolute bottom-full mb-2 left-0 w-[calc(100vw-2.5rem)] max-w-xs bg-card border border-border rounded-2xl shadow-xl p-4 animate-fade-in">
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
    </div>
  );
};

export default RoleIndicator;
