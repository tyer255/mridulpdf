import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to handle deep links and Android "Open With" intents
 * When a PDF is opened via Android intent, navigate to the PDF viewer
 */
export const useAppUrlListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle Capacitor App URL Open events (for Android intents)
    const handleAppUrlOpen = async () => {
      try {
        // Dynamic import for Capacitor to avoid build issues in web
        const { App } = await import('@capacitor/app');
        
        App.addListener('appUrlOpen', (event) => {
          console.log('App URL opened:', event.url);
          
          // Handle file:// and content:// URLs from Android intent
          if (event.url) {
            const url = event.url;
            
            // Check if it's a PDF file
            if (url.toLowerCase().includes('.pdf') || url.includes('application/pdf')) {
              // Navigate to PDF viewer with the file URL
              navigate(`/view-pdf?url=${encodeURIComponent(url)}&name=${encodeURIComponent('Shared PDF')}`);
            }
          }
        });

        // Also handle incoming data (file shared to app)
        App.addListener('appStateChange', (state) => {
          console.log('App state changed:', state.isActive);
        });
      } catch (error) {
        // Capacitor not available (running in browser)
        console.log('Capacitor App plugin not available');
      }
    };

    handleAppUrlOpen();

    // Cleanup listeners on unmount
    return () => {
      import('@capacitor/app').then(({ App }) => {
        App.removeAllListeners();
      }).catch(() => {});
    };
  }, [navigate]);
};

export default useAppUrlListener;
