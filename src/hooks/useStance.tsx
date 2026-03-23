import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/** Deterministic hue from a UUID string */
function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ((hash % 360) + 360) % 360;
}

/** Pre-defined palette of pleasant, distinguishable hues */
const SUBJECT_HUES = [32, 190, 280, 340, 160, 45, 210, 310]; // amber, teal, purple, rose, green, gold, blue, magenta

export interface SubjectColor {
  hue: number;
  bg: string;       // tailwind-compatible bg class value (hsl inline)
  border: string;
  text: string;
  dot: string;
}

function colorFromHue(hue: number): SubjectColor {
  return {
    hue,
    bg: `hsl(${hue} 60% 95%)`,
    border: `hsl(${hue} 50% 60%)`,
    text: `hsl(${hue} 55% 35%)`,
    dot: `hsl(${hue} 55% 50%)`,
  };
}

export interface StanceContextValue {
  subjectType: 'self' | 'relative';
  selectedSubjectId: string | null;
  selectedSubjectName: string | undefined;
  subjectColor: SubjectColor | null; // null when self
  setSubjectType: (type: 'self' | 'relative') => void;
  setSelectedSubjectId: (id: string | null) => void;
  setSelectedSubjectName: (name: string | undefined) => void;
  resetToSelf: () => void;
}

const StanceContext = createContext<StanceContextValue | undefined>(undefined);

export const StanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [subjectType, setSubjectType] = useState<'self' | 'relative'>('self');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string | undefined>();

  const subjectColor = useMemo(() => {
    if (subjectType !== 'relative' || !selectedSubjectId) return null;
    const hue = SUBJECT_HUES[hueFromId(selectedSubjectId) % SUBJECT_HUES.length];
    return colorFromHue(hue);
  }, [subjectType, selectedSubjectId]);

  const resetToSelf = useCallback(() => {
    setSubjectType('self');
    setSelectedSubjectId(null);
    setSelectedSubjectName(undefined);
  }, []);

  return (
    <StanceContext.Provider value={{
      subjectType, selectedSubjectId, selectedSubjectName, subjectColor,
      setSubjectType, setSelectedSubjectId, setSelectedSubjectName,
      resetToSelf,
    }}>
      {children}
    </StanceContext.Provider>
  );
};

const defaultStance: StanceContextValue = {
  subjectType: 'self',
  selectedSubjectId: null,
  selectedSubjectName: undefined,
  subjectColor: null,
  setSubjectType: () => {},
  setSelectedSubjectId: () => {},
  setSelectedSubjectName: () => {},
  resetToSelf: () => {},
};

export const useStance = () => {
  const ctx = useContext(StanceContext);
  return ctx ?? defaultStance;
};
