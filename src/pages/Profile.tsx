import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

const Profile = () => {
  const { user, signOut } = useAuth();
  const { currentRole, setRole, loading: roleLoading } = useUserRole();
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
    toast.success('Profile updated');
    setSaving(false);
  };

  const handleRoleChange = async (newRole: string) => {
    await setRole(newRole as 'affected_person' | 'observer');
    toast.success('Role updated');
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-8">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your identity and role framing.</p>
        </div>

        <div className="border border-border rounded-sm p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">Account</h2>
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest">Email</Label>
            <Input value={user?.email ?? ''} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest">Display Name</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="border border-border rounded-sm p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">Role Framing</h2>
          {roleLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <RadioGroup value={currentRole ?? ''} onValueChange={handleRoleChange} className="space-y-2">
              <div className="flex items-center space-x-3 border border-border rounded-sm p-3">
                <RadioGroupItem value="affected_person" id="role_ap" />
                <div>
                  <Label htmlFor="role_ap" className="text-sm font-medium cursor-pointer">Affected Person</Label>
                  <p className="text-xs text-muted-foreground">Documenting your own experiences.</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 border border-border rounded-sm p-3">
                <RadioGroupItem value="observer" id="role_ob" />
                <div>
                  <Label htmlFor="role_ob" className="text-sm font-medium cursor-pointer">Observer</Label>
                  <p className="text-xs text-muted-foreground">Documenting patterns you witness.</p>
                </div>
              </div>
            </RadioGroup>
          )}
        </div>

        <Button variant="outline" onClick={signOut} size="sm">Sign Out</Button>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
