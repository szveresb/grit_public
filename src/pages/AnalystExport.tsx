import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BarChart3, Download, ShieldAlert } from 'lucide-react';

const AnalystExport = () => {
  const { user } = useAuth();
  const { hasAnyRole, loading: roleLoading } = useUserRole();
  const [downloading, setDownloading] = useState(false);

  const canAccess = hasAnyRole('analyst', 'admin');

  const handleExport = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Not authenticated'); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyst-export`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const body = await res.json();

      if (!res.ok) {
        toast.error(body.message || body.error || 'Export failed');
        return;
      }

      const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analyst-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Anonymised data exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setDownloading(false);
    }
  };

  if (roleLoading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground font-mono">Loading…</p>
      </DashboardLayout>
    );
  }

  if (!canAccess) {
    return (
      <DashboardLayout>
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <h1 className="text-xl font-bold tracking-tight">Access Denied</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This page is restricted to users with the Analyst or Admin role.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Analyst Export</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Download anonymised, aggregated data for analysis.
          </p>
        </div>

        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1 text-sm text-muted-foreground leading-relaxed">
              <p>The export contains <strong className="text-foreground">depersonalised</strong> aggregate data only:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Journal entry counts &amp; average impact per date</li>
                <li>Questionnaire answer distributions per question</li>
                <li>Role distribution across users</li>
              </ul>
              <p className="pt-2 text-xs">
                Data is only available when the platform has <strong className="text-foreground">10 or more</strong> active users to protect individual privacy.
              </p>
            </div>
          </div>

          <Button
            onClick={handleExport}
            disabled={downloading}
            size="sm"
            className="rounded-2xl"
          >
            <Download className="h-4 w-4 mr-1.5" />
            {downloading ? 'Exporting…' : 'Download Analyst Data'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalystExport;
