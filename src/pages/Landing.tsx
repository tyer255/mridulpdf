import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Eye, EyeOff, X, Mail, Lock, FileText, File, Image, Sparkles, User } from 'lucide-react';

const USER_ID_KEY = 'anonymous_user_id';
const USER_NAME_KEY = 'user_display_name';

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, getUserId } = useAuth();
  const { toast } = useToast();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [mainVisible, setMainVisible] = useState(false);

  useEffect(() => {
    if (!loading && (isAuthenticated || getUserId())) {
      navigate('/home', { replace: true });
    }
  }, [loading, isAuthenticated, getUserId, navigate]);

  useEffect(() => {
    setTimeout(() => setMainVisible(true), 100);
  }, []);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}/home`,
        extraParams: {
          prompt: 'select_account',
        },
      });
      if (error) toast({ title: "Login Error", description: error.message, variant: "destructive" });
    } catch {
      toast({ title: "Error", description: "Failed to initiate Google login", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Error", description: "Please enter email and password", variant: "destructive" });
      return;
    }
    setEmailLoading(true);
    try {
      if (authMode === 'signup') {
        if (password.length < 6) {
          toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
          setEmailLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
          setEmailLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/home` },
        });
        if (error) {
          toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Account Created!", description: "Please check your email to verify your account before logging in." });
          setAuthMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          toast({ title: "Login Failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Welcome back!", description: "Logged in successfully" });
          navigate('/home');
        }
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const newId = uuidv4();
    localStorage.setItem(USER_ID_KEY, newId);
    localStorage.setItem(USER_NAME_KEY, 'Guest User');
    toast({ title: "Welcome!", description: "Entering as Guest mode..." });
    setTimeout(() => {
      setShowLoginModal(false);
      navigate('/home');
    }, 500);
  };

  const openLogin = () => setShowLoginModal(true);
  const closeLogin = () => setShowLoginModal(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen relative bg-[#030712] text-white overflow-x-hidden font-sans">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply blur-[128px] opacity-20 animate-pulse"
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply blur-[128px] opacity-20 animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      {/* Main Content */}
      <main
        className="relative z-10 flex-grow flex flex-col items-center justify-center p-6 text-center w-full max-w-4xl mx-auto mt-10 md:mt-0 transition-all duration-500"
        style={{
          opacity: mainVisible ? 1 : 0,
          transform: mainVisible ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        {/* Logo with Orbiting Elements */}
        <div className="relative w-80 h-80 md:w-96 md:h-96 mb-8 flex items-center justify-center">
          {/* Central floating logo */}
          <div className="relative z-20 flex flex-col items-center animate-float transform hover:scale-105 transition-transform duration-500">
            <div className="relative mb-2">
              <svg
                width="100"
                height="120"
                viewBox="0 0 100 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_0_25px_rgba(59,130,246,0.6)]"
              >
                <path
                  d="M25 5 H65 L95 35 V105 C95 113.284 88.2843 120 80 120 H25 C16.7157 120 10 113.284 10 105 V20 C10 11.7157 16.7157 5 25 5 Z"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <path
                  d="M65 5 V25 C65 30.5228 69.4772 35 75 35 H95"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#002b5c] border-2 border-blue-500 rounded-lg px-2 py-0.5 shadow-lg">
                <span className="text-white font-bold text-sm tracking-wide font-sans">PDF</span>
              </div>
            </div>
            <div className="text-center mt-2 flex flex-col items-center">
              <span className="block text-[#3b82f6] font-extrabold text-3xl tracking-wide drop-shadow-lg font-sans">
                MRIDUL
              </span>
              <span className="block text-[#3b82f6] font-extrabold text-3xl tracking-wide drop-shadow-lg font-sans -mt-2">
                PDF
              </span>
            </div>
          </div>

          {/* Orbiting elements */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* PDF icon orbit */}
            <div className="absolute animate-orbit-1">
              <div className="glass-card p-3 rounded-xl shadow-lg border-blue-400/30">
                <FileText className="w-5 h-5 text-red-400" />
              </div>
            </div>
            {/* Document icon orbit */}
            <div className="absolute animate-orbit-1" style={{ animationDelay: '-5s' }}>
              <div className="glass-card p-3 rounded-xl shadow-lg border-purple-400/30">
                <File className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            {/* Image icon orbit */}
            <div className="absolute animate-orbit-1" style={{ animationDelay: '-10s' }}>
              <div className="glass-card p-3 rounded-xl shadow-lg border-green-400/30">
                <Image className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>

          {/* Shadow/glow under logo */}
          <div className="absolute -bottom-20 w-64 h-24 bg-blue-600/20 rounded-[100%] blur-xl pointer-events-none" />
        </div>

        {/* Heading */}
        <div className="space-y-6 max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Welcome to <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-gray-400">
              Mridul PDF
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-lg mx-auto">
            The ultimate AI-powered workspace to capture, convert, chat, and organize all your documents.
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-12 flex flex-col items-center space-y-6 w-full max-w-xs">
          <button
            onClick={openLogin}
            className="text-gray-400 hover:text-white transition-colors text-sm font-medium tracking-wide"
          >
            Sign In
          </button>
          <button
            onClick={openLogin}
            className="group relative w-full overflow-hidden rounded-2xl shimmer-btn p-[1px] transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] hover:scale-105 active:scale-95"
          >
            <div className="relative h-full bg-[#1e1b4b] bg-opacity-90 hover:bg-opacity-0 transition-all rounded-2xl px-8 py-4 flex items-center justify-center space-x-2">
              <span className="text-white font-semibold text-lg">Get Started</span>
              <Sparkles className="w-5 h-5 text-yellow-300 group-hover:animate-pulse" />
            </div>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full p-6 text-center text-gray-600 text-xs">
        <p>&copy; 2026 Mridul PDF. AI Powered.</p>
      </footer>

      {/* Login Overlay */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/90 backdrop-blur-xl transition-opacity duration-300 ${
          showLoginModal ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Close button */}
        <button
          onClick={closeLogin}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors text-2xl z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Login Card */}
        <div
          className={`glass-card w-full max-w-md p-8 md:p-10 rounded-3xl shadow-2xl border border-gray-700/50 transition-transform duration-300 mx-4 ${
            showLoginModal ? 'scale-100' : 'scale-95'
          }`}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block p-3 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <User className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 text-sm">Sign in to access your Mridul PDF workspace</p>
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 py-3.5 px-4 rounded-xl font-semibold hover:bg-gray-100 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-[0.98] disabled:opacity-50"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              className="w-5 h-5"
              alt="Google Logo"
            />
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-700" />
            <span className="mx-4 text-gray-500 text-sm font-medium">OR EMAIL</span>
            <div className="flex-grow border-t border-gray-700" />
          </div>

          {/* Email & Password */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="input-field w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field w-full pl-11 pr-10 py-3.5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={emailLoading}
              className="w-full shimmer-btn py-3.5 rounded-xl text-white font-bold text-lg hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all active:scale-[0.98] mt-2 disabled:opacity-50"
            >
              {emailLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Guest Login */}
          <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            <button
              onClick={handleGuestLogin}
              className="text-gray-400 hover:text-blue-400 transition-colors font-medium flex items-center justify-center gap-2 mx-auto"
            >
              ⚡ Continue as Guest
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
        }
        @keyframes orbit-reverse {
          from { transform: rotate(360deg) translateX(150px) rotate(-360deg); }
          to { transform: rotate(0deg) translateX(150px) rotate(0deg); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-orbit-1 { animation: orbit 15s linear infinite; }
        .animate-orbit-2 { animation: orbit-reverse 20s linear infinite; }
        .bg-grid {
          background-size: 50px 50px;
          background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
          mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
        }
        .shimmer-btn {
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6);
          background-size: 200% 100%;
          animation: shimmer 3s infinite linear;
        }
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .input-field {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        .input-field:focus {
          outline: none;
          border-color: #3b82f6;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
};

export default Landing;
