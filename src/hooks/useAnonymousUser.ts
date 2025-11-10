import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'anonymous_user_id';

export const useAnonymousUser = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user ID exists in localStorage
    let storedUserId = localStorage.getItem(USER_ID_KEY);
    
    if (!storedUserId) {
      // Generate new anonymous user ID
      storedUserId = uuidv4();
      localStorage.setItem(USER_ID_KEY, storedUserId);
    }
    
    setUserId(storedUserId);
  }, []);

  return userId;
};
