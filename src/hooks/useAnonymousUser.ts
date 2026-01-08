import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

// Legacy hook name kept to avoid refactors across the app.
// Guest accounts are removed; we now return the authenticated user's id.
export const useAnonymousUser = () => {
  const { user } = useAuth();
  return user?.id ?? null;
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
