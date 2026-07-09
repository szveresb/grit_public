import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
const supabaseAny = supabase as any;
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { safeFormat } from '@/lib/date-safe';
import { getDateLocale } from '@/lib/date-locale';
import ErrorBoundary from '@/components/ErrorBoundary';
import { FClock, FChevronDown, FTrendingUp } from '@/components/icons/FreudIcons';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuestionnaireTrends } from '@/hooks/useQuestionnaireTrends';
import { type ScoreRange } from '@/lib/score-interpretation';

interface ScoreEntry {
  id: string;
  questionnaire_id: string;
  questionnaire_title: string;
  total_score: number;
  completed_at: string;
  subscale_scores?: Record<string, number> | null;
}

interface AnswerDetail {
  question_text: string;
  answer: string;
}

interface Subscale {
  id: string;
  name: {
    hu?: string;
    en?: string;
  };
  type: 'sum' | 'average';
  score_ranges?: {
    min: number;
    max: number;
    label: {
      hu: string;
      en: string;
    };
    description?: {
      hu?: string;
      en?: string;
    };
  }[];
}

interface GroupedScores {
  questionnaire_id: string;
  title: string;
  entries: ScoreEntry[];
  scoreRanges: ScoreRange[];
  maxPossibleScore: number;
  scoringEnabled: boolean;
  interpretationProfile: string | null;
  subscales?: any;
}

interface LocalizedQuestionnaireRow {
  id: string;
  title: string;
  title_localized: Record<string, string> | null;
  snomed_code: string | null;
  interpretation_profile: string | null;
  score_ranges: ScoreRange[] | null;
  scoring_enabled: boolean;
  scoring_mode: string;
  subscales: any;
}

interface ScoreHistoryProps {
  questionnaireId?: string;
  subjectType?: 'self' | 'relative';
  subjectId?: string | null;
  emptyMessage?: string;
  compact?: boolean;
}

const ScoreHistory = ({
  questionnaireId,
  subjectType,
  subjectId,
  emptyMessage,
  compact = false,
}: ScoreHistoryProps) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { activeSubject } = useStance();
  const dateLocale = getDateLocale(lang);
  const [groups, setGroups] = useState<GroupedScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [answerCache, setAnswerCache] = useState<Record<string, AnswerDetail[]>>({});

  const effectiveSubjectType = subjectType ?? activeSubject.type;
  const effectiveSubjectId =
    effectiveSubjectType === 'relative' ? (subjectId ?? activeSubject.id) : null;

  const questionnaireName = useCallback(
    (questionnaire: LocalizedQuestionnaireRow | null | undefined) => {
      if (!questionnaire) return '';
      if (lang === 'en') return questionnaire.title_localized?.en ?? questionnaire.title;
      return questionnaire.title_localized?.hu ?? questionnaire.title;
    },
    [lang]
  );

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setGroups([]);
      setExpandedEntries(new Set());
      setAnswerCache({});

      let responseQuery = supabase
        .from('questionnaire_responses')
        .select('id, questionnaire_id, total_score, completed_at, subject_type, subject_id, subscale_scores')
        .eq('user_id', user.id);

      if (effectiveSubjectType === 'relative') {
        responseQuery = responseQuery
          .eq('subject_type', 'relative')
          .eq('subject_id', effectiveSubjectId);
      } else {
        responseQuery = responseQuery
          .is('subject_id', null)
          .or('subject_type.eq.self,subject_type.is.null');
      }

      if (questionnaireId) {
        responseQuery = responseQuery.eq('questionnaire_id', questionnaireId);
      }

      const { data: responses } = await responseQuery.order('completed_at', { ascending: true });

      if (!responses || responses.length === 0) {
        setLoading(false);
        return;
      }

      const qIds = [...new Set(responses.map((response) => response.questionnaire_id))];
      const { data: questionnaires } = await supabase
        .from('questionnaires')
        .select('id, title, title_localized, snomed_code, interpretation_profile, score_ranges, scoring_enabled, scoring_mode, subscales')
        .in('id', qIds);

      const { data: questions } = await supabase
        .from('questionnaire_questions')
        .select('questionnaire_id, question_type, options, answer_scores, subscale_ids')
        .in('questionnaire_id', qIds);

      const titleMap = new Map(
        ((questionnaires ?? []) as unknown as LocalizedQuestionnaireRow[]).map((questionnaire) => [
          questionnaire.id,
          questionnaire,
        ])
      );

      const maxScoreMap = new Map<string, number>();
      for (const qId of qIds) {
        const questionnaire = titleMap.get(qId);
        const questionnaireQuestions = (questions ?? []).filter((question) => question.questionnaire_id === qId);
        let maxTotal = 0;

        for (const question of questionnaireQuestions) {
          if (question.question_type === 'text') continue;

          const scores = question.answer_scores as Record<string, number> | null;
          if (questionnaire?.scoring_mode === 'weighted' && scores) {
            maxTotal += Math.max(...Object.values(scores), 0);
          } else if (question.question_type === 'scale') {
            const options = question.options as string[] | null;
            if (scores && Object.keys(scores).length > 0) {
              maxTotal += Math.max(...Object.values(scores), 0);
            } else {
              maxTotal += options && options.length >= 2 ? Number(options[1]) || 5 : 5;
            }
          } else if (question.question_type === 'yes_no') {
            maxTotal += 1;
          } else if (question.question_type === 'multiple_choice') {
            maxTotal += ((question.options as string[] | null) ?? []).length;
          }
        }

        maxScoreMap.set(qId, maxTotal);
      }

      const grouped = new Map<string, GroupedScores>();
      for (const response of responses) {
        if (!grouped.has(response.questionnaire_id)) {
          const questionnaire = titleMap.get(response.questionnaire_id);
          const configuredRanges = (questionnaire?.score_ranges ?? []) as ScoreRange[];
          grouped.set(response.questionnaire_id, {
            questionnaire_id: response.questionnaire_id,
            title: questionnaireName(questionnaire),
            entries: [],
            scoreRanges: configuredRanges,
            maxPossibleScore: maxScoreMap.get(response.questionnaire_id) ?? 0,
            scoringEnabled: questionnaire?.scoring_enabled ?? false,
            interpretationProfile: questionnaire?.interpretation_profile ?? null,
            subscales: questionnaire?.subscales,
          });
        }

        grouped.get(response.questionnaire_id)!.entries.push({
          id: response.id,
          questionnaire_id: response.questionnaire_id,
          questionnaire_title: grouped.get(response.questionnaire_id)!.title,
          total_score: response.total_score ?? 0,
          completed_at: response.completed_at,
          subscale_scores: response.subscale_scores as Record<string, number> | null,
        });
      }

      setGroups(Array.from(grouped.values()));
      setLoading(false);
    };

    load();
  }, [effectiveSubjectId, effectiveSubjectType, questionnaireId, questionnaireName, user]);

  const toggleEntry = useCallback(async (responseId: string) => {
    setExpandedEntries((previous) => {
      const next = new Set(previous);
      if (next.has(responseId)) {
        next.delete(responseId);
      } else {
        next.add(responseId);
      }
      return next;
    });

    if (answerCache[responseId]) return;

    const { data } = await supabase
      .from('questionnaire_answers')
      .select('answer, questionnaire_questions(question_text, sort_order)')
      .eq('response_id', responseId)
      .order('questionnaire_questions(sort_order)' as never);

    const details: AnswerDetail[] = ((data ?? []) as Array<{
      answer: unknown;
      questionnaire_questions?: { question_text?: string; sort_order?: number } | null;
    }>)
      .sort(
        (left, right) =>
          (left.questionnaire_questions?.sort_order ?? 0) - (right.questionnaire_questions?.sort_order ?? 0)
      )
      .map((answerRow) => ({
        question_text: answerRow.questionnaire_questions?.question_text ?? '',
        answer:
          typeof answerRow.answer === 'string'
            ? answerRow.answer.replace(/^"|"$/g, '')
            : JSON.stringify(answerRow.answer),
      }));

    setAnswerCache((previous) => ({ ...previous, [responseId]: details }));
  }, [answerCache]);

  const getMatchedRange = (score: number, ranges: ScoreRange[]) =>
    ranges.find((range) => score >= range.min && score <= range.max);

  if (loading) return <p className="text-sm text-muted-foreground">{t.loading}</p>;
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyMessage ?? t.questionnaires_manage.scoreHistoryEmpty}
      </p>
    );
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {groups.map((group) => (
        <ErrorBoundary key={group.questionnaire_id} name={`ScoreHistory-${group.title}`}>
          <ScoreHistoryGroup
            group={group}
            compact={compact}
            lang={lang}
            t={t}
            dateLocale={dateLocale}
            userId={user?.id}
            effectiveSubjectType={effectiveSubjectType}
            effectiveSubjectId={effectiveSubjectId}
            expandedEntries={expandedEntries}
            answerCache={answerCache}
            toggleEntry={toggleEntry}
            getMatchedRange={getMatchedRange}
          />
        </ErrorBoundary>
      ))}
    </div>
  );
};

interface ScoreHistoryGroupProps {
  group: GroupedScores;
  compact: boolean;
  lang: 'en' | 'hu';
  t: any;
  dateLocale: ReturnType<typeof getDateLocale>;
  userId: string | undefined;
  effectiveSubjectType: 'self' | 'relative';
  effectiveSubjectId: string | null;
  expandedEntries: Set<string>;
  answerCache: Record<string, AnswerDetail[]>;
  toggleEntry: (id: string) => void;
  getMatchedRange: (score: number, ranges: ScoreRange[]) => ScoreRange | undefined;
}

const renderRangeLabel = (range: ScoreRange, t: any): string => {
  if (range.label) return range.label;
  if (range.labelKey === 'low') return t.questionnaires_manage.interpretationRangeLow;
  if (range.labelKey === 'medium') return t.questionnaires_manage.interpretationRangeMedium;
  return t.questionnaires_manage.interpretationRangeHigh;
};

const ScoreHistoryGroup = ({
  group,
  compact,
  lang,
  t,
  userId,
  effectiveSubjectType,
  effectiveSubjectId,
  expandedEntries,
  answerCache,
  toggleEntry,
  getMatchedRange,
}: ScoreHistoryGroupProps) => {
  const chartData = group.entries.map((entry) => {
    const dataObj: any = {
      date: safeFormat(entry.completed_at, 'MM/dd', lang),
      score: entry.total_score,
    };
    if (entry.subscale_scores) {
      for (const [subId, val] of Object.entries(entry.subscale_scores)) {
        dataObj[subId] = val;
      }
    }
    return dataObj;
  });

  const { trends } = useQuestionnaireTrends({
    userId,
    subjectType: effectiveSubjectType,
    subjectId: effectiveSubjectId,
    questionnaireId: group.questionnaire_id,
  });

  const latestTrend = trends[0];
  const latest = group.entries[group.entries.length - 1];
  const trend = latestTrend ? latestTrend.trend_delta : 0;
  const latestRange = getMatchedRange(latest.total_score, group.scoreRanges);
  const percentage =
    group.scoringEnabled && group.maxPossibleScore > 0
      ? Math.round((latest.total_score / group.maxPossibleScore) * 100)
      : 0;

  const [interpretation, setInterpretation] = useState<{ body: string; citations: any[] } | null>(null);

  useEffect(() => {
    if (!group.questionnaire_id || latest?.total_score === undefined) return;

    const loadInterpretation = async () => {
      const { data, error } = await supabase
        .from('survey_interpretations')
        .select('*')
        .eq('survey_id', group.questionnaire_id);

      if (error || !data || data.length === 0) return;

      const matched = data.find(i => 
        i.score_min !== null && 
        i.score_max !== null && 
        latest.total_score >= i.score_min && 
        latest.total_score <= i.score_max
      ) || data.find(i => i.score_min === null && i.score_max === null);

      if (matched) {
        let citationsList: any[] = [];
        if (matched.citations && matched.citations.length > 0) {
          const { data: studyData } = await supabase
            .from('survey_studies')
            .select('title, authors, year, citation_string, url, doi')
            .in('id', matched.citations);
          if (studyData) {
            citationsList = studyData;
          }
        }

        setInterpretation({
          body: lang === 'hu' ? matched.body_hu : matched.body_en,
          citations: citationsList
        });
      } else {
        setInterpretation(null);
      }
    };

    loadInterpretation();
  }, [group.questionnaire_id, latest?.total_score, lang]);

  return (
    <div className={`rounded-[1.5rem] border border-border/60 ${compact ? 'p-3 space-y-3' : 'p-4 space-y-4'}`}>
            {!compact && (
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
                {group.scoringEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">{latest.total_score}</span>
                    {trend !== 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-xs font-medium flex items-center gap-1 ${
                          trend > 0 ? 'bg-primary/10 text-primary' : trend < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {trend !== 0 && <FTrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />}
                        {trend > 0 ? '+' : ''}
                        {trend}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            {compact && group.scoringEnabled && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.questionnaires_manage.detailPanelTitle}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">{latest.total_score}</span>
                  {trend !== 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                        trend > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {trend > 0 ? '+' : ''}
                      {trend}
                    </span>
                  )}
                </div>
              </div>
            )}

            {group.scoringEnabled && group.maxPossibleScore > 0 && (
              <div className="space-y-1.5">
                <Progress value={percentage} className="h-2 rounded-full" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {latest.total_score} / {group.maxPossibleScore}
                  </span>
                  {latestRange && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {renderRangeLabel(latestRange, t)}
                    </span>
                  )}
                </div>
                {interpretation && (
                  <div className="rounded-xl border border-border/50 bg-background/50 p-2.5 text-left space-y-1.5 mt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.questionnaires_manage.interpretation}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {interpretation.body}
                    </p>
                    {interpretation.citations.length > 0 && (
                      <div className="border-t border-border/30 pt-1.5 space-y-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          {t.questionnaires_manage.citationTitle}
                        </span>
                        <ul className="space-y-1 pl-0 list-none">
                          {interpretation.citations.map((cite, i) => (
                            <li key={i} className="text-[9px] text-muted-foreground leading-snug">
                              {cite.url || cite.doi ? (
                                <a
                                  href={cite.url || `https://doi.org/${cite.doi}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline hover:text-primary transition-colors block font-medium"
                                >
                                  {cite.citation_string || `${cite.authors || 'Unknown'} (${cite.year || 'n.d.'}). ${cite.title}`}
                                </a>
                              ) : (
                                <span>
                                  {cite.citation_string || `${cite.authors || 'Unknown'} (${cite.year || 'n.d.'}). ${cite.title}`}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!group.scoringEnabled && (
              <div className="flex items-center gap-2 rounded-xl bg-accent/20 px-3 py-2.5">
                <FClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t.questionnaires_manage.completionSummary.replace('{count}', String(group.entries.length))}
                </span>
              </div>
            )}

            {group.scoringEnabled && group.entries.length > 1 && (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                     <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    {group.subscales && (group.subscales as unknown as Subscale[]).map((sub, idx) => {
                      const name = lang === 'en' ? sub.name.en || sub.id : sub.name.hu || sub.id;
                      const colors = [
                        '#10B981', // Emerald
                        '#3B82F6', // Blue
                        '#F59E0B', // Amber
                        '#EC4899', // Pink
                        '#8B5CF6'  // Violet
                      ];
                      const color = colors[idx % colors.length];
                      return (
                        <Line
                          key={sub.id}
                          type="monotone"
                          dataKey={sub.id}
                          name={name}
                          stroke={color}
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={{ r: 2 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

      <div className="space-y-1">
              {group.entries
                .slice()
                .reverse()
                .slice(0, 10)
                .map((entry) => {
                  const isOpen = expandedEntries.has(entry.id);
                  const answers = answerCache[entry.id];
                  const entryRange = getMatchedRange(entry.total_score, group.scoreRanges);

                  return (
                    <Collapsible key={entry.id} open={isOpen} onOpenChange={() => toggleEntry(entry.id)}>
                      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-xs transition-colors hover:bg-accent/30">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <FClock className="h-3 w-3" />
                          <span>{safeFormat(entry.completed_at, 'PPp', lang)}</span>
                          {entryRange && (
                            <span className="rounded-full bg-accent/30 px-1.5 py-0.5 text-[10px]">
                              {renderRangeLabel(entryRange, t)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">
                            {group.scoringEnabled
                              ? `${entry.total_score} ${t.questionnaires_manage.points}`
                              : safeFormat(entry.completed_at, 'PP', lang)}
                          </span>
                          <FChevronDown
                            className={`h-3 w-3 text-muted-foreground transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-1.5 px-2 pb-2 pt-1">
                          {/* Subscale scores breakdown */}
                          {group.subscales && (group.subscales as unknown as Subscale[]).length > 0 && entry.subscale_scores && (
                            <div className="mb-2 pb-2 border-b border-border/30 space-y-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t.questionnaires_manage.subscaleScores}
                              </p>
                              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                {(group.subscales as unknown as Subscale[]).map((sub) => {
                                  const score = (entry.subscale_scores as Record<string, number>)[sub.id] ?? 0;
                                  const name = lang === 'en' ? sub.name.en || sub.id : sub.name.hu || sub.id;
                                  const typeLabel = sub.type === 'average' ? t.questionnaires_manage.subscaleTypeAverage : t.questionnaires_manage.subscaleTypeSum;

                                  const matchedRange = (sub.score_ranges || []).find(r => score >= r.min && score <= r.max);
                                  const matchedLabel = matchedRange ? (lang === 'en' ? matchedRange.label.en : matchedRange.label.hu) : null;

                                  return (
                                    <div key={sub.id} className="flex justify-between items-center bg-accent/10 rounded-lg px-2 py-1 text-[10px] border border-border/10">
                                      <div className="text-left">
                                        <span className="font-medium text-foreground">{name}</span>
                                        <span className="text-[8px] text-muted-foreground ml-1.5">({typeLabel})</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {matchedLabel && (
                                          <span className="text-[9px] font-semibold text-primary">
                                            {matchedLabel}
                                          </span>
                                        )}
                                        <span className="font-bold text-foreground">{score}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {!answers && (
                            <p className="text-[11px] text-muted-foreground">{t.loading}</p>
                          )}
                          {answers?.map((answer, index) => (
                            <div
                              key={`${entry.id}-${index}`}
                              className="flex items-start justify-between gap-3 rounded-lg bg-accent/20 px-2 py-1.5 text-[11px]"
                            >
                              <span className="flex-1 text-muted-foreground">
                                {index + 1}. {answer.question_text}
                              </span>
                              <span className="shrink-0 font-medium text-foreground">{answer.answer}</span>
                            </div>
                          ))}
                          {answers?.length === 0 && (
                            <p className="text-[11px] italic text-muted-foreground">
                              {t.questionnaires_manage.noAnswersRecorded}
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
      </div>
    </div>
  );
};

export default ScoreHistory;
