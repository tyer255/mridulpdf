import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Camera, X, Save, Loader2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAnonymousUser, getUserDisplayName } from '@/hooks/useAnonymousUser';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import { mockStorage } from '@/lib/mockStorage';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { PDFTag } from '@/types/pdf';
import TagSelector from '@/components/TagSelector';
import ImageEnhancer from '@/components/ImageEnhancer';
import { generateThumbnail, prepareImageForPdf } from '@/lib/imageProcessing';
import ImageFilterModal from '@/components/ImageFilterModal';
import heic2any from 'heic2any';
import { alertEvent } from '@/lib/preferences';
import ExitConfirmDialog from '@/components/ExitConfirmDialog';
import FeedbackDialog from '@/components/FeedbackDialog';
import { useAuth } from '@/contexts/AuthContext';

const CapturePDF = () => {
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [capturedImageForFilter, setCapturedImageForFilter] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pdfName, setPdfName] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'world'>('private');
  const [tags, setTags] = useState<PDFTag[]>([]);
  const [addPageNumbers, setAddPageNumbers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [createdPdfName, setCreatedPdfName] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const userId = useAnonymousUser();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const hasUnsavedContent = images.length > 0;

  const handleBackClick = () => {
    if (hasUnsavedContent) {
      setShowExitDialog(true);
    } else {
      navigate('/add');
    }
  };

  const handleSaveDraft = () => {
    const draft = { images, pdfName, visibility, tags, addPageNumbers, timestamp: Date.now() };
    localStorage.setItem('capture_draft', JSON.stringify(draft));
    toast({ title: "Draft saved", description: "Your work has been saved" });
    setShowExitDialog(false);
    navigate('/add');
  };

  const handleResume = () => setShowExitDialog(false);
  const handleExit = () => { setShowExitDialog(false); navigate('/add'); };

  const handleCapture = () => cameraInputRef.current?.click();
  const handleGallerySelect = () => galleryInputRef.current?.click();

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      toast({ title: "No image captured", description: "Please capture an image", variant: "destructive" });
      return;
    }
    let file = files[0];
    const isImage = (file.type || '').startsWith('image/') || /\.(heic|heif|jpg|jpeg|png|webp)$/i.test(file.name);
    if (!isImage) {
      toast({ title: "Invalid file", description: "Please select only image files", variant: "destructive" });
      return;
    }
    const isHeic = /image\/heic|image\/heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
    try {
      if (isHeic) {
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 }) as Blob | Blob[];
        const blob = Array.isArray(converted) ? converted[0] : converted;
        file = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImageForFilter(event.target.result as string);
          setShowFilterModal(true);
        }
      };
      reader.onerror = () => toast({ title: "Error", description: "Failed to read image file", variant: "destructive" });
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Camera image processing failed:', err);
      toast({ title: 'Unsupported image', description: 'Failed to process this image. Please try another.', variant: 'destructive' });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleGallerySelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      toast({ title: "No images selected", description: "Please select images from gallery", variant: "destructive" });
      return;
    }
    try {
      const results = (await Promise.all(
        Array.from(files).map(async (file) => {
          const isImage = (file.type || '').startsWith('image/') || /\.(heic|heif|jpg|jpeg|png|webp)$/i.test(file.name);
          if (!isImage) return null;
          try {
            let workingFile: File = file;
            const isHeic = /image\/heic|image\/heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
            if (isHeic) {
              const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 }) as Blob | Blob[];
              const blob = Array.isArray(converted) ? converted[0] : converted;
              workingFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
            }
            return await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('read_fail'));
              reader.readAsDataURL(workingFile);
            });
          } catch { return null; }
        })
      )).filter((u): u is string => !!u);

      if (results.length > 0) {
        setImages((prev) => [...prev, ...results]);
        toast({ title: "Images added!", description: `${results.length} image${results.length > 1 ? 's' : ''} added to PDF` });
      } else {
        toast({ title: "No usable images", description: "Selected files could not be processed", variant: "destructive" });
      }
    } catch (error) {
      console.error('Gallery selection failed:', error);
      toast({ title: "Error", description: "Failed to read some image files", variant: "destructive" });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleFilterApply = (filteredImage: string) => {
    setImages((prev) => [...prev, filteredImage]);
    setShowFilterModal(false);
    setCapturedImageForFilter(null);
  };

  const handleFilterSkip = () => {
    if (capturedImageForFilter) setImages((prev) => [...prev, capturedImageForFilter]);
    setShowFilterModal(false);
    setCapturedImageForFilter(null);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setCurrentImageIndex(null);
  };

  const handleImageEnhanced = (enhancedImage: string) => {
    if (currentImageIndex !== null) {
      setImages(prev => {
        const newImages = [...prev];
        newImages[currentImageIndex] = enhancedImage;
        return newImages;
      });
      setCurrentImageIndex(null);
      toast({ title: "Enhancement applied!", description: "Image has been enhanced successfully" });
    }
  };

  const createPDF = async () => {
    if (images.length === 0) { toast({ title: "No images", description: "Please capture at least one image", variant: "destructive" }); return; }
    if (!pdfName.trim()) { toast({ title: "Name required", description: "Please enter a name for your PDF", variant: "destructive" }); return; }
    if (!userId) { toast({ title: "Error", description: "User ID not found", variant: "destructive" }); return; }

    setUploading(true);
    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const totalPages = images.length;
      for (let i = 0; i < images.length; i++) {
        const processed = await prepareImageForPdf(images[i], 1200);
        if (i > 0) pdf.addPage();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgRatio = processed.width / processed.height;
        let drawWidth = pageWidth;
        let drawHeight = drawWidth / imgRatio;
        if (drawHeight > pageHeight) { drawHeight = pageHeight; drawWidth = pageHeight * imgRatio; }
        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;
        pdf.addImage(processed.dataUrl, 'JPEG', x, y, drawWidth, drawHeight);
        if (addPageNumbers) {
          pdf.setFontSize(10);
          pdf.setTextColor(128, 128, 128);
          pdf.text(`Page ${i + 1} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
      }
      const pdfBlob = pdf.output('blob');
      const pdfDataUrl = pdf.output('dataurlstring');
      const thumbnailUrl = await generateThumbnail(images[0]);
      await mockStorage.savePDF({
        name: pdfName.trim(), userId, timestamp: Date.now(), visibility,
        downloadUrl: pdfDataUrl, thumbnailUrl, size: pdfBlob.size, tags, pageCount: totalPages,
      }, getUserDisplayName());
      alertEvent.uploadComplete(pdfName.trim());
      toast({ title: "Success!", description: `PDF created and saved as ${visibility}` });
      setCreatedPdfName(pdfName.trim());
      setShowFeedback(true);
    } catch (error: any) {
      console.error('Error creating PDF:', error);
      toast({ title: "Error", description: error.message || "Failed to create PDF", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white pb-20">
      <FeedbackDialog open={showFeedback} onOpenChange={(open) => { setShowFeedback(open); if (!open) navigate('/library'); }} pdfName={createdPdfName} />
      <ExitConfirmDialog open={showExitDialog} onOpenChange={setShowExitDialog} onSaveDraft={handleSaveDraft} onResume={handleResume} onExit={handleExit} hasContent={hasUnsavedContent} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#030712]/90 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBackClick} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white">Capture PDF</h1>
        </div>
      </div>

      <ImageFilterModal image={capturedImageForFilter} isOpen={showFilterModal} onApply={handleFilterApply} onSkip={handleFilterSkip} />

      <div className="p-6">
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Hidden file inputs */}
          <input ref={cameraInputRef} type="file" accept="image/*" capture className="hidden" onChange={handleCameraCapture} />
          <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGallerySelection} />

          {/* Take a Photo Card */}
          <button onClick={handleCapture} className="w-full group">
            <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-blue-500/30 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Take a Photo</h2>
              <p className="text-sm text-gray-400">Use your camera to scan a document.</p>
            </div>
          </button>

          {/* Select from Gallery Card */}
          <button onClick={handleGallerySelect} className="w-full group">
            <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-blue-500/30 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Select from Gallery</h2>
              <p className="text-sm text-gray-400">Pick an image from your photos.</p>
            </div>
          </button>

          {/* Captured Images */}
          {images.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Captured Images ({images.length})</h2>
              <div className="grid grid-cols-2 gap-3">
                {images.map((img, index) => (
                  <div key={index} className="relative overflow-hidden rounded-xl glass-card">
                    <img src={img} alt={`Capture ${index + 1}`} className="w-full h-40 object-cover cursor-pointer" onClick={() => setCurrentImageIndex(index)} />
                    <button className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500 transition-colors" onClick={() => removeImage(index)}>
                      <X className="h-4 w-4" />
                    </button>
                    {currentImageIndex === index && (
                      <div className="absolute inset-0 border-2 border-blue-500 bg-blue-500/10 pointer-events-none rounded-xl" />
                    )}
                  </div>
                ))}
              </div>

              {currentImageIndex !== null && (
                <ImageEnhancer image={images[currentImageIndex]} onEnhanced={handleImageEnhanced} />
              )}
            </div>
          )}

          {/* PDF Options */}
          {images.length > 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="pdfName" className="text-gray-300">PDF Name</Label>
                <input
                  id="pdfName"
                  value={pdfName}
                  onChange={(e) => setPdfName(e.target.value)}
                  placeholder="Enter PDF name"
                  className="w-full mt-1.5 px-4 py-3 rounded-xl input-field text-white text-sm placeholder-gray-500"
                />
              </div>

              <div>
                <Label className="text-gray-300">Visibility</Label>
                <RadioGroup value={visibility} onValueChange={(value) => setVisibility(value as 'private' | 'world')} className="mt-1.5">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="font-normal cursor-pointer text-gray-300">Private (Only visible in your library)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="world" id="world" />
                    <Label htmlFor="world" className="font-normal cursor-pointer text-gray-300">World (Visible to everyone)</Label>
                  </div>
                </RadioGroup>
              </div>

              {visibility === 'world' && <TagSelector selectedTags={tags} onChange={setTags} />}

              <div className="flex items-center justify-between">
                <Label htmlFor="pageNumbers" className="flex-1 cursor-pointer text-gray-300">Add Page Numbers</Label>
                <Switch id="pageNumbers" checked={addPageNumbers} onCheckedChange={setAddPageNumbers} />
              </div>

              <button
                onClick={createPDF}
                disabled={uploading}
                className="w-full py-3.5 rounded-xl shimmer-btn text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Creating PDF...</>
                ) : (
                  <><Save className="h-5 w-5" /> Create PDF</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .input-field {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        .input-field:focus {
          outline: none;
          border-color: #3b82f6;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
        }
        .shimmer-btn {
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6);
          background-size: 200% 100%;
          animation: shimmer 3s infinite linear;
        }
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
};

export default CapturePDF;
