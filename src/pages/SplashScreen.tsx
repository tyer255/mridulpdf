import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import splashVideo from '@/assets/splash-video.mp4';

const SplashScreen = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if splash has been shown this session
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown) {
      navigate('/landing', { replace: true });
      return;
    }

    // Hard fail-safe: never let the splash block the app for more than 3.5s.
    const failSafe = setTimeout(() => {
      sessionStorage.setItem('splashShown', 'true');
      navigate('/landing', { replace: true });
    }, 3500);

    const video = videoRef.current;
    if (video) {
      const startPlayback = () => {
        setIsReady(true);
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            sessionStorage.setItem('splashShown', 'true');
            navigate('/landing', { replace: true });
          });
        }
      };
      // Start as soon as we have *some* data, not full canplaythrough.
      video.addEventListener('loadeddata', startPlayback, { once: true });
      video.addEventListener('canplay', startPlayback, { once: true });

      // Preload video
      video.load();
    }

    return () => clearTimeout(failSafe);
  }, [navigate]);

  const handleVideoEnd = () => {
    if (!hasPlayed) {
      setHasPlayed(true);
      sessionStorage.setItem('splashShown', 'true');
      navigate('/landing', { replace: true });
    }
  };

  const handleVideoError = () => {
    sessionStorage.setItem('splashShown', 'true');
    navigate('/landing', { replace: true });
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <video
        ref={videoRef}
        src={splashVideo}
        muted
        playsInline
        preload="auto"
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        className="max-w-full max-h-full object-contain"
        style={{ 
          backgroundColor: '#FFFFFF',
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.1s ease-in'
        }}
      />
    </div>
  );
};

export default SplashScreen;
