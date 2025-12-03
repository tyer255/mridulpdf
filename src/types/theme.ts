export type ThemeType = 'neon-blue' | 'gold-premium' | 'cyber-purple' | 'white-minimal';

export type VoiceType = 'female' | 'male' | 'robotic';

export interface AppPreferences {
  theme: ThemeType;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  voiceType: VoiceType;
}

export const THEMES = {
  'neon-blue': {
    name: 'Neon Blue (Jarvis Mode)',
    colors: {
      primary: '199 89% 48%',
      secondary: '210 100% 50%',
      accent: '180 100% 50%',
      background: '222 47% 11%',
      foreground: '210 40% 98%',
    }
  },
  'gold-premium': {
    name: 'Gold Premium (FF Portal)',
    colors: {
      primary: '45 93% 47%',
      secondary: '38 92% 50%',
      accent: '43 100% 71%',
      background: '30 17% 11%',
      foreground: '43 10% 90%',
    }
  },
  'cyber-purple': {
    name: 'Cyber Purple (AI Mode)',
    colors: {
      primary: '271 81% 56%',
      secondary: '280 100% 70%',
      accent: '291 64% 42%',
      background: '240 10% 4%',
      foreground: '280 10% 95%',
    }
  },
  'white-minimal': {
    name: 'White Minimal (Pro Docs)',
    colors: {
      primary: '220 13% 91%',
      secondary: '220 9% 46%',
      accent: '213 27% 84%',
      background: '0 0% 100%',
      foreground: '222 47% 11%',
    }
  }
};
