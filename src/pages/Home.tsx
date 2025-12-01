import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { mockStorage } from '@/lib/mockStorage';
import { PDFDocument, PDFTag } from '@/types/pdf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Clock, RefreshCw, Trash2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SearchBar from '@/components/SearchBar';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import { QRShareModal } from '@/components/QRShareModal';
import { alertEvent } from '@/lib/preferences';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Home = () => {
  const [worldPDFs, setWorldPDFs] = useState<PDFDocument[]>([]);
  const [filteredPDFs, setFilteredPDFs] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<PDFDocument | null>(null);
  const { toast } = useToast();
  const location = useLocation();
  const currentUserId = localStorage.getItem('anonymous_user_id');

  useEffect(() => {
    loadWorldPDFs();
  }, [location.pathname]);

  const loadWorldPDFs = async (retryCount = 0) => {
    try {
      const pdfs = await mockStorage.getWorldPDFs();
      setWorldPDFs(pdfs);
      setFilteredPDFs(pdfs);
    } catch (error: any) {
      console.error('Error loading world PDFs:', error);
      
      // Retry once if timeout error
      if (retryCount === 0 && error?.code === '57014') {
        console.log('Retrying with smaller limit...');
        setTimeout(() => loadWorldPDFs(1), 1000);
        return;
      }
      
      toast({
        title: "Error",
        description: error?.code === '57014' ? "Loading PDFs... Please refresh" : "Failed to load world PDFs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWorldPDFs();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "World feed updated",
    });
  };

  const handleSearch = async (query: string, tags: PDFTag[]) => {
    try {
      const results = await mockStorage.searchWorldPDFs(query, tags);
      setFilteredPDFs(results);
    } catch (error) {
      console.error('Error searching world PDFs:', error);
      toast({
        title: "Error",
        description: "Failed to search world PDFs",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (pdf: PDFDocument) => {
    try {
      // Fetch download URL on-demand for world PDFs
      const downloadUrl = pdf.visibility === 'world' && !pdf.downloadUrl
        ? await mockStorage.getPDFDownloadUrl(pdf.id)
        : pdf.downloadUrl;
        
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdf.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alertEvent.downloadComplete(pdf.name);
      toast({
        title: "✅ PDF downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive"
      });
    }
  };

  const handleShareQR = async (pdf: PDFDocument) => {
    // Fetch download URL on-demand for world PDFs if not already loaded
    if (pdf.visibility === 'world' && !pdf.downloadUrl) {
      try {
        const downloadUrl = await mockStorage.getPDFDownloadUrl(pdf.id);
        setSelectedPDF({ ...pdf, downloadUrl });
      } catch (error) {
        console.error('Error fetching download URL:', error);
        toast({
          title: "Error",
          description: "Failed to load PDF for sharing",
          variant: "destructive"
        });
        return;
      }
    } else {
      setSelectedPDF(pdf);
    }
    setQrModalOpen(true);
  };

  const handleDelete = async (pdfId: string) => {
    try {
      await mockStorage.deletePDF(pdfId, 'world');
      await loadWorldPDFs();
      toast({
        title: "Success",
        description: "PDF deleted successfully",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete PDF",
        variant: "destructive"
      });
    }
    setDeleteId(null);
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
      <Header />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">World PDFs</h1>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} />
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </Card>
            ))}
          </div>
        ) : filteredPDFs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {worldPDFs.length === 0 ? 'No world PDFs yet' : 'No PDFs match your search'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {worldPDFs.length === 0 ? 'Be the first to share a PDF!' : 'Try different search terms or tags'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPDFs.map((pdf) => (
              <Card key={pdf.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex gap-3">
                  {pdf.thumbnailUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={pdf.thumbnailUrl}
                        alt="PDF preview"
                        className="w-16 h-20 object-cover rounded border border-border"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-card-foreground flex-shrink-0" />
                          <h3 className="font-semibold text-card-foreground truncate">
                            {pdf.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span>{formatDate(pdf.timestamp)}</span>
                          {pdf.pageCount && (
                            <span>• {pdf.pageCount} pages</span>
                          )}
                        </div>
                        {pdf.tags && pdf.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {pdf.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleShareQR(pdf)}
                          title="Share via QR"
                          className="text-foreground hover:text-foreground"
                        >
                          <QrCode className="w-4 h-4 text-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="default"
                          onClick={() => handleDownload(pdf)}
                          className="text-primary-foreground"
                        >
                          <Download className="w-4 h-4 text-primary-foreground" />
                        </Button>
                        {currentUserId === pdf.userId && (
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => setDeleteId(pdf.id)}
                            className="text-destructive-foreground"
                          >
                            <Trash2 className="w-4 h-4 text-destructive-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* QR Share Modal */}
      {selectedPDF && (
        <QRShareModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          pdfUrl={selectedPDF.downloadUrl}
          fileName={selectedPDF.name}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PDF</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this PDF? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Home;
