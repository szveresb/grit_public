import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

const readOAuthError = (): string | null => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return searchParams.get("error_description")
    ?? searchParams.get("error")
    ?? hashParams.get("error_description")
    ?? hashParams.get("error");
};

const AuthCallback = () => {
  const { user, loading } = useAuth();
  const { t, localePath } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const oauthError = readOAuthError();

    if (oauthError) {
      toast.error(decodeURIComponent(oauthError.replace(/\+/g, " ")));
      navigate(localePath("/auth"), { replace: true });
      return;
    }

    if (!loading && user) {
      navigate(localePath("/journal"), { replace: true });
      return;
    }

    if (!loading && !user) {
      navigate(localePath("/auth"), { replace: true });
    }
  }, [loading, navigate, localePath, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm font-medium text-muted-foreground">{t.auth.connecting}</p>
    </div>
  );
};

export default AuthCallback;
