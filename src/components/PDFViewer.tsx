import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  ZoomIn, 
  ZoomOut, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Columns,
  Moon,
  Sun,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
  onClose?: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl, fileName = 'Document', onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const { toast } = useToast();

  // Detect container width for responsive scaling
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Check system dark mode preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page);
      const pageElement = pageRefs.current.get(page);
      pageElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCopyText = async () => {
    try {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        await navigator.clipboard.writeText(selection.toString());
        setCopied(true);
        toast({ title: 'Text copied!' });
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast({ title: 'Select text first', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const pageWidth = containerWidth > 0 ? Math.min(containerWidth, 800) : 350;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex flex-col",
        isDarkMode ? "bg-gray-900" : "bg-background"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-3 border-b",
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-card border-border"
      )}>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
          <span className={cn(
            "text-sm font-medium truncate max-w-[150px]",
            isDarkMode ? "text-white" : "text-foreground"
          )}>
            {fileName}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Thumbnails */}
          <Sheet open={showThumbnails} onOpenChange={setShowThumbnails}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Columns className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className={cn(
              "w-[200px] p-2",
              isDarkMode ? "bg-gray-800 border-gray-700" : ""
            )}>
              <ScrollArea className="h-full">
                <div className="space-y-2 p-2">
                  {Array.from({ length: numPages }, (_, i) => (
                    <div
                      key={i + 1}
                      onClick={() => {
                        goToPage(i + 1);
                        setShowThumbnails(false);
                      }}
                      className={cn(
                        "cursor-pointer border rounded overflow-hidden",
                        currentPage === i + 1 
                          ? "border-primary ring-2 ring-primary" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Document file={fileUrl} loading="">
                        <Page
                          pageNumber={i + 1}
                          width={150}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                      <div className={cn(
                        "text-center text-xs py-1",
                        isDarkMode ? "bg-gray-700 text-white" : "bg-muted"
                      )}>
                        {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Search */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Copy */}
          <Button variant="ghost" size="icon" onClick={handleCopyText}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>

          {/* Dark Mode */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className={cn(
          "p-2 border-b flex gap-2",
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-card border-border"
        )}>
          <Input
            placeholder="Search text..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={cn(
              "flex-1",
              isDarkMode ? "bg-gray-700 border-gray-600 text-white" : ""
            )}
          />
          <Button variant="ghost" size="icon" onClick={() => setShowSearch(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* PDF Content */}
      <div 
        ref={containerRef}
        className={cn(
          "flex-1 overflow-auto",
          isDarkMode ? "bg-gray-900" : "bg-muted/30"
        )}
      >
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-64 text-destructive">
              Failed to load PDF
            </div>
          }
          className="flex flex-col items-center py-4 gap-4"
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={i + 1}
              ref={(el) => {
                if (el) pageRefs.current.set(i + 1, el);
              }}
              className={cn(
                "shadow-lg",
                isDarkMode ? "shadow-black/50" : "shadow-gray-300"
              )}
            >
              <Page
                pageNumber={i + 1}
                scale={scale}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className={cn(
                  isDarkMode ? "invert hue-rotate-180" : ""
                )}
                customTextRenderer={({ str }) => {
                  if (searchText && str.toLowerCase().includes(searchText.toLowerCase())) {
                    return `<mark style="background: yellow; color: black;">${str}</mark>`;
                  }
                  return str;
                }}
              />
            </div>
          ))}
        </Document>
      </div>

      {/* Bottom Controls */}
      <div className={cn(
        "flex items-center justify-between p-3 border-t",
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-card border-border"
      )}>
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className={cn(
            "text-sm w-14 text-center",
            isDarkMode ? "text-white" : ""
          )}>
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className={cn(
            "text-sm",
            isDarkMode ? "text-white" : ""
          )}>
            {currentPage} / {numPages}
          </span>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
