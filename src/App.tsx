import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import AddPDF from "./pages/AddPDF";
import Library from "./pages/Library";
import CapturePDF from "./pages/CapturePDF";
import ImportPDF from "./pages/ImportPDF";
import HandwritingOCR from "./pages/HandwritingOCR";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import NotificationSettings from "./pages/NotificationSettings";
import AppearanceSettings from "./pages/AppearanceSettings";
import ViewPDF from "./pages/ViewPDF";
import BottomNav from "./components/BottomNav";
import { NotificationPermission } from "./components/NotificationPermission";
import { WorldUploadNotification } from "./components/WorldUploadNotification";
import { useNotifications } from "./hooks/useNotifications";
import { shouldAskPermission } from "./lib/notifications";
import { applyTheme, getAppPreferences } from "./lib/preferences";
import { useAppUrlListener } from "./hooks/useAppUrlListener";

const queryClient = new QueryClient();

// Wrapper component to use hooks that need router context
const AppContent = () => {
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const { notification, clearNotification } = useNotifications();
  
  // Listen for Android "Open With" intents
  useAppUrlListener();

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
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Index />} />
        <Route path="/add" element={<AddPDF />} />
        <Route path="/library" element={<Library />} />
        <Route path="/capture" element={<CapturePDF />} />
        <Route path="/import" element={<ImportPDF />} />
        <Route path="/ocr" element={<HandwritingOCR />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<NotificationSettings />} />
        <Route path="/appearance" element={<AppearanceSettings />} />
        <Route path="/view-pdf" element={<ViewPDF />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
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
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
