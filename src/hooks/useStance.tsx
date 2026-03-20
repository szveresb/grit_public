import React, { createContext, useContext, useState, useCallback } from 'react';

interface StanceContextValue {
  subjectType: 'self' | 'relative';
  selectedSubjectId: string | null;
  selectedSubjectName: string | undefined;
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

  const resetToSelf = useCallback(() => {
    setSubjectType('self');
    setSelectedSubjectId(null);
    setSelectedSubjectName(undefined);
  }, []);

  return (
    <StanceContext.Provider value={{
      subjectType, selectedSubjectId, selectedSubjectName,
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
  setSubjectType: () => {},
  setSelectedSubjectId: () => {},
  setSelectedSubjectName: () => {},
  resetToSelf: () => {},
};

export const useStance = () => {
  const ctx = useContext(StanceContext);
  return ctx ?? defaultStance;
};
