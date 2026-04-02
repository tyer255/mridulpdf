import { useEffect, useRef, useState } from 'react';
import { LOADING_ANIMATION_URL } from '@/lib/loaderConfig';

interface LottieLoaderProps {
  size?: number;
  className?: string;
  message?: string;
}

const LottieLoader = ({ size = 200, className = '' }: LottieLoaderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || failed) return;

    // Dynamically create dotlottie-wc element
    const el = document.createElement('dotlottie-wc') as any;
    el.setAttribute('src', LOADING_ANIMATION_URL);
    el.setAttribute('autoplay', '');
    el.setAttribute('loop', '');
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;

    const handleError = () => setFailed(true);
    el.addEventListener('error', handleError);

    // Timeout fallback if animation doesn't load
    const timeout = setTimeout(() => {
      if (!el.isConnected) return;
      // Check if animation loaded by seeing if canvas exists
      if (!el.shadowRoot?.querySelector('canvas')) {
        setFailed(true);
      }
    }, 5000);

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(el);

    return () => {
      clearTimeout(timeout);
      el.removeEventListener('error', handleError);
      if (el.isConnected) el.remove();
    };
  }, [size, failed]);

  // Fallback spinner
  if (failed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div
          className="border-4 border-primary/20 border-t-primary rounded-full animate-spin"
          style={{ width: size * 0.3, height: size * 0.3 }}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex items-center justify-center ${className}`} />
  );
};

export default LottieLoader;
