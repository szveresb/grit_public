import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'affected_person' | 'observer';

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
    // Remove existing roles then add new one
    await supabase.from('user_roles').delete().eq('user_id', user.id);
    await supabase.from('user_roles').insert({ user_id: user.id, role });
    await fetchRoles();
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return { roles, loading, setRole, hasRole, currentRole: roles[0] ?? null };
};
