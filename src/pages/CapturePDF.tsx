import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, X, Save, Loader2 } from 'lucide-react';
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
import Header from '@/components/Header';
import ImageFilterModal from '@/components/ImageFilterModal';
import heic2any from 'heic2any';
import { alertEvent } from '@/lib/preferences';

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const userId = useAnonymousUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    galleryInputRef.current?.click();
  };

// Handle camera capture - show filter modal for single image
const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) {
    toast({
      title: "No image captured",
      description: "Please capture an image",
      variant: "destructive"
    });
    return;
  }

  let file = files[0];

  const isImage = (file.type || '').startsWith('image/') || /\.(heic|heif|jpg|jpeg|png|webp)$/i.test(file.name);
  if (!isImage) {
    toast({
      title: "Invalid file",
      description: "Please select only image files",
      variant: "destructive"
    });
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
        // Show filter modal for camera capture
        setCapturedImageForFilter(event.target.result as string);
        setShowFilterModal(true);
      }
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read image file",
        variant: "destructive"
      });
    };
    reader.readAsDataURL(file);
  } catch (err) {
    console.error('Camera image processing failed:', err);
    toast({
      title: 'Unsupported image',
      description: 'Some camera images are in HEIC format. We try to convert them automatically, but this one failed. Please try another image.',
      variant: 'destructive'
    });
  } finally {
    if (e.target) {
      e.target.value = '';
    }
  }
};

// Handle gallery selection - add multiple images directly
const handleGallerySelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) {
    toast({
      title: "No images selected",
      description: "Please select images from gallery",
      variant: "destructive"
    });
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

          // Read as data URL
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('read_fail'));
            reader.readAsDataURL(workingFile);
          });

          return dataUrl;
        } catch (err) {
          console.warn('Skipping file due to processing error:', err);
          return null;
        }
      })
    )).filter((u): u is string => !!u);

    if (results.length > 0) {
      setImages((prev) => [...prev, ...results]);
      toast({
        title: "Images added!",
        description: `${results.length} image${results.length > 1 ? 's' : ''} added to PDF`
      });
    } else {
      toast({
        title: "No usable images",
        description: "Selected files could not be processed",
        variant: "destructive"
      });
    }
  } catch (error) {
    console.error('Gallery selection failed:', error);
    toast({
      title: "Error",
      description: "Failed to read some image files",
      variant: "destructive"
    });
  } finally {
    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  }
};

  const handleFilterApply = (filteredImage: string) => {
    setImages((prev) => [...prev, filteredImage]);
    setShowFilterModal(false);
    setCapturedImageForFilter(null);
  };

  const handleFilterSkip = () => {
    if (capturedImageForFilter) {
      setImages((prev) => [...prev, capturedImageForFilter]);
    }
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
      toast({
        title: "Enhancement applied!",
        description: "Image has been enhanced successfully",
      });
    }
  };

  const createPDF = async () => {
    if (images.length === 0) {
      toast({
        title: "No images",
        description: "Please capture at least one image",
        variant: "destructive"
      });
      return;
    }

    if (!pdfName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your PDF",
        variant: "destructive"
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Use A4 portrait by default; units in mm
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const totalPages = images.length;

      for (let i = 0; i < images.length; i++) {
        const original = images[i];

        // Optimize: reduce size for faster processing (1200px max instead of 2000px)
        const processed = await prepareImageForPdf(original, 1200);
        const imgData = processed.dataUrl;
        const imgWidthPx = processed.width;
        const imgHeightPx = processed.height;

        if (i > 0) {
          pdf.addPage();
        }

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Compute draw size to fit within page while keeping aspect ratio
        const imgRatio = imgWidthPx / imgHeightPx;
        let drawWidth = pageWidth;
        let drawHeight = drawWidth / imgRatio;
        if (drawHeight > pageHeight) {
          drawHeight = pageHeight;
          drawWidth = pageHeight * imgRatio;
        }

        // Center horizontally and vertically
        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        pdf.addImage(imgData, 'JPEG', x, y, drawWidth, drawHeight);

        // Add page numbers if enabled
        if (addPageNumbers) {
          const pageNum = i + 1;
          pdf.setFontSize(10);
          pdf.setTextColor(128, 128, 128);
          pdf.text(
            `Page ${pageNum} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      }

      const pdfBlob = pdf.output('blob');
      const pdfDataUrl = pdf.output('dataurlstring');

      // Generate thumbnail from first image (use processed JPEG for reliability)
      const thumbnailUrl = await generateThumbnail(images[0]);

      await mockStorage.savePDF({
        name: pdfName.trim(),
        userId,
        timestamp: Date.now(),
        visibility,
        downloadUrl: pdfDataUrl,
        thumbnailUrl,
        size: pdfBlob.size,
        tags,
        pageCount: totalPages,
      }, getUserDisplayName());

      alertEvent.uploadComplete(pdfName.trim());
      toast({
        title: "Success!",
        description: `PDF created and saved as ${visibility}`
      });

      navigate('/library');
    } catch (error: any) {
      console.error('Error creating PDF:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create PDF",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <ImageFilterModal
        image={capturedImageForFilter}
        isOpen={showFilterModal}
        onApply={handleFilterApply}
        onSkip={handleFilterSkip}
      />

      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Capture PDF</h1>

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Camera Input - Single capture with filter */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture
            className="hidden"
            onChange={handleCameraCapture}
          />

          {/* Gallery Input - Multiple selection without filter modal */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleGallerySelection}
          />

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCapture}
              size="lg"
              className="w-full"
              variant="default"
            >
              <Camera className="mr-2 h-5 w-5" />
              Capture Photo
            </Button>
            
            <Button
              onClick={handleGallerySelect}
              size="lg"
              className="w-full"
              variant="secondary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              Select from Gallery
            </Button>
          </div>

          {images.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-3">
                  Captured Images ({images.length})
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {images.map((img, index) => (
                    <Card key={index} className="relative overflow-hidden">
                      <img
                        src={img}
                        alt={`Capture ${index + 1}`}
                        className="w-full h-40 object-cover cursor-pointer"
                        onClick={() => setCurrentImageIndex(index)}
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      {currentImageIndex === index && (
                        <div className="absolute inset-0 border-2 border-primary bg-primary/10 pointer-events-none" />
                      )}
                    </Card>
                  ))}
                </div>
              </div>

              {currentImageIndex !== null && (
                <ImageEnhancer
                  image={images[currentImageIndex]}
                  onEnhanced={handleImageEnhanced}
                />
              )}
            </div>
          )}

          {images.length > 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="pdfName">PDF Name</Label>
                <Input
                  id="pdfName"
                  value={pdfName}
                  onChange={(e) => setPdfName(e.target.value)}
                  placeholder="Enter PDF name"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Visibility</Label>
                <RadioGroup
                  value={visibility}
                  onValueChange={(value) => setVisibility(value as 'private' | 'world')}
                  className="mt-1.5"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="font-normal cursor-pointer">
                      Private (Only visible in your library)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="world" id="world" />
                    <Label htmlFor="world" className="font-normal cursor-pointer">
                      World (Visible to everyone)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {visibility === 'world' && (
                <TagSelector selectedTags={tags} onChange={setTags} />
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="pageNumbers" className="flex-1 cursor-pointer">
                  Add Page Numbers
                </Label>
                <Switch
                  id="pageNumbers"
                  checked={addPageNumbers}
                  onCheckedChange={setAddPageNumbers}
                />
              </div>

              <Button
                onClick={createPDF}
                size="lg"
                className="w-full"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating PDF...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Create PDF
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CapturePDF;
