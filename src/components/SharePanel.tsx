import { Button } from '@/components/ui/button';
import { Link, MessageCircle, Instagram, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SharePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  pdfName: string;
}

const SharePanel = ({ open, onOpenChange, shareUrl, pdfName }: SharePanelProps) => {
  const { toast } = useToast();

  const shareText = `Check out "${pdfName}" on MridulPDF!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to clipboard",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    onOpenChange(false);
  };

  const handleInstagramShare = () => {
    // Instagram doesn't support direct URL sharing, so we copy the link
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    toast({
      title: "Link copied!",
      description: "Paste in Instagram to share. Instagram doesn't support direct links.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-2xl bg-card border-border p-0 overflow-hidden">
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>
        
        <DialogHeader className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-foreground">
              Share PDF
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon"
              className="-mr-2"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="px-6 pb-6">
          <div className="grid grid-cols-3 gap-4">
            {/* WhatsApp */}
            <button 
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-accent/50 transition-colors group"
            >
              <div className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-medium text-foreground">WhatsApp</span>
            </button>

            {/* Instagram */}
            <button 
              onClick={handleInstagramShare}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-accent/50 transition-colors group"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Instagram className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-medium text-foreground">Instagram</span>
            </button>

            {/* Copy Link */}
            <button 
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-accent/50 transition-colors group"
            >
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Link className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground">Copy Link</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SharePanel;
