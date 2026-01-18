import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  getUserDisplayName: () => string;
  getUserId: () => string | null;
  getUserEmail: () => string | null;
  getUserAvatar: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // If user signs in with Google, migrate guest data if needed
        if (event === 'SIGNED_IN' && session?.user) {
          // Store user info for backward compatibility
          localStorage.setItem('anonymous_user_id', session.user.id);
          localStorage.setItem('user_display_name', session.user.user_metadata?.full_name || session.user.email || 'User');
        }
        
        // Clear localStorage on sign out
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('anonymous_user_id');
          localStorage.removeItem('user_display_name');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Sync localStorage with session
      if (session?.user) {
        localStorage.setItem('anonymous_user_id', session.user.id);
        localStorage.setItem('user_display_name', session.user.user_metadata?.full_name || session.user.email || 'User');
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('anonymous_user_id');
    localStorage.removeItem('user_display_name');
  };

  const getUserDisplayName = (): string => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return localStorage.getItem('user_display_name') || 'Guest User';
  };

  const getUserId = (): string | null => {
    return user?.id || localStorage.getItem('anonymous_user_id');
  };

  const getUserEmail = (): string | null => {
    return user?.email || null;
  };

  const getUserAvatar = (): string | null => {
    return user?.user_metadata?.avatar_url || null;
  };

  const isAuthenticated = !!session;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAuthenticated,
      signOut,
      getUserDisplayName,
      getUserId,
      getUserEmail,
      getUserAvatar,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
