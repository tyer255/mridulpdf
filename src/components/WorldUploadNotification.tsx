import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { WorldUploadNotification as NotificationType } from '@/types/notification';
import { getNotificationPreferences, playNotificationSound, triggerHapticFeedback } from '@/lib/notifications';
import { useNavigate } from 'react-router-dom';

interface Props {
  notification: NotificationType;
  onClose: () => void;
}

export const WorldUploadNotification = ({ notification, onClose }: Props) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const navigate = useNavigate();
  const prefs = getNotificationPreferences();

  useEffect(() => {
    // Trigger effects
    if (!prefs.muted) {
      playNotificationSound();
      triggerHapticFeedback();
    }

    // Show animation
    setTimeout(() => setVisible(true), 10);

    // Auto dismiss after 6 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 500);
  };

  const handleClick = () => {
    navigate('/');
    handleClose();
  };

  const animationClass = prefs.animationStyle === 'bounce' 
    ? 'animate-bounce' 
    : prefs.animationStyle === 'slide' 
    ? 'animate-slide-in-right' 
    : '';

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] transition-all duration-500 ${
        visible && !exiting 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-4'
      } ${animationClass}`}
      style={{
        maxWidth: '360px',
        filter: 'drop-shadow(0 0 30px rgba(0, 245, 255, 0.4)) drop-shadow(0 0 60px rgba(179, 0, 255, 0.3))',
      }}
    >
      <div
        onClick={handleClick}
        className="relative cursor-pointer rounded-2xl p-4 backdrop-blur-xl border transition-transform hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, rgba(67, 56, 202, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%)',
          borderImage: 'linear-gradient(135deg, rgba(251, 191, 36, 0.6), rgba(251, 191, 36, 0.2)) 1',
          animation: 'glow-pulse 2s ease-in-out infinite',
        }}
      >
        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Notification content */}
        <div className="flex items-start gap-3">
          {/* Icon with pulse effect */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center animate-pulse">
              <span className="text-2xl">📄</span>
            </div>
            <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></div>
          </div>

          {/* Text content */}
          <div className="flex-1 pt-1">
            <h3 className="text-white font-semibold text-base mb-1 tracking-wide" style={{ fontFamily: 'Poppins, sans-serif', textShadow: '0 0 10px rgba(255, 255, 255, 0.5)' }}>
              ✨ New Upload on World!
            </h3>
            <p className="text-blue-100 text-sm mb-2 leading-relaxed">
              <span className="font-medium">{notification.userName}</span> just uploaded{' '}
              <span className="font-medium">📄 '{notification.fileName}'</span>
            </p>
            <p className="text-yellow-300 text-xs font-medium flex items-center gap-1">
              Tap to view now 🚀
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-pink-500"
            style={{
              animation: 'progress 6s linear forwards',
            }}
          ></div>
        </div>
      </div>

      <style>{`
        @keyframes glow-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 20px rgba(0, 245, 255, 0.4)) drop-shadow(0 0 40px rgba(179, 0, 255, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 30px rgba(0, 245, 255, 0.6)) drop-shadow(0 0 60px rgba(179, 0, 255, 0.5));
          }
        }
        
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
