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
  setGuestAvatar: (url: string) => void;
  refreshGuestAvatar: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_AVATAR_KEY = 'guest_avatar_url';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestAvatarUrl, setGuestAvatarUrl] = useState<string | null>(() => 
    localStorage.getItem(GUEST_AVATAR_KEY)
  );

  useEffect(() => {
    let isMounted = true;

    const syncLegacyStorage = (session: Session | null) => {
      if (session?.user) {
        localStorage.setItem('anonymous_user_id', session.user.id);
        localStorage.setItem(
          'user_display_name',
          session.user.user_metadata?.full_name || session.user.email || 'User'
        );
      }
    };

    const clearLegacyStorage = () => {
      localStorage.removeItem('anonymous_user_id');
      localStorage.removeItem('user_display_name');
    };

    // 1) Subscribe first so we don't miss SIGNED_IN after redirect.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      // INITIAL_SESSION can be null/undefined while the URL/code exchange is still being processed.
      // We rely on the explicit getSession() call below to determine the initial auth state.
      if (event === 'INITIAL_SESSION') return;

      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN') {
        syncLegacyStorage(session);
      }

      if (event === 'SIGNED_OUT') {
        clearLegacyStorage();
      }
    });

    // 2) Immediately check for an existing session (also handles OAuth callback URL).
    (async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      syncLegacyStorage(session);
      setLoading(false);
    })();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    return guestAvatarUrl;
  };

  const setGuestAvatar = (url: string) => {
    localStorage.setItem(GUEST_AVATAR_KEY, url);
    setGuestAvatarUrl(url);
  };

  const refreshGuestAvatar = () => {
    setGuestAvatarUrl(localStorage.getItem(GUEST_AVATAR_KEY));
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
      setGuestAvatar,
      refreshGuestAvatar,
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
