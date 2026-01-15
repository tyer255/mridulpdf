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
      navigate('/home', { replace: true });
      return;
    }

    const video = videoRef.current;
    if (video) {
      // Wait for video to be ready before playing
      video.addEventListener('canplaythrough', () => {
        setIsReady(true);
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            sessionStorage.setItem('splashShown', 'true');
            navigate('/home', { replace: true });
          });
        }
      });

      // Preload video
      video.load();
    }
  }, [navigate]);

  const handleVideoEnd = () => {
    if (!hasPlayed) {
      setHasPlayed(true);
      sessionStorage.setItem('splashShown', 'true');
      navigate('/home', { replace: true });
    }
  };

  const handleVideoError = () => {
    sessionStorage.setItem('splashShown', 'true');
    navigate('/home', { replace: true });
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
