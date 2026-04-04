import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Copy, FileText, Plus, Palette, Bell, LogOut,
  ChevronRight, ChevronLeft, Volume2, Mic, Check, Bot, User,
  Camera, Loader2
} from 'lucide-react';
import { mockStorage } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getAppPreferences, saveAppPreferences, applyTheme, playSound, speakAlert } from '@/lib/preferences';
import { getNotificationPreferences, saveNotificationPreferences, requestNotificationPermission } from '@/lib/notifications';
import { THEMES, ThemeType, VoiceType } from '@/types/theme';
import { toast as sonnerToast } from 'sonner';

// Theme UI config for glassmorphism styling
const themeUIConfig = {
  'neon-blue': {
    id: 'neon-blue',
    name: 'Neon Blue',
    sub: '(Jarvis Mode)',
    colors: ['bg-cyan-500', 'bg-blue-600', 'bg-cyan-300'],
    border: 'border-cyan-400',
    text: 'text-cyan-400',
    bg: 'bg-cyan-400',
    cardBg: 'bg-cyan-400/10',
    icon1Bg: 'bg-cyan-500/20',
    icon1Text: 'text-cyan-400',
    icon2Bg: 'bg-blue-500/20',
    icon2Text: 'text-blue-400',
  },
  'gold-premium': {
    id: 'gold-premium',
    name: 'Gold Premium',
    sub: '(FF Portal)',
    colors: ['bg-yellow-500', 'bg-orange-500', 'bg-yellow-200'],
    border: 'border-yellow-400',
    text: 'text-yellow-400',
    bg: 'bg-yellow-400',
    cardBg: 'bg-yellow-400/10',
    icon1Bg: 'bg-yellow-500/20',
    icon1Text: 'text-yellow-400',
    icon2Bg: 'bg-orange-500/20',
    icon2Text: 'text-orange-400',
  },
  'cyber-purple': {
    id: 'cyber-purple',
    name: 'Cyber Purple',
    sub: '(AI Mode)',
    colors: ['bg-purple-500', 'bg-fuchsia-500', 'bg-purple-300'],
    border: 'border-purple-500',
    text: 'text-purple-500',
    bg: 'bg-purple-500',
    cardBg: 'bg-purple-500/10',
    icon1Bg: 'bg-purple-500/20',
    icon1Text: 'text-purple-400',
    icon2Bg: 'bg-fuchsia-500/20',
    icon2Text: 'text-fuchsia-400',
  },
  'white-minimal': {
    id: 'white-minimal',
    name: 'White Minimal',
    sub: '(Pro Docs)',
    colors: ['bg-slate-300', 'bg-slate-500', 'bg-slate-200'],
    border: 'border-slate-800',
    text: 'text-slate-800',
    bg: 'bg-slate-800',
    cardBg: 'bg-white',
    icon1Bg: 'bg-slate-800',
    icon1Text: 'text-white',
    icon2Bg: 'bg-slate-600',
    icon2Text: 'text-white',
    isLight: true as const,
  },
} as const;

type ThemeUIKey = keyof typeof themeUIConfig;

const getGlassPanelClasses = (isLight: boolean) => {
  if (isLight) return "bg-white border-slate-200 shadow-sm rounded-2xl border";
  return "bg-[#1E2536]/60 backdrop-blur-md border border-white/10 rounded-2xl";
};

const getAppBgClasses = (isLight: boolean) => {
  if (isLight) return "bg-slate-50 text-slate-900";
  return "bg-[#0A0E17] text-white";
};

const Profile = () => {
  const { loading, isAuthenticated, signOut, getUserDisplayName, getUserId, getUserEmail, getUserAvatar, setGuestAvatar } = useAuth();
  const [currentView, setCurrentView] = useState<'profile-main' | 'appearance-settings' | 'notification-settings'>('profile-main');
  const [totalPDFs, setTotalPDFs] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [prefs, setPrefs] = useState(getAppPreferences());
  const themeId = prefs.theme as ThemeUIKey;
  const currentTheme = themeUIConfig[themeId] || themeUIConfig['neon-blue'];
  const isLight = 'isLight' in currentTheme && currentTheme.isLight === true;

  const userId = getUserId();
  const email = getUserEmail();
  const avatar = getUserAvatar();
  const displayName = getUserDisplayName();

  useEffect(() => {
    if (!loading && !userId) {
      navigate('/landing');
      return;
    }
    const loadPDFCount = async () => {
      if (!userId) return;
      const worldPDFs = await mockStorage.getWorldPDFs();
      const privatePDFs = await mockStorage.getUserPDFs(userId);
      const userWorldPDFs = worldPDFs.filter(pdf => pdf.userId === userId);
      setTotalPDFs(userWorldPDFs.length + privatePDFs.length);
    };
    loadPDFCount();
  }, [loading, userId, navigate]);

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged out", description: "You have been logged out successfully" });
    navigate('/landing');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Please select an image under 5MB", variant: "destructive" }); return; }
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      if (isAuthenticated) {
        // For authenticated users, update user metadata so it syncs across devices
        await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
      }
      // Also set locally for immediate display
      setGuestAvatar(avatarUrl);
      toast({ title: "Success!", description: "Profile photo updated successfully" });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({ title: "Upload failed", description: "Failed to upload profile photo", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopyId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId).catch(() => { document.execCommand("copy"); });
      sonnerToast.success('Copied to clipboard');
    }
  };

  const glassPanelClasses = getGlassPanelClasses(isLight);

  if (loading) {
    return (
      <div className={`min-h-screen min-h-[100dvh] flex items-center justify-center ${getAppBgClasses(isLight)}`}>
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'profile-main':
        return (
          <ProfileMainView
            setView={setCurrentView}
            glassPanelClasses={glassPanelClasses}
            currentTheme={currentTheme}
            isLight={isLight}
            displayName={displayName}
            email={email}
            userId={userId}
            avatar={avatar}
            totalPDFs={totalPDFs}
            isAuthenticated={isAuthenticated}
            uploadingAvatar={uploadingAvatar}
            handleAvatarClick={handleAvatarClick}
            handleLogout={handleLogout}
            handleCopyId={handleCopyId}
            fileInputRef={fileInputRef}
            handleAvatarUpload={handleAvatarUpload}
            navigate={navigate}
          />
        );
      case 'appearance-settings':
        return (
          <AppearanceSettingsView
            setView={setCurrentView}
            themeId={themeId}
            setThemeId={(id: ThemeUIKey) => {
              const newPrefs = { ...prefs, theme: id as ThemeType };
              setPrefs(newPrefs);
              saveAppPreferences(newPrefs);
              applyTheme(id as ThemeType);
              sonnerToast.success(`Theme changed to ${THEMES[id as ThemeType]?.name || id}`);
            }}
            themes={themeUIConfig}
            prefs={prefs}
            setPrefs={setPrefs}
          />
        );
      case 'notification-settings':
        return (
          <NotificationSettingsView
            setView={setCurrentView}
            currentTheme={currentTheme}
            isLight={isLight}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen min-h-[100dvh] font-sans flex flex-col max-w-md mx-auto relative overflow-hidden transition-colors duration-300 ${getAppBgClasses(isLight)}`}>
      {/* Background glow effects */}
      {!isLight && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl ${currentTheme.colors[0]}`} />
          <div className={`absolute -bottom-40 -right-40 w-80 h-80 rounded-full opacity-15 blur-3xl ${currentTheme.colors[1]}`} />
        </div>
      )}

      {renderView()}

      {/* Custom scrollbar styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isLight ? '#cbd5e1' : '#334155'}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isLight ? '#94a3b8' : '#475569'}; border-radius: 10px; }
      `}} />
    </div>
  );
};

// ─── PROFILE MAIN VIEW ───
function ProfileMainView({
  setView, glassPanelClasses, currentTheme, isLight,
  displayName, email, userId, avatar, totalPDFs, isAuthenticated,
  uploadingAvatar, handleAvatarClick, handleLogout, handleCopyId,
  fileInputRef, handleAvatarUpload, navigate
}: any) {
  return (
    <>
      {/* Header / Profile Section */}
      <div className={`relative pt-12 pb-8 px-6 text-center z-10 ${!isLight ? 'bg-gradient-to-b from-black/30 to-transparent' : ''}`}>
        {/* Hidden file input */}
        <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />

        {/* Back button */}
        <button onClick={() => navigate('/home')} className="absolute left-4 top-4 p-2 rounded-full transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar with Glow */}
        <div className="relative inline-block mb-4" onClick={handleAvatarClick}>
          {!isLight && <div className={`absolute inset-0 rounded-full blur-xl opacity-40 scale-150 ${currentTheme.bg}`} />}
          <div className="relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold border-4 overflow-hidden ${isLight ? 'border-slate-200 bg-slate-100' : 'border-white/20 bg-slate-800'} ${!isAuthenticated ? 'cursor-pointer group' : ''}`}>
              {avatar ? (
                <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className={isLight ? 'text-slate-700' : 'text-white'}>
                  {displayName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                </span>
              )}
              {/* Upload overlay for guests */}
              {!isAuthenticated && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                </div>
              )}
            </div>
          </div>
          {/* Crown emoji */}
          <div className="absolute -top-1 -right-1 text-lg">👑</div>
        </div>

        <p className={`text-lg font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>{displayName?.toUpperCase()}</p>
        {email && <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{email}</p>}

        {isAuthenticated && (
          <div className="flex items-center gap-1 mt-2 text-xs py-1 px-3 rounded-full border border-green-500/30 bg-green-500/10 mx-auto w-fit">
            <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#4285F4]"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </span>
            Account Verified
          </div>
        )}
      </div>

      <div className="px-5 space-y-6 pb-24 flex-1 overflow-y-auto custom-scrollbar relative z-10">

        {/* ACCOUNT DETAILS */}
        <div>
          <h2 className={`text-xs font-semibold mb-2 uppercase tracking-wider pl-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Account Details</h2>
          <div className={`${glassPanelClasses} p-4`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className={`text-sm font-medium ${isLight ? 'text-slate-800' : 'text-gray-300'}`}>Account ID</p>
                <p className={`text-xs font-mono mt-1 break-all pr-4 select-all ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                  {userId}
                </p>
              </div>
              <button
                className={`transition-colors p-1 cursor-pointer active:scale-95 rounded-md ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}
                onClick={handleCopyId}
              >
                <Copy size={16} />
              </button>
            </div>
            <div className="flex justify-between items-end">
              <p className={`text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full ${isLight ? 'bg-slate-400' : 'bg-slate-600'}`} />
                Silver Tier Creator ({totalPDFs} creations)
              </p>
              <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Copy to Clipboard</p>
            </div>
          </div>
        </div>

        {/* LIBRARY DASHBOARD */}
        <div>
          <h2 className={`text-xs font-semibold mb-2 uppercase tracking-wider pl-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Library Dashboard</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* My PDFs card */}
            <div className={`${glassPanelClasses} p-4 flex flex-col justify-between transition-all`}>
              <div className="flex justify-between items-start">
                <p className={`text-sm font-medium ${isLight ? 'text-slate-800' : 'text-white'}`}>My PDFs</p>
                <div className={`p-2 rounded-lg transition-colors ${isLight ? 'bg-slate-100 text-slate-700' : currentTheme.icon1Bg + ' ' + currentTheme.icon1Text}`}>
                  <FileText size={18} />
                </div>
              </div>
              <div className="mt-2">
                <p className={`text-4xl font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalPDFs}</p>
                <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>You have {totalPDFs} PDF files</p>
              </div>
            </div>

            {/* Recent Creations card */}
            <div className={`${glassPanelClasses} p-4 flex flex-col justify-between relative`}>
              <div className={`absolute -top-2 right-2 text-[8px] px-2 py-0.5 rounded uppercase font-bold ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-gray-400'}`}>
                Important
              </div>
              <p className={`text-sm font-medium mb-3 ${isLight ? 'text-slate-800' : 'text-white'}`}>Recent Creations</p>

              <button
                onClick={() => navigate('/add')}
                className={`w-full py-2 border rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    : `${currentTheme.cardBg} border-white/20 ${currentTheme.text} hover:bg-white/10`
                }`}
              >
                <Plus size={14} /> Create New
              </button>

              <div className="text-center mt-auto">
                <button
                  onClick={() => navigate('/library')}
                  className={`text-[10px] flex items-center justify-center gap-1 w-full mt-2 ${isLight ? 'text-slate-500 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  View All Creations <ChevronRight size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* APP SETTINGS */}
        <div>
          <h2 className={`text-xs font-semibold mb-2 uppercase tracking-wider pl-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>App Settings</h2>
          <div className={`${glassPanelClasses} divide-y ${isLight ? 'divide-slate-100' : 'divide-white/5'}`}>
            {/* Appearance */}
            <button
              onClick={() => setView('appearance-settings')}
              className={`w-full p-4 flex items-center justify-between transition-colors cursor-pointer ${isLight ? 'hover:bg-slate-50 active:bg-slate-100' : 'hover:bg-white/5 active:bg-white/10'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl shadow-sm transition-colors duration-300 ${
                  isLight
                    ? (currentTheme.id === 'white-minimal' ? 'bg-slate-800 text-white' : `${currentTheme.icon1Bg} ${currentTheme.icon1Text}`)
                    : `${currentTheme.icon1Bg} ${currentTheme.icon1Text} shadow-[0_0_15px_rgba(0,0,0,0.2)]`
                }`}>
                  <Palette size={20} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>Appearance</p>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Theme & preferences</p>
                </div>
              </div>
              <ChevronRight size={18} className={isLight ? 'text-slate-400' : 'text-gray-500'} />
            </button>

            {/* Notifications */}
            <button
              onClick={() => setView('notification-settings')}
              className={`w-full p-4 flex items-center justify-between transition-colors cursor-pointer ${isLight ? 'hover:bg-slate-50 active:bg-slate-100' : 'hover:bg-white/5 active:bg-white/10'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl shadow-sm transition-colors duration-300 ${
                  isLight
                    ? (currentTheme.id === 'white-minimal' ? 'bg-slate-600 text-white' : `${currentTheme.icon2Bg} ${currentTheme.icon2Text}`)
                    : `${currentTheme.icon2Bg} ${currentTheme.icon2Text} shadow-[0_0_15px_rgba(0,0,0,0.2)]`
                }`}>
                  <Bell size={20} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>Notifications</p>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Alerts & reminders</p>
                </div>
              </div>
              <ChevronRight size={18} className={isLight ? 'text-slate-400' : 'text-gray-500'} />
            </button>
          </div>
        </div>

        {/* SIGN OUT BUTTON */}
        <button
          onClick={handleLogout}
          className={`w-full py-4 mt-4 backdrop-blur-md rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all active:scale-[0.98] ${
            isLight
              ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100 border'
              : 'bg-red-950/30 text-red-400 border-red-500/20 hover:bg-red-900/40 hover:text-red-300 border'
          }`}
        >
          <LogOut size={18} /> Sign Out Safely
        </button>
      </div>
    </>
  );
}

// ─── APPEARANCE SETTINGS VIEW ───
function AppearanceSettingsView({ setView, themeId, setThemeId, themes, prefs, setPrefs }: any) {
  const [soundEnabled, setSoundEnabled] = useState(prefs.soundEnabled);
  const [voiceEnabled, setVoiceEnabled] = useState(prefs.voiceEnabled);
  const [voiceType, setVoiceType] = useState<string>(prefs.voiceType);

  const currentTheme = themes[themeId] || themes['neon-blue'];
  const isLight = 'isLight' in currentTheme && currentTheme.isLight === true;

  const handleTestVoice = () => {
    if (!('speechSynthesis' in window)) { alert("Browser does not support text-to-speech."); return; }
    const msg = new SpeechSynthesisUtterance("System settings updated successfully.");
    if (voiceType === 'female') { msg.pitch = 1.5; msg.rate = 1; }
    else if (voiceType === 'male') { msg.pitch = 0.8; msg.rate = 0.9; }
    else { msg.pitch = 0.2; msg.rate = 0.8; }
    window.speechSynthesis.speak(msg);
  };

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    const newPrefs = { ...prefs, soundEnabled: next };
    setPrefs(newPrefs);
    saveAppPreferences(newPrefs);
    if (next) playSound('success');
  };

  const handleVoiceToggle = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    const newPrefs = { ...prefs, voiceEnabled: next };
    setPrefs(newPrefs);
    saveAppPreferences(newPrefs);
    if (next) speakAlert('Voice alerts enabled.');
  };

  const handleVoiceTypeChange = (vt: string) => {
    setVoiceType(vt);
    const newPrefs = { ...prefs, voiceType: vt as VoiceType };
    setPrefs(newPrefs);
    saveAppPreferences(newPrefs);
  };

  const Toggle = ({ enabled, setEnabled }: { enabled: boolean; setEnabled: (v: boolean) => void }) => (
    <button onClick={() => setEnabled(!enabled)} className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors duration-300 shrink-0 cursor-pointer ${enabled ? currentTheme.bg : (isLight ? 'bg-slate-300' : 'bg-slate-600')}`}>
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );

  return (
    <div className="flex flex-col h-full w-full relative transition-colors duration-300 z-10">
      <header className="shrink-0 flex items-center px-4 h-16 w-full relative z-10 pt-2">
        <button onClick={() => setView('profile-main')} className="p-2 -ml-2 transition-colors cursor-pointer rounded-full active:scale-95">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className={`text-xl font-bold ml-2 transition-colors tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Appearance & Settings
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-8 custom-scrollbar relative z-10">
        <div className="animate-in fade-in duration-300 pt-5">
          {/* THEME SELECTOR */}
          <h2 className={`text-xs font-semibold uppercase tracking-wider pl-1 mb-3 transition-colors ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Theme Selector</h2>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {Object.values(themes).map((t: any) => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                className={`relative p-3 rounded-2xl border text-left transition-all h-28 overflow-hidden ${
                  themeId === t.id
                    ? t.border + ' ' + (isLight && !t.isLight ? t.cardBg : (t.isLight ? 'bg-white text-slate-900 shadow-md' : t.cardBg))
                    : (isLight ? 'border-slate-200 bg-white shadow-sm hover:border-slate-400' : 'border-white/10 bg-white/5 hover:border-white/20')
                }`}
              >
                <div className={`font-semibold text-sm ${t.isLight ? 'text-slate-800' : (isLight ? 'text-slate-800' : (isLight && themeId !== t.id ? 'text-slate-600' : 'text-white'))}`}>{t.name}</div>
                <div className={`text-xs ${t.isLight ? 'text-slate-500' : (isLight ? 'text-slate-500' : 'text-gray-400')}`}>{t.sub}</div>

                {themeId === t.id && (
                  <div className={`absolute top-2 right-2 rounded-full p-0.5 shadow-sm ${t.isLight ? 'bg-slate-800 text-white' : t.bg + ' text-slate-900'}`}>
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </div>
                )}

                <div className="absolute bottom-3 left-3 flex gap-1.5 z-10">
                  {t.colors.map((c: string, i: number) => (
                    <div key={i} className={`w-4 h-4 rounded-full ${c} ${isLight ? 'shadow-sm' : ''}`} />
                  ))}
                </div>

                {/* Mini bars decoration */}
                <div className={`absolute -bottom-2 -right-2 w-16 h-20 border rounded-xl opacity-30 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>
                  <div className={`w-6 h-1 rounded-full mb-1.5 ${t.isLight ? 'bg-slate-300' : t.colors[0]}`} />
                  <div className={`w-10 h-1 rounded-full mb-1 opacity-50 ${t.isLight ? 'bg-slate-200' : t.colors[1]}`} />
                  <div className={`w-10 h-1 rounded-full mb-1 opacity-50 ${t.isLight ? 'bg-slate-200' : t.colors[1]}`} />
                </div>
              </button>
            ))}
          </div>

          {/* SOUND SETTINGS */}
          <h2 className={`text-xs font-semibold uppercase tracking-wider pl-1 mb-3 transition-colors ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Sound & Voice</h2>
          <div className={`border rounded-2xl p-4 transition-colors duration-300 backdrop-blur-md ${isLight ? 'bg-white border-slate-200' : 'border-white/10 bg-[#1E2536]/60'}`}>

            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-3 items-start">
                <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${isLight ? 'bg-slate-100' : currentTheme.icon1Bg}`}>
                  <Volume2 className={`w-5 h-5 ${currentTheme.text}`} />
                </div>
                <div>
                  <h3 className={`font-semibold text-sm transition-colors ${isLight ? 'text-slate-800' : 'text-white'}`}>Audio Feedback for Actions</h3>
                  <p className={`text-xs mt-0.5 leading-snug pr-2 transition-colors ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Play sounds for uploads.</p>
                </div>
              </div>
              <Toggle enabled={soundEnabled} setEnabled={handleSoundToggle} />
            </div>

            <div className={`h-px w-full mb-4 transition-colors ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />

            <div className="flex items-center justify-between mb-5">
              <div className="flex gap-3 items-start">
                <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${isLight ? 'bg-slate-100' : currentTheme.icon1Bg}`}>
                  <Mic className={`w-5 h-5 ${currentTheme.text}`} />
                </div>
                <div>
                  <h3 className={`font-semibold text-sm transition-colors ${isLight ? 'text-slate-800' : 'text-white'}`}>Spoken Notifications</h3>
                  <p className={`text-xs mt-0.5 leading-snug pr-2 transition-colors ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Hear spoken alerts.</p>
                </div>
              </div>
              <Toggle enabled={voiceEnabled} setEnabled={handleVoiceToggle} />
            </div>

            {/* Voice type selector */}
            <div className={`grid grid-cols-3 gap-2 mb-5 ${!voiceEnabled && 'opacity-50 pointer-events-none'}`}>
              <button
                onClick={() => handleVoiceTypeChange('female')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  voiceType === 'female'
                    ? currentTheme.border + (isLight ? ' bg-slate-50 ring-1 ring-slate-800/10' : '')
                    : (isLight ? 'border-slate-200 bg-transparent hover:bg-slate-50' : 'border-white/10 hover:border-white/20')
                }`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1">
                  <User className="text-pink-500 w-6 h-6" fill="currentColor" />
                </div>
                <span className={`text-[10px] font-medium transition-colors ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Female</span>
              </button>
              <button
                onClick={() => handleVoiceTypeChange('male')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  voiceType === 'male'
                    ? currentTheme.border + (isLight ? ' bg-slate-50 ring-1 ring-slate-800/10' : '')
                    : (isLight ? 'border-slate-200 bg-transparent hover:bg-slate-50' : 'border-white/10 hover:border-white/20')
                }`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1">
                  <User className="text-blue-500 w-6 h-6" fill="currentColor" />
                </div>
                <span className={`text-[10px] font-medium transition-colors ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Male</span>
              </button>
              <button
                onClick={() => handleVoiceTypeChange('robotic')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  voiceType === 'robotic'
                    ? currentTheme.border + (isLight ? ' bg-slate-50 ring-1 ring-slate-800/10' : '')
                    : (isLight ? 'border-slate-200 bg-transparent hover:bg-slate-50' : 'border-white/10 hover:border-white/20')
                }`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1">
                  <Bot className={`${isLight ? 'text-slate-500' : 'text-gray-400'} w-6 h-6`} />
                </div>
                <span className={`text-[10px] font-medium transition-colors ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Robot</span>
              </button>
            </div>

            {/* Test Voice Button */}
            <button
              onClick={handleTestVoice}
              disabled={!voiceEnabled}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
                isLight && currentTheme.id === 'white-minimal'
                  ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                  : `${currentTheme.bg} text-slate-900 hover:brightness-110 shadow-[0_4px_15px_rgba(0,0,0,0.2)]`
              } ${!voiceEnabled && 'opacity-50 cursor-not-allowed'}`}
            >
              🔊 Test Voice
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── NOTIFICATION SETTINGS VIEW ───
function NotificationSettingsView({ setView, currentTheme, isLight }: any) {
  const [notifPrefs, setNotifPrefs] = useState(getNotificationPreferences());
  const [alertsEnabled, setAlertsEnabled] = useState(notifPrefs.enabled);
  const [muteEnabled, setMuteEnabled] = useState(notifPrefs.muted);
  const [animStyle, setAnimStyle] = useState<'glow' | 'slide' | 'bounce'>(notifPrefs.animationStyle || 'glow');

  const glassBoxClass = isLight
    ? "bg-white border-slate-200 shadow-sm rounded-2xl relative z-10 border"
    : "bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl";

  const ThemedToggle = ({ enabled, setEnabled }: { enabled: boolean; setEnabled: (v: boolean) => void }) => (
    <button
      onClick={() => setEnabled(!enabled)}
      className={`w-[52px] h-[28px] rounded-full relative cursor-pointer transition-colors duration-300 ${
        enabled
          ? (isLight && currentTheme.id === 'white-minimal' ? 'bg-slate-800' : currentTheme.bg)
          : (isLight ? 'bg-slate-300' : 'bg-[#1a2b50]')
      }`}
    >
      <div className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-md transition-all duration-300 ${enabled ? 'left-[27px]' : 'left-[3px]'}`} />
    </button>
  );

  const CustomRadio = ({ value, currentValue, onChange, label, desc, recommended }: any) => {
    const isChecked = currentValue === value;
    return (
      <div className={`flex items-center justify-between p-3 rounded-xl transition-all ${
        isChecked
          ? (isLight ? 'bg-slate-50 border border-slate-300' : 'bg-white/5 border border-white/20')
          : (isLight ? 'bg-transparent' : 'bg-transparent')
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onChange(value)}
            className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center ${
              isChecked
                ? (isLight && currentTheme.id === 'white-minimal' ? 'border-slate-800' : currentTheme.border)
                : (isLight ? 'border-slate-300 bg-slate-50' : 'border-[#4a5e82] bg-black/20')
            }`}
          >
            {isChecked && (
              <div className={`w-[10px] h-[10px] rounded-full ${isLight && currentTheme.id === 'white-minimal' ? 'bg-slate-800' : currentTheme.bg}`} />
            )}
          </button>
          <div onClick={() => onChange(value)} className="cursor-pointer">
            <div className="flex items-center gap-2">
              <span className={`text-[13px] font-medium ${isLight ? 'text-slate-800' : 'text-white'}`}>{label}</span>
              {recommended && (
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-gray-400'}`}>
                  Recommended
                </span>
              )}
            </div>
            <p className={`text-[13px] ${isLight ? 'text-slate-500' : 'text-[#8a9bbd]'}`}>{desc}</p>
          </div>
        </div>
      </div>
    );
  };

  const handleAlertsToggle = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) { sonnerToast.error('Permission denied'); return; }
    }
    setAlertsEnabled(val);
    const newPrefs = { ...notifPrefs, enabled: val };
    setNotifPrefs(newPrefs);
    saveNotificationPreferences(newPrefs);
  };

  const handleMuteToggle = (val: boolean) => {
    setMuteEnabled(val);
    const newPrefs = { ...notifPrefs, muted: val };
    setNotifPrefs(newPrefs);
    saveNotificationPreferences(newPrefs);
  };

  const handleAnimChange = (val: 'glow' | 'slide' | 'bounce') => {
    setAnimStyle(val);
    const newPrefs = { ...notifPrefs, animationStyle: val as 'glow' | 'slide' | 'bounce' };
    setNotifPrefs(newPrefs);
    saveNotificationPreferences(newPrefs);
  };

  return (
    <div className="flex flex-col h-full w-full relative transition-colors duration-300 z-10">
      <header className="shrink-0 flex items-center px-4 h-16 w-full relative z-20 pt-2">
        <button onClick={() => setView('profile-main')} className="p-2 -ml-2 transition-colors cursor-pointer rounded-full active:scale-95">
          <ChevronLeft className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-10 custom-scrollbar relative z-10">
        <div className="animate-in fade-in duration-300">
          <h1 className={`text-[22px] font-semibold text-center mb-8 tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Notifications
          </h1>

          {/* Header icon + title */}
          <div className={`${glassBoxClass} p-5 flex items-center gap-4 mb-8`}>
            <div className={`flex-shrink-0 ${currentTheme.text}`}>
              <svg width="52" height="52" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 8C16.5 8 13.5 15.5 13.5 23V28.5L9.5 34H38.5L34.5 28.5V23C34.5 15.5 31.5 8 24 8Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2.5"/>
                <path d="M19.5 38C19.5 40.5 21.5 42.5 24 42.5C26.5 42.5 28.5 40.5 28.5 38" stroke="currentColor" strokeWidth="2.5"/>
              </svg>
            </div>
            <div>
              <h2 className={`text-[19px] font-bold leading-[1.2] mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Notification<br/>Settings
              </h2>
              <p className={`text-[13px] leading-snug ${isLight ? 'text-slate-500' : 'text-[#8a9bbd]'}`}>
                Customize your<br/>notification experience
              </p>
            </div>
          </div>

          {/* Enable World Upload Alerts */}
          <div className="flex items-center justify-between mb-8 px-1">
            <div className="flex items-start gap-3">
              <div className={currentTheme.text}>
                <svg className="mt-1 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4C8.5 4 7 7.5 7 11V15L5 18H19L17 15V11C17 7.5 15.5 4 12 4Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 20C10 21.1046 10.8954 22 12 22C13.1046 22 14 21.1046 14 20" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div>
                <h3 className={`text-[15px] font-medium mb-1 leading-tight ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  Enable World<br/>Upload Alerts
                </h3>
                <p className={`text-[13px] leading-relaxed max-w-[170px] ${isLight ? 'text-slate-500' : 'text-[#8a9bbd]'}`}>
                  Get notified when new PDFs are uploaded to World
                </p>
              </div>
            </div>
            <ThemedToggle enabled={alertsEnabled} setEnabled={handleAlertsToggle} />
          </div>

          {/* Animation Style */}
          <div className={`${glassBoxClass} p-5 pb-6 mb-8 flex flex-col gap-5`}>
            <div className="flex items-center gap-2.5">
              <div className={currentTheme.text}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L14.2 9.8L21 12L14.2 14.2L12 21L9.8 14.2L3 12L9.8 9.8L12 3Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5.5 5.5L6.5 7.5L8.5 8.5L6.5 9.5L5.5 11.5L4.5 9.5L2.5 8.5L4.5 7.5L5.5 5.5Z" fill="currentColor" fillOpacity="0.3"/>
                </svg>
              </div>
              <h3 className={`text-[15px] font-medium ${isLight ? 'text-slate-800' : 'text-white'}`}>Animation Style</h3>
            </div>

            <div className="flex flex-col gap-4">
              <CustomRadio value="glow" currentValue={animStyle} onChange={handleAnimChange} label="Glow Effect" desc="Smooth fade with neon glow" recommended />
              <CustomRadio value="slide" currentValue={animStyle} onChange={handleAnimChange} label="Slide In" desc="Slides from the right side" />
              <CustomRadio value="bounce" currentValue={animStyle} onChange={handleAnimChange} label="Bounce" desc="Playful bouncing effect" />
            </div>
          </div>

          {/* Mute Sounds & Haptics */}
          <div className="flex items-center justify-between mb-10 px-1">
            <div className="flex items-start gap-3">
              <div className={currentTheme.text}>
                <svg className="mt-1 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24">
                  <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
                  <path d="M22 12C22 14.5 20.5 16.5 18.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M19 12C19 13.5 18 14.5 16.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h3 className={`text-[15px] font-medium mb-1 leading-tight ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  Mute Sounds &<br/>Haptics
                </h3>
                <p className={`text-[13px] leading-relaxed max-w-[160px] ${isLight ? 'text-slate-500' : 'text-[#8a9bbd]'}`}>
                  Disable notification sounds and vibrations
                </p>
              </div>
            </div>
            <ThemedToggle enabled={muteEnabled} setEnabled={handleMuteToggle} />
          </div>

          {/* Submit / Test Button */}
          <button
            onClick={() => {
              if (alertsEnabled) {
                sonnerToast('Test notification sent! 🎉', { description: 'Check your notification tray' });
              } else {
                sonnerToast.error('Please enable notifications first');
              }
            }}
            className={`w-full mt-auto font-semibold text-[16px] py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
              isLight && currentTheme.id === 'white-minimal'
                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                : `${currentTheme.bg} text-slate-900 hover:brightness-110 shadow-[0_4px_15px_rgba(0,0,0,0.2)]`
            }`}
          >
            Test Notification
          </button>
        </div>
      </main>
    </div>
  );
}

export default Profile;
