import { useEffect, useState } from 'react';
import { friendlyDbError } from '@/lib/db-error';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { FMessageCircle, FClock, FUser } from '@/components/icons/FreudIcons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FeedbackItem {
  id: string;
  user_id: string;
  kind: 'bug' | 'unclear' | 'idea' | 'praise' | 'question';
  summary: string;
  message: string | null;
  urgency: 'low' | 'medium' | 'high' | null;
  page_path: string | null;
  locale: string | null;
  viewport: string | null;
  context_json: any;
  created_at: string;
  user_name?: string;
}

const ManageFeedback = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { hasRole, loading: roleLoading } = useUserRole();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKind, setFilterKind] = useState<string>('all');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const isAdmin = hasRole('admin');

  const fetchFeedback = async () => {
    setLoading(true);
    const { data: feedbackData, error } = await supabase
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(friendlyDbError(error));
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name');
    const profileMap = new Map<string, string>();
    (profiles ?? []).forEach(p => {
      if (p.display_name) profileMap.set(p.user_id, p.display_name);
    });

    const mappedFeedback = (feedbackData ?? []).map((item: any) => ({
      ...item,
      user_name: profileMap.get(item.user_id) || t.manageUsers.unnamedUser,
    }));

    setFeedback(mappedFeedback);
    setLoading(false);
  };

  useEffect(() => {
    if (user && isAdmin) fetchFeedback();
  }, [user, isAdmin]);

  if (roleLoading) return <DashboardLayout><p className="text-sm text-muted-foreground">{t.loading}</p></DashboardLayout>;
  if (!isAdmin) return <Navigate to="/journal" replace />;

  const filteredFeedback = feedback.filter(item => {
    const matchKind = filterKind === 'all' || item.kind === filterKind;
    const matchUrgency = filterUrgency === 'all' || item.urgency === filterUrgency;
    return matchKind && matchUrgency;
  });

  return (
    <DashboardLayout showContextToolPanel={false}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.manageFeedback.title}</h1>
          <p className="text-sm text-muted-foreground">{t.manageFeedback.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t.manageFeedback.kind}:</span>
            <Select value={filterKind} onValueChange={setFilterKind}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t.manageFeedback.filterAll} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.manageFeedback.filterAll}</SelectItem>
                <SelectItem value="bug">{t.manageFeedback.filterBug}</SelectItem>
                <SelectItem value="unclear">{t.manageFeedback.filterUnclear}</SelectItem>
                <SelectItem value="idea">{t.manageFeedback.filterIdea}</SelectItem>
                <SelectItem value="praise">{t.manageFeedback.filterPraise}</SelectItem>
                <SelectItem value="question">{t.manageFeedback.filterQuestion}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t.manageFeedback.urgency}:</span>
            <Select value={filterUrgency} onValueChange={setFilterUrgency}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t.manageFeedback.filterAll} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.manageFeedback.filterAll}</SelectItem>
                <SelectItem value="low">{t.feedback.urgencyLow}</SelectItem>
                <SelectItem value="medium">{t.feedback.urgencyMedium}</SelectItem>
                <SelectItem value="high">{t.feedback.urgencyHigh}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t.manageFeedback.loadingFeedback}</p>
        ) : filteredFeedback.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.manageFeedback.noFeedback}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFeedback.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant={
                      item.kind === 'bug' ? 'destructive' :
                      item.kind === 'idea' ? 'secondary' :
                      item.kind === 'praise' ? 'outline' : 'default'
                    }>
                      {t.manageFeedback[`filter${item.kind.charAt(0).toUpperCase() + item.kind.slice(1)}` as keyof typeof t.manageFeedback] || item.kind}
                    </Badge>
                    {item.urgency && (
                      <Badge variant={
                        item.urgency === 'high' ? 'destructive' :
                        item.urgency === 'medium' ? 'default' : 'secondary'
                      }>
                        {item.urgency === 'high' ? t.feedback.urgencyHigh :
                         item.urgency === 'medium' ? t.feedback.urgencyMedium : t.feedback.urgencyLow}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-2">{item.summary}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1">
                    <FUser className="h-3 w-3" /> {item.user_name}
                  </CardDescription>
                  <CardDescription className="text-xs flex items-center gap-1">
                    <FClock className="h-3 w-3" /> {new Date(item.created_at).toLocaleString(item.locale || 'hu-HU')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{item.message}</p>
                  <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
                    <p><strong>{t.manageFeedback.page}:</strong> {item.page_path}</p>
                    <p><strong>{t.manageFeedback.context}:</strong> {item.viewport} | {item.locale}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageFeedback;
