import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Save, Play, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveDraft: () => void;
  onResume: () => void;
  onExit: () => void;
  hasContent: boolean;
}

const ExitConfirmDialog = ({
  open,
  onOpenChange,
  onSaveDraft,
  onResume,
  onExit,
  hasContent,
}: ExitConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Leave this page?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasContent 
              ? "You have unsaved work. What would you like to do?"
              : "Are you sure you want to leave?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 py-4">
          {hasContent && (
            <Button
              variant="default"
              className="w-full justify-start gap-3 h-12"
              onClick={onSaveDraft}
            >
              <Save className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Save as Draft</p>
                <p className="text-xs opacity-70">Continue later</p>
              </div>
            </Button>
          )}
          <Button
            variant="secondary"
            className="w-full justify-start gap-3 h-12"
            onClick={onResume}
          >
            <Play className="w-5 h-5" />
            <div className="text-left">
              <p className="font-medium">Resume</p>
              <p className="text-xs opacity-70">Continue editing</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
            onClick={onExit}
          >
            <LogOut className="w-5 h-5" />
            <div className="text-left">
              <p className="font-medium">Exit</p>
              <p className="text-xs opacity-70">Discard changes</p>
            </div>
          </Button>
        </div>
        <AlertDialogFooter className="hidden">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ExitConfirmDialog;
