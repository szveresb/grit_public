import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useBetaAccess = () => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAccess = async () => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    try {
      // 1. Check profile for explicit beta access flag or legacy status
      const { data: profile } = await supabase
        .from('profiles')
        .select('beta_access, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      // Legacy bypass: Anyone who signed up before the beta merge (May 3, 2026) is grandfathered in.
      const isLegacyUser = profile?.created_at && new Date(profile.created_at) < new Date('2026-05-03T00:00:00Z');

      if (profile?.beta_access || isLegacyUser) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // 2. Check for privileged roles that should bypass the gate
      // This ensures new admins and staff aren't locked out even if created today.
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const privilegedRoles = ['admin', 'editor', 'analyst', 'guest_editor'];
      const hasPrivilegedRole = roles?.some(r => privilegedRoles.includes(r.role));

      setHasAccess(hasPrivilegedRole || false);
    } catch (error) {
      console.error('Beta access check error:', error);
      setHasAccess(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAccess();
  }, [user]);

  return { hasAccess, loading, refreshAccess: checkAccess };
};
