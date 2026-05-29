import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  displayName: string | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshDisplayName: () => Promise<void>;
  setDisplayName: (displayName: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const displayNameRequestRef = useRef(0);

  const fetchDisplayName = useCallback(async (targetUser: User | null) => {
    const requestId = ++displayNameRequestRef.current;

    if (!targetUser) {
      if (requestId === displayNameRequestRef.current) {
        setDisplayName(null);
      }
      return;
    }

    const fallbackName =
      targetUser.user_metadata?.display_name ??
      targetUser.email ??
      null;

    const { data, error } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', targetUser.id)
      .maybeSingle();

    if (requestId !== displayNameRequestRef.current) {
      return;
    }

    if (error) {
      setDisplayName(fallbackName);
      return;
    }

    setDisplayName(data?.display_name?.trim() || fallbackName);
  }, []);

  const refreshDisplayName = useCallback(async () => {
    await fetchDisplayName(user);
  }, [fetchDisplayName, user]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      void fetchDisplayName(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      void fetchDisplayName(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchDisplayName]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        displayName,
        loading,
        signUp,
        signIn,
        signOut,
        refreshDisplayName,
        setDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
