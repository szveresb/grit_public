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

    const { data, error } = await supabase
      .from('profiles')
      .select('beta_access')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      setHasAccess(false);
    } else {
      setHasAccess(!!data.beta_access);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAccess();
  }, [user]);

  return { hasAccess, loading, refreshAccess: checkAccess };
};
