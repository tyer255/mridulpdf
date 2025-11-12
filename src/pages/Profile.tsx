import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, LogOut } from 'lucide-react';
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

    // Get total PDFs count
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
                <Label>Guest ID</Label>
                <div className="mt-1.5 p-3 bg-muted rounded-md">
                  <code className="text-sm break-all">{userId}</code>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Save this ID to access your PDFs on other devices
                </p>
              </div>

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

          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full"
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
