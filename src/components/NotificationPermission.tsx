import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, Sparkles } from 'lucide-react';
import { requestNotificationPermission, saveNotificationPreferences, getNotificationPreferences } from '@/lib/notifications';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationPermission = ({ open, onOpenChange }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    const granted = await requestNotificationPermission();
    
    const prefs = getNotificationPreferences();
    saveNotificationPreferences({
      ...prefs,
      enabled: granted,
      lastAsked: Date.now(),
    });

    setLoading(false);
    onOpenChange(false);
  };

  const handleLater = () => {
    const prefs = getNotificationPreferences();
    saveNotificationPreferences({
      ...prefs,
      lastAsked: Date.now(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center animate-pulse">
                <Bell className="w-10 h-10 text-white" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-yellow-400 animate-bounce" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Enable Smart Notifications?</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Get instant alerts when new PDFs are shared on World. 
            <br />
            <span className="text-primary font-medium">Stay updated in real-time! ✨</span>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2 my-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">🔔</span>
            <p className="text-sm text-muted-foreground">Beautiful animated notifications</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">📱</span>
            <p className="text-sm text-muted-foreground">Works even when app is closed</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">⚙️</span>
            <p className="text-sm text-muted-foreground">Customize anytime in settings</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleEnable}
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-600 text-white shadow-lg"
          >
            {loading ? 'Enabling...' : '✨ Enable Notifications'}
          </Button>
          <Button
            onClick={handleLater}
            variant="ghost"
            className="w-full"
          >
            Ask Me Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
