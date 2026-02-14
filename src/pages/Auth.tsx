import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'affected_person' | 'observer'>('affected_person');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

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
      // Get the newly created user and assign role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_roles').insert({ user_id: user.id, role });
      }
      toast.success('Account created successfully');
      navigate('/dashboard');
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg font-medium tracking-tight">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {isSignUp ? 'Register to start documenting.' : 'Access your sensemaking portal.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-xs font-mono uppercase tracking-widest">Display Name</Label>
                <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-mono uppercase tracking-widest">Email</Label>
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-mono uppercase tracking-widest">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {isSignUp && (
              <div className="space-y-3">
                <Label className="text-xs font-mono uppercase tracking-widest">Your Role</Label>
                <RadioGroup value={role} onValueChange={(v) => setRole(v as typeof role)} className="space-y-2">
                  <div className="flex items-center space-x-3 border border-border rounded-sm p-3">
                    <RadioGroupItem value="affected_person" id="affected_person" />
                    <div>
                      <Label htmlFor="affected_person" className="text-sm font-medium cursor-pointer">Affected Person</Label>
                      <p className="text-xs text-muted-foreground">You are documenting your own experiences.</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 border border-border rounded-sm p-3">
                    <RadioGroupItem value="observer" id="observer" />
                    <div>
                      <Label htmlFor="observer" className="text-sm font-medium cursor-pointer">Observer</Label>
                      <p className="text-xs text-muted-foreground">You are documenting patterns you witness.</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
