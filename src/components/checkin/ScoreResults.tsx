import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FClose } from '@/components/icons/FreudIcons';

interface ScoreRange {
  min: number;
  max: number;
  label: string;
  description?: string;
}

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
  onClose: () => void;
}

const ScoreResults = ({ totalScore, maxPossibleScore, questionScores, scoreRanges, onClose }: ScoreResultsProps) => {
  const { t } = useLanguage();

  const matchedRange = scoreRanges.find(r => totalScore >= r.min && totalScore <= r.max);
  const pct = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

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
        {matchedRange && (
          <div className="mt-2 space-y-1">
            <span className="inline-block text-sm font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
              {matchedRange.label}
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
          {t.selfChecks.scoreBreakdown}
        </h4>
        {questionScores.map((qs, i) => (
          <div key={i} className="flex items-center justify-between border border-border rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-xs font-medium text-foreground truncate">{i + 1}. {qs.questionText}</p>
              <p className="text-[11px] text-muted-foreground">{qs.answer}</p>
            </div>
            <span className="text-sm font-semibold text-foreground shrink-0">+{qs.score}</span>
          </div>
        ))}
      </div>

      <Button size="sm" variant="outline" className="rounded-2xl w-full" onClick={onClose}>
        {t.selfChecks.closeResults}
      </Button>
    </div>
  );
};

export default ScoreResults;
