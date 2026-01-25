import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect, Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import SplashScreen from "./pages/SplashScreen";
import Index from "./pages/Index";
import BottomNav from "./components/BottomNav";
import { NotificationPermission } from "./components/NotificationPermission";
import { WorldUploadNotification } from "./components/WorldUploadNotification";
import { useNotifications } from "./hooks/useNotifications";
import { shouldAskPermission } from "./lib/notifications";
import { applyTheme, getAppPreferences } from "./lib/preferences";

// Lazy load heavy pages for better performance
const AddPDF = lazy(() => import("./pages/AddPDF"));
const Library = lazy(() => import("./pages/Library"));
const CapturePDF = lazy(() => import("./pages/CapturePDF"));
const ImportPDF = lazy(() => import("./pages/ImportPDF"));
const HandwritingOCR = lazy(() => import("./pages/HandwritingOCR"));
const CompressPDF = lazy(() => import("./pages/CompressPDF"));
const Login = lazy(() => import("./pages/Login"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const AppearanceSettings = lazy(() => import("./pages/AppearanceSettings"));

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const { notification, clearNotification } = useNotifications();

  useEffect(() => {
    // Apply saved theme on app load
    const prefs = getAppPreferences();
    applyTheme(prefs.theme);

    // Ask for permission after 3 seconds if needed
    const timer = setTimeout(() => {
      if (shouldAskPermission()) {
        setShowPermissionDialog(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<SplashScreen />} />
                <Route path="/login" element={<Login />} />
                <Route path="/home" element={<Index />} />
                <Route path="/add" element={<AddPDF />} />
                <Route path="/library" element={<Library />} />
                <Route path="/capture" element={<CapturePDF />} />
                <Route path="/import" element={<ImportPDF />} />
                <Route path="/ocr" element={<HandwritingOCR />} />
                <Route path="/compress" element={<CompressPDF />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<NotificationSettings />} />
                <Route path="/appearance" element={<AppearanceSettings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <BottomNav />
            
            {/* Notification Permission Dialog */}
            <NotificationPermission 
              open={showPermissionDialog} 
              onOpenChange={setShowPermissionDialog} 
            />
            
            {/* World Upload Notification */}
            {notification && (
              <WorldUploadNotification 
                notification={notification} 
                onClose={clearNotification} 
              />
            )}
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;