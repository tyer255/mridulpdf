import { Home, PlusCircle, Lock, User } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const BottomNav = () => {
  const location = useLocation();
  
  // Hide bottom nav on login page and splash screen
  if (location.pathname === '/login' || location.pathname === '/') {
    return null;
  }
  
  const isActive = (path: string) => {
    if (path === '/home') {
      return location.pathname === '/home';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/add', icon: PlusCircle, label: 'Create' },
    { path: '/library', icon: Lock, label: 'Private PDFs' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="glass-strong border-t border-border/50 shadow-[0_-4px_20px_-5px_hsl(var(--foreground)/0.1)]">
        <div className="flex items-center justify-around h-16 app-container px-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 relative',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {active && (
                  <div className="absolute -top-0.5 w-12 h-1 rounded-full gradient-primary shadow-[0_0_10px_0_hsl(var(--primary)/0.5)]" />
                )}
                <div className={cn(
                  'p-1.5 rounded-xl transition-all duration-200',
                  active && 'bg-primary/10'
                )}>
                  <Icon className={cn(
                    'w-5 h-5 transition-transform duration-200',
                    active && 'scale-110'
                  )} />
                </div>
                <span className={cn(
                  'text-[10px] font-medium transition-all duration-200 truncate max-w-[60px]',
                  active && 'font-semibold'
                )}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
