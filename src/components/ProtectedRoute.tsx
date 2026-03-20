import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipConsentCheck?: boolean;
}

const ProtectedRoute = ({ children, skipConsentCheck }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentCompleted, setConsentCompleted] = useState(true);

  useEffect(() => {
    if (!user || skipConsentCheck) { setConsentChecked(true); return; }
    supabase
      .from('profiles')
      .select('consent_completed')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setConsentCompleted(data?.consent_completed ?? false);
        setConsentChecked(true);
      });
  }, [user, skipConsentCheck]);

  if (loading || !consentChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground font-mono">Loading...</p>
      </div>
    );
  }

  if (!user) return <Navigate to={isEn ? '/en/auth' : '/auth'} replace />;

  if (!skipConsentCheck && !consentCompleted) {
    return <Navigate to={isEn ? '/en/consent' : '/consent'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
