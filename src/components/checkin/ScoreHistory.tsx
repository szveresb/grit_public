import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FClock } from '@/components/icons/FreudIcons';

interface ScoreEntry {
  id: string;
  questionnaire_id: string;
  questionnaire_title: string;
  total_score: number;
  completed_at: string;
}

interface GroupedScores {
  questionnaire_id: string;
  title: string;
  entries: ScoreEntry[];
}

const ScoreHistory = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const dateLocale = getDateLocale(lang);
  const [groups, setGroups] = useState<GroupedScores[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Fetch responses with scores
      const { data: responses } = await supabase
        .from('questionnaire_responses')
        .select('id, questionnaire_id, total_score, completed_at')
        .eq('user_id', user.id)
        .not('total_score', 'is', null)
        .order('completed_at', { ascending: true });

      if (!responses || responses.length === 0) {
        setLoading(false);
        return;
      }

      // Get questionnaire titles
      const qIds = [...new Set(responses.map(r => r.questionnaire_id))];
      const { data: questionnaires } = await supabase
        .from('questionnaires')
        .select('id, title')
        .in('id', qIds);

      const titleMap = new Map((questionnaires ?? []).map(q => [q.id, q.title]));

      // Group by questionnaire
      const grouped = new Map<string, GroupedScores>();
      for (const r of responses) {
        if (!grouped.has(r.questionnaire_id)) {
          grouped.set(r.questionnaire_id, {
            questionnaire_id: r.questionnaire_id,
            title: titleMap.get(r.questionnaire_id) ?? '',
            entries: [],
          });
        }
        grouped.get(r.questionnaire_id)!.entries.push({
          id: r.id,
          questionnaire_id: r.questionnaire_id,
          questionnaire_title: titleMap.get(r.questionnaire_id) ?? '',
          total_score: r.total_score!,
          completed_at: r.completed_at,
        });
      }

      setGroups(Array.from(grouped.values()));
      setLoading(false);
    };
    load();
  }, [user]);

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

            {/* Chart - only show if more than 1 entry */}
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

            {/* Recent entries list */}
            <div className="space-y-1.5">
              {group.entries.slice().reverse().slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-xl hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FClock className="h-3 w-3" />
                    <span>{format(new Date(e.completed_at), 'PPp', { locale: dateLocale })}</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {e.total_score} {t.questionnaires_manage.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScoreHistory;
