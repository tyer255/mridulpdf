import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const USER_ID_KEY = 'anonymous_user_id';
const USER_NAME_KEY = 'user_display_name';

const Header = () => {
  const [displayInfo, setDisplayInfo] = useState<{
    name: string;
    avatarUrl: string | null;
    isGoogleUser: boolean;
  }>({ name: '', avatarUrl: null, isGoogleUser: false });

  useEffect(() => {
    const updateUserInfo = (session: any) => {
      if (session?.user) {
        // Google user
        const name = session.user.user_metadata?.full_name || 
                    session.user.user_metadata?.name || 
                    session.user.email || 
                    'User';
        const avatarUrl = session.user.user_metadata?.avatar_url || 
                         session.user.user_metadata?.picture || 
                         null;
        setDisplayInfo({ name, avatarUrl, isGoogleUser: true });
      } else {
        // Guest user
        const storedName = localStorage.getItem(USER_NAME_KEY) || 'Guest';
        const storedId = localStorage.getItem(USER_ID_KEY);
        if (storedId) {
          setDisplayInfo({ 
            name: storedName === 'Guest User' ? storedId.slice(0, 8) + '...' : storedName, 
            avatarUrl: null, 
            isGoogleUser: false 
          });
        }
      }
    };

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      updateUserInfo(session);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateUserInfo(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!displayInfo.name) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl font-bold text-foreground">MRIDUL PDF</h1>
      <Link to="/profile">
        <Button variant="ghost" size="sm" className="gap-2 text-foreground hover:text-foreground">
          <Avatar className="h-7 w-7">
            {displayInfo.avatarUrl ? (
              <AvatarImage src={displayInfo.avatarUrl} alt={displayInfo.name} />
            ) : null}
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {displayInfo.isGoogleUser ? getInitials(displayInfo.name) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground max-w-[100px] truncate">
            {displayInfo.isGoogleUser ? displayInfo.name.split(' ')[0] : displayInfo.name}
          </span>
        </Button>
      </Link>
    </div>
  );
};

export default Header;
