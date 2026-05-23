import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { friendlyDbError } from '@/lib/db-error';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FActivity, FCheck, FAlert, FClock } from '@/components/icons/FreudIcons';

interface MonitorCheck {
  id: string;
  checked_at: string;
  target: string;
  status: string;
  http_status: number | null;
  latency_ms: number | null;
  error_message: string | null;
}

interface MonitorState {
  last_status: string;
  last_status_at: string;
  consecutive_failures: number;
  last_failure_reason: string | null;
  updated_at: string;
}

const Monitoring = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { hasRole, loading: roleLoading } = useUserRole();
  const isAdmin = hasRole('admin');

  const [checks, setChecks] = useState<MonitorCheck[]>([]);
  const [state, setState] = useState<MonitorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: checkRows, error: checkErr }, { data: stateRow }] = await Promise.all([
      supabase.from('monitor_checks').select('*').order('checked_at', { ascending: false }).limit(200),
      supabase.from('monitor_state').select('*').eq('id', 1).maybeSingle(),
    ]);
    if (checkErr) {
      toast.error(friendlyDbError(checkErr));
    } else {
      setChecks((checkRows ?? []) as MonitorCheck[]);
    }
    if (stateRow) setState(stateRow as MonitorState);
    setLoading(false);
  };

  useEffect(() => {
    if (user && isAdmin) fetchData();
  }, [user, isAdmin]);

  if (roleLoading) {
    return <DashboardLayout><p className="text-sm text-muted-foreground">{t.loading}</p></DashboardLayout>;
  }
  if (!isAdmin) return <Navigate to="/journal" replace />;

  const targets = Array.from(new Set(checks.map(c => c.target)));
  const filtered = checks.filter(c =>
    (targetFilter === 'all' || c.target === targetFilter) &&
    (statusFilter === 'all' || c.status === statusFilter)
  );

  const latestByTarget = new Map<string, MonitorCheck>();
  checks.forEach(c => { if (!latestByTarget.has(c.target)) latestByTarget.set(c.target, c); });

  const overallOk = state?.last_status === 'ok';

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <FActivity className="h-6 w-6 text-primary" />
              Uptime monitoring
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live health checks for grit.hu — runs every 5 minutes.
            </p>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </header>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {overallOk ? (
                <FCheck className="h-5 w-5 text-emerald-600" />
              ) : (
                <FAlert className="h-5 w-5 text-destructive" />
              )}
              Current status: {state ? state.last_status.toUpperCase() : 'unknown'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {state ? (
              <>
                <p className="text-muted-foreground">
                  Since {formatDistanceToNow(new Date(state.last_status_at), { addSuffix: true })}
                  {state.consecutive_failures > 0 && ` · ${state.consecutive_failures} consecutive failures`}
                </p>
                {state.last_failure_reason && (
                  <p className="text-destructive text-xs">{state.last_failure_reason}</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No state recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from(latestByTarget.entries()).map(([target, c]) => (
            <Card key={target} className="surface-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium truncate">{target}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Badge variant={c.status === 'ok' ? 'default' : 'destructive'}>
                  {c.status}
                </Badge>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FClock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(c.checked_at), { addSuffix: true })}
                </p>
                {c.latency_ms != null && (
                  <p className="text-xs text-muted-foreground">{c.latency_ms} ms</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Check history</CardTitle>
            <div className="flex gap-2 flex-wrap pt-2">
              <Select value={targetFilter} onValueChange={setTargetFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Target" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All targets</SelectItem>
                  {targets.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                  <SelectItem value="down">Down</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Target</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">HTTP</th>
                    <th className="py-2 pr-4">Latency</th>
                    <th className="py-2 pr-4">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">{new Date(c.checked_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{c.target}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={c.status === 'ok' ? 'default' : 'destructive'}>{c.status}</Badge>
                      </td>
                      <td className="py-2 pr-4">{c.http_status ?? '—'}</td>
                      <td className="py-2 pr-4">{c.latency_ms != null ? `${c.latency_ms} ms` : '—'}</td>
                      <td className="py-2 pr-4 text-destructive text-xs max-w-md truncate">{c.error_message ?? ''}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No checks recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Monitoring;
