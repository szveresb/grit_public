import { useEffect, useState } from 'react';
import { friendlyDbError } from '@/lib/db-error';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserRole, AppRole, ROLE_LABELS, ADMIN_ONLY_ROLES, SELF_SELECT_ROLES } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { FShield, FPlus, FClose } from '@/components/icons/FreudIcons';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserWithRoles { user_id: string; display_name: string | null; roles: AppRole[]; }
const ALL_ROLES: AppRole[] = [...ADMIN_ONLY_ROLES, ...SELF_SELECT_ROLES];

const ManageUsers = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { hasRole, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = hasRole('admin');

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name');
    const { data: allRoles } = await supabase.from('user_roles').select('user_id, role');
    const roleMap = new Map<string, AppRole[]>();
    (allRoles ?? []).forEach(r => { const existing = roleMap.get(r.user_id) ?? []; existing.push(r.role as AppRole); roleMap.set(r.user_id, existing); });
    setUsers((profiles ?? []).map(p => ({ user_id: p.user_id, display_name: p.display_name, roles: roleMap.get(p.user_id) ?? [] })));
    setLoading(false);
  };

  useEffect(() => { if (user && isAdmin) fetchUsers(); }, [user, isAdmin]);

  if (roleLoading) return <DashboardLayout><p className="text-sm text-muted-foreground">{t.loading}</p></DashboardLayout>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const addRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success(t.manageUsers.addedRole.replace('{role}', ROLE_LABELS[role])); fetchUsers();
  };

  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success(t.manageUsers.removedRole.replace('{role}', ROLE_LABELS[role])); fetchUsers();
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t.manageUsers.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.manageUsers.subtitle}</p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t.manageUsers.loadingUsers}</p>
          ) : users.length === 0 ? (
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <p className="text-sm text-muted-foreground">{t.manageUsers.noUsers}</p>
            </div>
          ) : (
            users.map(u => {
              const missingRoles = ALL_ROLES.filter(r => !u.roles.includes(r));
              return (
                <div key={u.user_id} className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <FShield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground truncate">{u.display_name || 'Unnamed user'}</span>
                    {u.user_id === user?.id && <Badge variant="outline" className="rounded-full text-[10px]">{t.manageUsers.you}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {u.roles.length === 0 && <span className="text-xs text-muted-foreground italic">{t.manageUsers.noRoles}</span>}
                    {u.roles.map(role => (
                      <Badge key={role} variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 pr-1">
                        {ROLE_LABELS[role]}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5" title={`Remove ${ROLE_LABELS[role]}`}>
                              <FClose className="h-3 w-3" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.manageUsers.removeRole}</AlertDialogTitle>
                              <AlertDialogDescription>{t.manageUsers.removeRoleDesc.replace('{role}', ROLE_LABELS[role]).replace('{name}', u.display_name || 'this user')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeRole(u.user_id, role)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t.delete}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </Badge>
                    ))}
                  </div>
                  {missingRoles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {missingRoles.map(role => (
                        <Button key={role} variant="outline" size="sm" className="rounded-full text-[10px] h-7 px-2.5 font-semibold uppercase tracking-wider" onClick={() => addRole(u.user_id, role)}>
                          <FPlus className="h-3 w-3 mr-0.5" /> {ROLE_LABELS[role]}
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
