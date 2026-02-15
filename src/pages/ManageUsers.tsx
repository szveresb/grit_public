import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, AppRole, ROLE_LABELS, ADMIN_ONLY_ROLES, SELF_SELECT_ROLES } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { Shield, Plus, X } from 'lucide-react';

interface UserWithRoles {
  user_id: string;
  display_name: string | null;
  email?: string;
  roles: AppRole[];
}

const ALL_ROLES: AppRole[] = [...ADMIN_ONLY_ROLES, ...SELF_SELECT_ROLES];

const ManageUsers = () => {
  const { user } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = hasRole('admin');

  const fetchUsers = async () => {
    // Get all profiles (admin RLS allows this)
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name');
    // Get all roles (admin RLS allows this)
    const { data: allRoles } = await supabase.from('user_roles').select('user_id, role');

    const roleMap = new Map<string, AppRole[]>();
    (allRoles ?? []).forEach(r => {
      const existing = roleMap.get(r.user_id) ?? [];
      existing.push(r.role as AppRole);
      roleMap.set(r.user_id, existing);
    });

    const merged: UserWithRoles[] = (profiles ?? []).map(p => ({
      user_id: p.user_id,
      display_name: p.display_name,
      roles: roleMap.get(p.user_id) ?? [],
    }));

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { if (user && isAdmin) fetchUsers(); }, [user, isAdmin]);

  if (roleLoading) return <DashboardLayout><p className="text-sm text-muted-foreground">Loading...</p></DashboardLayout>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const addRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${ROLE_LABELS[role]} role`);
    fetchUsers();
  };

  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
    if (error) { toast.error(error.message); return; }
    toast.success(`Removed ${ROLE_LABELS[role]} role`);
    fetchUsers();
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Manage Users</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">Assign and revoke roles for registered users.</p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <p className="text-sm text-muted-foreground">No users found.</p>
            </div>
          ) : (
            users.map(u => {
              const missingRoles = ALL_ROLES.filter(r => !u.roles.includes(r));
              return (
                <div key={u.user_id} className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground truncate">
                      {u.display_name || 'Unnamed user'}
                    </span>
                    {u.user_id === user?.id && (
                      <Badge variant="outline" className="rounded-full text-[10px]">You</Badge>
                    )}
                  </div>

                  {/* Current roles */}
                  <div className="flex flex-wrap gap-1.5">
                    {u.roles.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No roles assigned</span>
                    )}
                    {u.roles.map(role => (
                      <Badge key={role} variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 pr-1">
                        {ROLE_LABELS[role]}
                        <button
                          onClick={() => removeRole(u.user_id, role)}
                          className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
                          title={`Remove ${ROLE_LABELS[role]}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {/* Add role buttons */}
                  {missingRoles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {missingRoles.map(role => (
                        <Button
                          key={role}
                          variant="outline"
                          size="sm"
                          className="rounded-full text-[10px] h-7 px-2.5 font-semibold uppercase tracking-wider"
                          onClick={() => addRole(u.user_id, role)}
                        >
                          <Plus className="h-3 w-3 mr-0.5" /> {ROLE_LABELS[role]}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageUsers;
