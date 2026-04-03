import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useBetaAccess } from '@/hooks/useBetaAccess';
import { supabase } from '@/integrations/supabase/client';
import LanguageToggle from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BetaGate = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, localePath } = useLanguage();
  const { refreshAccess } = useBetaAccess();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('redeem_invite_access' as any, {
        invite_code: code.trim()
      });

      if (error) throw error;
      
      if (data === true) {
        toast.success('Access granted!');
        await refreshAccess();
        // Force navigate to protected route which will now pass the beta_access check
        navigate(localePath('/journal'));
      } else {
        toast.error('Invalid or already used invite code.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate(localePath('/auth'));
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:py-10">
      <div className="fixed inset-0 z-0 bg-background" />

      <div className="fixed right-4 top-4 z-20">
        <LanguageToggle />
      </div>

      <div className="reference-auth-card relative z-10 w-full max-w-[26rem] rounded-[2.25rem] p-6 sm:p-7 animate-fade-in text-center">
        <div className="mb-6 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            Grit.hu
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Closed Beta
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-balance">
            We are currently in a private testing phase. Please enter your invite code to gain access.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="INVITE CODE"
            className="h-12 rounded-xl text-center font-mono tracking-widest uppercase text-foreground bg-accent/30"
            required
            autoCapitalize="characters"
          />

          <Button 
            type="submit" 
            className="h-11 w-full rounded-full font-semibold"
            disabled={loading || !code.trim()}
          >
            {loading ? 'Verifying...' : 'Enter Platform'}
          </Button>
        </form>

        <div className="mt-8">
          <button 
            onClick={handleSignOut}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest font-semibold"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetaGate;
