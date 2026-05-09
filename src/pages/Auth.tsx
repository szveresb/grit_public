import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import LanguageToggle from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const role = 'affected_person' as const;
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const { signUp, signIn, user, loading: authLoading } = useAuth();
  const { t, localePath } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      navigate(localePath('/journal'));
    }
  }, [user, authLoading, navigate, localePath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('user_roles').insert({ user_id: user.id, role });
      }

      toast.success(t.auth.welcomeToast);
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth('apple', { redirect_uri: window.location.origin });
    if (error) {
      toast.error(error.message);
      setAppleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:py-10">
      <div className="fixed inset-0 z-0 bg-background" />

      <div className="fixed right-4 top-4 z-20">
        <LanguageToggle />
      </div>

      <div className="reference-auth-card relative z-10 w-full max-w-[26rem] rounded-[2.25rem] p-6 sm:p-7 animate-fade-in">
        <div className="mb-6 text-center">
          <h1 className="text-[1.7rem] font-bold tracking-tight text-foreground sm:text-[1.85rem]">
            {isSignUp ? t.auth.createYourSpace : t.auth.welcomeBack}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
            {isSignUp ? t.auth.beginJourney : t.auth.returnSanctuary}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t.auth.displayName}
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t.auth.yourName}
                className="reference-auth-field h-10 rounded-full px-4 text-sm sm:h-11"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t.auth.email}
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="reference-auth-field h-10 rounded-full px-4 text-sm sm:h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t.auth.password}
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="........"
              className="reference-auth-field h-10 rounded-full px-4 text-sm sm:h-11"
            />
          </div>


          <Button type="submit" className="reference-auth-button h-10 w-full rounded-full text-sm font-semibold hover:bg-primary sm:h-11" disabled={loading}>
            {loading ? t.auth.pleaseWait : isSignUp ? t.auth.createAccount : t.auth.signIn}
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 font-semibold tracking-[0.18em] text-muted-foreground">{t.or}</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <Button variant="outline" className="reference-auth-field h-10 w-full rounded-full text-sm font-medium hover:bg-card sm:h-11" disabled={googleLoading} onClick={handleGoogleSignIn}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {googleLoading ? t.auth.connecting : t.auth.continueGoogle}
          </Button>

          <Button variant="outline" className="reference-auth-field h-10 w-full rounded-full text-sm font-medium hover:bg-card sm:h-11" disabled={appleLoading} onClick={handleAppleSignIn}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            {appleLoading ? t.auth.connecting : t.auth.continueApple}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest font-semibold"
          >
            {isSignUp ? t.auth.alreadyHaveAccount : t.auth.noAccount}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
