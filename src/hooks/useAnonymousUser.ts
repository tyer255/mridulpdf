import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const USER_ID_KEY = 'anonymous_user_id';

export const useAnonymousUser = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user ID exists in localStorage
    const storedUserId = localStorage.getItem(USER_ID_KEY);
    
    if (!storedUserId) {
      // Redirect to login if no user ID
      navigate('/login');
      return;
    }
    
    setUserId(storedUserId);
  }, [navigate]);

  return userId;
};

export const getUserDisplayName = (): string => {
  return localStorage.getItem('user_display_name') || 'Guest User';
};
