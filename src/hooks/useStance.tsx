import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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

export interface SupportedSubject {
  id: string;
  name: string;
  relationshipType: string;
}

export interface ActiveSubjectContext {
  key: string;
  type: 'self' | 'relative';
  id: string | null;
  name: string;
  relationshipType?: string;
  color: SubjectColor | null;
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
  subjects: SupportedSubject[];
  subjectsLoading: boolean;
  activeSubject: ActiveSubjectContext;
  setSubjectType: (type: 'self' | 'relative') => void;
  setSelectedSubjectId: (id: string | null) => void;
  setSelectedSubjectName: (name: string | undefined) => void;
  setActiveSubjectContext: (subject: { type: 'self' } | { type: 'relative'; id: string; name: string }) => void;
  refetchSubjects: () => Promise<void>;
  resetToSelf: () => void;
}

const StanceContext = createContext<StanceContextValue | undefined>(undefined);

export const StanceProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [subjectType, setSubjectType] = useState<'self' | 'relative'>('self');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string | undefined>();
  const [subjects, setSubjects] = useState<SupportedSubject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const subjectColor = useMemo(() => {
    if (subjectType !== 'relative' || !selectedSubjectId) return null;
    const hue = SUBJECT_HUES[hueFromId(selectedSubjectId) % SUBJECT_HUES.length];
    return colorFromHue(hue);
  }, [subjectType, selectedSubjectId]);

  const refetchSubjects = useCallback(async () => {
    if (!user) {
      setSubjects([]);
      setSubjectsLoading(false);
      return;
    }

    setSubjectsLoading(true);
    const { data } = await supabase
      .from('subjects')
      .select('id, name, relationship_type')
      .eq('user_id', user.id)
      .order('created_at');

    setSubjects(((data ?? []) as Array<{ id: string; name: string; relationship_type: string }>).map((subject) => ({
      id: subject.id,
      name: subject.name,
      relationshipType: subject.relationship_type,
    })));
    setSubjectsLoading(false);
  }, [user]);

  useEffect(() => {
    refetchSubjects();
  }, [refetchSubjects]);

  useEffect(() => {
    if (subjectType !== 'relative' || !selectedSubjectId) return;

    const selectedStillExists = subjects.some((subject) => subject.id === selectedSubjectId);
    if (!selectedStillExists) {
      setSubjectType('self');
      setSelectedSubjectId(null);
      setSelectedSubjectName(undefined);
    }
  }, [subjectType, selectedSubjectId, subjects]);

  useEffect(() => {
    if (subjectType !== 'relative' || !selectedSubjectId) return;

    const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);
    if (selectedSubject && selectedSubject.name !== selectedSubjectName) {
      setSelectedSubjectName(selectedSubject.name);
    }
  }, [selectedSubjectId, selectedSubjectName, subjectType, subjects]);

  const setActiveSubjectContext = useCallback((subject: { type: 'self' } | { type: 'relative'; id: string; name: string }) => {
    if (subject.type === 'self') {
      setSubjectType('self');
      setSelectedSubjectId(null);
      setSelectedSubjectName(undefined);
      return;
    }

    setSubjectType('relative');
    setSelectedSubjectId(subject.id);
    setSelectedSubjectName(subject.name);
  }, []);

  const resetToSelf = useCallback(() => {
    setSubjectType('self');
    setSelectedSubjectId(null);
    setSelectedSubjectName(undefined);
  }, []);

  const activeSubject = useMemo<ActiveSubjectContext>(() => {
    if (subjectType === 'relative' && selectedSubjectId) {
      const subject = subjects.find((item) => item.id === selectedSubjectId);
      const name = subject?.name ?? selectedSubjectName ?? 'Supported person';

      return {
        key: `relative:${selectedSubjectId}`,
        type: 'relative',
        id: selectedSubjectId,
        name,
        relationshipType: subject?.relationshipType,
        color: subjectColor,
      };
    }

    return {
      key: 'self',
      type: 'self',
      id: null,
      name: 'Self',
      color: null,
    };
  }, [selectedSubjectId, selectedSubjectName, subjectColor, subjectType, subjects]);

  return (
    <StanceContext.Provider value={{
      subjectType, selectedSubjectId, selectedSubjectName, subjectColor,
      subjects, subjectsLoading, activeSubject,
      setSubjectType, setSelectedSubjectId, setSelectedSubjectName,
      setActiveSubjectContext, refetchSubjects,
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
  subjects: [],
  subjectsLoading: false,
  activeSubject: {
    key: 'self',
    type: 'self',
    id: null,
    name: 'Self',
    color: null,
  },
  setSubjectType: () => {},
  setSelectedSubjectId: () => {},
  setSelectedSubjectName: () => {},
  setActiveSubjectContext: () => {},
  refetchSubjects: async () => {},
  resetToSelf: () => {},
};

export const useStance = () => {
  const ctx = useContext(StanceContext);
  return ctx ?? defaultStance;
};
