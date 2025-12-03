import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image, ArrowLeft, Lock, Globe, Tag, FileText } from 'lucide-react';
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

const HandwritingOCR = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userId = useAnonymousUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<OCRStep>('capture');
  const [images, setImages] = useState<string[]>([]);
  const [extractedPages, setExtractedPages] = useState<ExtractedPage[]>([]);
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [scanProgress, setProgress] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'world'>('private');
  const [selectedTags, setSelectedTags] = useState<PDFTag[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [isCreatingPDF, setIsCreatingPDF] = useState(false);

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

  // Process OCR with Lovable AI
  const processOCR = async (imageUrl: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('ocr-handwriting', {
        body: { image: imageUrl }
      });

      if (error) throw error;
      return data.text || '';
    } catch (error) {
      console.error('OCR Error:', error);
      return 'Error processing image. Please try again.';
    }
  };

  // Start scanning process
  const startScanning = async () => {
    if (images.length === 0) {
      toast({ title: "No images", description: "Please capture or select images first", variant: "destructive" });
      return;
    }

    stopCamera();
    setStep('scanning');
    setCurrentScanIndex(0);
    setProgress(0);
    setExtractedPages([]);

    speak("Starting scan");

    for (let i = 0; i < images.length; i++) {
      setCurrentScanIndex(i);
      
      // Animate progress
      for (let p = 0; p <= 100; p += 2) {
        await new Promise(r => setTimeout(r, 30));
        setProgress(p);
        
        // Announce progress at intervals
        if (p === 25 || p === 50 || p === 75) {
          speak(`${p} percent`);
        }
      }

      // Process OCR
      const text = await processOCR(images[i]);
      setExtractedPages(prev => [...prev, { imageUrl: images[i], text }]);
      
      speak("Scan complete");
      await new Promise(r => setTimeout(r, 500));
    }

    setStep('results');
    speak("All pages scanned successfully");
  };

  // Create PDF from extracted text
  const createPDF = async () => {
    if (extractedPages.length === 0) return;
    
    setIsCreatingPDF(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const lineHeight = 7;
      const maxWidth = pageWidth - margin * 2;

      extractedPages.forEach((page, index) => {
        if (index > 0) pdf.addPage();
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        const lines = pdf.splitTextToSize(page.text, maxWidth);
        let y = margin;
        
        lines.forEach((line: string) => {
          if (y > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(line, margin, y);
          y += lineHeight;
        });
      });

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

      const fileName = `OCR_${new Date().toLocaleDateString().replace(/\//g, '-')}_${Date.now()}`;
      
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

      {/* Scanning Step */}
      {step === 'scanning' && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          {/* Scanning Animation */}
          <div className="flex-1 relative overflow-hidden">
            {/* Current image being scanned */}
            <img 
              src={images[currentScanIndex]} 
              alt="Scanning"
              className="w-full h-full object-contain"
            />
            
            {/* Neon scan line */}
            <div 
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(59,130,246,0.8)]"
              style={{
                bottom: `${scanProgress}%`,
                transition: 'bottom 0.03s linear'
              }}
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
            
            {/* Progress display */}
            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
              <div className="flex items-center justify-between text-foreground">
                <span className="text-lg font-medium">
                  Scanning page {currentScanIndex + 1} of {images.length}
                </span>
                <span className="text-4xl font-bold text-primary drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                  {scanProgress}%
                </span>
              </div>
              <Progress value={scanProgress} className="h-2" />
            </div>
          </div>
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
