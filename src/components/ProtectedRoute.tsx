import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConsent } from '@/hooks/useConsent';
import { useUserRole } from '@/hooks/useUserRole';

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipConsentCheck?: boolean;
  requiredRole?: string;
}

const ProtectedRoute = ({ children, skipConsentCheck, requiredRole }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { loaded: consentLoaded, consentCompleted } = useConsent();
  const { hasRole, loading: roleLoading } = useUserRole();
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');

  // 1. Wait for auth to resolve
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground font-mono">Loading...</p>
      </div>
    );
  }

  // 2. No user → login
  if (!user) return <Navigate to={isEn ? '/en/auth' : '/auth'} replace />;

  // 3. Wait for consent data to load
  if (!consentLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground font-mono">Loading...</p>
      </div>
    );
  }

  // 4. Consent not completed → onboarding
  // We ONLY redirect to onboarding if skipConsentCheck is false AND consent is not completed.
  if (!skipConsentCheck && !consentCompleted) {
    return <Navigate to={isEn ? '/en/consent' : '/consent'} replace />;
  }

  // 5. Role check (if requiredRole is specified)
  if (requiredRole) {
    if (roleLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground font-mono">Loading...</p>
        </div>
      );
    }
    if (!hasRole(requiredRole as any)) {
      return <Navigate to={isEn ? '/en/journal' : '/journal'} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
