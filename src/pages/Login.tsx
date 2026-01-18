import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const USER_ID_KEY = 'anonymous_user_id';
const USER_NAME_KEY = 'user_display_name';

const Login = () => {
  const [guestId, setGuestId] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [newGuestId, setNewGuestId] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, loading: authLoading, getUserId } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && (isAuthenticated || getUserId())) {
      navigate('/home', { replace: true });
    }
  }, [authLoading, isAuthenticated, getUserId, navigate]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });

      if (error) {
        toast({
          title: "Login Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate Google login",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const newId = uuidv4();
    localStorage.setItem(USER_ID_KEY, newId);
    localStorage.setItem(USER_NAME_KEY, 'Guest User');
    setNewGuestId(newId);
    setShowPopup(true);
  };

  const handleEnterGuestId = () => {
    if (!guestId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Guest ID",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem(USER_ID_KEY, guestId.trim());
    localStorage.setItem(USER_NAME_KEY, 'Guest User');
    toast({
      title: "Welcome back!",
      description: "You have successfully logged in with your Guest ID"
    });
    navigate('/home');
  };

  const handleContinue = () => {
    setShowPopup(false);
    navigate('/home');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">MRIDUL PDF</CardTitle>
          <CardDescription>Welcome! Please login to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Login - Primary Option */}
          <div className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              size="lg"
              className="w-full h-12 text-base font-semibold"
              variant="default"
            >
              {googleLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </span>
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Recommended - Sync across devices
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue as guest</span>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleGuestLogin}
              size="lg"
              className="w-full"
              variant="outline"
            >
              Guest Login
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Generate a new unique Guest ID
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Returning guest?</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="guestId">Enter Guest ID</Label>
              <Input
                id="guestId"
                value={guestId}
                onChange={(e) => setGuestId(e.target.value)}
                placeholder="Enter your existing Guest ID"
                className="mt-1.5"
              />
            </div>
            <Button
              onClick={handleEnterGuestId}
              size="lg"
              className="w-full"
              variant="secondary"
            >
              Login with Guest ID
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showPopup} onOpenChange={setShowPopup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Your Guest ID</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="font-semibold text-foreground">Your Guest ID:</p>
              <div className="bg-muted p-3 rounded-md">
                <code className="text-sm break-all">{newGuestId}</code>
              </div>
              <p className="text-destructive font-medium">
                ⚠️ Please save your Guest ID in your Notes or WhatsApp.
              </p>
              <p>
                You will need this ID to access your uploaded PDFs if you reinstall the app or use a different device.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Button onClick={handleContinue} className="w-full">
            I've Saved My ID
          </Button>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Login;
