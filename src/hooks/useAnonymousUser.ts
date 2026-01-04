import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const USER_ID_KEY = 'anonymous_user_id';
const USER_NAME_KEY = 'user_display_name';

export const useAnonymousUser = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      // First check for Supabase session (Google auth)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is logged in with Google - use their Supabase ID
        setUserId(session.user.id);
        
        // Update localStorage for consistency
        localStorage.setItem(USER_ID_KEY, session.user.id);
        const googleName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          session.user.email || 
                          'User';
        localStorage.setItem(USER_NAME_KEY, googleName);
        return;
      }
      
      // Fall back to guest user
      const storedUserId = localStorage.getItem(USER_ID_KEY);
      
      if (!storedUserId) {
        navigate('/login');
        return;
      }
      
      setUserId(storedUserId);
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        localStorage.setItem(USER_ID_KEY, session.user.id);
        const googleName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          session.user.email || 
                          'User';
        localStorage.setItem(USER_NAME_KEY, googleName);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return userId;
};

export const getUserDisplayName = async (): Promise<string> => {
  // First check for Supabase session (Google auth)
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    return session.user.user_metadata?.full_name || 
           session.user.user_metadata?.name || 
           session.user.email || 
           'User';
  }
  
  return localStorage.getItem(USER_NAME_KEY) || 'Guest User';
};

// Synchronous version for places that can't await
export const getUserDisplayNameSync = (): string => {
  return localStorage.getItem(USER_NAME_KEY) || 'Guest User';
};
