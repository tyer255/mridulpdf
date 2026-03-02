import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, getUserId } = useAuth();

  useEffect(() => {
    if (!loading && (isAuthenticated || getUserId())) {
      navigate('/home', { replace: true });
    }
  }, [loading, isAuthenticated, getUserId, navigate]);

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
          <span className="hover:text-white cursor-pointer transition-colors flex items-center gap-1.5">
            <i className="fas fa-cube text-xs" /> Features
          </span>
          <span className="hover:text-white cursor-pointer transition-colors flex items-center gap-1.5">
            <i className="fas fa-wand-magic-sparkles text-xs" /> AI Tools
          </span>
          <span className="hover:text-white cursor-pointer transition-colors flex items-center gap-1.5">
            <i className="fas fa-shield-halved text-xs" /> Security
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="hidden md:block px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/login')}
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
            onClick={() => navigate('/login')}
            className="px-6 py-3 text-sm text-gray-300 border border-white/10 rounded-xl hover:bg-white/5 transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/login')}
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

      {/* Login Modal - hidden, users go to /login */}
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
      `}</style>
    </div>
  );
};

export default Landing;
