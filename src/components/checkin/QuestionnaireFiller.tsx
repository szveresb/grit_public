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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import ScoreResults from './ScoreResults';
import ScoreHistory from './ScoreHistory';
import QuestionnaireCard from './QuestionnaireCard';
import { evaluateLogicRules, computeVisiblePath, getSkippedQuestionIds, hasBranchingLogic, getSkippedQuestionsWithRules } from '@/lib/logic-engine';
import type { QuestionWithLogic, LogicRule } from '@/lib/logic-engine';
import { type ScoreRange } from '@/lib/score-interpretation';
import type { Database } from '@/integrations/supabase/types';
import {
  FALLBACK_QUESTIONNAIRE_CATEGORIES,
  getFallbackQuestionnaireCategory,
  isMissingQuestionnaireCategorySchema,
  QUESTIONNAIRE_SELECT_BASE,
  QUESTIONNAIRE_SELECT_WITH_CATEGORIES,
} from '@/lib/questionnaire-category-schema';
import { getQuestionnaireCategoryErrorMessage } from '@/lib/questionnaire-category-ui';

type Questionnaire = Omit<
  Database['public']['Tables']['questionnaires']['Row'],
  'category_id'
> & {
  category_id?: string | null;
  score_ranges: ScoreRange[] | null;
  title_localized: Record<string, string> | null;
  description_localized: Record<string, string> | null;
  category?: {
    id: string;
    key: string;
    name_hu: string;
    name_en: string;
    is_active: boolean;
    sort_order: number;
  } | null;
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
    subscaleScores?: Record<string, number>;
  } | null>(null);
  const subjectScopeKey = `${activeSubject.type}:${activeSubject.id ?? 'self'}`;
  const previousSubjectScopeRef = useRef(subjectScopeKey);
  const containerRef = useRef<HTMLDivElement>(null);

  type FilterMode = 'all' | 'due' | 'completed' | string; // string for freq
  type SortMode = 'urgent' | 'recent' | 'alpha';
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('urgent');
  const dateLocale = getDateLocale(lang);

  interface Category {
    id: string;
    key: string;
    name_hu: string;
    name_en: string;
    is_active: boolean;
    sort_order: number;
  }
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<string[]>([]);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [mobileTopicsOpen, setMobileTopicsOpen] = useState(false);
  const [categorySchemaAvailable, setCategorySchemaAvailable] = useState(true);

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

  const getCategoryLabel = (category: Category) => (lang === 'en' ? category.name_en : category.name_hu);

  const allTopicsSelected = categories.length > 0 && selectedCategoryKeys.length === categories.length;
  const effectiveSelectedCategoryKeys = allTopicsSelected ? [] : selectedCategoryKeys;
  const hasTopicFilter = effectiveSelectedCategoryKeys.length > 0;

  const selectedTopicSummary = (() => {
    if (!categories.length || !hasTopicFilter) return t.questionnaires_manage.filterAllTopics;

    const selectedTopics = categories.filter((category) => effectiveSelectedCategoryKeys.includes(category.key));
    if (selectedTopics.length === 0) return t.questionnaires_manage.filterAllTopics;
    if (selectedTopics.length === 1) return getCategoryLabel(selectedTopics[0]);

    return `${getCategoryLabel(selectedTopics[0])} +${selectedTopics.length - 1}`;
  })();

  const toggleCategoryKey = (categoryKey: string) => {
    setSelectedCategoryKeys((current) =>
      current.includes(categoryKey)
        ? current.filter((key) => key !== categoryKey)
        : [...current, categoryKey]
    );
  };

  const toggleAllCategories = () => {
    setSelectedCategoryKeys((current) =>
      current.length === categories.length ? [] : categories.map((category) => category.key)
    );
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

      const categoriesPromise = supabase
        .from('questionnaire_categories')
        .select('id, key, name_hu, name_en, is_active, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const questionnaireQuery = supabase
        .from('questionnaires')
        .select(QUESTIONNAIRE_SELECT_WITH_CATEGORIES)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      const [questionnaireResult, responseResult, categoriesResult] = await Promise.all([
        readOnly 
          ? supabase.from('questionnaires').select(QUESTIONNAIRE_SELECT_WITH_CATEGORIES).order('created_at', { ascending: false }) 
          : questionnaireQuery,
        responsePromise,
        categoriesPromise,
      ]);

      const missingCategorySchema =
        isMissingQuestionnaireCategorySchema(categoriesResult.error) ||
        isMissingQuestionnaireCategorySchema(questionnaireResult.error);

      setCategorySchemaAvailable(!missingCategorySchema);

      if (categoriesResult.error && !missingCategorySchema) {
        console.error('Error fetching categories:', categoriesResult.error);
        toast.error(getQuestionnaireCategoryErrorMessage(categoriesResult.error));
      }

      let questionnaireData = (questionnaireResult.data ?? []) as unknown as Questionnaire[];
      if (questionnaireResult.error && missingCategorySchema) {
        const fallbackQuery = readOnly
          ? supabase
              .from('questionnaires')
              .select(QUESTIONNAIRE_SELECT_BASE)
              .order('created_at', { ascending: false })
          : supabase
              .from('questionnaires')
              .select(QUESTIONNAIRE_SELECT_BASE)
              .eq('is_published', true)
              .order('created_at', { ascending: false });
        const fallbackResult = await fallbackQuery;
        if (fallbackResult.error) {
          console.error('Error fetching questionnaires:', fallbackResult.error);
          toast.error(t.errors.genericFailure);
        } else {
          questionnaireData = (fallbackResult.data ?? []) as unknown as Questionnaire[];
        }
      } else if (questionnaireResult.error) {
        console.error('Error fetching questionnaires:', questionnaireResult.error);
        toast.error(t.errors.genericFailure);
      }

      const activeCats = missingCategorySchema
        ? (FALLBACK_QUESTIONNAIRE_CATEGORIES as Category[])
        : ((categoriesResult.data ?? []) as Category[]);
      const questionnairesWithFallbackCategory = missingCategorySchema
        ? questionnaireData.map((questionnaire) => ({
            ...questionnaire,
            category: questionnaire.category ?? getFallbackQuestionnaireCategory(questionnaire.title),
          }))
        : questionnaireData;
      setCategories(activeCats);
      setQuestionnaires(questionnairesWithFallbackCategory);

      setSelectedCategoryKeys((prev) => prev.filter((key) => activeCats.some((category) => category.key === key)));

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

    const questionsWithLogic: QuestionWithLogic[] = questions.map((question) => ({
      id: question.id,
      sort_order: question.sort_order,
      logic_rules: question.logic_rules,
    }));
    const skippedWithRules = getSkippedQuestionsWithRules(questionsWithLogic, answers);
    const allAnswers = { ...answers };
    skippedWithRules.forEach((item) => {
      const syntheticVal = item.ruleApplied?.synthetic_skipped_answers?.[item.id];
      if (syntheticVal !== undefined) {
        allAnswers[item.id] = syntheticVal;
      } else {
        allAnswers[item.id] = '__SKIPPED__';
      }
    });

    for (const question of questions) {
      const answer = allAnswers[question.id];
      if (!answer || answer === '__SKIPPED__' || question.question_type === 'text') continue;

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

  interface Subscale {
    id: string;
    name: {
      hu?: string;
      en?: string;
    };
    type: 'sum' | 'average';
  }

  const calculateSubscaleScores = (
    questionnaire: Questionnaire,
    questionsList: Question[],
    fullAnswers: Record<string, string>
  ): Record<string, number> => {
    const scores: Record<string, number> = {};
    const counts: Record<string, number> = {};

    const subscalesConfig = (questionnaire.subscales as unknown as Subscale[]) ?? [];
    for (const sub of subscalesConfig) {
      scores[sub.id] = 0;
      counts[sub.id] = 0;
    }

    for (const question of questionsList) {
      const answer = fullAnswers[question.id];
      const subscaleIds = (question.subscale_ids as string[]) ?? [];
      
      if (subscaleIds.length === 0) continue;
      
      if (!answer || answer === '__SKIPPED__' || question.question_type === 'text') {
        continue;
      }

      let score = 0;
      if (questionnaire.scoring_mode === 'weighted' && question.answer_scores) {
        const scoresObj = question.answer_scores as Record<string, number>;
        score = scoresObj[answer] ?? 0;
      } else if (question.question_type === 'scale') {
        if (question.answer_scores && Object.keys(question.answer_scores).length > 0) {
          const scoresObj = question.answer_scores as Record<string, number>;
          score = scoresObj[answer] ?? 0;
        } else {
          score = Number(answer);
          if (isNaN(score)) score = 0;
        }
      } else if (question.question_type === 'yes_no') {
        score = answer === 'yes' ? 1 : 0;
      } else if (question.question_type === 'multiple_choice') {
        const optionIndex = (question.options ?? []).indexOf(answer);
        score = optionIndex !== -1 ? optionIndex + 1 : 0;
      }

      for (const subId of subscaleIds) {
        if (scores[subId] !== undefined) {
          scores[subId] += score;
          counts[subId] += 1;
        }
      }
    }

    for (const sub of subscalesConfig) {
      if (sub.type === 'average') {
        const count = counts[sub.id];
        scores[sub.id] = count > 0 ? Number((scores[sub.id] / count).toFixed(2)) : 0;
      }
    }

    return scores;
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

    let subscaleScoresObj: Record<string, number> = {};
    if (questionnaire) {
      const questionsWithLogic: QuestionWithLogic[] = questions.map((question) => ({
        id: question.id,
        sort_order: question.sort_order,
        logic_rules: question.logic_rules,
      }));
      const skippedWithRules = getSkippedQuestionsWithRules(questionsWithLogic, answers);

      const fullAnswers = { ...answers };
      for (const item of skippedWithRules) {
        const syntheticVal = item.ruleApplied?.synthetic_skipped_answers?.[item.id];
        fullAnswers[item.id] = syntheticVal !== undefined ? syntheticVal : '__SKIPPED__';
      }

      subscaleScoresObj = calculateSubscaleScores(questionnaire, questions, fullAnswers);
    }

    if (questionnaire?.scoring_enabled) {
      const score = calculateScore(questionnaire);
      setScoreResult({
        ...score,
        scoreRanges: (questionnaire.score_ranges ?? []) as ScoreRange[],
        subscaleScores: subscaleScoresObj,
      });
    }

    const { data: response, error } = await supabase
      .from('questionnaire_responses')
      .insert({
        user_id: user.id,
        questionnaire_id: selectedQ,
        subject_type: activeSubject.type,
        subject_id: activeSubject.type === 'relative' ? activeSubject.id : null,
        subscale_scores: subscaleScoresObj as any,
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
    const skippedWithRules = getSkippedQuestionsWithRules(questionsWithLogic, answers);

    if (skippedWithRules.length > 0) {
      const skippedRows = skippedWithRules.map((item) => {
        const syntheticVal = item.ruleApplied?.synthetic_skipped_answers?.[item.id];
        return {
          response_id: response.id,
          question_id: item.id,
          answer: (syntheticVal !== undefined ? syntheticVal : '__SKIPPED__') as unknown as Database['public']['Tables']['questionnaire_answers']['Insert']['answer'],
        };
      });
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


  if (loading) return <p className="text-sm text-muted-foreground">{t.loading}</p>;
  if (questionnaires.length === 0) return <p className="text-sm text-muted-foreground">{t.questionnaires_manage.noAvailable}</p>;

  return (
    <div ref={containerRef} className="scroll-mt-20">
      {selectedQ && scoreResult ? (
        <ScoreResults
          surveyId={selectedQ}
          totalScore={scoreResult.totalScore}
          maxPossibleScore={scoreResult.maxPossibleScore}
          questionScores={scoreResult.questionScores}
          scoreRanges={scoreResult.scoreRanges}
          subscaleScores={scoreResult.subscaleScores}
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

            if (hasTopicFilter) {
              filtered = filtered.filter((e) =>
                e.q.category ? effectiveSelectedCategoryKeys.includes(e.q.category.key) : false
              );
            }

            const sorted = [...filtered].sort((a, b) => {
              if (sortMode === 'alpha') return qName(a.q).localeCompare(qName(b.q));
              if (sortMode === 'recent') return b.lastKey - a.lastKey;
              return a.urgencyKey - b.urgencyKey;
            });

            return (
              <>
                <div className="rounded-[28px] border border-border/60 bg-card/70 px-4 py-3 shadow-sm shadow-black/5 backdrop-blur-sm">
                  <div className="hidden items-center gap-2 lg:grid lg:grid-cols-[auto,minmax(14rem,1fr),auto,auto]">
                    <div className="inline-flex min-w-0 rounded-full border border-border/70 bg-muted/30 p-1">
                      {[
                        { id: 'all', label: tm.filterAll },
                        { id: 'due', label: tm.filterDueNow },
                        { id: 'completed', label: tm.filterCompleted },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setFilter(option.id)}
                          className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                            filter === option.id
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-background hover:text-foreground'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {categories.length > 0 ? (
                      <Popover open={topicsOpen} onOpenChange={setTopicsOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex h-11 min-w-0 items-center justify-between gap-3 rounded-full border border-border/70 bg-background/90 px-4 text-sm text-foreground transition-colors hover:border-primary/40"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{selectedTopicSummary}</span>
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[22rem] rounded-[1.5rem] border-border/70 p-0">
                          <div className="border-b border-border/60 px-4 py-3">
                            <button
                              type="button"
                              onClick={toggleAllCategories}
                              className="flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left text-sm text-foreground"
                            >
                              <Checkbox checked={allTopicsSelected || selectedCategoryKeys.length === 0} />
                              <span>{tm.filterAllTopics}</span>
                            </button>
                          </div>
                          <div className="max-h-80 space-y-1 overflow-y-auto p-2">
                            {categories.map((category) => {
                              const checked = selectedCategoryKeys.includes(category.key);
                              return (
                                <button
                                  key={category.id}
                                  type="button"
                                  onClick={() => toggleCategoryKey(category.key)}
                                  className={cn(
                                    'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60',
                                    checked && 'bg-muted/50'
                                  )}
                                >
                                  <Checkbox checked={checked} />
                                  <span className="leading-snug">{getCategoryLabel(category)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div />
                    )}

                    {frequencies.length > 1 && (
                      <Select
                        value={frequencies.includes(filter) ? filter : '__all_frequency__'}
                        onValueChange={(value) => setFilter(value === '__all_frequency__' ? 'all' : value)}
                      >
                        <SelectTrigger className="h-11 min-w-[12rem] rounded-full border-border/70 bg-background/90 px-4 text-left text-sm">
                          <SelectValue placeholder={tm.filterByFrequency} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all_frequency__">{tm.filterByFrequency}</SelectItem>
                          {frequencies.map((freq) => (
                            <SelectItem key={freq} value={freq}>
                              {getRepeatLabel(freq === 'once' ? null : freq)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
                      <SelectTrigger className="h-11 min-w-[13rem] rounded-full border-border/70 bg-background/90 px-4 text-sm">
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

                  <div className="flex flex-col gap-2 lg:hidden">
                    <div className="-mx-1 overflow-x-auto px-1 pb-1">
                      <div className="inline-flex min-w-max rounded-full border border-border/70 bg-muted/30 p-1">
                        {[
                          { id: 'all', label: tm.filterAll },
                          { id: 'due', label: tm.filterDueNow },
                          { id: 'completed', label: tm.filterCompleted },
                        ].map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setFilter(option.id)}
                            className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                              filter === option.id
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-background hover:text-foreground'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {categories.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setMobileTopicsOpen(true)}
                          className="flex h-11 items-center justify-between gap-3 rounded-full border border-border/70 bg-background/90 px-4 text-sm text-foreground"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{selectedTopicSummary}</span>
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>

                        <Sheet open={mobileTopicsOpen} onOpenChange={setMobileTopicsOpen}>
                          <SheetContent side="bottom" className="rounded-t-[1.75rem] px-0 pb-6">
                            <SheetHeader className="px-5 pb-3 text-left">
                              <SheetTitle>{tm.categoryLabel}</SheetTitle>
                            </SheetHeader>
                            <div className="space-y-1 px-3">
                              <button
                                type="button"
                                onClick={toggleAllCategories}
                                className="flex w-full items-center gap-3 rounded-2xl border border-border/60 px-4 py-3 text-left text-sm"
                              >
                                <Checkbox checked={allTopicsSelected || selectedCategoryKeys.length === 0} />
                                <span>{tm.filterAllTopics}</span>
                              </button>
                              <div className="max-h-[50vh] space-y-1 overflow-y-auto pt-2">
                                {categories.map((category) => {
                                  const checked = selectedCategoryKeys.includes(category.key);
                                  return (
                                    <button
                                      key={category.id}
                                      type="button"
                                      onClick={() => toggleCategoryKey(category.key)}
                                      className={cn(
                                        'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60',
                                        checked && 'bg-muted/50'
                                      )}
                                    >
                                      <Checkbox checked={checked} />
                                      <span className="leading-snug">{getCategoryLabel(category)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </SheetContent>
                        </Sheet>
                      </>
                    )}

                    <div className={`grid gap-2 ${frequencies.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {frequencies.length > 1 && (
                        <Select
                          value={frequencies.includes(filter) ? filter : '__all_frequency__'}
                          onValueChange={(value) => setFilter(value === '__all_frequency__' ? 'all' : value)}
                        >
                          <SelectTrigger className="h-11 rounded-full border-border/70 bg-background/90 px-4 text-left text-sm">
                            <SelectValue placeholder={tm.filterByFrequency} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all_frequency__">{tm.filterByFrequency}</SelectItem>
                            {frequencies.map((freq) => (
                              <SelectItem key={freq} value={freq}>
                                {getRepeatLabel(freq === 'once' ? null : freq)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
                        <SelectTrigger className="h-11 rounded-full border-border/70 bg-background/90 px-4 text-sm">
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
                  </div>
                </div>

                {sorted.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{tm.noMatchingQuestionnaires}</p>
                ) : hasTopicFilter ? (
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
                          categoryLabel={
                            questionnaire.category
                              ? lang === 'en'
                                ? questionnaire.category.name_en
                                : questionnaire.category.name_hu
                              : null
                          }
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
                ) : (
                  <div className="space-y-8 animate-fade-in">
                    {(() => {
                      const categoriesWithSurveys = categories
                        .map((cat) => {
                          const items = sorted.filter((item) => item.q.category?.key === cat.key);
                          return { category: cat, items };
                        })
                        .filter((group) => group.items.length > 0);

                      const uncategorizedItems = sorted.filter(
                        (item) => !item.q.category || !categories.some((cat) => cat.key === item.q.category?.key)
                      );

                      if (uncategorizedItems.length > 0) {
                        categoriesWithSurveys.push({
                          category: {
                            id: 'uncategorized',
                            key: 'uncategorized',
                            name_hu: tm.uncategorized ?? 'Egyéb',
                            name_en: tm.uncategorized ?? 'Other',
                            is_active: true,
                            sort_order: 9999,
                          },
                          items: uncategorizedItems,
                        });
                      }

                      return categoriesWithSurveys.map(({ category, items }) => (
                        <div key={category.id} className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 border-b border-border/40 pb-1.5">
                            {lang === 'en' ? category.name_en : category.name_hu}
                          </h3>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {items.map(({ q: questionnaire, last: lastCompletion, available, nextDue }) => {
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
                                  categoryLabel={
                                    questionnaire.category
                                      ? lang === 'en'
                                        ? questionnaire.category.name_en
                                        : questionnaire.category.name_hu
                                      : null
                                  }
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
                        </div>
                      ));
                    })()}
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

