import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'editor' | 'analyst' | 'guest_editor' | 'observer' | 'affected_person';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  analyst: 'Analyst',
  guest_editor: 'Guest Editor',
  observer: 'Observer',
  affected_person: 'Affected Person',
};

// Roles users can self-select during signup / profile
export const SELF_SELECT_ROLES: AppRole[] = ['affected_person', 'observer'];

// Roles only an admin can assign
export const ADMIN_ONLY_ROLES: AppRole[] = ['admin', 'editor', 'analyst', 'guest_editor'];

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    if (!user) { setRoles([]); setLoading(false); return; }
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    setRoles((data ?? []).map(r => r.role as AppRole));
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, [user]);

  const setRole = async (role: AppRole) => {
    if (!user) return;
    // Only allow self-selecting from permitted roles
    if (!SELF_SELECT_ROLES.includes(role)) return;
    // Remove existing self-select roles, keep admin-assigned ones
    for (const r of SELF_SELECT_ROLES) {
      if (roles.includes(r)) {
        await supabase.from('user_roles').delete().eq('user_id', user.id).eq('role', r);
      }
    }
    await supabase.from('user_roles').insert({ user_id: user.id, role });
    await fetchRoles();
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const hasAnyRole = (...checkRoles: AppRole[]) => checkRoles.some(r => roles.includes(r));

  return { roles, loading, setRole, hasRole, hasAnyRole, currentRole: roles[0] ?? null, refetch: fetchRoles };
};
