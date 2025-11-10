import { useEffect, useState } from 'react';
import { mockStorage } from '@/lib/mockStorage';
import { PDFDocument } from '@/types/pdf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Home = () => {
  const [publicPDFs, setPublicPDFs] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPublicPDFs();
  }, []);

  const loadPublicPDFs = async () => {
    try {
      const pdfs = mockStorage.getPublicPDFs();
      setPublicPDFs(pdfs.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Error loading public PDFs:', error);
      toast({
        title: "Error",
        description: "Failed to load public PDFs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (pdf: PDFDocument) => {
    window.open(pdf.downloadUrl, '_blank');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Public PDFs</h1>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-16 bg-muted rounded"></div>
              </Card>
            ))}
          </div>
        ) : publicPDFs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No public PDFs yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Be the first to share a PDF!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {publicPDFs.map((pdf) => (
              <Card key={pdf.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <h3 className="font-semibold text-foreground truncate">
                        {pdf.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(pdf.timestamp)}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="default"
                    onClick={() => handleDownload(pdf)}
                    className="ml-2 flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
