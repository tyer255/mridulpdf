import { AppPreferences, ThemeType, VoiceType, THEMES } from '@/types/theme';

const PREFS_KEY = 'app_preferences';

const DEFAULT_PREFS: AppPreferences = {
  theme: 'neon-blue',
  soundEnabled: true,
  voiceEnabled: false,
  voiceType: 'female',
};

// Preload voices on module load for instant response
let voicesLoaded = false;
let cachedVoices: SpeechSynthesisVoice[] = [];

const loadVoices = () => {
  if ('speechSynthesis' in window) {
    cachedVoices = speechSynthesis.getVoices();
    voicesLoaded = cachedVoices.length > 0;
  }
};

// Load voices immediately and on change
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

export const getAppPreferences = (): AppPreferences => {
  const stored = localStorage.getItem(PREFS_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_PREFS;
    }
  }
  return DEFAULT_PREFS;
};

export const saveAppPreferences = (prefs: AppPreferences) => {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  applyTheme(prefs.theme);
};

export const applyTheme = (theme: ThemeType) => {
  const root = document.documentElement;
  const colors = THEMES[theme].colors;
  
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--secondary', colors.secondary);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--foreground', colors.foreground);
  
  // Set card colors for proper contrast
  root.style.setProperty('--card', colors.background);
  root.style.setProperty('--card-foreground', colors.foreground);
  root.style.setProperty('--muted', colors.secondary);
  root.style.setProperty('--muted-foreground', colors.foreground);
  
  root.setAttribute('data-theme', theme);
};

// Sound effects
export const playSound = (type: 'success' | 'notification' | 'upload') => {
  const prefs = getAppPreferences();
  if (!prefs.soundEnabled) return;

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const frequencies = {
    success: [800, 1000, 1200],
    notification: [600, 800],
    upload: [400, 600, 800]
  };

  const freqs = frequencies[type];
  let time = audioContext.currentTime;

  freqs.forEach((freq, i) => {
    oscillator.frequency.setValueAtTime(freq, time);
    gainNode.gain.setValueAtTime(0.1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    time += 0.15;
  });

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + time);
};

// Voice alerts - instant response with preloaded voices
export const speakAlert = (message: string) => {
  const prefs = getAppPreferences();
  if (!prefs.voiceEnabled || !('speechSynthesis' in window)) return;

  // Cancel any pending speech first for instant response
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  
  // Use cached voices for instant response
  const voices = cachedVoices.length > 0 ? cachedVoices : speechSynthesis.getVoices();
  
  if (voices.length > 0) {
    const voiceFilters = {
      female: (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('victoria') || v.name.toLowerCase().includes('zira'),
      male: (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('alex') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('david'),
      robotic: (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('robot') || v.name.toLowerCase().includes('whisper')
    };

    const selectedVoice = voices.find(voiceFilters[prefs.voiceType]);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }

  utterance.rate = prefs.voiceType === 'robotic' ? 1.3 : 1.0;
  utterance.pitch = prefs.voiceType === 'robotic' ? 0.8 : 1.0;
  
  // Speak immediately
  speechSynthesis.speak(utterance);
};

// Alert events
export const alertEvent = {
  uploadComplete: (fileName: string) => {
    playSound('upload');
    speakAlert(`Upload complete. ${fileName} is ready.`);
  },
  newWorldFile: (userName: string, fileName: string) => {
    playSound('notification');
    speakAlert(`${userName} just shared ${fileName}.`);
  },
  downloadComplete: (fileName: string) => {
    playSound('success');
    speakAlert(`Your file ${fileName} is ready.`);
  }
};
