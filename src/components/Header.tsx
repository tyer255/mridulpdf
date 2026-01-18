import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const { user, loading, getUserDisplayName, getUserAvatar, getUserId } = useAuth();
  const displayId = getUserId()?.slice(0, 8) || '';
  const avatar = getUserAvatar();
  const displayName = getUserDisplayName();

  if (loading || !displayId) return null;

  return (
    <div className="sticky top-0 z-40 glass-strong border-b border-border/50 safe-top safe-x">
      <div className="px-4 py-3 flex items-center justify-between app-container">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">MRIDUL PDF</h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Share • Create • Manage</p>
          </div>
        </div>
        <Link to="/profile">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          >
            {avatar ? (
              <img 
                src={avatar} 
                alt={displayName} 
                className="w-7 h-7 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            )}
            <span className="text-xs font-medium text-muted-foreground max-w-[80px] truncate">
              {user ? displayName.split(' ')[0] : `${displayId}...`}
            </span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Header;
