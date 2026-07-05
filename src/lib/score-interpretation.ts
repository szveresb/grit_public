/**
 * Score range definition used by survey editors and result renderers.
 * Score ranges are survey-owned (stored in questionnaires.score_ranges).
 * Literature-backed ranges and interpretation notes will come from the
 * study corpus attached to each survey (Epic 2).
 */
export interface ScoreRange {
  min: number;
  max: number;
  label?: string;
  labelKey?: 'low' | 'medium' | 'high';
  description?: string | null;
}

/**
 * Returns true when the survey has interpretation explicitly enabled.
 * A non-null, non-empty interpretation_profile value is the signal.
 * The actual interpretation content (notes, citations) is sourced from
 * the survey's study corpus and will be wired in Epic 2.
 */
export const isInterpretationEnabled = (
  interpretationProfile: string | null | undefined
): boolean => {
  return !!interpretationProfile?.trim();
};
