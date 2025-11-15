import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface QRShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  fileName: string;
}

export const QRShareModal = ({ open, onOpenChange, pdfUrl, fileName }: QRShareModalProps) => {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = `${window.location.origin}/view?pdf=${encodeURIComponent(pdfUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard! 📋');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code-svg') as any;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `${fileName}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      
      toast.success('QR code downloaded! 📥');
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: fileName,
          text: `Check out this PDF: ${fileName}`,
          url: shareUrl
        });
        toast.success('Shared successfully! 🚀');
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share via QR
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          {/* QR Code with glassmorphic background */}
          <div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-lg border-2 border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.3)]">
            <QRCodeSVG
              id="qr-code-svg"
              value={shareUrl}
              size={200}
              level="H"
              includeMargin
              fgColor="hsl(var(--foreground))"
              bgColor="transparent"
            />
          </div>

          {/* File name */}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground mt-1">Scan to view PDF</p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="text-xs">{copied ? 'Copied!' : 'Copy Link'}</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDownloadQR}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs">Download</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleShareQR}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-xs">Share</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
