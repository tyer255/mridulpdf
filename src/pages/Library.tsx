import { useEffect, useState } from 'react';
import { mockStorage } from '@/lib/mockStorage';
import { PDFDocument } from '@/types/pdf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, Eye, Trash2, FolderOpen, Globe, Lock } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<{ id: string; visibility: 'private' | 'world' } | null>(null);
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
      const privatePDFs = mockStorage.getUserPDFs(userId);
      const allWorldPDFs = await mockStorage.getWorldPDFs();
      const userWorldPDFs = allWorldPDFs.filter(pdf => pdf.userId === userId);
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
      <div className="min-h-screen bg-background pb-24 p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background pb-24 safe-top overflow-x-hidden">
      <Header />
      
      <div className="p-4 sm:p-6 app-container">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Private PDFs</h1>
          </div>
          <p className="text-sm text-muted-foreground">All your private and uploaded PDFs</p>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 overflow-hidden">
                <div className="flex gap-3">
                  <div className="w-16 h-20 rounded-lg animate-shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded animate-shimmer" />
                    <div className="h-3 w-1/2 rounded animate-shimmer" />
                    <div className="h-5 w-1/3 rounded animate-shimmer" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : myPDFs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No PDFs yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Create or import your first PDF to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myPDFs.map((pdf, index) => (
              <Card 
                key={pdf.id} 
                className="group p-4 hover-lift border-border/50 hover:border-primary/30 transition-all duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex gap-3">
                  {pdf.thumbnailUrl ? (
                    <div className="flex-shrink-0 relative overflow-hidden rounded-lg">
                      <img
                        src={pdf.thumbnailUrl}
                        alt="PDF preview"
                        className="w-16 h-20 object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate mb-1 group-hover:text-primary transition-colors">
                          {pdf.name}
                        </h3>
                        <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(pdf.timestamp)}</span>
                          </div>
                          {pdf.pageCount && (
                            <>
                              <span className="text-border">•</span>
                              <span>{pdf.pageCount} pages</span>
                            </>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            pdf.visibility === 'world' 
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {pdf.visibility === 'world' ? (
                              <>
                                <Globe className="w-2.5 h-2.5" />
                                World
                              </>
                            ) : (
                              <>
                                <Lock className="w-2.5 h-2.5" />
                                Private
                              </>
                            )}
                          </span>
                        </div>
                        {pdf.tags && pdf.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {pdf.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="tag" className="text-[10px] px-2 py-0.5">
                                {tag}
                              </Badge>
                            ))}
                            {pdf.tags.length > 2 && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                +{pdf.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-1.5 ml-2 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleView(pdf)}
                          className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId({ id: pdf.id, visibility: pdf.visibility })}
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PDF</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this PDF? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="rounded-full bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Library;
