import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { FArrowLeft } from '@/components/icons/FreudIcons';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { format, addDays } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ScoreResults from './ScoreResults';
import ScoreHistory from './ScoreHistory';
import QuestionnaireCard from './QuestionnaireCard';
import { evaluateLogicRules, computeVisiblePath, getSkippedQuestionIds, hasBranchingLogic } from '@/lib/logic-engine';
import type { QuestionWithLogic, LogicRule } from '@/lib/logic-engine';
import { getScoreInterpretation, type ScoreRange } from '@/lib/score-interpretation';
import type { Database } from '@/integrations/supabase/types';

type Questionnaire = Database['public']['Tables']['questionnaires']['Row'] & {
  score_ranges: ScoreRange[] | null;
  title_localized: Record<string, string> | null;
  description_localized: Record<string, string> | null;
};

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

type CardPanelState =
  | {
      questionnaireId: string;
      mode: 'description' | 'history';
    }
  | null;

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
  
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [lastResponses, setLastResponses] = useState<LastResponse[]>([]);
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<CardPanelState>(null);
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
  const subjectScopeKey = `${activeSubject.type}:${activeSubject.id ?? 'self'}`;
  const previousSubjectScopeRef = useRef(subjectScopeKey);
  const containerRef = useRef<HTMLDivElement>(null);

  type FilterMode = 'all' | 'due' | 'completed' | string; // string for freq
  type SortMode = 'urgent' | 'recent' | 'alpha';
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('urgent');
  const dateLocale = getDateLocale(lang);

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
    if (previousSubjectScopeRef.current === subjectScopeKey) return;

    previousSubjectScopeRef.current = subjectScopeKey;
    setSelectedQ(null);
    setActivePanel(null);
    setQuestions([]);
    setAnswers({});
    setScoreResult(null);
  }, [subjectScopeKey]);

  useEffect(() => {
    // Scroll to the container when scoreResult is set or when we return to history after completion
    if (scoreResult || (activePanel?.mode === 'history' && !selectedQ && !loading)) {
      // Use a small timeout to ensure the DOM has updated and rendered the new view
      const timer = setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scoreResult, activePanel?.mode, selectedQ, loading]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

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
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      const [questionnaireResult, responseResult] = await Promise.all([
        readOnly ? supabase.from('questionnaires').select('id, title, title_localized, description, description_localized, repeat_interval, scoring_enabled, scoring_mode, score_ranges, is_published, created_at, updated_at, created_by, snomed_code').order('created_at', { ascending: false }) : questionnaireQuery,
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
  }, [activeSubject.id, activeSubject.type, readOnly, user?.id]);

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

  const loadQuestions = async (questionnaireId: string) => {
    setActivePanel(null);
    setSelectedQ(questionnaireId);
    setAnswers({});
    setScoreResult(null);

    const { data } = await supabase
      .from('questionnaire_questions')
      .select('*')
      .eq('questionnaire_id', questionnaireId)
      .order('sort_order');

    setQuestions((data ?? []) as unknown as Question[]);
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
      toast.info(t.pwa.syncPending, {
        description: t.errors.offlineDescription,
      });
      return;
    }

    setSubmitting(true);

    const questionnaire = questionnaires.find((candidate) => candidate.id === selectedQ);

    if (questionnaire?.scoring_enabled) {
      const interpretation = getScoreInterpretation({
        interpretationProfile: questionnaire.interpretation_profile,
      });
      const configuredRanges = questionnaire.score_ranges ?? [];
      const score = calculateScore(questionnaire);
      setScoreResult({
        ...score,
        scoreRanges: configuredRanges.length > 0 ? configuredRanges : interpretation?.scoreRanges ?? [],
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
      const completedQuestionnaireId = selectedQ;
      setSelectedQ(null);
      setAnswers({});
      setActivePanel({ questionnaireId: completedQuestionnaireId, mode: 'history' });
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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] text-muted-foreground">
                {points
                  .filter((point) => labels[String(point)])
                  .map((point) => (
                    <span key={`${question.id}-scale-label-${point}`}>
                      {point} = {labels[String(point)]}
                    </span>
                  ))}
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

  const selectedQuestionnaire = selectedQ
    ? questionnaires.find((candidate) => candidate.id === selectedQ) ?? null
    : null;
  const selectedQuestionnaireInterpretationTarget = selectedQuestionnaire
    ? {
        interpretationProfile: selectedQuestionnaire.interpretation_profile,
      }
    : null;

  if (loading) return <p className="text-sm text-muted-foreground">{t.loading}</p>;
  if (questionnaires.length === 0) return <p className="text-sm text-muted-foreground">{t.questionnaires_manage.noAvailable}</p>;

  return (
    <div ref={containerRef} className="scroll-mt-20">
      {selectedQ && scoreResult ? (
        <ScoreResults
          totalScore={scoreResult.totalScore}
          maxPossibleScore={scoreResult.maxPossibleScore}
          questionScores={scoreResult.questionScores}
          scoreRanges={scoreResult.scoreRanges}
          questionnaireInterpretationTarget={selectedQuestionnaireInterpretationTarget}
          onClose={() => {
            const completedQuestionnaireId = selectedQ;
            setSelectedQ(null);
            setAnswers({});
            setScoreResult(null);
            if (completedQuestionnaireId) {
              setActivePanel({ questionnaireId: completedQuestionnaireId, mode: 'history' });
            }
          }}
        />
      ) : selectedQ ? (
        (() => {
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
                      const activeQuestionnaireId = selectedQ;
                      setSelectedQ(null);
                      if (activeQuestionnaireId) {
                        setActivePanel({ questionnaireId: activeQuestionnaireId, mode: 'history' });
                      }
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
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-foreground">
                        {questions.indexOf(currentQuestion) + 1}.
                      </span>
                      <div className="prose prose-sm max-w-none text-sm text-foreground [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1">
                        <ReactMarkdown>{currentQuestion.question_text}</ReactMarkdown>
                      </div>
                    </div>
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
                    const activeQuestionnaireId = selectedQ;
                    setSelectedQ(null);
                    if (activeQuestionnaireId) {
                      setActivePanel({ questionnaireId: activeQuestionnaireId, mode: 'history' });
                    }
                  }}
                  className="text-xs font-medium text-primary underline underline-offset-2"
                >
                  {t.questionnaires_manage.viewQuestionnaireHistory}
                </button>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-foreground">{qName(questionnaire)}</h3>
              </div>

              {questions.map((question, index) => (
                <div key={question.id} className="space-y-2">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-foreground">{index + 1}.</span>
                    <div className="prose prose-sm max-w-none text-sm text-foreground [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1">
                      <ReactMarkdown>{question.question_text}</ReactMarkdown>
                    </div>
                  </div>
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
        })()
      ) : (
        <div className="space-y-6">
          {(() => {
            const tm = t.questionnaires_manage;
            const frequencies = Array.from(
              new Set(questionnaires.map((q) => q.repeat_interval ?? 'once'))
            );

            const computeNextDueDate = (q: Questionnaire): Date | null => {
              const last = getLastCompletion(q.id);
              if (!last) return new Date(0); // due now
              if (!q.repeat_interval || q.repeat_interval === 'anytime') return null;
              const days = INTERVAL_DAYS[q.repeat_interval];
              if (!days) return null;
              return addDays(new Date(last.completed_at), days);
            };

            const enriched = questionnaires.map((q) => {
              const last = getLastCompletion(q.id);
              const nextDue = computeNextDueDate(q);
              return {
                q,
                last,
                nextDue,
                available: isAvailable(q),
                urgencyKey: nextDue ? nextDue.getTime() : Number.POSITIVE_INFINITY,
                lastKey: last ? new Date(last.completed_at).getTime() : 0,
              };
            });

            let filtered = enriched;
            if (filter === 'due') filtered = enriched.filter((e) => e.available);
            else if (filter === 'completed') filtered = enriched.filter((e) => e.last);
            else if (filter !== 'all') filtered = enriched.filter((e) => (e.q.repeat_interval ?? 'once') === filter);

            const sorted = [...filtered].sort((a, b) => {
              if (sortMode === 'alpha') return qName(a.q).localeCompare(qName(b.q));
              if (sortMode === 'recent') return b.lastKey - a.lastKey;
              return a.urgencyKey - b.urgencyKey;
            });

            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: tm.filterAll },
                      { id: 'due', label: tm.filterDueNow },
                      { id: 'completed', label: tm.filterCompleted },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter(f.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          filter === f.id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                    {frequencies.length > 1 && (
                      <Select
                        value={frequencies.includes(filter) ? filter : '__freq__'}
                        onValueChange={(v) => v !== '__freq__' && setFilter(v)}
                      >
                        <SelectTrigger
                          className={`h-7 w-auto gap-1.5 rounded-full border px-3 text-xs font-medium ${
                            frequencies.includes(filter)
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-muted-foreground'
                          }`}
                        >
                          <SelectValue placeholder={tm.filterByFrequency}>
                            {frequencies.includes(filter)
                              ? getRepeatLabel(filter === 'once' ? null : filter)
                              : tm.filterByFrequency}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {frequencies.map((freq) => (
                            <SelectItem key={freq} value={freq}>
                              {getRepeatLabel(freq === 'once' ? null : freq)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                    <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full text-xs">
                      <span className="text-muted-foreground">{tm.sortLabel}:</span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">{tm.sortMostUrgent}</SelectItem>
                      <SelectItem value="recent">{tm.sortRecentlyUsed}</SelectItem>
                      <SelectItem value="alpha">{tm.sortAlphabetical}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sorted.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{tm.noMatchingQuestionnaires}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {sorted.map(({ q: questionnaire, last: lastCompletion, available, nextDue }) => {
                      const description = qDescription(questionnaire);
                      const cardPanelMode =
                        activePanel?.questionnaireId === questionnaire.id ? activePanel.mode : null;

                      const lastValue = lastCompletion
                        ? formatDistanceToNow(new Date(lastCompletion.completed_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })
                        : tm.metaNever;

                      let nextDueValue: string;
                      if (!nextDue) nextDueValue = tm.metaNotScheduled;
                      else if (available) nextDueValue = tm.metaDueNow;
                      else nextDueValue = format(nextDue, 'PP', { locale: dateLocale });

                      return (
                        <QuestionnaireCard
                          key={questionnaire.id}
                          title={qName(questionnaire)}
                          description={description}
                          repeatLabel={getRepeatLabel(questionnaire.repeat_interval)}
                          metaFrequencyLabel={tm.metaFrequency}
                          metaFrequencyValue={getRepeatLabel(questionnaire.repeat_interval)}
                          metaLastCompletionLabel={tm.metaLastCompletion}
                          metaLastCompletionValue={lastValue}
                          metaNextDueLabel={tm.metaNextDue}
                          metaNextDueValue={nextDueValue}
                          available={available}
                          canReadMore={(description?.length ?? 0) > DESCRIPTION_TOGGLE_THRESHOLD}
                          onStart={() => loadQuestions(questionnaire.id)}
                          startLabel={tm.startQuestionnaire}
                          historyLabel={tm.viewQuestionnaireHistory}
                          availableNowLabel={tm.availableNow}
                          expandLabel={tm.expandDescription}
                          completedLabel={tm.alreadyCompleted}
                          closeLabel={t.ui.close}
                          detailPanelTitle={tm.detailPanelTitle}
                          activePanel={cardPanelMode}
                          onPanelChange={(mode) =>
                            setActivePanel(mode ? { questionnaireId: questionnaire.id, mode } : null)
                          }
                          historyContent={
                            <ScoreHistory
                              questionnaireId={questionnaire.id}
                              emptyMessage={tm.noHistoryForQuestionnaire}
                              compact
                            />
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default QuestionnaireFiller;
