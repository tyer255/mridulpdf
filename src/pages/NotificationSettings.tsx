import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getNotificationPreferences, saveNotificationPreferences, requestNotificationPermission } from '@/lib/notifications';
import { toast } from 'sonner';
import { Bell, BellOff, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationSettings = () => {
  const [prefs, setPrefs] = useState(getNotificationPreferences());
  const navigate = useNavigate();

  const handleToggleEnabled = async () => {
    if (!prefs.enabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        const newPrefs = { ...prefs, enabled: true };
        setPrefs(newPrefs);
        saveNotificationPreferences(newPrefs);
        toast.success('Notifications enabled! 🔔');
      } else {
        toast.error('Permission denied. Please enable in browser settings.');
      }
    } else {
      const newPrefs = { ...prefs, enabled: false };
      setPrefs(newPrefs);
      saveNotificationPreferences(newPrefs);
      toast.info('Notifications disabled');
    }
  };

  const handleToggleMuted = () => {
    const newPrefs = { ...prefs, muted: !prefs.muted };
    setPrefs(newPrefs);
    saveNotificationPreferences(newPrefs);
    toast.success(newPrefs.muted ? 'Sounds muted 🔇' : 'Sounds enabled 🔊');
  };

  const handleAnimationChange = (value: 'glow' | 'slide' | 'bounce') => {
    const newPrefs = { ...prefs, animationStyle: value };
    setPrefs(newPrefs);
    saveNotificationPreferences(newPrefs);
    toast.success(`Animation style: ${value}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        </div>
      
        <div className="container max-w-2xl mx-auto">
          <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Notification Settings</h2>
              <p className="text-sm text-muted-foreground">Customize your notification experience</p>
            </div>
          </div>

          {/* Enable/Disable */}
          <div className="flex items-center justify-between py-4 border-b">
            <div className="space-y-1">
              <Label className="text-base font-medium flex items-center gap-2">
                {prefs.enabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                Enable World Upload Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new PDFs are uploaded to World
              </p>
            </div>
            <Switch
              checked={prefs.enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>

          {/* Animation Style */}
          <div className="space-y-3 py-4 border-b">
            <Label className="text-base font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Animation Style
            </Label>
            <RadioGroup
              value={prefs.animationStyle}
              onValueChange={handleAnimationChange}
              disabled={!prefs.enabled}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="glow" id="glow" />
                <Label htmlFor="glow" className="flex-1 cursor-pointer">
                  <div className="font-medium">Glow Effect</div>
                  <div className="text-sm text-muted-foreground">Smooth fade with neon glow (Recommended)</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="slide" id="slide" />
                <Label htmlFor="slide" className="flex-1 cursor-pointer">
                  <div className="font-medium">Slide In</div>
                  <div className="text-sm text-muted-foreground">Slides from the right side</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="bounce" id="bounce" />
                <Label htmlFor="bounce" className="flex-1 cursor-pointer">
                  <div className="font-medium">Bounce</div>
                  <div className="text-sm text-muted-foreground">Playful bouncing effect</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Mute Sounds */}
          <div className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <Label className="text-base font-medium">Mute Sounds & Haptics</Label>
              <p className="text-sm text-muted-foreground">
                Disable notification sounds and vibrations
              </p>
            </div>
            <Switch
              checked={prefs.muted}
              onCheckedChange={handleToggleMuted}
              disabled={!prefs.enabled}
            />
          </div>

          {/* Test Notification */}
          <Button
            onClick={() => {
              if (prefs.enabled) {
                toast('Test notification sent! 🎉', {
                  description: 'Check your notification tray',
                });
              } else {
                toast.error('Please enable notifications first');
              }
            }}
            variant="outline"
            className="w-full"
            disabled={!prefs.enabled}
          >
            Test Notification
          </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
