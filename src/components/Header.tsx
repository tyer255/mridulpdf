import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

const USER_ID_KEY = 'anonymous_user_id';

const Header = () => {
  const [guestId, setGuestId] = useState('');

  useEffect(() => {
    const storedId = localStorage.getItem(USER_ID_KEY);
    if (storedId) {
      setGuestId(storedId.slice(0, 8));
    }
  }, []);

  if (!guestId) return null;

  return (
    <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl font-bold text-foreground">MRIDUL PDF</h1>
      <Link to="/profile">
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="text-xs font-mono">{guestId}...</span>
        </Button>
      </Link>
    </div>
  );
};

export default Header;
