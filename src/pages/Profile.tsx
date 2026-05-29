import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FDownload } from '@/components/icons/FreudIcons';
import ConsentDashboard from '@/components/consent/ConsentDashboard';
import ManagedRelatives from '@/components/premium/ManagedRelatives';

const Profile = () => {
  const { user, signOut, setDisplayName: setAuthDisplayName, refreshDisplayName } = useAuth();
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { setDisplayName(data?.display_name ?? ''); });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const trimmedDisplayName = displayName.trim();
    const nextDisplayName = trimmedDisplayName || null;

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: nextDisplayName })
      .eq('user_id', user.id);

    if (error) {
      toast.error(t.error.submit);
      setSaving(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        display_name: nextDisplayName,
      },
    });

    if (authError) {
      toast.error(t.error.submit);
      setSaving(false);
      return;
    }

    setDisplayName(trimmedDisplayName);
    setAuthDisplayName(nextDisplayName || user.email || null);
    await refreshDisplayName();
    toast.success(t.profile.profileUpdated);
    setSaving(false);
  };

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
    toast.success(t.profile.dataExported);
  };

  return (
    <DashboardLayout showSubjectRegistry={true}>
      <div className="max-w-lg mx-auto w-full space-y-5">
        <div className="pb-3 border-b border-border/50">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.profile.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.profile.subtitle}</p>
        </div>

        <div className="surface-card p-5 sm:p-6 space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pb-3 border-b border-border/50">{t.profile.profileSection}</h2>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.profile.emailLabel}</Label>
            <Input value={user?.email ?? ''} disabled className="opacity-60 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.profile.displayNameLabel}</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="rounded-2xl" />
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-2xl">
            {saving ? t.saving : t.profile.saveChanges}
          </Button>
        </div>

        <div className="surface-card p-5 sm:p-6 space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pb-3 border-b border-border/50">{t.profile.yourData}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.profile.yourDataDesc}</p>
          <Button onClick={handleExport} size="sm" variant="outline" className="rounded-2xl">
            <FDownload className="h-4 w-4 mr-1.5" /> {t.profile.exportAllData}
          </Button>
        </div>
        <ManagedRelatives />
        <ConsentDashboard />

        <Button variant="outline" onClick={signOut} size="sm" className="rounded-2xl">{t.signOut}</Button>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
