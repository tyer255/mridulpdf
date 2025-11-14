export interface NotificationPreferences {
  enabled: boolean;
  animationStyle: 'glow' | 'slide' | 'bounce';
  muted: boolean;
  lastAsked?: number;
}

export interface WorldUploadNotification {
  id: string;
  userName: string;
  fileName: string;
  fileId: string;
  timestamp: number;
}
