import { useState, useEffect, useRef } from 'react';
import { PDFDocument } from '@/types/pdf';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  Clock, 
  User, 
  Share2, 
  FileStack,
  Sparkles,
  Loader2
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import SharePanel from './SharePanel';
import AskAIChat from './AskAIChat';
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
  const [showAIChat, setShowAIChat] = useState(false);
  const [pdfContext, setPdfContext] = useState<string>('');
  const [loadingContext, setLoadingContext] = useState(false);

  // Prevent "stale" delayed open from firing after user taps other PDFs
  const askAiTimeoutRef = useRef<number | null>(null);
  const askAiRequestRef = useRef<{ pdfId: string; token: number } | null>(null);

  useEffect(() => {
    return () => {
      if (askAiTimeoutRef.current) {
        window.clearTimeout(askAiTimeoutRef.current);
        askAiTimeoutRef.current = null;
      }
      askAiRequestRef.current = null;
    };
  }, []);

  useEffect(() => {
    // If user selected a different PDF while a delayed Ask-AI was pending, cancel it.
    askAiRequestRef.current = null;
    if (askAiTimeoutRef.current) {
      window.clearTimeout(askAiTimeoutRef.current);
      askAiTimeoutRef.current = null;
    }
    setLoadingContext(false);
  }, [pdf?.id]);

  // Fetch the actual download URL when sheet opens
  useEffect(() => {
    const fetchShareUrl = async () => {
      if (pdf && open) {
        try {
          const downloadUrl = pdf.downloadUrl || await mockStorage.getPDFDownloadUrl(pdf.id);
          setShareUrl(downloadUrl);
        } catch (error) {
          console.error('Error fetching share URL:', error);
          setShareUrl(`${window.location.origin}/?search=${encodeURIComponent(pdf.name)}`);
        }
      }
    };
    fetchShareUrl();
  }, [pdf, open]);

  if (!pdf) return null;

  const isOCR = pdf.isOCR === true;

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

  const handleAskAI = async () => {
    // IMPORTANT: only open chat when this button is explicitly clicked
    if (!pdf) return;

    // Cancel any previous pending open
    if (askAiTimeoutRef.current) {
      window.clearTimeout(askAiTimeoutRef.current);
      askAiTimeoutRef.current = null;
    }

    const token = Date.now();
    askAiRequestRef.current = { pdfId: pdf.id, token };

    setLoadingContext(true);
    try {
      const storedText = localStorage.getItem(`ocr_text_${pdf.id}`);
      setPdfContext(storedText || '(OCR text not available for this document)');

      // Close sheet first, then open AI chat after overlay animation finishes
      onOpenChange(false);
      askAiTimeoutRef.current = window.setTimeout(() => {
        const req = askAiRequestRef.current;
        // Only open if it is still the same explicit request (prevents opening on random taps)
        if (!req || req.token !== token || req.pdfId !== pdf.id) return;

        setShowAIChat(true);
        setLoadingContext(false);
      }, 450);
    } catch (error) {
      console.error('Error loading PDF context:', error);
      setLoadingContext(false);
    }
  };

  return (
    <>
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
              {/* Ask AI - Only for OCR PDFs */}
              {isOCR && (
                <Button
                  type="button"
                  className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg"
                  onClick={handleAskAI}
                  disabled={loadingContext}
                >
                  {loadingContext ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing document…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Ask AI ✨
                    </>
                  )}
                </Button>
              )}

              <Button 
                type="button"
                className="w-full h-14 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                onClick={handleDownload}
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </Button>
              
              <Button 
                type="button"
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

      {/* AI Chat Modal */}
      <AskAIChat
        open={showAIChat}
        onClose={() => setShowAIChat(false)}
        pdfContext={pdfContext}
        pdfName={pdf.name}
      />
    </>
  );
};

export default PDFDetailsSheet;
