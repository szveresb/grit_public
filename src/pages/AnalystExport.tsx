import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FBarChart, FDownload, FShieldAlert } from '@/components/icons/FreudIcons';

const AnalystExport = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { hasAnyRole, loading: roleLoading } = useUserRole();
  const [downloading, setDownloading] = useState(false);
  const canAccess = hasAnyRole('analyst', 'admin');

  const handleExport = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Not authenticated'); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyst-export`, {
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const body = await res.json();
      if (!res.ok) { toast.error(body.message || body.error || 'Export failed'); return; }
      const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `analyst-export-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
      toast.success(t.analystExport.exported);
    } catch { toast.error('Export failed'); } finally { setDownloading(false); }
  };

  if (roleLoading) return <DashboardLayout><p className="text-sm text-muted-foreground">{t.loading}</p></DashboardLayout>;

  if (!canAccess) {
    return (
      <DashboardLayout>
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <FShieldAlert className="h-5 w-5" />
            <h1 className="text-xl font-bold tracking-tight">{t.analystExport.accessDenied}</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.analystExport.accessDeniedDesc}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t.analystExport.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.analystExport.subtitle}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <FBarChart className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1 text-sm text-muted-foreground leading-relaxed">
              <p>{t.analystExport.depersonalised}</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>{t.analystExport.journalCounts}</li>
                <li>{t.analystExport.questionnaireDist}</li>
                <li>{t.analystExport.roleDist}</li>
              </ul>
              <p className="pt-2 text-xs">{t.analystExport.privacyNote}</p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={downloading} size="sm" className="rounded-2xl">
            <FDownload className="h-4 w-4 mr-1.5" />
            {downloading ? t.analystExport.exporting : t.analystExport.downloadData}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalystExport;
