import { Home, PlusCircle, FolderOpen } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const BottomNav = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="flex items-center justify-around h-16 max-w-screen-lg mx-auto">
        <Link
          to="/"
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
            isActive('/') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Home className={cn('w-6 h-6', isActive('/') && 'fill-current')} />
          <span className="text-xs font-medium">Home</span>
        </Link>

        <Link
          to="/add"
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
            isActive('/add') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <PlusCircle className={cn('w-6 h-6', isActive('/add') && 'fill-current')} />
          <span className="text-xs font-medium">Add</span>
        </Link>

        <Link
          to="/library"
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
            isActive('/library') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <FolderOpen className={cn('w-6 h-6', isActive('/library') && 'fill-current')} />
          <span className="text-xs font-medium">Library</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
