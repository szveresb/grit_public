import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { FArrowLeft } from '@/components/icons/FreudIcons';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import ScoreResults from './ScoreResults';
import ScoreHistory from './ScoreHistory';
import QuestionnaireCard from './QuestionnaireCard';
import { evaluateLogicRules, computeVisiblePath, getSkippedQuestionIds, hasBranchingLogic } from '@/lib/logic-engine';
import type { QuestionWithLogic, LogicRule } from '@/lib/logic-engine';
import type { Database } from '@/integrations/supabase/types';

type Questionnaire = Database['public']['Tables']['questionnaires']['Row'] & {
  score_ranges: ScoreRange[] | null;
  title_localized: Record<string, string> | null;
  description_localized: Record<string, string> | null;
};

interface ScoreRange {
  min: number;
  max: number;
  label: string;
  description?: string;
}

type Question = Omit<
  Database['public']['Tables']['questionnaire_questions']['Row'],
  'options' | 'answer_scores' | 'options_localized' | 'logic_rules'
> & {
  options: string[] | null;
  answer_scores: Record<string, number> | null;
  options_localized: Record<string, string> | null;
  logic_rules: LogicRule[] | null;
};

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

const DESCRIPTION_TOGGLE_THRESHOLD = 180;

interface QuestionnaireFillerProps {
  onCompleted?: () => void;
  readOnly?: boolean;
}

const QuestionnaireFiller: React.FC<QuestionnaireFillerProps> = ({ onCompleted, readOnly }) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { activeSubject } = useStance();
  const { hasAnyRole } = useUserRole();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [lastResponses, setLastResponses] = useState<LastResponse[]>([]);
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [openHistoryCards, setOpenHistoryCards] = useState<Set<string>>(new Set());
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
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
  const isAdminOrEditor = hasAnyRole('admin', 'editor');

  const qName = (questionnaire: Questionnaire | undefined | null) => {
    if (!questionnaire) return '';
    if (lang === 'en') return questionnaire.title_localized?.en ?? questionnaire.title;
    return questionnaire.title_localized?.hu ?? questionnaire.title;
  };

  const qDescription = (questionnaire: Questionnaire | undefined | null) => {
    if (!questionnaire) return null;
    if (lang === 'en') return questionnaire.description_localized?.en ?? questionnaire.description;
    return questionnaire.description_localized?.hu ?? questionnaire.description;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setSelectedQ(null);
      setOpenHistoryCards(new Set());
      setQuestions([]);
      setAnswers({});
      setScoreResult(null);
      setExpandedDescriptions(new Set());

      const responsePromise = user
        ? (() => {
            let query = supabase
              .from('questionnaire_responses')
              .select('questionnaire_id, completed_at')
              .eq('user_id', user.id);

            if (activeSubject.type === 'relative') {
              query = query
                .eq('subject_type', 'relative')
                .eq('subject_id', activeSubject.id);
            } else {
              query = query
                .is('subject_id', null)
                .or('subject_type.eq.self,subject_type.is.null');
            }

            return query.order('completed_at', { ascending: false });
          })()
        : Promise.resolve({ data: [] as LastResponse[] });

      const questionnaireQuery = supabase
        .from('questionnaires')
        .select('id, title, title_localized, description, description_localized, repeat_interval, scoring_enabled, scoring_mode, score_ranges, is_published, created_at, updated_at, created_by, snomed_code')
        .order('created_at', { ascending: false });

      const [questionnaireResult, responseResult] = await Promise.all([
        readOnly || isAdminOrEditor ? questionnaireQuery : questionnaireQuery.eq('is_published', true),
        responsePromise,
      ]);

      setQuestionnaires((questionnaireResult.data ?? []) as unknown as Questionnaire[]);

      const seen = new Set<string>();
      const latestResponses: LastResponse[] = [];
      for (const response of (responseResult.data ?? []) as LastResponse[]) {
        if (!seen.has(response.questionnaire_id)) {
          seen.add(response.questionnaire_id);
          latestResponses.push(response);
        }
      }

      setLastResponses(latestResponses);
      setLoading(false);
    };

    load();
  }, [activeSubject.id, activeSubject.type, isAdminOrEditor, readOnly, user]);

  const getLastCompletion = (questionnaireId: string) =>
    lastResponses.find((response) => response.questionnaire_id === questionnaireId);

  const isAvailable = (questionnaire: Questionnaire): boolean => {
    const lastCompletion = getLastCompletion(questionnaire.id);
    if (!lastCompletion) return true;
    if (!questionnaire.repeat_interval) return false;
    if (questionnaire.repeat_interval === 'anytime') return true;

    const intervalDays = INTERVAL_DAYS[questionnaire.repeat_interval];
    if (!intervalDays) return true;

    const daysSince = differenceInHours(new Date(), new Date(lastCompletion.completed_at)) / 24;
    return daysSince >= intervalDays;
  };

  const getRepeatLabel = (interval: string | null): string => {
    if (!interval) return t.questionnaires_manage.repeatOnce;
    const labelMap: Record<string, string> = {
      daily: t.questionnaires_manage.repeatDaily,
      weekly: t.questionnaires_manage.repeatWeekly,
      biweekly: t.questionnaires_manage.repeatBiweekly,
      monthly: t.questionnaires_manage.repeatMonthly,
      anytime: t.questionnaires_manage.repeatAnytime,
    };

    return labelMap[interval] ?? interval;
  };

  const toggleDescription = (questionnaireId: string) => {
    setExpandedDescriptions((previous) => {
      const next = new Set(previous);
      if (next.has(questionnaireId)) {
        next.delete(questionnaireId);
      } else {
        next.add(questionnaireId);
      }
      return next;
    });
  };

  const loadQuestions = async (questionnaireId: string) => {
    setSelectedQ(questionnaireId);
    setOpenHistoryCards(new Set());
    setAnswers({});
    setScoreResult(null);

    const { data } = await supabase
      .from('questionnaire_questions')
      .select('*')
      .eq('questionnaire_id', questionnaireId)
      .order('sort_order');

    setQuestions((data ?? []) as unknown as Question[]);
  };

  const toggleHistoryCard = (questionnaireId: string) => {
    setOpenHistoryCards((previous) => {
      const next = new Set(previous);
      if (next.has(questionnaireId)) {
        next.delete(questionnaireId);
      } else {
        next.add(questionnaireId);
      }
      return next;
    });
  };

  const calculateScore = (questionnaire: Questionnaire) => {
    const questionScores: { questionText: string; answer: string; score: number }[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const question of questions) {
      const answer = answers[question.id];
      if (!answer || question.question_type === 'text') continue;

      let score = 0;
      let maxScore = 0;

      if (questionnaire.scoring_mode === 'weighted' && question.answer_scores) {
        const scores = question.answer_scores as Record<string, number>;
        score = scores[answer] ?? 0;
        maxScore = Math.max(...Object.values(scores));
      } else if (question.question_type === 'scale') {
        const scaleMax =
          question.options && question.options.length >= 2 && question.options[1] !== ''
            ? Number(question.options[1])
            : 5;

        if (question.answer_scores && Object.keys(question.answer_scores).length > 0) {
          const scores = question.answer_scores as Record<string, number>;
          score = scores[answer] ?? 0;
          maxScore = Math.max(...Object.values(scores));
        } else {
          score = Number(answer) || 0;
          maxScore = scaleMax;
        }
      } else if (question.question_type === 'yes_no') {
        score = answer === 'yes' ? 1 : 0;
        maxScore = 1;
      } else if (question.question_type === 'multiple_choice') {
        const optionIndex = (question.options ?? []).indexOf(answer);
        score = optionIndex + 1;
        maxScore = (question.options ?? []).length;
      }

      totalScore += score;
      maxPossibleScore += maxScore;
      questionScores.push({
        questionText: question.question_text,
        answer,
        score,
      });
    }

    return { totalScore, maxPossibleScore, questionScores };
  };

  const handleSubmit = async () => {
    if (!user || !selectedQ) return;

    if (!navigator.onLine) {
      toast.info(t.pwa?.syncPending || 'Sync Pending – will upload when connection restores', {
        description: 'You are currently offline.',
      });
      return;
    }

    setSubmitting(true);

    const questionnaire = questionnaires.find((candidate) => candidate.id === selectedQ);

    if (questionnaire?.scoring_enabled) {
      const score = calculateScore(questionnaire);
      setScoreResult({
        ...score,
        scoreRanges: questionnaire.score_ranges ?? [],
      });
    }

    const { data: response, error } = await supabase
      .from('questionnaire_responses')
      .insert({
        user_id: user.id,
        questionnaire_id: selectedQ,
        subject_type: activeSubject.type,
        subject_id: activeSubject.type === 'relative' ? activeSubject.id : null,
      })
      .select('id')
      .single();

    if (error || !response) {
      toast.error(t.error.submit);
      setSubmitting(false);
      return;
    }

    const answerRows = Object.entries(answers).map(([questionId, answer]) => ({
      response_id: response.id,
      question_id: questionId,
      answer: answer as unknown as Database['public']['Tables']['questionnaire_answers']['Insert']['answer'],
    }));

    if (answerRows.length > 0) {
      await supabase.from('questionnaire_answers').insert(answerRows);
    }

    const questionsWithLogic: QuestionWithLogic[] = questions.map((question) => ({
      id: question.id,
      sort_order: question.sort_order,
      logic_rules: question.logic_rules,
    }));
    const visiblePath = computeVisiblePath(questionsWithLogic, answers);
    const skippedQuestionIds = getSkippedQuestionIds(questionsWithLogic, visiblePath);

    if (skippedQuestionIds.length > 0) {
      const skippedRows = skippedQuestionIds.map((questionId) => ({
        response_id: response.id,
        question_id: questionId,
        answer: '__SKIPPED__' as unknown as Database['public']['Tables']['questionnaire_answers']['Insert']['answer'],
      }));
      await supabase.from('questionnaire_answers').insert(skippedRows);
    }

    if (questionnaire?.scoring_enabled) {
      const { data: finalResponse } = await supabase
        .from('questionnaire_responses')
        .select('total_score')
        .eq('id', response.id)
        .single();

      if (finalResponse?.total_score !== null) {
        setScoreResult((previous) =>
          previous ? { ...previous, totalScore: finalResponse.total_score as number } : null
        );
      }
    }

    toast.success(t.questionnaires_manage.completed);
    setLastResponses((previous) => [
      { questionnaire_id: selectedQ, completed_at: new Date().toISOString() },
      ...previous.filter((entry) => entry.questionnaire_id !== selectedQ),
    ]);

    if (!questionnaire?.scoring_enabled) {
      setSelectedQ(null);
      setAnswers({});
      setOpenHistoryCards(new Set([selectedQ]));
    }

    setSubmitting(false);
    onCompleted?.();
  };

  const renderInput = (question: Question) => {
    const value = answers[question.id] ?? '';

    switch (question.question_type) {
      case 'scale': {
        const scaleMin =
          question.options && question.options.length >= 2 && question.options[0] !== ''
            ? Number(question.options[0])
            : 1;
        const scaleMax =
          question.options && question.options.length >= 2 && question.options[1] !== ''
            ? Number(question.options[1])
            : 5;
        const points = Array.from({ length: scaleMax - scaleMin + 1 }, (_, index) => scaleMin + index);
        const labels = question.options_localized ?? {};

        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {points.map((point) => (
                <button
                  key={point}
                  type="button"
                  onClick={() => setAnswers((previous) => ({ ...previous, [question.id]: String(point) }))}
                  className={`h-10 w-10 rounded-full border text-sm font-semibold transition-all ${
                    value === String(point)
                      ? 'border-primary bg-primary text-primary-foreground shadow-md'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {point}
                </button>
              ))}
            </div>
            {Object.keys(labels).length > 0 && (
              <div className="flex justify-between px-1 text-[10px] text-muted-foreground">
                {labels[String(scaleMin)] && <span>{scaleMin} = {labels[String(scaleMin)]}</span>}
                {labels[String(scaleMax)] && <span>{scaleMax} = {labels[String(scaleMax)]}</span>}
              </div>
            )}
          </div>
        );
      }
      case 'yes_no':
        return (
          <RadioGroup value={value} onValueChange={(next) => setAnswers((previous) => ({ ...previous, [question.id]: next }))}>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                <Label htmlFor={`${question.id}-yes`}>{t.yes}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id={`${question.id}-no`} />
                <Label htmlFor={`${question.id}-no`}>{t.no}</Label>
              </div>
            </div>
          </RadioGroup>
        );
      case 'multiple_choice':
        return (
          <RadioGroup value={value} onValueChange={(next) => setAnswers((previous) => ({ ...previous, [question.id]: next }))}>
            <div className="space-y-2">
              {(question.options ?? []).map((option) => (
                <div
                  key={option}
                  className="flex items-center gap-2 rounded-2xl border border-border p-3 transition-colors hover:bg-accent/30"
                >
                  <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                  <Label htmlFor={`${question.id}-${option}`} className="cursor-pointer text-sm">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );
      default:
        return (
          <Textarea
            value={value}
            onChange={(event) => setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))}
            rows={2}
            className="rounded-2xl"
          />
        );
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">{t.loading}</p>;
  if (questionnaires.length === 0) return <p className="text-sm text-muted-foreground">{t.questionnaires_manage.noAvailable}</p>;

  if (selectedQ && scoreResult) {
    return (
      <ScoreResults
        totalScore={scoreResult.totalScore}
        maxPossibleScore={scoreResult.maxPossibleScore}
        questionScores={scoreResult.questionScores}
        scoreRanges={scoreResult.scoreRanges}
        onClose={() => {
          setOpenHistoryCards(new Set([selectedQ]));
          setSelectedQ(null);
          setAnswers({});
          setScoreResult(null);
        }}
      />
    );
  }

  if (selectedQ) {
    const questionnaire = questionnaires.find((candidate) => candidate.id === selectedQ);
    const hasBranching = hasBranchingLogic(questions as unknown as QuestionWithLogic[]);

    if (hasBranching) {
      const questionsWithLogic = questions as unknown as QuestionWithLogic[];
      const visiblePath = computeVisiblePath(questionsWithLogic, answers);
      const currentQuestionId = visiblePath[visiblePath.length - 1];
      const currentQuestion = questions.find((question) => question.id === currentQuestionId);
      const answeredCount = visiblePath.filter((questionId) => answers[questionId] !== undefined).length;
      const isLastAnswered = currentQuestion ? answers[currentQuestionId] !== undefined : false;
      const lastResult =
        currentQuestion && answers[currentQuestionId]
          ? evaluateLogicRules(currentQuestion as unknown as QuestionWithLogic, answers[currentQuestionId])
          : null;
      const reachedEnd =
        lastResult?.action === 'skip_to_end' ||
        (isLastAnswered && !lastResult?.targetId && currentQuestion ? questions.indexOf(currentQuestion) === questions.length - 1 : false);

      return (
        <div className="space-y-5 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => setSelectedQ(null)}>
              <FArrowLeft className="mr-1 h-4 w-4" />
              {t.observations.back}
            </Button>
            <button
              type="button"
              onClick={() => {
                setSelectedQ(null);
                setOpenHistoryCards(new Set([selectedQ]));
              }}
              className="text-xs font-medium text-primary underline underline-offset-2"
            >
              {t.questionnaires_manage.viewQuestionnaireHistory}
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{qName(questionnaire)}</h3>
              <span className="text-[10px] text-muted-foreground">
                {t.questionnaires_manage.questionN.replace('{n}', String(answeredCount + (isLastAnswered ? 0 : 1)))} / ~{questions.length}
              </span>
            </div>
            {qDescription(questionnaire) && (
              <p className="text-sm italic leading-relaxed text-muted-foreground">
                {qDescription(questionnaire)}
              </p>
            )}
          </div>

          <div className="h-1 overflow-hidden rounded-full bg-border/50">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, (answeredCount / questions.length) * 100)}%` }}
            />
          </div>

          {reachedEnd ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t.questionnaires_manage.completionSummary.replace('{count}', String(answeredCount))}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" className="rounded-2xl" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? t.questionnaires_manage.submitting : t.submit}
                </Button>
                <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setSelectedQ(null)}>
                  {t.cancel}
                </Button>
              </div>
            </div>
          ) : currentQuestion ? (
            <div key={currentQuestion.id} className="space-y-3 animate-fade-in">
              <Label className="text-sm font-medium">
                {questions.indexOf(currentQuestion) + 1}. {currentQuestion.question_text}
              </Label>
              {renderInput(currentQuestion)}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => setSelectedQ(null)}>
            <FArrowLeft className="mr-1 h-4 w-4" />
            {t.observations.back}
          </Button>
          <button
            type="button"
            onClick={() => {
              setSelectedQ(null);
              setOpenHistoryCards(new Set([selectedQ]));
            }}
            className="text-xs font-medium text-primary underline underline-offset-2"
          >
            {t.questionnaires_manage.viewQuestionnaireHistory}
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">{qName(questionnaire)}</h3>
          {qDescription(questionnaire) && (
            <p className="border-l-2 border-primary/20 pl-3 text-sm italic leading-relaxed text-muted-foreground">
              {qDescription(questionnaire)}
            </p>
          )}
        </div>

        {questions.map((question, index) => (
          <div key={question.id} className="space-y-2">
            <Label className="text-sm font-medium">
              {index + 1}. {question.question_text}
            </Label>
            {renderInput(question)}
          </div>
        ))}

        <div className="flex items-center gap-2">
          <Button size="sm" className="rounded-2xl" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t.questionnaires_manage.submitting : t.submit}
          </Button>
          <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setSelectedQ(null)}>
            {t.cancel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {questionnaires.map((questionnaire) => {
          const lastCompletion = getLastCompletion(questionnaire.id);
          const available = isAvailable(questionnaire);
          const description = qDescription(questionnaire);
          const historyOpen = openHistoryCards.has(questionnaire.id);

          return (
            <QuestionnaireCard
              key={questionnaire.id}
              title={qName(questionnaire)}
              description={description}
              repeatLabel={getRepeatLabel(questionnaire.repeat_interval)}
              lastCompletedLabel={
                lastCompletion
                  ? `${t.questionnaires_manage.lastCompleted}: ${formatDistanceToNow(new Date(lastCompletion.completed_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}`
                  : undefined
              }
              available={available}
              descriptionExpanded={expandedDescriptions.has(questionnaire.id)}
              canToggleDescription={(description?.length ?? 0) > DESCRIPTION_TOGGLE_THRESHOLD}
              onToggleDescription={() => toggleDescription(questionnaire.id)}
              onStart={() => loadQuestions(questionnaire.id)}
              onToggleHistory={() => toggleHistoryCard(questionnaire.id)}
              historyOpen={historyOpen}
              startLabel={t.questionnaires_manage.startQuestionnaire}
              historyLabel={t.questionnaires_manage.viewQuestionnaireHistory}
              hideHistoryLabel={t.questionnaires_manage.hideQuestionnaireHistory}
              availableNowLabel={t.questionnaires_manage.availableNow}
              expandLabel={t.questionnaires_manage.expandDescription}
              collapseLabel={t.questionnaires_manage.collapseDescription}
              completedLabel={t.questionnaires_manage.alreadyCompleted}
            >
              <ScoreHistory
                questionnaireId={questionnaire.id}
                emptyMessage={t.questionnaires_manage.noHistoryForQuestionnaire}
                compact
              />
            </QuestionnaireCard>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionnaireFiller;
