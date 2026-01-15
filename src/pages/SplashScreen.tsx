import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import splashVideo from '@/assets/splash-video.mp4';

const SplashScreen = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    // Check if splash has been shown this session
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown) {
      navigate('/home', { replace: true });
      return;
    }

    const video = videoRef.current;
    if (video) {
      // Attempt to play video
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If autoplay fails, navigate immediately
          sessionStorage.setItem('splashShown', 'true');
          navigate('/home', { replace: true });
        });
      }
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
    // If video fails to load, navigate to home
    sessionStorage.setItem('splashShown', 'true');
    navigate('/home', { replace: true });
  };

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <video
        ref={videoRef}
        src={splashVideo}
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
};

export default SplashScreen;
