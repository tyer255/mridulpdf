import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockStorage } from '@/lib/mockStorage';
import { PDFDocument } from '@/types/pdf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, Eye, Trash2, Download } from 'lucide-react';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
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

const Library = () => {
  const [myPDFs, setMyPDFs] = useState<PDFDocument[]>([]);
  const [worldPDFs, setWorldPDFs] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<{ id: string; visibility: 'private' | 'world' } | null>(null);
  const userId = useAnonymousUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      loadMyPDFs();
    }
  }, [userId]);

  const loadMyPDFs = async () => {
    if (!userId) return;
    
    try {
      // Load private PDFs from localStorage
      const privatePDFs = mockStorage.getUserPDFs(userId);
      
      // Load world PDFs from the user with retry logic
      const allWorldPDFs = await mockStorage.getWorldPDFs();
      const userWorldPDFs = allWorldPDFs.filter(pdf => pdf.userId === userId);
      
      // Combine and sort
      const allPDFs = [...privatePDFs, ...userWorldPDFs].sort((a, b) => b.timestamp - a.timestamp);
      
      setMyPDFs(allPDFs);
    } catch (error: any) {
      console.error('Error loading my PDFs:', error);
      toast({
        title: "Error",
        description: error?.code === '57014' ? "Loading PDFs... Please refresh" : "Failed to load your PDFs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (pdf: PDFDocument) => {
    try {
      let downloadUrl = pdf.downloadUrl;
      if (pdf.visibility === 'world' && !downloadUrl) {
        downloadUrl = await mockStorage.getPDFDownloadUrl(pdf.id);
      }
      navigate(`/view-pdf?url=${encodeURIComponent(downloadUrl)}&name=${encodeURIComponent(pdf.name)}`);
    } catch (error) {
      console.error('View error:', error);
      toast({
        title: "Error",
        description: "Failed to open PDF",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (pdf: PDFDocument) => {
    try {
      let downloadUrl = pdf.downloadUrl;
      if (pdf.visibility === 'world' && !downloadUrl) {
        downloadUrl = await mockStorage.getPDFDownloadUrl(pdf.id);
      }
      
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

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await mockStorage.deletePDF(deleteId.id, deleteId.visibility);
      await loadMyPDFs();
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
      <Header />
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
                <div className="flex gap-3">
                   {pdf.thumbnailUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={pdf.thumbnailUrl}
                        alt="PDF preview"
                        className="w-16 h-20 object-cover rounded border border-border"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-foreground truncate">
                            {pdf.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(pdf.timestamp)}</span>
                          </div>
                          {pdf.pageCount && (
                            <span>• {pdf.pageCount} pages</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            pdf.visibility === 'world' 
                              ? 'bg-accent/10 text-accent' 
                              : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {pdf.visibility}
                          </span>
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
                          onClick={() => handleView(pdf)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="default"
                          onClick={() => handleDownload(pdf)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => setDeleteId({ id: pdf.id, visibility: pdf.visibility })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

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
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Library;
