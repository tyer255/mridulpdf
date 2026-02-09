import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image, ArrowLeft, Lock, Globe, Tag, FileText, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import TagSelector from '@/components/TagSelector';
import { mockStorage } from '@/lib/mockStorage';
import { PDFTag } from '@/types/pdf';
import { getAppPreferences } from '@/lib/preferences';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';
import ExitConfirmDialog from '@/components/ExitConfirmDialog';
import CopyButton from '@/components/CopyButton';

type OCRStep = 'capture' | 'scanning' | 'results';

interface ExtractedPage {
  imageUrl: string;
  text: string;
}

interface ScanStatus {
  currentPage: number;
  totalPages: number;
  progress: number;
  message: string;
  isProcessing: boolean;
}

const HandwritingOCR = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userId = useAnonymousUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanAbortRef = useRef(false);

  const [step, setStep] = useState<OCRStep>('capture');
  const [images, setImages] = useState<string[]>([]);
  const [extractedPages, setExtractedPages] = useState<ExtractedPage[]>([]);
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    currentPage: 1,
    totalPages: 0,
    progress: 0,
    message: 'Preparing scan...',
    isProcessing: false
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'world'>('private');
  const [selectedTags, setSelectedTags] = useState<PDFTag[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [isCreatingPDF, setIsCreatingPDF] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pdfName, setPdfName] = useState('');
  const [showExitDialog, setShowExitDialog] = useState(false);

  const hasUnsavedContent = images.length > 0 || extractedPages.length > 0;

  const handleBackClick = () => {
    if (hasUnsavedContent) {
      setShowExitDialog(true);
    } else {
      navigate('/add');
    }
  };

  const handleSaveDraft = () => {
    // Save to local storage as draft
    const draft = {
      images,
      extractedPages,
      pdfName,
      visibility,
      selectedTags,
      step,
      timestamp: Date.now(),
    };
    localStorage.setItem('ocr_draft', JSON.stringify(draft));
    toast({ title: "Draft saved", description: "Your work has been saved" });
    setShowExitDialog(false);
    navigate('/add');
  };

  const handleResume = () => {
    setShowExitDialog(false);
  };

  const handleExit = () => {
    setShowExitDialog(false);
    stopCamera();
    navigate('/add');
  };

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('ocr_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
          setImages(draft.images || []);
          setExtractedPages(draft.extractedPages || []);
          setPdfName(draft.pdfName || '');
          setVisibility(draft.visibility || 'private');
          setSelectedTags(draft.selectedTags || []);
          if (draft.extractedPages?.length > 0) {
            setStep('results');
          }
          toast({ title: "Draft restored", description: "Your previous work has been loaded" });
        }
        localStorage.removeItem('ocr_draft');
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  // Voice announcement
  const speak = useCallback((text: string) => {
    const prefs = getAppPreferences();
    if (!prefs.voiceEnabled) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    utterance.pitch = 1.0;
    speechSynthesis.speak(utterance);
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (_error) {
      toast({ title: "Camera Error", description: "Could not access camera", variant: "destructive" });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
      setImages(prev => [...prev, imageUrl]);
      toast({ title: "Photo captured", description: `${images.length + 1} image(s) ready` });
    }
  };

  // Handle gallery selection
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Preprocess image for better OCR (resize + grayscale + binarize)
  // NOTE: Keep this lightweight to avoid UI lag on low-end devices.
  const preprocessImage = async (imageUrl: string): Promise<string> => {
    try {
      // Yield once to keep UI responsive before heavy work
      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const bitmap = await createImageBitmap(blob);

      // Downscale to reduce CPU time (biggest lag source)
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return imageUrl;

      ctx.drawImage(bitmap, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Single-pass grayscale + contrast + threshold
      const threshold = 150;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.35 + 128));
        const val = contrast < threshold ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = val;
      }

      ctx.putImageData(imageData, 0, 0);

      // Lower quality is fine post-binarization and saves bytes/latency
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      console.warn('preprocessImage failed, using original image:', e);
      return imageUrl;
    }
  };


  // Process OCR with Lovable AI - returns progress updates (optimized for speed)
  const processOCR = async (
    imageUrl: string, 
    onProgress: (progress: number, message: string) => void
  ): Promise<{ success: boolean; text: string }> => {
    try {
      // Phase 1: Preprocessing (0-20%)
      onProgress(0, 'Preparing image...');
      onProgress(5, 'Denoising scan...');
      
      const processedImage = await preprocessImage(imageUrl);
      
      onProgress(15, 'Sharpening edges...');

      // Phase 2: OCR Processing (20-75%)
      onProgress(20, 'Extracting text...');
      
      const { data, error } = await supabase.functions.invoke('ocr-handwriting', {
        body: { image: processedImage },
        headers: {
          'X-Guest-ID': userId || ''
        }
      });

      if (error) throw error;

      // Phase 3: Post-processing (75-100%)
      onProgress(80, 'Formatting output...');
      onProgress(100, 'Complete');

      return { success: true, text: data.text || '' };
    } catch (error) {
      console.error('OCR Error:', error);
      return { success: false, text: '' };
    }
  };


  // Start scanning process
  const startScanning = async () => {
    if (images.length === 0) {
      toast({ title: "No images", description: "Please capture or select images first", variant: "destructive" });
      return;
    }

    stopCamera();
    scanAbortRef.current = false;
    setStep('scanning');
    setExtractedPages([]);
    setScanStatus({
      currentPage: 1,
      totalPages: images.length,
      progress: 0,
      message: 'Starting scan...',
      isProcessing: true
    });

    speak("Starting scan");
    const results: ExtractedPage[] = [];
    
    for (let i = 0; i < images.length; i++) {
      if (scanAbortRef.current) break;

      const pageNum = i + 1;
      setIsTransitioning(false);
      
      // Reset for new page
      setScanStatus(prev => ({
        ...prev,
        currentPage: pageNum,
        progress: 0,
        message: `Scanning Page ${pageNum}...`,
        isProcessing: true
      }));

      // Process with progress updates (faster animation)
      const result = await processOCR(images[i], (progress, message) => {
        setScanStatus(prev => ({
          ...prev,
          progress,
          message
        }));
      });

      if (result.success) {
        results.push({ imageUrl: images[i], text: result.text });
        speak(`Page ${pageNum} done${i < images.length - 1 ? `. Scanning Page ${pageNum + 1}` : ''}`);
        
        // Show completion message
        setScanStatus(prev => ({
          ...prev,
          progress: 100,
          message: `Page ${pageNum} completed.${i < images.length - 1 ? ` Scanning Page ${pageNum + 1}...` : ''}`
        }));
      } else {
        // Handle failed page
        speak(`Skipped Page ${pageNum} due to unreadable content`);
        setScanStatus(prev => ({
          ...prev,
          progress: 100,
          message: `Skipped Page ${pageNum} due to unreadable content.`
        }));
        toast({ 
          title: "Page Skipped", 
          description: `Page ${pageNum} could not be read`,
          variant: "destructive"
        });
      }

      // Transition to next page (reduced delay)
      if (i < images.length - 1) {
        setIsTransitioning(true);
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setExtractedPages(results);
    
    // Final message
    setScanStatus(prev => ({
      ...prev,
      progress: 100,
      message: 'All pages scanned successfully.',
      isProcessing: false
    }));
    
    speak("All pages scanned");
    await new Promise(r => setTimeout(r, 300));
    setStep('results');
  };

  // Create PDF from extracted text - using images with text overlay for Hindi support
  const createPDF = async () => {
    if (extractedPages.length === 0) return;
    
    setIsCreatingPDF(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      for (let i = 0; i < extractedPages.length; i++) {
        if (i > 0) pdf.addPage();
        
        const page = extractedPages[i];
        
        // Create a canvas with the text rendered properly
        const canvas = document.createElement('canvas');
        const scale = 3; // High resolution for clarity
        canvas.width = contentWidth * scale * 3.78; // mm to px at 96dpi * scale
        canvas.height = contentHeight * scale * 3.78;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Setup text rendering with Unicode-compatible font
          ctx.fillStyle = '#000000';
          ctx.font = `${16 * scale}px "Noto Sans Devanagari", "Mangal", "Arial Unicode MS", sans-serif`;
          ctx.textBaseline = 'top';
          
          const lineHeight = 24 * scale;
          const maxWidth = canvas.width - 40 * scale;
          let y = 20 * scale;
          
          // Split text by lines and render
          const paragraphs = page.text.split('\n');
          
          for (const paragraph of paragraphs) {
            if (paragraph.trim() === '') {
              y += lineHeight * 0.5;
              continue;
            }
            
            // Word wrap
            const words = paragraph.split(' ');
            let line = '';
            
            for (const word of words) {
              const testLine = line + (line ? ' ' : '') + word;
              const metrics = ctx.measureText(testLine);
              
              if (metrics.width > maxWidth && line) {
                ctx.fillText(line, 20 * scale, y);
                line = word;
                y += lineHeight;
              } else {
                line = testLine;
              }
            }
            
            if (line) {
              ctx.fillText(line, 20 * scale, y);
              y += lineHeight;
            }
          }
          
          // Add page number
          ctx.fillStyle = '#666666';
          ctx.font = `${12 * scale}px Arial`;
          ctx.fillText(`Page ${i + 1} of ${extractedPages.length}`, canvas.width / 2 - 40 * scale, canvas.height - 20 * scale);
        }
        
        // Add canvas as image to PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
      }

      const pdfBlob = pdf.output('blob');
      const pdfDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(pdfBlob);
      });

      // Generate thumbnail from first page text preview
      const thumbnailCanvas = document.createElement('canvas');
      thumbnailCanvas.width = 150;
      thumbnailCanvas.height = 200;
      const ctx = thumbnailCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 150, 200);
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('OCR Document', 10, 25);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px Arial';
        const previewText = extractedPages[0].text.substring(0, 200);
        const words = previewText.split(' ');
        let line = '';
        let y = 45;
        words.forEach(word => {
          if (ctx.measureText(line + word).width > 130) {
            ctx.fillText(line, 10, y);
            line = word + ' ';
            y += 12;
          } else {
            line += word + ' ';
          }
        });
        ctx.fillText(line, 10, y);
      }
      const thumbnailUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.8);

      const fileName = pdfName.trim() || `OCR_${new Date().toLocaleDateString().replace(/\//g, '-')}_${Date.now()}`;
      
      // Combine all extracted text for AI context
      const fullOCRText = extractedPages.map(p => p.text).join('\n\n--- Page Break ---\n\n');
      
      const savedPdf = await mockStorage.savePDF({
        name: fileName,
        userId: userId || 'anonymous',
        timestamp: Date.now(),
        downloadUrl: pdfDataUrl,
        thumbnailUrl,
        visibility,
        tags: selectedTags,
        pageCount: extractedPages.length,
        size: pdfBlob.size,
        isOCR: true,
      });

      // Store OCR text in localStorage for AI chat
      try {
        localStorage.setItem(`ocr_text_${savedPdf.id}`, fullOCRText);
      } catch (e) {
        console.warn('Could not save OCR text for AI:', e);
      }

      toast({ title: "PDF created successfully" });
      speak("PDF created successfully");
      navigate('/library');
    } catch (error) {
      console.error('PDF creation error:', error);
      toast({ title: "Error", description: "Failed to create PDF", variant: "destructive" });
    } finally {
      setIsCreatingPDF(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <ExitConfirmDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onSaveDraft={handleSaveDraft}
        onResume={handleResume}
        onExit={handleExit}
        hasContent={hasUnsavedContent}
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackClick}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Handwriting to Text</h1>
        </div>
      </div>

      {/* Capture Step */}
      {step === 'capture' && (
        <div className="p-4 space-y-4">
          {/* Camera Preview */}
          <div className="relative aspect-[3/4] bg-secondary rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            {!cameraActive && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Camera className="w-16 h-16 mb-4 opacity-50" />
                <p>Camera preview</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Image count badge */}
          {images.length > 0 && (
            <div className="flex items-center justify-center">
              <span className="px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium">
                {images.length} image(s) ready
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="grid grid-cols-2 gap-3">
            {!cameraActive ? (
              <Button onClick={startCamera} className="h-14 gap-2">
                <Camera className="w-5 h-5" />
                Open Camera
              </Button>
            ) : (
              <>
                <Button onClick={capturePhoto} className="h-14 gap-2 bg-primary">
                  <Camera className="w-5 h-5" />
                  Capture
                </Button>
                <Button onClick={stopCamera} variant="outline" className="h-14">
                  Close Camera
                </Button>
              </>
            )}
            
            <Button 
              variant="outline" 
              className="h-14 gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="w-5 h-5" />
              Gallery
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleGallerySelect}
            />
          </div>

          {/* Start Scan Button */}
          {images.length > 0 && (
            <Button 
              onClick={startScanning}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-blue-400"
            >
              Start OCR Scan ({images.length} images)
            </Button>
          )}
        </div>
      )}

      {/* Scanning Step - Full screen with scroll support */}
      {step === 'scanning' && (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
          <div className="min-h-full flex flex-col">
            {/* Scanning Animation Container */}
            <div className={`flex-1 relative overflow-hidden transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              {/* Current image being scanned */}
              <div className="relative w-full h-full min-h-[50vh]">
                <img 
                  src={images[scanStatus.currentPage - 1]} 
                  alt="Scanning"
                  className="w-full h-full object-contain"
                />
                
                {/* Neon scan line - continuous loop animation */}
                {scanStatus.isProcessing && scanStatus.progress < 100 && (
                  <div 
                    className="absolute left-0 right-0 h-1 pointer-events-none animate-scan-line"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 20%, hsl(var(--primary)) 80%, transparent 100%)',
                      boxShadow: '0 0 20px hsl(var(--primary) / 0.8), 0 0 40px hsl(var(--primary) / 0.4)',
                    }}
                  />
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30 pointer-events-none" />
              </div>
            </div>
            
            {/* Progress display - always visible and scrollable */}
            <div className="sticky bottom-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 sm:p-6 space-y-4">
              {/* Page indicator */}
              <div className="flex items-center justify-center">
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                  Page {scanStatus.currentPage} of {scanStatus.totalPages}
                </span>
              </div>
              
              {/* Progress percentage - responsive text */}
              <div className="flex items-center justify-center">
                <span 
                  className="text-5xl sm:text-6xl md:text-7xl font-bold text-primary transition-all duration-150"
                  style={{
                    textShadow: '0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--primary) / 0.3)'
                  }}
                >
                  {scanStatus.progress}%
                </span>
              </div>
              
              {/* Status message - wraps on small screens */}
              <p className="text-center text-sm sm:text-base text-muted-foreground break-words px-2">
                {scanStatus.message}
              </p>
              
              {/* Progress bar */}
              <Progress value={scanStatus.progress} className="h-2 sm:h-3" />
            </div>
          </div>
          
          {/* CSS for scan line animation */}
          <style>{`
            @keyframes scanLine {
              0% {
                top: 0%;
              }
              100% {
                top: 100%;
              }
            }
            .animate-scan-line {
              animation: scanLine 1.5s ease-in-out infinite;
              will-change: top;
              transform: translateZ(0);
            }
          `}</style>
        </div>
      )}

      {/* Results Step */}
      {step === 'results' && (
        <div className="p-4 space-y-4">
          {/* Extracted text display */}
          <Card className="p-4 max-h-[50vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Extracted Text</h2>
              <CopyButton 
                text={extractedPages.map(p => p.text).join('\n\n--- Page Break ---\n\n')}
                className="shrink-0"
              />
            </div>
            {extractedPages.map((page, index) => (
              <div key={index} className="mb-4 pb-4 border-b border-border last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Page {index + 1}</p>
                  {extractedPages.length > 1 && (
                    <CopyButton text={page.text} size="icon" variant="ghost" />
                  )}
                </div>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {page.text}
                </p>
              </div>
            ))}
          </Card>

          {/* PDF Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Edit className="w-4 h-4" />
              PDF Name
            </label>
            <Input
              value={pdfName}
              onChange={(e) => setPdfName(e.target.value)}
              placeholder="Enter PDF name (optional)"
              className="bg-secondary/50"
            />
          </div>

          {/* Action Cards */}
          <div className="space-y-3">
            <Card 
              className={`p-4 cursor-pointer transition-all ${visibility === 'private' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-secondary/50'}`}
              onClick={() => setVisibility('private')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Save to Private</h3>
                  <p className="text-sm text-muted-foreground">Visible only to you</p>
                </div>
              </div>
            </Card>

            <Card 
              className={`p-4 cursor-pointer transition-all ${visibility === 'world' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-secondary/50'}`}
              onClick={() => setVisibility('world')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Save to World</h3>
                  <p className="text-sm text-muted-foreground">Publish publicly</p>
                </div>
              </div>
            </Card>

            <Card 
              className={`p-4 cursor-pointer transition-all hover:bg-secondary/50 ${showTagSelector ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setShowTagSelector(!showTagSelector)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Tag className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Select Tags</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTags.length > 0 ? selectedTags.join(', ') : 'Choose tags before saving'}
                  </p>
                </div>
              </div>
            </Card>

            {showTagSelector && (
              <Card className="p-4">
                <TagSelector
                  selectedTags={selectedTags}
                  onChange={setSelectedTags}
                />
              </Card>
            )}
          </div>

          {/* Create PDF Button */}
          <Button 
            onClick={createPDF}
            disabled={isCreatingPDF}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-blue-400 gap-2"
          >
            <FileText className="w-5 h-5" />
            {isCreatingPDF ? 'Creating PDF...' : 'Create PDF'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default HandwritingOCR;
