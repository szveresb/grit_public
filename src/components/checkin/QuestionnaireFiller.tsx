import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { FClipboardCheck, FArrowRight, FClock } from '@/components/icons/FreudIcons';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import ScoreResults from './ScoreResults';

interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
  repeat_interval: string | null;
  scoring_enabled: boolean;
  scoring_mode: string;
  score_ranges: ScoreRange[] | null;
}

interface ScoreRange {
  min: number;
  max: number;
  label: string;
  description?: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  sort_order: number;
  answer_scores: Record<string, number> | null;
}

interface LastResponse {
  questionnaire_id: string;
  completed_at: string;
}

const INTERVAL_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

const QuestionnaireFiller = ({ onCompleted }: { onCompleted?: () => void }) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [lastResponses, setLastResponses] = useState<LastResponse[]>([]);
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scoreResult, setScoreResult] = useState<{
    totalScore: number;
    maxPossibleScore: number;
    questionScores: { questionText: string; answer: string; score: number }[];
    scoreRanges: ScoreRange[];
  } | null>(null);

  const dateLocale = getDateLocale(lang);

  useEffect(() => {
    const load = async () => {
      const [qRes, rRes] = await Promise.all([
        supabase
          .from('questionnaires')
          .select('id, title, description, repeat_interval, scoring_enabled, scoring_mode, score_ranges')
          .eq('is_published', true)
          .order('created_at', { ascending: false }),
        user
          ? supabase
              .from('questionnaire_responses')
              .select('questionnaire_id, completed_at')
              .eq('user_id', user.id)
              .order('completed_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      setQuestionnaires((qRes.data ?? []) as unknown as Questionnaire[]);
      // Keep only the latest response per questionnaire
      const seen = new Set<string>();
      const latest: LastResponse[] = [];
      for (const r of (rRes.data ?? []) as LastResponse[]) {
        if (!seen.has(r.questionnaire_id)) {
          seen.add(r.questionnaire_id);
          latest.push(r);
        }
      }
      setLastResponses(latest);
      setLoading(false);
    };
    load();
  }, [user]);

  const getLastCompletion = (qId: string) =>
    lastResponses.find((r) => r.questionnaire_id === qId);

  const isAvailable = (q: Questionnaire): boolean => {
    const last = getLastCompletion(q.id);
    if (!last) return true; // never filled
    if (!q.repeat_interval) return false; // one-time, already done
    if (q.repeat_interval === 'anytime') return true;
    const intervalDays = INTERVAL_DAYS[q.repeat_interval];
    if (!intervalDays) return true;
    const daysSince = differenceInHours(new Date(), new Date(last.completed_at)) / 24;
    return daysSince >= intervalDays;
  };

  const getRepeatLabel = (interval: string | null): string => {
    if (!interval) return t.questionnaires_manage.repeatOnce;
    const map: Record<string, string> = {
      daily: t.questionnaires_manage.repeatDaily,
      weekly: t.questionnaires_manage.repeatWeekly,
      biweekly: t.questionnaires_manage.repeatBiweekly,
      monthly: t.questionnaires_manage.repeatMonthly,
      anytime: t.questionnaires_manage.repeatAnytime,
    };
    return map[interval] ?? interval;
  };

  const loadQuestions = async (qId: string) => {
    setSelectedQ(qId);
    setAnswers({});
    setScoreResult(null);
    const { data } = await supabase
      .from('questionnaire_questions')
      .select('id, question_text, question_type, options, sort_order, answer_scores')
      .eq('questionnaire_id', qId)
      .order('sort_order');
    setQuestions(
      (data ?? []).map((q) => ({ ...q, options: q.options as string[] | null, answer_scores: q.answer_scores as Record<string, number> | null }))
    );
  };

  const calculateScore = (questionnaire: Questionnaire): { totalScore: number; maxPossibleScore: number; questionScores: { questionText: string; answer: string; score: number }[] } => {
    const qScores: { questionText: string; answer: string; score: number }[] = [];
    let total = 0;
    let maxTotal = 0;

    for (const q of questions) {
      const answer = answers[q.id];
      if (!answer || q.question_type === 'text') continue;

      let score = 0;
      let maxScore = 0;

      if (questionnaire.scoring_mode === 'weighted' && q.answer_scores) {
        score = q.answer_scores[answer] ?? 0;
        maxScore = Math.max(...Object.values(q.answer_scores), 0);
      } else {
        // Sum mode: scale value directly, yes=1/no=0
        if (q.question_type === 'scale') {
          score = Number(answer) || 0;
          maxScore = 5;
        } else if (q.question_type === 'yes_no') {
          score = answer === 'yes' ? 1 : 0;
          maxScore = 1;
        } else if (q.question_type === 'multiple_choice') {
          // In sum mode, multiple choice gets index+1
          const idx = (q.options ?? []).indexOf(answer);
          score = idx + 1;
          maxScore = (q.options ?? []).length;
        }
      }

      total += score;
      maxTotal += maxScore;
      qScores.push({ questionText: q.question_text, answer, score });
    }

    return { totalScore: total, maxPossibleScore: maxTotal, questionScores: qScores };
  };

  const handleSubmit = async () => {
    if (!user || !selectedQ) return;
    setSubmitting(true);

    const questionnaire = questionnaires.find(q => q.id === selectedQ);

    // Calculate score if scoring is enabled
    let totalScore: number | null = null;
    if (questionnaire?.scoring_enabled) {
      const result = calculateScore(questionnaire);
      totalScore = result.totalScore;
      setScoreResult({
        ...result,
        scoreRanges: (questionnaire.score_ranges as ScoreRange[]) ?? [],
      });
    }

    const { data: resp, error } = await supabase
      .from('questionnaire_responses')
      .insert({ user_id: user.id, questionnaire_id: selectedQ, total_score: totalScore } as any)
      .select('id')
      .single();
    if (error || !resp) {
      toast.error('Failed to submit');
      setSubmitting(false);
      return;
    }
    const answerRows = Object.entries(answers).map(([question_id, answer]) => ({
      response_id: resp.id,
      question_id,
      answer: JSON.stringify(answer),
    }));
    if (answerRows.length) await supabase.from('questionnaire_answers').insert(answerRows);

    // Auto-create journal entry from self-check
    const qTitle = questionnaire?.title ?? '';
    const summaryLines = questions
      .map((q, i) => `${i + 1}. ${q.question_text}: ${answers[q.id] ?? '-'}`)
      .join('\n');
    const scaleAnswers = questions
      .filter((q) => q.question_type === 'scale' && answers[q.id])
      .map((q) => Number(answers[q.id]));
    const avgImpact = scaleAnswers.length
      ? Math.round(scaleAnswers.reduce((a, b) => a + b, 0) / scaleAnswers.length)
      : null;

    const journalDesc = totalScore != null
      ? `${summaryLines}\n\n${t.questionnaires_manage.totalScore}: ${totalScore}`
      : summaryLines;

    await supabase.from('journal_entries').insert({
      user_id: user.id,
      title: `${t.questionnaires_manage.questionnaireJournalTitle}: ${qTitle}`,
      entry_date: new Date().toISOString().split('T')[0],
      event_description: journalDesc,
      impact_level: avgImpact,
    });

    toast.success(t.questionnaires_manage.completed);
    setLastResponses((prev) => [
      { questionnaire_id: selectedQ, completed_at: new Date().toISOString() },
      ...prev.filter((r) => r.questionnaire_id !== selectedQ),
    ]);

    // If scoring enabled, keep showing results; otherwise reset
    if (!questionnaire?.scoring_enabled) {
      setSelectedQ(null);
      setAnswers({});
    }
    setSubmitting(false);
    onCompleted?.();
  };

  const renderInput = (q: Question) => {
    const val = answers[q.id] ?? '';
    switch (q.question_type) {
      case 'scale':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(n) }))}
                className={`h-10 w-10 rounded-full border text-sm font-semibold transition-all ${
                  val === String(n)
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        );
      case 'yes_no':
        return (
          <RadioGroup value={val} onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id={`${q.id}-yes`} />
                <Label htmlFor={`${q.id}-yes`}>{t.yes}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id={`${q.id}-no`} />
                <Label htmlFor={`${q.id}-no`}>{t.no}</Label>
              </div>
            </div>
          </RadioGroup>
        );
      case 'multiple_choice':
        return (
          <RadioGroup value={val} onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}>
            <div className="space-y-2">
              {(q.options ?? []).map((opt) => (
                <div
                  key={opt}
                  className="flex items-center gap-2 border border-border rounded-2xl p-3 hover:bg-accent/30 transition-colors"
                >
                  <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                  <Label htmlFor={`${q.id}-${opt}`} className="text-sm cursor-pointer">
                    {opt}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );
      default:
        return (
          <Textarea
            value={val}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            rows={2}
            className="rounded-2xl"
          />
        );
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">{t.loading}</p>;
  if (questionnaires.length === 0) return <p className="text-sm text-muted-foreground">{t.questionnaires_manage.noAvailable}</p>;

  // Show score results after submission
  if (selectedQ && scoreResult) {
    return (
      <ScoreResults
        totalScore={scoreResult.totalScore}
        maxPossibleScore={scoreResult.maxPossibleScore}
        questionScores={scoreResult.questionScores}
        scoreRanges={scoreResult.scoreRanges}
        onClose={() => {
          setSelectedQ(null);
          setAnswers({});
          setScoreResult(null);
        }}
      />
    );
  }

  // Filling a specific questionnaire
  if (selectedQ) {
    const qTitle = questionnaires.find((q) => q.id === selectedQ)?.title;
    return (
      <div className="space-y-5 animate-fade-in">
        <h3 className="text-sm font-semibold text-foreground">{qTitle}</h3>
        {questions.map((q, i) => (
          <div key={q.id} className="space-y-2">
            <Label className="text-sm font-medium">
              {i + 1}. {q.question_text}
            </Label>
            {renderInput(q)}
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" className="rounded-2xl" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t.selfChecks.submitting : t.submit}
          </Button>
          <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setSelectedQ(null)}>
            {t.cancel}
          </Button>
        </div>
      </div>
    );
  }

  // List available questionnaires
  return (
    <div className="space-y-3">
      {questionnaires.map((q) => {
        const last = getLastCompletion(q.id);
        const available = isAvailable(q);
        const repeatLabel = getRepeatLabel(q.repeat_interval);

        return (
          <button
            key={q.id}
            onClick={() => available && loadQuestions(q.id)}
            disabled={!available}
            className={`w-full text-left flex items-start gap-3 py-3 px-4 rounded-2xl transition-colors ${
              available
                ? 'hover:bg-accent/50 cursor-pointer'
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <FClipboardCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{q.title}</span>
                {q.repeat_interval && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                    {repeatLabel}
                  </span>
                )}
              </div>
              {q.description && (
                <p className="text-xs text-muted-foreground truncate">{q.description}</p>
              )}
              {last && (
                <div className="flex items-center gap-1.5 mt-1">
                  <FClock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    {t.selfChecks.lastCompleted}: {formatDistanceToNow(new Date(last.completed_at), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>
              )}
              {!available && (
                <span className="text-[11px] text-muted-foreground/70">
                  {t.selfChecks.alreadyCompleted}
                </span>
              )}
            </div>
            {available && <FArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />}
          </button>
        );
      })}
    </div>
  );
};

export default QuestionnaireFiller;
