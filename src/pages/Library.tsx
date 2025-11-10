import { useEffect, useState } from 'react';
import { mockStorage } from '@/lib/mockStorage';
import { PDFDocument } from '@/types/pdf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, Eye } from 'lucide-react';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';
import { useToast } from '@/hooks/use-toast';

const Library = () => {
  const [myPDFs, setMyPDFs] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = useAnonymousUser();
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadMyPDFs();
    }
  }, [userId]);

  const loadMyPDFs = async () => {
    if (!userId) return;
    
    try {
      const pdfs = mockStorage.getUserPDFs(userId);
      setMyPDFs(pdfs.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Error loading my PDFs:', error);
      toast({
        title: "Error",
        description: "Failed to load your PDFs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (pdf: PDFDocument) => {
    window.open(pdf.downloadUrl, '_blank');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-background pb-20 p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">My Library</h1>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-16 bg-muted rounded"></div>
              </Card>
            ))}
          </div>
        ) : myPDFs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No PDFs yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create or import your first PDF to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myPDFs.map((pdf) => (
              <Card key={pdf.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <h3 className="font-semibold text-foreground truncate">
                        {pdf.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(pdf.timestamp)}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        pdf.visibility === 'public' 
                          ? 'bg-accent/10 text-accent' 
                          : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {pdf.visibility}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="default"
                    onClick={() => handleView(pdf)}
                    className="ml-2 flex-shrink-0"
                  >
                    <Eye className="w-4 h-4" />
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

export default Library;
