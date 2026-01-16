import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, LogOut, Bell, Palette, User, FileText, ChevronRight, Shield } from 'lucide-react';
import { mockStorage } from '@/lib/mockStorage';

const USER_ID_KEY = 'anonymous_user_id';
const USER_NAME_KEY = 'user_display_name';

const Profile = () => {
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [totalPDFs, setTotalPDFs] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const storedUserId = localStorage.getItem(USER_ID_KEY);
    const storedName = localStorage.getItem(USER_NAME_KEY) || 'Guest User';
    
    if (!storedUserId) {
      navigate('/login');
      return;
    }

    setUserId(storedUserId);
    setDisplayName(storedName);

    const loadPDFCount = async () => {
      const worldPDFs = await mockStorage.getWorldPDFs();
      const privatePDFs = mockStorage.getUserPDFs(storedUserId);
      const userWorldPDFs = worldPDFs.filter(pdf => pdf.userId === storedUserId);
      setTotalPDFs(userWorldPDFs.length + privatePDFs.length);
    };

    loadPDFCount();
  }, [navigate]);

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

  const handleLogout = () => {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    toast({
      title: "Logged out",
      description: "You have been logged out successfully"
    });
    navigate('/login');
  };

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
              <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center -mt-10 mb-4">
                <User className="w-10 h-10 text-primary" />
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Guest ID</Label>
                  <div className="mt-1.5 p-3 bg-muted/50 rounded-xl border border-border/50">
                    <code className="text-sm break-all font-mono text-foreground">{userId}</code>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Save this ID to access your PDFs on other devices
                  </p>
                </div>

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
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
