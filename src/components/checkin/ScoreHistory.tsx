import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FClock, FChevronDown } from '@/components/icons/FreudIcons';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ScoreEntry {
  id: string;
  questionnaire_id: string;
  questionnaire_title: string;
  total_score: number;
  completed_at: string;
}

interface AnswerDetail {
  question_text: string;
  answer: string;
}

interface GroupedScores {
  questionnaire_id: string;
  title: string;
  entries: ScoreEntry[];
  scoreRanges: ScoreRange[];
  maxPossibleScore: number;
}

interface ScoreRange {
  min: number;
  max: number;
  label: string;
  description?: string;
}

const ScoreHistory = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const dateLocale = getDateLocale(lang);
  const [groups, setGroups] = useState<GroupedScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [answerCache, setAnswerCache] = useState<Record<string, AnswerDetail[]>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: responses } = await supabase
        .from('questionnaire_responses')
        .select('id, questionnaire_id, total_score, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: true });

      if (!responses || responses.length === 0) {
        setLoading(false);
        return;
      }

      const qIds = [...new Set(responses.map(r => r.questionnaire_id))];
      const { data: questionnaires } = await supabase
        .from('questionnaires')
        .select('id, title, score_ranges, scoring_mode')
        .in('id', qIds);

      // Fetch questions to calculate max possible score
      const { data: questions } = await supabase
        .from('questionnaire_questions')
        .select('questionnaire_id, question_type, options, answer_scores')
        .in('questionnaire_id', qIds);

      const titleMap = new Map((questionnaires ?? []).map(q => [q.id, q]));

      // Calculate max possible score per questionnaire
      const maxScoreMap = new Map<string, number>();
      for (const qId of qIds) {
        const qInfo = titleMap.get(qId);
        const qs = (questions ?? []).filter(q => q.questionnaire_id === qId);
        let maxTotal = 0;
        for (const q of qs) {
          if (q.question_type === 'text') continue;
          const scores = q.answer_scores as Record<string, number> | null;
          if (qInfo?.scoring_mode === 'weighted' && scores) {
            maxTotal += Math.max(...Object.values(scores), 0);
          } else if (q.question_type === 'scale') {
            const opts = q.options as string[] | null;
            if (scores && Object.keys(scores).length > 0) {
              maxTotal += Math.max(...Object.values(scores), 0);
            } else {
              maxTotal += opts && opts.length >= 2 ? Number(opts[1]) || 5 : 5;
            }
          } else if (q.question_type === 'yes_no') {
            maxTotal += 1;
          } else if (q.question_type === 'multiple_choice') {
            maxTotal += ((q.options as string[] | null) ?? []).length;
          }
        }
        maxScoreMap.set(qId, maxTotal);
      }

      const grouped = new Map<string, GroupedScores>();
      for (const r of responses) {
        if (!grouped.has(r.questionnaire_id)) {
          const qInfo = titleMap.get(r.questionnaire_id);
          grouped.set(r.questionnaire_id, {
            questionnaire_id: r.questionnaire_id,
            title: qInfo?.title ?? '',
            entries: [],
            scoreRanges: (qInfo?.score_ranges as unknown as ScoreRange[]) ?? [],
            maxPossibleScore: maxScoreMap.get(r.questionnaire_id) ?? 0,
          });
        }
        grouped.get(r.questionnaire_id)!.entries.push({
          id: r.id,
          questionnaire_id: r.questionnaire_id,
          questionnaire_title: titleMap.get(r.questionnaire_id)?.title ?? '',
          total_score: r.total_score!,
          completed_at: r.completed_at,
        });
      }

      setGroups(Array.from(grouped.values()));
      setLoading(false);
    };
    load();
  }, [user]);

  const toggleEntry = useCallback(async (responseId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
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
      .order('questionnaire_questions(sort_order)' as any);

    const details: AnswerDetail[] = ((data ?? []) as any[])
      .sort((a, b) => (a.questionnaire_questions?.sort_order ?? 0) - (b.questionnaire_questions?.sort_order ?? 0))
      .map((a: any) => ({
        question_text: a.questionnaire_questions?.question_text ?? '',
        answer: typeof a.answer === 'string' ? a.answer.replace(/^"|"$/g, '') : JSON.stringify(a.answer),
      }));

    setAnswerCache(prev => ({ ...prev, [responseId]: details }));
  }, [answerCache]);

  const getMatchedRange = (score: number, ranges: ScoreRange[]) =>
    ranges.find(r => score >= r.min && score <= r.max);

  if (loading) return <p className="text-sm text-muted-foreground">{t.loading}</p>;
  if (groups.length === 0) return <p className="text-sm text-muted-foreground">{t.questionnaires_manage.scoreHistoryEmpty}</p>;

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const chartData = group.entries.map(e => ({
          date: format(new Date(e.completed_at), 'MM/dd', { locale: dateLocale }),
          score: e.total_score,
          fullDate: e.completed_at,
        }));

        const latest = group.entries[group.entries.length - 1];
        const prev = group.entries.length >= 2 ? group.entries[group.entries.length - 2] : null;
        const trend = prev ? latest.total_score - prev.total_score : 0;
        const latestRange = getMatchedRange(latest.total_score, group.scoreRanges);
        const pct = group.maxPossibleScore > 0 ? Math.round((latest.total_score / group.maxPossibleScore) * 100) : 0;

        return (
          <div key={group.questionnaire_id} className="border border-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{latest.total_score}</span>
                {trend !== 0 && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    trend > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {trend > 0 ? '+' : ''}{trend}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar + matched range */}
            {group.maxPossibleScore > 0 && (
              <div className="space-y-1.5">
                <Progress value={pct} className="h-2 rounded-full" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {latest.total_score} / {group.maxPossibleScore}
                  </span>
                  {latestRange && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {latestRange.label}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Chart */}
            {group.entries.length > 1 && (
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
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Entries with expandable answers */}
            <div className="space-y-1">
              {group.entries.slice().reverse().slice(0, 10).map((e) => {
                const isOpen = expandedEntries.has(e.id);
                const answers = answerCache[e.id];
                const entryRange = getMatchedRange(e.total_score, group.scoreRanges);

                return (
                  <Collapsible key={e.id} open={isOpen} onOpenChange={() => toggleEntry(e.id)}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between text-xs px-2 py-2 rounded-xl hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <FClock className="h-3 w-3" />
                        <span>{format(new Date(e.completed_at), 'PPp', { locale: dateLocale })}</span>
                        {entryRange && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border">
                            {entryRange.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">
                          {e.total_score} {t.questionnaires_manage.points}
                        </span>
                        <FChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-2 pb-2 pt-1 space-y-1.5">
                        {!answers && (
                          <p className="text-[11px] text-muted-foreground">{t.loading}</p>
                        )}
                        {answers?.map((a, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 text-[11px] px-2 py-1.5 rounded-lg bg-accent/20">
                            <span className="text-muted-foreground flex-1">{i + 1}. {a.question_text}</span>
                            <span className="font-medium text-foreground shrink-0">{a.answer}</span>
                          </div>
                        ))}
                        {answers?.length === 0 && (
                          <p className="text-[11px] text-muted-foreground">{t.questionnaires_manage.scoreHistoryEmpty}</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScoreHistory;
