import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface GoogleLoginPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GoogleLoginPrompt = ({ open, onOpenChange }: GoogleLoginPromptProps) => {
  const handleDismiss = () => {
    sessionStorage.setItem('google_prompt_dismissed', 'true');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Google Login Not Supported
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Google login is currently not available. Please use <strong>Email</strong> or <strong>Guest</strong> login/signup instead.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <Button
            onClick={handleDismiss}
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            OK, Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleLoginPrompt;
