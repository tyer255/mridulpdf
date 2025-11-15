import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorldUploadNotification } from '@/types/notification';
import { getNotificationPreferences, showNativeNotification, registerServiceWorker } from '@/lib/notifications';
import { alertEvent } from '@/lib/preferences';

export const useNotifications = () => {
  const [notification, setNotification] = useState<WorldUploadNotification | null>(null);
  const prefs = getNotificationPreferences();

  useEffect(() => {
    if (!prefs.enabled) return;

    // Register service worker
    registerServiceWorker();

    // Subscribe to world_pdfs table for new inserts
    const channel = supabase
      .channel('world-uploads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'world_pdfs',
        },
        (payload) => {
          const newPDF = payload.new as any;
          
          // Create notification data
          const notificationData: WorldUploadNotification = {
            id: newPDF.id,
            userName: newPDF.display_name || 'Anonymous',
            fileName: newPDF.name,
            fileId: newPDF.id,
            timestamp: Date.now(),
          };

          // Show in-app notification
          setNotification(notificationData);

          // Show native notification
          showNativeNotification(
            notificationData.userName,
            notificationData.fileName,
            notificationData.fileId
          );

          // Trigger sound and voice alert
          alertEvent.newWorldFile(notificationData.userName, notificationData.fileName);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prefs.enabled]);

  const clearNotification = () => {
    setNotification(null);
  };

  return { notification, clearNotification };
};
