import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LogIn } from 'lucide-react';

interface GoogleLoginPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GoogleLoginPrompt = ({ open, onOpenChange }: GoogleLoginPromptProps) => {
  const navigate = useNavigate();

  const handleDismiss = () => {
    sessionStorage.setItem('google_prompt_dismissed', 'true');
    onOpenChange(false);
  };

  const handleSignIn = () => {
    sessionStorage.setItem('google_prompt_dismissed', 'true');
    onOpenChange(false);
    navigate('/landing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Sign in for the full experience
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sign in with <strong>Google</strong> or <strong>Email</strong> to sync your PDFs across devices and unlock all features.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={handleSignIn} className="w-full h-12 text-base font-semibold rounded-xl">
            Sign in now
          </Button>
          <Button onClick={handleDismiss} variant="ghost" className="w-full h-10 text-sm">
            Continue as guest
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleLoginPrompt;
