import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, FileText, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAnonymousUser, getUserDisplayName } from '@/hooks/useAnonymousUser';
import { useToast } from '@/hooks/use-toast';
import { mockStorage } from '@/lib/mockStorage';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PDFTag } from '@/types/pdf';
import TagSelector from '@/components/TagSelector';
import Header from '@/components/Header';
import { alertEvent } from '@/lib/preferences';

const ImportPDF = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'world'>('private');
  const [tags, setTags] = useState<PDFTag[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = useAnonymousUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setPdfName(file.name.replace('.pdf', ''));
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a PDF file",
        variant: "destructive"
      });
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPdfName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadPDF = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file",
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
      // Read file as data URL
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        
        await mockStorage.savePDF({
          name: pdfName.trim(),
          userId,
          timestamp: Date.now(),
          visibility,
          downloadUrl: dataUrl,
          size: selectedFile!.size,
          tags,
          thumbnailUrl: undefined, // Could generate from PDF first page
          pageCount: undefined,
        }, getUserDisplayName());

        alertEvent.uploadComplete(pdfName.trim());
        toast({
          title: "Success!",
          description: `PDF uploaded as ${visibility}`
        });

        navigate('/library');
        setUploading(false);
      };
      
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read PDF file",
          variant: "destructive"
        });
        setUploading(false);
      };
      
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to upload PDF",
        variant: "destructive"
      });
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Import PDF</h1>

        <div className="space-y-6 max-w-2xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />

          {!selectedFile ? (
            <Card
              className="p-8 border-2 border-dashed cursor-pointer hover:bg-accent/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Select PDF File</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a PDF from your device storage
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={clearSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>

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

              <Button
                onClick={uploadPDF}
                size="lg"
                className="w-full"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Upload PDF
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

export default ImportPDF;
