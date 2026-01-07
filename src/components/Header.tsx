import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/auth/AuthProvider';

const Header = () => {
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  const displayName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.email || 
                     'User';
  const avatarUrl = user.user_metadata?.avatar_url || 
                   user.user_metadata?.picture || 
                   null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl font-bold text-foreground">MRIDUL PDF</h1>
      <Link to="/profile">
        <Button variant="ghost" size="sm" className="gap-2 text-foreground hover:text-foreground">
          <Avatar className="h-7 w-7">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground max-w-[100px] truncate">
            {displayName.split(' ')[0]}
          </span>
        </Button>
      </Link>
    </div>
  );
};

export default Header;
