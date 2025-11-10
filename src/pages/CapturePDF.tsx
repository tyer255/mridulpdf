import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, X, Save, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import { mockStorage } from '@/lib/mockStorage';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const CapturePDF = () => {
  const [images, setImages] = useState<string[]>([]);
  const [pdfName, setPdfName] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = useAnonymousUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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
      const pdf = new jsPDF();
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        
        if (i > 0) {
          pdf.addPage();
        }
        
        const imgProps = pdf.getImageProperties(img);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const pdfBlob = pdf.output('blob');
      const pdfDataUrl = pdf.output('dataurlstring');

      await mockStorage.savePDF({
        name: pdfName.trim(),
        userId,
        timestamp: Date.now(),
        visibility,
        downloadUrl: pdfDataUrl,
        size: pdfBlob.size
      });

      toast({
        title: "Success!",
        description: `PDF created and saved as ${visibility}`
      });

      navigate('/library');
    } catch (error) {
      console.error('Error creating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to create PDF",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Capture PDF</h1>

        <div className="space-y-6 max-w-2xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <div>
            <Button
              onClick={handleCapture}
              size="lg"
              className="w-full"
              variant="default"
            >
              <Camera className="mr-2 h-5 w-5" />
              Capture Image
            </Button>
          </div>

          {images.length > 0 && (
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
                      className="w-full h-40 object-cover"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
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
                  onValueChange={(value) => setVisibility(value as 'private' | 'public')}
                  className="mt-1.5"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="font-normal cursor-pointer">
                      Private (Only visible in your library)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public" className="font-normal cursor-pointer">
                      Public (Visible to everyone)
                    </Label>
                  </div>
                </RadioGroup>
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
