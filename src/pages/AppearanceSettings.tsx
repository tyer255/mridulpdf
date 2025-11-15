import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Palette, Volume2, Mic, QrCode, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAppPreferences, saveAppPreferences, applyTheme, playSound, speakAlert } from '@/lib/preferences';
import { THEMES, ThemeType, VoiceType } from '@/types/theme';
import { toast } from 'sonner';

const AppearanceSettings = () => {
  const [prefs, setPrefs] = useState(getAppPreferences());
  const navigate = useNavigate();

  useEffect(() => {
    applyTheme(prefs.theme);
  }, []);

  const handleThemeChange = (theme: ThemeType) => {
    const newPrefs = { ...prefs, theme };
    setPrefs(newPrefs);
    saveAppPreferences(newPrefs);
    applyTheme(theme);
    toast.success(`Theme changed to ${THEMES[theme].name}`);
  };

  const handleSoundToggle = () => {
    const newPrefs = { ...prefs, soundEnabled: !prefs.soundEnabled };
    setPrefs(newPrefs);
    saveAppPreferences(newPrefs);
    if (newPrefs.soundEnabled) {
      playSound('success');
      toast.success('Sound effects enabled 🔊');
    } else {
      toast.info('Sound effects disabled 🔇');
    }
  };

  const handleVoiceToggle = () => {
    const newPrefs = { ...prefs, voiceEnabled: !prefs.voiceEnabled };
    setPrefs(newPrefs);
    saveAppPreferences(newPrefs);
    if (newPrefs.voiceEnabled) {
      speakAlert('Voice alerts enabled.');
      toast.success('Voice alerts enabled 🎙️');
    } else {
      toast.info('Voice alerts disabled');
    }
  };

  const handleVoiceTypeChange = (voiceType: VoiceType) => {
    const newPrefs = { ...prefs, voiceType };
    setPrefs(newPrefs);
    saveAppPreferences(newPrefs);
    speakAlert('Voice type updated.');
    toast.success(`Voice type: ${voiceType}`);
  };

  const handleAutoQRToggle = () => {
    const newPrefs = { ...prefs, autoQR: !prefs.autoQR };
    setPrefs(newPrefs);
    saveAppPreferences(newPrefs);
    toast.success(newPrefs.autoQR ? 'Auto QR enabled' : 'Auto QR disabled');
  };

  const testVoice = () => {
    speakAlert('This is a test voice alert. Your settings are working perfectly.');
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
          <h1 className="text-2xl font-bold text-foreground">Appearance & Settings</h1>
        </div>

        <div className="container max-w-2xl mx-auto space-y-6">
          {/* Theme Selector */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Theme Selector</h2>
                <p className="text-sm text-muted-foreground">Choose your visual style</p>
              </div>
            </div>

            <RadioGroup value={prefs.theme} onValueChange={handleThemeChange}>
              {Object.entries(THEMES).map(([key, theme]) => (
                <div key={key} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent/5 transition-colors">
                  <RadioGroupItem value={key} id={key} />
                  <Label htmlFor={key} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{theme.name}</span>
                      {prefs.theme === key && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {Object.values(theme.colors).slice(0, 3).map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border-2 border-border"
                          style={{ backgroundColor: `hsl(${color})` }}
                        />
                      ))}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </Card>

          {/* Sound Settings */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Sound Effects</h2>
                <p className="text-sm text-muted-foreground">Audio feedback for actions</p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <Label className="text-base font-medium text-foreground">Enable Sound Effects</Label>
                <p className="text-sm text-muted-foreground">Play sounds for uploads, downloads, etc.</p>
              </div>
              <Switch checked={prefs.soundEnabled} onCheckedChange={handleSoundToggle} />
            </div>
          </Card>

          {/* Voice Settings */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Voice Alerts</h2>
                <p className="text-sm text-muted-foreground">Spoken notifications</p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <Label className="text-base font-medium text-foreground">Enable Voice Alerts</Label>
                <p className="text-sm text-muted-foreground">Hear spoken notifications</p>
              </div>
              <Switch checked={prefs.voiceEnabled} onCheckedChange={handleVoiceToggle} />
            </div>

            {prefs.voiceEnabled && (
              <>
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium text-foreground">Voice Type</Label>
                  <RadioGroup value={prefs.voiceType} onValueChange={handleVoiceTypeChange}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/5">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female" className="flex-1 cursor-pointer text-foreground">Female AI (Soft)</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/5">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male" className="flex-1 cursor-pointer text-foreground">Male AI (Deep)</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/5">
                      <RadioGroupItem value="robotic" id="robotic" />
                      <Label htmlFor="robotic" className="flex-1 cursor-pointer text-foreground">Robotic AI (Digital)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button onClick={testVoice} variant="outline" className="w-full">
                  Test Voice
                </Button>
              </>
            )}
          </Card>

          {/* QR Settings */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">QR Code Settings</h2>
                <p className="text-sm text-muted-foreground">Sharing preferences</p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-base font-medium text-foreground">Auto-generate QR</Label>
                <p className="text-sm text-muted-foreground">Create QR codes for world uploads</p>
              </div>
              <Switch checked={prefs.autoQR} onCheckedChange={handleAutoQRToggle} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
