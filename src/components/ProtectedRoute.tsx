import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConsent } from '@/hooks/useConsent';

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipConsentCheck?: boolean;
}

const ProtectedRoute = ({ children, skipConsentCheck }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { loaded, consentCompleted } = useConsent();
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');

  if (loading || !loaded) {
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
