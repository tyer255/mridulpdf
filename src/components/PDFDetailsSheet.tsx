import { useState, useEffect } from 'react';
import { PDFDocument } from '@/types/pdf';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  Clock, 
  User, 
  Share2, 
  FileStack
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import SharePanel from './SharePanel';
import { mockStorage } from '@/lib/mockStorage';

interface PDFDetailsSheetProps {
  pdf: PDFDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (pdf: PDFDocument) => void;
  displayName?: string;
}

const PDFDetailsSheet = ({ 
  pdf, 
  open, 
  onOpenChange, 
  onDownload,
  displayName 
}: PDFDetailsSheetProps) => {
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');

  // Fetch the actual download URL when sheet opens
  useEffect(() => {
    const fetchShareUrl = async () => {
      if (pdf && open) {
        try {
          // Get the actual public storage URL for sharing
          const downloadUrl = pdf.downloadUrl || await mockStorage.getPDFDownloadUrl(pdf.id);
          setShareUrl(downloadUrl);
        } catch (error) {
          console.error('Error fetching share URL:', error);
          // Fallback to a generic share message
          setShareUrl(`${window.location.origin}/?search=${encodeURIComponent(pdf.name)}`);
        }
      }
    };
    fetchShareUrl();
  }, [pdf, open]);

  if (!pdf) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDownload = () => {
    onDownload(pdf);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[85vh] rounded-t-3xl bg-card border-t border-border p-0 overflow-hidden"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <div className="px-6 pb-8 overflow-y-auto max-h-[calc(85vh-24px)]">
          {/* Header Section */}
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <SheetTitle className="text-xl font-bold text-foreground text-left leading-tight">
                  {pdf.name}
                </SheetTitle>
              </div>
            </div>
          </SheetHeader>

          {/* Metadata Section */}
          <div className="py-5 border-b border-border space-y-4">
            {/* Tags */}
            {pdf.tags && pdf.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pdf.tags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant="tag" 
                    className="px-3 py-1.5 text-sm font-medium"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Date and Page count */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{formatDate(pdf.timestamp)}</span>
              </div>
              {pdf.pageCount && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileStack className="w-4 h-4" />
                  <span className="text-sm">{pdf.pageCount} pages</span>
                </div>
              )}
            </div>
          </div>

          {/* Uploader Information */}
          <div className="py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-muted/30">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Uploaded by</p>
                <p className="text-sm font-medium text-foreground">
                  {displayName || 'Guest User'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 space-y-3">
            <Button 
              className="w-full h-14 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              onClick={handleDownload}
            >
              <Download className="w-5 h-5 mr-2" />
              Download PDF
            </Button>
            
            <Button 
              variant="outline"
              className="w-full h-14 text-base font-semibold rounded-xl border-2 border-border hover:bg-accent"
              onClick={() => setShowSharePanel(true)}
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share
            </Button>
          </div>

          {/* Share Panel */}
          <SharePanel 
            open={showSharePanel}
            onOpenChange={setShowSharePanel}
            shareUrl={shareUrl}
            pdfName={pdf.name}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PDFDetailsSheet;
