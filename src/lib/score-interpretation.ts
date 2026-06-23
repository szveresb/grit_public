export interface ScoreRange {
  min: number;
  max: number;
  label?: string;
  labelKey?: 'low' | 'medium' | 'high';
  description?: string | null;
}

export type InterpretationProfileKey = 'pvs' | 'brcs';

export interface InterpretationProfileDefinition {
  key: InterpretationProfileKey;
  scoreMin: number;
  scoreMax: number;
  scoreRanges: ScoreRange[];
  noteKey: InterpretationProfileKey;
  labelKey: 'interpretationProfilePvs' | 'interpretationProfileBrcs';
}

export interface ScoreInterpretation {
  scoreMin: number;
  scoreMax: number;
  scoreRanges: ScoreRange[];
  noteKey: InterpretationProfileKey;
}

export const INTERPRETATION_REGISTRY = [
  {
    key: 'pvs',
    scoreMin: 6,
    scoreMax: 30,
    scoreRanges: [],
    noteKey: 'pvs',
    labelKey: 'interpretationProfilePvs',
  },
  {
    key: 'brcs',
    scoreMin: 4,
    scoreMax: 20,
    scoreRanges: [
      { min: 4, max: 13, labelKey: 'low', description: null },
      { min: 14, max: 16, labelKey: 'medium', description: null },
      { min: 17, max: 20, labelKey: 'high', description: null },
    ],
    noteKey: 'brcs',
    labelKey: 'interpretationProfileBrcs',
  },
] as const satisfies readonly InterpretationProfileDefinition[];

export interface QuestionnaireInterpretationTarget {
  interpretationProfile?: string | null;
}

export const getScoreInterpretation = (
  target: QuestionnaireInterpretationTarget | null | undefined
): ScoreInterpretation | null => {
  if (!target) return null;

  const profileKey = target.interpretationProfile?.trim().toLowerCase();
  if (!profileKey) return null;

  const profile = INTERPRETATION_REGISTRY.find((candidate) => candidate.key === profileKey);
  if (!profile) return null;

  return {
    scoreMin: profile.scoreMin,
    scoreMax: profile.scoreMax,
    scoreRanges: profile.scoreRanges,
    noteKey: profile.noteKey,
  };
};
