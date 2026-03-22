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

  // 1. Wait for auth to resolve
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground font-mono">Loading...</p>
      </div>
    );
  }

  // 2. No user → login
  if (!user) return <Navigate to={isEn ? '/en/auth' : '/auth'} replace />;

  // 3. Wait for consent data to load (only after user is confirmed)
  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground font-mono">Loading...</p>
      </div>
    );
  }

  // 4. Consent not completed → onboarding
  if (!skipConsentCheck && !consentCompleted) {
    return <Navigate to={isEn ? '/en/consent' : '/consent'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
