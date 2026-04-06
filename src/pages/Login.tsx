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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

const USER_ID_KEY = 'anonymous_user_id';
const USER_NAME_KEY = 'user_display_name';

const Login = () => {
  const [guestId, setGuestId] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [newGuestId, setNewGuestId] = useState('');
  
  
  // Email auth states
  const [emailTab, setEmailTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, loading: authLoading, getUserId } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && (isAuthenticated || getUserId())) {
      navigate('/home', { replace: true });
    }
  }, [authLoading, isAuthenticated, getUserId, navigate]);

  const handleGoogleLogin = () => {
    toast({
      title: "Google Login Currently Not Supported",
      description: "Please use Email or Guest login/signup instead.",
      variant: "destructive",
    });
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ title: "Error", description: "Please enter email and password", variant: "destructive" });
      return;
    }
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Welcome back!", description: "Logged in successfully" });
        navigate('/home');
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ title: "Error", description: "Please enter email and password", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/home` },
      });
      if (error) {
        toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account before logging in.",
        });
        setEmailTab('login');
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setEmailLoading(false);
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
      toast({ title: "Error", description: "Please enter a valid Guest ID", variant: "destructive" });
      return;
    }
    localStorage.setItem(USER_ID_KEY, guestId.trim());
    localStorage.setItem(USER_NAME_KEY, 'Guest User');
    toast({ title: "Welcome back!", description: "You have successfully logged in with your Guest ID" });
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-bold">MRIDUL PDF</CardTitle>
          <CardDescription>Welcome! Please login to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Google Login */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            size="lg"
            className="w-full h-12 text-base font-semibold opacity-60"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google (Currently Unavailable)
            </span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or use email</span>
            </div>
          </div>

          {/* Email Login / Signup Tabs */}
          <Tabs value={emailTab} onValueChange={(v) => setEmailTab(v as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="gap-1.5">
                <LogIn className="w-4 h-4" /> Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="gap-1.5">
                <UserPlus className="w-4 h-4" /> Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-3 mt-3">
              <div>
                <Label htmlFor="loginEmail">Email</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="loginPassword">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="loginPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button onClick={handleEmailLogin} disabled={emailLoading} size="lg" className="w-full">
                {emailLoading ? 'Logging in...' : 'Login with Email'}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-3 mt-3">
              <div>
                <Label htmlFor="signupEmail">Email</Label>
                <Input
                  id="signupEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="signupPassword">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="signupPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="mt-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailSignup()}
                />
              </div>
              <Button onClick={handleEmailSignup} disabled={emailLoading} size="lg" className="w-full">
                {emailLoading ? 'Creating account...' : 'Create Account'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                A verification email will be sent to confirm your account
              </p>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue as guest</span>
            </div>
          </div>

          {/* Guest Login */}
          <div className="space-y-3">
            <Button onClick={handleGuestLogin} size="lg" className="w-full" variant="outline">
              Guest Login
            </Button>
            <div>
              <Label htmlFor="guestId">Enter Guest ID</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="guestId"
                  value={guestId}
                  onChange={(e) => setGuestId(e.target.value)}
                  placeholder="Enter your existing Guest ID"
                />
                <Button onClick={handleEnterGuestId} variant="secondary">Go</Button>
              </div>
            </div>
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
              <p>You will need this ID to access your uploaded PDFs if you reinstall the app or use a different device.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Button onClick={handleContinue} className="w-full">I've Saved My ID</Button>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Login;
