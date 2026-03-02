import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Eye, EyeOff } from 'lucide-react';

const USER_ID_KEY = 'anonymous_user_id';
const USER_NAME_KEY = 'user_display_name';

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, getUserId } = useAuth();
  const { toast } = useToast();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (!loading && (isAuthenticated || getUserId())) {
      navigate('/home', { replace: true });
    }
  }, [loading, isAuthenticated, getUserId, navigate]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/home` },
      });
      if (error) toast({ title: "Login Error", description: error.message, variant: "destructive" });
    } catch {
      toast({ title: "Error", description: "Failed to initiate Google login", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ title: "Error", description: "Please enter email and password", variant: "destructive" });
      return;
    }
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Welcome back!", description: "Logged in successfully" });
        navigate('/home');
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
    toast({ title: "Welcome!", description: "Logged in as Guest" });
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden font-sans">
      {/* Background Grid */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />

      {/* Gradient Orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-xl font-bold tracking-tight">
            <span className="text-white">MRIDUL</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">PDF</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <span className="hover:text-white cursor-pointer transition-colors flex items-center gap-1.5">Features</span>
          <span className="hover:text-white cursor-pointer transition-colors flex items-center gap-1.5">AI Tools</span>
          <span className="hover:text-white cursor-pointer transition-colors flex items-center gap-1.5">Security</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLoginModal(true)}
            className="hidden md:block px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl shimmer-btn text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-20 pb-32">
        {/* Orbiting Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] pointer-events-none">
          <div className="animate-orbit-1 absolute top-1/2 left-1/2">
            <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" />
          </div>
          <div className="animate-orbit-2 absolute top-1/2 left-1/2">
            <div className="w-2 h-2 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50" />
          </div>
          <div className="animate-orbit-1 absolute top-1/2 left-1/2" style={{ animationDelay: '-5s' }}>
            <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
          </div>
        </div>

        {/* Floating PDF Icon */}
        <div className="animate-float mb-12">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-2xl scale-150" />
            <div className="relative w-24 h-28 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl border border-white/10 flex flex-col items-center justify-center">
              <svg className="w-10 h-10 text-blue-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="text-[10px] font-bold text-blue-300 tracking-wider">PDF</div>
            </div>
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 max-w-4xl">
          <span className="text-gray-400 text-lg md:text-2xl font-light block mb-3">Welcome to</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white">Mridul </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">PDF</span>
        </h1>

        <p className="text-gray-400 text-base md:text-lg max-w-xl mb-10 leading-relaxed">
          The ultimate AI-powered workspace to capture, convert, chat, and organize all your documents.
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-6 py-3 text-sm text-gray-300 border border-white/10 rounded-xl hover:bg-white/5 transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => setShowLoginModal(true)}
            className="flex items-center gap-2 px-7 py-3 text-sm font-semibold rounded-xl shimmer-btn text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
          >
            Get Started
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 border-t border-white/5">
        <p className="text-gray-500 text-sm">© 2026 Mridul PDF. AI Powered.</p>
      </footer>

      {/* Login Modal Overlay */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLoginModal(false)} />
          
          {/* Animated gradient bg */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />

          {/* Modal */}
          <div className="relative w-full max-w-md glass-card rounded-3xl p-8 animate-modal-in">
            {/* Close button */}
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              ✕
            </button>

            {/* Logo */}
            <div className="flex justify-center mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-white mb-1">Welcome Back</h2>
            <p className="text-gray-400 text-center text-sm mb-6">Sign in to access your Mridul PDF workspace</p>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all mb-5 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-500 tracking-wider">OR EMAIL</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Email & Password */}
            <div className="space-y-3 mb-5">
              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-10 pr-4 py-3 rounded-xl input-field text-white text-sm placeholder-gray-500"
                  />
                </div>
              </div>
              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                    className="w-full pl-10 pr-10 py-3 rounded-xl input-field text-white text-sm placeholder-gray-500"
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
                onClick={handleEmailLogin}
                disabled={emailLoading}
                className="w-full py-3 rounded-xl shimmer-btn text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow disabled:opacity-50"
              >
                {emailLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>

            {/* Guest Login */}
            <div className="text-center">
              <button
                onClick={handleGuestLogin}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                ⚡ Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}

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
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-orbit-1 { animation: orbit 15s linear infinite; }
        .animate-orbit-2 { animation: orbit-reverse 20s linear infinite; }
        .animate-modal-in { animation: modalIn 0.3s ease-out; }
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
