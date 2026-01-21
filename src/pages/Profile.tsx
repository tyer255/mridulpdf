import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, LogOut, Bell, Palette, User, FileText, ChevronRight, Shield, Mail, CheckCircle, Camera, Loader2 } from 'lucide-react';
import { mockStorage } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { loading, isAuthenticated, signOut, getUserDisplayName, getUserId, getUserEmail, getUserAvatar, setGuestAvatar } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [totalPDFs, setTotalPDFs] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const userId = getUserId();
  const email = getUserEmail();
  const avatar = getUserAvatar();

  useEffect(() => {
    if (!loading && !userId) {
      navigate('/login');
      return;
    }

    setDisplayName(getUserDisplayName());

    const loadPDFCount = async () => {
      if (!userId) return;
      const worldPDFs = await mockStorage.getWorldPDFs();
      const privatePDFs = mockStorage.getUserPDFs(userId);
      const userWorldPDFs = worldPDFs.filter(pdf => pdf.userId === userId);
      setTotalPDFs(userWorldPDFs.length + privatePDFs.length);
    };

    loadPDFCount();
  }, [loading, userId, navigate, getUserDisplayName]);

  const handleSaveName = () => {
    if (!displayName.trim()) {
      toast({
        title: "Error",
        description: "Display name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem('user_display_name', displayName.trim());
    toast({
      title: "Success!",
      description: "Display name updated successfully"
    });
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully"
    });
    navigate('/login');
  };

  const handleAvatarClick = () => {
    if (!isAuthenticated) {
      fileInputRef.current?.click();
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting query param
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      
      // Save to localStorage and update context
      setGuestAvatar(avatarUrl);

      toast({
        title: "Success!",
        description: "Profile photo updated successfully"
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile photo",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background pb-24 safe-top overflow-x-hidden">
      <div className="p-4 sm:p-6 app-container">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/home')}
            className="rounded-full hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Profile</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="border-border/50 overflow-hidden">
            <div className="h-20 gradient-primary" />
            <div className="relative px-6 pb-6">
              {/* Hidden file input for avatar upload */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              
              {/* Avatar with upload overlay for guests */}
              <div 
                className={`relative -mt-10 mb-4 ${!isAuthenticated ? 'cursor-pointer group' : ''}`}
                onClick={handleAvatarClick}
              >
                {avatar ? (
                  <img 
                    src={avatar} 
                    alt={displayName}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-card shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                )}
                
                {/* Upload overlay for guests */}
                {!isAuthenticated && (
                  <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingAvatar ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </div>
                )}
                
                {/* Always visible camera badge for guests */}
                {!isAuthenticated && !uploadingAvatar && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                
                {/* Loading indicator */}
                {uploadingAvatar && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Google Auth Status */}
                {isAuthenticated && email && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Signed in with Google</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {email}
                      </p>
                    </div>
                  </div>
                )}

                {/* User ID */}
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    {isAuthenticated ? 'Account ID' : 'Guest ID'}
                  </Label>
                  <div className="mt-1.5 p-3 bg-muted/50 rounded-xl border border-border/50">
                    <code className="text-sm break-all font-mono text-foreground">{userId}</code>
                  </div>
                  {!isAuthenticated && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Save this ID to access your PDFs on other devices
                    </p>
                  )}
                </div>

                {/* Display Name - only show for guests */}
                {!isAuthenticated && (
                  <div>
                    <Label htmlFor="displayName" className="text-xs text-muted-foreground uppercase tracking-wider">Display Name</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                      />
                      <Button 
                        onClick={handleSaveName} 
                        size="icon"
                        className="rounded-xl gradient-primary hover:opacity-90 transition-opacity"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Stats Card */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total PDFs</p>
                    <p className="text-2xl font-bold text-foreground">{totalPDFs}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/library')}
                  className="rounded-full"
                >
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => navigate('/appearance')}
                variant="ghost"
                className="w-full justify-between h-14 px-4 rounded-xl hover:bg-primary/5 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                    <Palette className="h-5 w-5 text-violet-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Appearance</p>
                    <p className="text-xs text-muted-foreground">Theme & preferences</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
              
              <Button
                onClick={() => navigate('/notifications')}
                variant="ghost"
                className="w-full justify-between h-14 px-4 rounded-xl hover:bg-primary/5 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Notifications</p>
                    <p className="text-xs text-muted-foreground">Alerts & reminders</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
            </CardContent>
          </Card>

          {/* Logout */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12 rounded-xl border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all"
            size="lg"
          >
            <LogOut className="mr-2 h-5 w-5" />
            {isAuthenticated ? 'Sign Out' : 'Logout'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
