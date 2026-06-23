import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FClose } from '@/components/icons/FreudIcons';
import {
  getScoreInterpretation,
  type QuestionnaireInterpretationTarget,
  type ScoreRange,
} from '@/lib/score-interpretation';

interface QuestionScore {
  questionText: string;
  answer: string;
  score: number;
}

interface ScoreResultsProps {
  totalScore: number;
  maxPossibleScore: number;
  questionScores: QuestionScore[];
  scoreRanges: ScoreRange[];
  questionnaireInterpretationTarget?: QuestionnaireInterpretationTarget | null;
  onClose: () => void;
}

const ScoreResults = ({
  totalScore,
  maxPossibleScore,
  questionScores,
  scoreRanges,
  questionnaireInterpretationTarget,
  onClose,
}: ScoreResultsProps) => {
  const { t } = useLanguage();

  const profile = getScoreInterpretation(questionnaireInterpretationTarget);
  const effectiveRanges = scoreRanges.length > 0 ? scoreRanges : profile?.scoreRanges ?? [];
  const matchedRange = effectiveRanges.find((r) => totalScore >= r.min && totalScore <= r.max);
  const pct = maxPossibleScore > 0 ? Math.round(Math.max(0, (totalScore / maxPossibleScore) * 100)) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t.questionnaires_manage.yourScore}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <FClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Total score */}
      <div className="bg-accent/30 rounded-2xl p-5 text-center space-y-3">
        <div className="text-3xl font-bold text-foreground">{totalScore}</div>
        <Progress value={pct} className="h-2 rounded-full" />
        <p className="text-xs text-muted-foreground">
          {t.questionnaires_manage.totalScore}: {totalScore} / {maxPossibleScore}
        </p>
        {profile && (
          <div className="rounded-2xl border border-border/60 bg-background px-3 py-2 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t.questionnaires_manage.interpretation}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {profile.noteKey === 'pvs'
                ? t.questionnaires_manage.interpretationNotePvs
                : t.questionnaires_manage.interpretationNoteBrcs}
            </p>
            {effectiveRanges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {effectiveRanges.map((range) => (
                  <span
                    key={`${range.min}-${range.max}`}
                    className="rounded-full bg-accent/30 px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {range.label
                      ? range.label
                      : range.labelKey === 'low'
                      ? t.questionnaires_manage.interpretationRangeLow
                      : range.labelKey === 'medium'
                        ? t.questionnaires_manage.interpretationRangeMedium
                        : t.questionnaires_manage.interpretationRangeHigh}
                    {' '}
                    {range.min}-{range.max}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {matchedRange && (
          <div className="mt-2 space-y-1">
            <span className="inline-block text-sm font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
              {matchedRange.label
                ? matchedRange.label
                : matchedRange.labelKey === 'low'
                ? t.questionnaires_manage.interpretationRangeLow
                : matchedRange.labelKey === 'medium'
                  ? t.questionnaires_manage.interpretationRangeMedium
                  : t.questionnaires_manage.interpretationRangeHigh}
            </span>
            {matchedRange.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{matchedRange.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t.questionnaires_manage.scoreBreakdown}
        </h4>
        {questionScores.map((qs, i) => (
          <div key={i} className="flex items-center justify-between border border-border rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-xs font-medium text-foreground truncate">{i + 1}. {qs.questionText}</p>
              {qs.answer === '__SKIPPED__' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                  {t.questionnaires_manage.skipped}
                </span>
              ) : (
                <p className="text-[11px] text-muted-foreground">{qs.answer}</p>
              )}
            </div>
            {qs.answer !== '__SKIPPED__' && (
              <span className="text-sm font-semibold text-foreground shrink-0">{qs.score >= 0 ? '+' : ''}{qs.score}</span>
            )}
          </div>
        ))}
      </div>

      <Button size="sm" variant="outline" className="rounded-2xl w-full" onClick={onClose}>
        {t.questionnaires_manage.closeResults}
      </Button>
    </div>
  );
};

export default ScoreResults;
