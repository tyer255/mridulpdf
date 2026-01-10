import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const USER_ID_KEY = 'anonymous_user_id';
const USER_NAME_KEY = 'user_display_name';

const Login = () => {
  const [guestId, setGuestId] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [newGuestId, setNewGuestId] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

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
    navigate('/');
  };

  const handleContinue = () => {
    setShowPopup(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">MRIDUL PDF</CardTitle>
          <CardDescription>Welcome! Please login to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button
              onClick={handleGuestLogin}
              size="lg"
              className="w-full"
              variant="default"
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
              <span className="bg-background px-2 text-muted-foreground">Or</span>
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
              variant="outline"
            >
              Login with Guest ID
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              For returning users
            </p>
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
