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
    } catch (error) {
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

  // Preprocess image for better OCR (denoise, sharpen, binarize)
  const preprocessImage = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Step 1: Convert to grayscale and enhance contrast
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Increase contrast
          const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128));
          data[i] = data[i + 1] = data[i + 2] = enhanced;
        }

        // Step 2: Apply adaptive thresholding for binarization (simple version)
        const threshold = 140;
        for (let i = 0; i < data.length; i += 4) {
          const val = data[i] < threshold ? 0 : 255;
          data[i] = data[i + 1] = data[i + 2] = val;
        }

        // Step 3: Simple sharpening using unsharp mask approximation
        const tempData = new Uint8ClampedArray(data);
        const w = canvas.width;
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            const blur = (
              tempData[idx - w * 4] + tempData[idx + w * 4] +
              tempData[idx - 4] + tempData[idx + 4]
            ) / 4;
            const sharp = Math.min(255, Math.max(0, tempData[idx] * 2 - blur * 0.5));
            data[idx] = data[idx + 1] = data[idx + 2] = sharp;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageUrl);
      img.src = imageUrl;
    });
  };

  // Process OCR with Lovable AI - returns progress updates
  const processOCR = async (
    imageUrl: string, 
    onProgress: (progress: number, message: string) => void
  ): Promise<{ success: boolean; text: string }> => {
    try {
      // Phase 1: Preprocessing (0-20%)
      onProgress(0, 'Preparing image...');
      await new Promise(r => setTimeout(r, 100));
      onProgress(5, 'Denoising scan...');
      
      const processedImage = await preprocessImage(imageUrl);
      
      onProgress(12, 'Binarizing handwriting...');
      await new Promise(r => setTimeout(r, 150));
      onProgress(18, 'Sharpening edges...');
      await new Promise(r => setTimeout(r, 100));

      // Phase 2: OCR Processing (20-75%)
      onProgress(22, 'Detecting layout...');
      await new Promise(r => setTimeout(r, 100));
      onProgress(28, 'Extracting Hindi text...');
      
      const { data, error } = await supabase.functions.invoke('ocr-handwriting', {
        body: { image: processedImage }
      });

      if (error) throw error;

      // Phase 3: Post-processing (75-100%)
      onProgress(76, 'Interpreting columns...');
      await new Promise(r => setTimeout(r, 150));
      onProgress(84, 'Formatting tables...');
      await new Promise(r => setTimeout(r, 150));
      onProgress(92, 'Validating Unicode...');
      await new Promise(r => setTimeout(r, 100));
      onProgress(100, 'Complete');

      return { success: true, text: data.text || '' };
    } catch (error) {
      console.error('OCR Error:', error);
      return { success: false, text: '' };
    }
  };

  // Smooth progress animation
  const animateProgress = useCallback((
    from: number, 
    to: number, 
    duration: number,
    onUpdate: (value: number) => void
  ): Promise<void> => {
    return new Promise(resolve => {
      const startTime = performance.now();
      const diff = to - from;
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(from + diff * eased);
        
        onUpdate(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }, []);

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

      let lastProgress = 0;
      
      // Process with progress updates
      const result = await processOCR(images[i], async (progress, message) => {
        // Animate smoothly between progress points
        await animateProgress(lastProgress, progress, 150, (val) => {
          setScanStatus(prev => ({
            ...prev,
            progress: val,
            message: message
          }));
        });
        lastProgress = progress;

        // Voice announcements at key points
        if (progress === 25 || progress === 50 || progress === 75) {
          speak(`${progress} percent`);
        }
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

      // Transition to next page
      if (i < images.length - 1) {
        setIsTransitioning(true);
        await new Promise(r => setTimeout(r, 600));
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
    
    speak("All pages scanned successfully");
    await new Promise(r => setTimeout(r, 800));
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
      
      await mockStorage.savePDF({
        name: fileName,
        userId: userId || 'anonymous',
        timestamp: Date.now(),
        downloadUrl: pdfDataUrl,
        thumbnailUrl,
        visibility,
        tags: selectedTags,
        pageCount: extractedPages.length,
        size: pdfBlob.size
      });

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
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/add')}>
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
            <h2 className="text-lg font-semibold mb-3 text-foreground">Extracted Text</h2>
            {extractedPages.map((page, index) => (
              <div key={index} className="mb-4 pb-4 border-b border-border last:border-0">
                <p className="text-sm text-muted-foreground mb-2">Page {index + 1}</p>
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
