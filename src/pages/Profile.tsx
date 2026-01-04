import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, LogOut, Bell, Palette } from 'lucide-react';
import { mockStorage } from '@/lib/mockStorage';
import { supabase } from '@/integrations/supabase/client';

const USER_ID_KEY = 'anonymous_user_id';
const USER_NAME_KEY = 'user_display_name';

const Profile = () => {
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [totalPDFs, setTotalPDFs] = useState(0);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadUserData = async () => {
      // First check for Supabase session (Google auth)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is authenticated via Google
        setIsGoogleUser(true);
        setUserId(session.user.id);
        
        // Get display name from Google user metadata
        const googleName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          session.user.email || 
                          'User';
        setDisplayName(googleName);
        
        // Also update localStorage for consistency
        localStorage.setItem(USER_ID_KEY, session.user.id);
        localStorage.setItem(USER_NAME_KEY, googleName);
        return;
      }
      
      // Check for guest user
      const storedUserId = localStorage.getItem(USER_ID_KEY);
      const storedName = localStorage.getItem(USER_NAME_KEY) || 'Guest User';
      
      if (!storedUserId) {
        navigate('/login');
        return;
      }

      setIsGoogleUser(false);
      setUserId(storedUserId);
      setDisplayName(storedName);
    };

    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsGoogleUser(true);
        setUserId(session.user.id);
        const googleName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          session.user.email || 
                          'User';
        setDisplayName(googleName);
        localStorage.setItem(USER_ID_KEY, session.user.id);
        localStorage.setItem(USER_NAME_KEY, googleName);
      } else if (event === 'SIGNED_OUT') {
        // On sign out, check if we have a guest user
        const storedUserId = localStorage.getItem(USER_ID_KEY);
        if (storedUserId) {
          setIsGoogleUser(false);
          setUserId(storedUserId);
          setDisplayName(localStorage.getItem(USER_NAME_KEY) || 'Guest User');
        }
      }
    });

    // THEN check for existing session
    loadUserData();

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load PDF count separately
  useEffect(() => {
    const loadPDFCount = async () => {
      if (!userId) return;
      const worldPDFs = await mockStorage.getWorldPDFs();
      const privatePDFs = mockStorage.getUserPDFs(userId);
      const userWorldPDFs = worldPDFs.filter(pdf => pdf.userId === userId);
      setTotalPDFs(userWorldPDFs.length + privatePDFs.length);
    };

    loadPDFCount();
  }, [userId]);

  const handleSaveName = () => {
    if (!displayName.trim()) {
      toast({
        title: "Error",
        description: "Display name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem(USER_NAME_KEY, displayName.trim());
    toast({
      title: "Success!",
      description: "Display name updated successfully"
    });
  };

  const handleLogout = async () => {
    // Sign out from Supabase (clears Google auth session)
    await supabase.auth.signOut();
    
    // Clear local storage
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    
    // Clear session storage flags
    sessionStorage.removeItem('google_prompt_dismissed');
    
    toast({
      title: "Logged out",
      description: "You have been logged out successfully"
    });
    
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Account Type</Label>
                <div className="mt-1.5 p-3 bg-muted rounded-md flex items-center gap-2">
                  {isGoogleUser ? (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span className="text-sm font-medium">Google Account</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium">Guest Account</span>
                  )}
                </div>
              </div>

              {!isGoogleUser && (
                <div>
                  <Label>Guest ID</Label>
                  <div className="mt-1.5 p-3 bg-muted rounded-md">
                    <code className="text-sm break-all">{userId}</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Save this ID to access your PDFs on other devices
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                  <Button onClick={handleSaveName} size="icon">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Total PDFs Uploaded</Label>
                <div className="mt-1.5 text-2xl font-bold text-primary">
                  {totalPDFs}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => navigate('/appearance')}
                variant="outline"
                className="w-full justify-start gap-2 text-foreground hover:text-foreground"
              >
                <Palette className="h-4 w-4 text-foreground" />
                <span className="text-foreground">Appearance & Preferences</span>
              </Button>
              <Button
                onClick={() => navigate('/notifications')}
                variant="outline"
                className="w-full justify-start gap-2 text-foreground hover:text-foreground"
              >
                <Bell className="h-4 w-4 text-foreground" />
                <span className="text-foreground">Notification Settings</span>
              </Button>
            </CardContent>
          </Card>

          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full text-destructive-foreground"
            size="lg"
          >
            <LogOut className="mr-2 h-5 w-5 text-destructive-foreground" />
            <span className="text-destructive-foreground">Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
