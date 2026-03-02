import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ActionGrid from '@/components/ActionGrid';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { FBookOpen, FClipboardCheck } from '@/components/icons/FreudIcons';

interface RecentItem {
  id: string;
  type: 'journal' | 'questionnaire';
  title: string;
  date: string;
  detail?: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { t, lang, localePath } = useLanguage();
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [jRes, qRes, pRes] = await Promise.all([
        supabase.from('journal_entries').select('id, title, entry_date, impact_level').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('questionnaire_responses').select('id, completed_at, questionnaires(title)').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
      ]);

      setDisplayName(pRes.data?.display_name ?? null);

      const jItems: RecentItem[] = (jRes.data ?? []).map(j => ({
        id: j.id, type: 'journal', title: j.title, date: j.entry_date,
        detail: j.impact_level ? `${t.journal.cardImpact}: ${j.impact_level}/5` : undefined,
      }));
      const qItems: RecentItem[] = (qRes.data ?? []).map((r: any) => ({
        id: r.id, type: 'questionnaire', title: r.questionnaires?.title ?? t.nav.selfChecks, date: r.completed_at.split('T')[0],
      }));

      setItems([...jItems, ...qItems].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
            {displayName ? t.dash.welcomeUser.replace('{name}', displayName) : t.dash.welcomeBack}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.dash.yourSpace}</p>
        </div>

        <ActionGrid />

        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">{t.dash.recentActivity}</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t.loading}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.dash.noActivity}</p>
          ) : (
            <div className="space-y-1">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(localePath('/journal'))}
                  className="w-full flex items-center gap-3 py-2.5 px-3 rounded-2xl text-left hover:bg-accent/50 transition-colors"
                >
                  {item.type === 'journal' ? <FBookOpen className="h-3.5 w-3.5 text-primary shrink-0" /> : <FClipboardCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  <span className="text-sm flex-1 truncate">{item.title}</span>
                  {item.detail && <span className="text-xs text-muted-foreground hidden sm:inline">{item.detail}</span>}
                  <span className="text-xs text-muted-foreground shrink-0">{format(parseISO(item.date), 'MMM d', { locale: getDateLocale(lang) })}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
