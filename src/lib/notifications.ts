import { NotificationPreferences } from '@/types/notification';

const PREFS_KEY = 'notification_preferences';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export const getNotificationPreferences = (): NotificationPreferences => {
  const stored = localStorage.getItem(PREFS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    enabled: false,
    animationStyle: 'glow',
    muted: false,
  };
};

export const saveNotificationPreferences = (prefs: NotificationPreferences) => {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
};

export const shouldAskPermission = (): boolean => {
  const prefs = getNotificationPreferences();
  if (prefs.enabled) return false;
  if (!prefs.lastAsked) return true;
  return Date.now() - prefs.lastAsked > SEVEN_DAYS;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export const showNativeNotification = (userName: string, fileName: string, fileId: string) => {
  if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification('New Upload on World!', {
        body: `${userName} just uploaded "${fileName}"\nTap to view now`,
        icon: '/mridulpdf_logo.png',
        badge: '/mridulpdf_logo.png',
        tag: `world-upload-${fileId}`,
        requireInteraction: false,
        data: { fileId, url: '/' },
      });
    });
  }
};

export const playNotificationSound = () => {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnMpBSuCzvLaiTYIG2m98OGeTxELUqvm8LZkHQU5k9j00HwrBSh+zPDekkIKEV64+e+qWhQLSKDh8r1uIgUuhM/z1oU0Bhxqwu7mnkwPDlWs5/CvXRgIPpba88d0KgUshM7z2Yk3CBxrvO/jnlARClOn5fCzYhwGN5HY8tB9KwUofszw3pJCChFduPnvqloUDEig4PKBaL');
  audio.volume = 0.3;
  audio.play().catch(() => {});
};

export const triggerHapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate([50, 30, 50]);
  }
};
