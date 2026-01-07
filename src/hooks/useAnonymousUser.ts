import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const useAnonymousUser = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserId(session.user.id);
        return;
      }
      
      navigate('/login');
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return userId;
};

export const getUserDisplayName = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    return session.user.user_metadata?.full_name || 
           session.user.user_metadata?.name || 
           session.user.email || 
           'User';
  }
  
  return 'User';
};

export const getUserDisplayNameSync = (): string => {
  return 'User';
};
