import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, SELF_SELECT_ROLES, ROLE_LABELS, AppRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

const Profile = () => {
  const { user, signOut } = useAuth();
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
    toast.success('Profile updated'); setSaving(false);
  };

  const handleRoleChange = async (newRole: string) => {
    await setRole(newRole as AppRole);
    toast.success('Role updated');
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
    a.href = url; a.download = `liftoff-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">Manage your identity, role, and data.</p>
        </div>

        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profile</h2>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</Label>
            <Input value={user?.email ?? ''} disabled className="opacity-60 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Display Name</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="rounded-2xl" />
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-2xl">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Role Framing</h2>
          {roleLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <RadioGroup value={selfSelectRole ?? ''} onValueChange={handleRoleChange} className="space-y-2">
                <div className="flex items-center space-x-3 border border-border rounded-2xl p-3.5 hover:bg-accent/30 transition-colors">
                  <RadioGroupItem value="affected_person" id="role_ap" />
                  <div>
                    <Label htmlFor="role_ap" className="text-sm font-semibold cursor-pointer">Affected Person</Label>
                    <p className="text-xs text-muted-foreground">Documenting your own experiences.</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 border border-border rounded-2xl p-3.5 hover:bg-accent/30 transition-colors">
                  <RadioGroupItem value="observer" id="role_ob" />
                  <div>
                    <Label htmlFor="role_ob" className="text-sm font-semibold cursor-pointer">Observer</Label>
                    <p className="text-xs text-muted-foreground">Documenting patterns you witness.</p>
                  </div>
                </div>
              </RadioGroup>
              {adminRoles.length > 0 && (
                <div className="pt-2 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Admin-assigned roles</p>
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
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your Data</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Download all your journal entries and self-check responses as a portable file.</p>
          <Button onClick={handleExport} size="sm" variant="outline" className="rounded-2xl">
            <Download className="h-4 w-4 mr-1.5" /> Export All Data
          </Button>
        </div>

        <Button variant="outline" onClick={signOut} size="sm" className="rounded-2xl">Sign Out</Button>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
