import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserRole, SELF_SELECT_ROLES, ROLE_LABELS, AppRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FDownload } from '@/components/icons/FreudIcons';
import ConsentDashboard from '@/components/consent/ConsentDashboard';

const Profile = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { roles, setRole, loading: roleLoading } = useUserRole();
  const selfSelectRole = roles.find(r => SELF_SELECT_ROLES.includes(r)) ?? null;
  const adminRoles = roles.filter(r => !SELF_SELECT_ROLES.includes(r));
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name); });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({ display_name: displayName }).eq('user_id', user.id);
    toast.success(t.profile.profileUpdated); setSaving(false);
  };

  const handleRoleChange = async (newRole: string) => {
    await setRole(newRole as AppRole);
    toast.success(t.profile.profileUpdated);
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
    <DashboardLayout>
      <div className="max-w-lg mx-auto w-full space-y-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.profile.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.profile.subtitle}</p>
        </div>

        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.profile.profileSection}</h2>
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

        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.profile.roleFraming}</h2>
          {roleLoading ? (
            <p className="text-sm text-muted-foreground">{t.loading}</p>
          ) : (
            <>
              <RadioGroup value={selfSelectRole ?? ''} onValueChange={handleRoleChange} className="space-y-2">
                <div className="flex items-center space-x-3 border border-border rounded-2xl p-3.5 hover:bg-accent/30 transition-colors">
                  <RadioGroupItem value="affected_person" id="role_ap" />
                  <div>
                    <Label htmlFor="role_ap" className="text-sm font-semibold cursor-pointer">{t.auth.affectedPerson}</Label>
                    <p className="text-xs text-muted-foreground">{t.auth.affectedPersonDesc}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 border border-border rounded-2xl p-3.5 hover:bg-accent/30 transition-colors">
                  <RadioGroupItem value="observer" id="role_ob" />
                  <div>
                    <Label htmlFor="role_ob" className="text-sm font-semibold cursor-pointer">{t.auth.observer}</Label>
                    <p className="text-xs text-muted-foreground">{t.auth.observerDesc}</p>
                  </div>
                </div>
              </RadioGroup>
              {adminRoles.length > 0 && (
                <div className="pt-2 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t.profile.adminAssigned}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {adminRoles.map(r => (
                      <Badge key={r} variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">
                        {ROLE_LABELS[r]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.profile.yourData}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.profile.yourDataDesc}</p>
          <Button onClick={handleExport} size="sm" variant="outline" className="rounded-2xl">
            <FDownload className="h-4 w-4 mr-1.5" /> {t.profile.exportAllData}
          </Button>
        </div>
        <ConsentDashboard />

        <Button variant="outline" onClick={signOut} size="sm" className="rounded-2xl">{t.signOut}</Button>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
