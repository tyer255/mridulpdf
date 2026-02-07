import { useEffect, useState } from 'react';

const USER_ID_KEY = 'anonymous_user_id';
const USER_NAME_KEY = 'user_display_name';

function generateGuestId(): string {
  // Prefer crypto.randomUUID when available
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (not cryptographically strong, but stable enough for guest identity)
  return `${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random().toString(16).slice(2)}`;
}

export const useAnonymousUser = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Guest users should ALWAYS have an ID; create one automatically if missing.
    const storedUserId = localStorage.getItem(USER_ID_KEY);

    if (storedUserId) {
      setUserId(storedUserId);
      return;
    }

    const newId = generateGuestId();
    localStorage.setItem(USER_ID_KEY, newId);
    if (!localStorage.getItem(USER_NAME_KEY)) {
      localStorage.setItem(USER_NAME_KEY, 'Guest User');
    }
    setUserId(newId);
  }, []);

  return userId;
};

export const getUserDisplayName = (): string => {
  return localStorage.getItem(USER_NAME_KEY) || 'Guest User';
};

