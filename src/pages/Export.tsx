import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

const Export = () => {
  const { user } = useAuth();

  const handleExport = async () => {
    if (!user) return;
    const { data: entries } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).order('entry_date');
    const { data: responses } = await supabase.from('questionnaire_responses')
      .select('*, questionnaires(title), questionnaire_answers(question_id, answer, questionnaire_questions(question_text))')
      .eq('user_id', user.id);
    const exportData = { exported_at: new Date().toISOString(), journal_entries: entries ?? [], questionnaire_responses: responses ?? [] };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `grithu-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Data Export</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">Download all your data in a portable format.</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">Export includes all journal entries and self-check responses as JSON. This is your data — take it with you.</p>
          <Button onClick={handleExport} size="sm" className="rounded-2xl">
            <Download className="h-4 w-4 mr-1.5" /> Export All Data
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Export;
