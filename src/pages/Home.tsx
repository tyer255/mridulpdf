import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { mockStorage } from '@/lib/mockStorage';
import { PDFDocument, PDFTag } from '@/types/pdf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, RefreshCw, Trash2, Globe, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SearchBar from '@/components/SearchBar';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import PDFDetailsSheet from '@/components/PDFDetailsSheet';
import GoogleLoginPrompt from '@/components/GoogleLoginPrompt';
import { useAuth } from '@/contexts/AuthContext';

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
  const [selectedPDF, setSelectedPDF] = useState<PDFDocument | null>(null);
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const { isAuthenticated, getUserId, loading: authLoading } = useAuth();
  const currentUserId = getUserId();

  useEffect(() => {
    loadWorldPDFs();
  }, [location.pathname]);

  // Show Google prompt only for guests who haven't dismissed it
  useEffect(() => {
    if (!authLoading && currentUserId && !isAuthenticated && !sessionStorage.getItem('google_prompt_dismissed')) {
      const timer = setTimeout(() => {
        setShowGooglePrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [authLoading, currentUserId, isAuthenticated]);

  const loadWorldPDFs = async (retryCount = 0) => {
    try {
      const pdfs = await mockStorage.getWorldPDFs();
      setWorldPDFs(pdfs);
      setFilteredPDFs(pdfs);
    } catch (error: any) {
      console.error('Error loading world PDFs:', error);
      
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
    <div className="min-h-screen min-h-[100dvh] bg-background pb-24 safe-top overflow-x-hidden">
      <Header />
      
      <div className="p-4 sm:p-6 app-container">
        {/* Hero Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">World PDFs</h1>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Discover and share PDFs with the community</p>
        </div>
        
        {/* Search Section */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} />
        </div>
        
        {/* Content */}
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
        ) : filteredPDFs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {worldPDFs.length === 0 ? 'No world PDFs yet' : 'No PDFs match your search'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {worldPDFs.length === 0 
                ? 'Be the first to share a PDF with the world!' 
                : 'Try different search terms or tags'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPDFs.map((pdf, index) => (
              <Card 
                key={pdf.id} 
                className="group p-4 hover-lift cursor-pointer border-border/50 hover:border-primary/30 transition-all duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setSelectedPDF(pdf)}
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ) : (
                    <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-card-foreground truncate mb-1 group-hover:text-primary transition-colors">
                          {pdf.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(pdf.timestamp)}</span>
                          {pdf.pageCount && (
                            <>
                              <span className="text-border">•</span>
                              <span>{pdf.pageCount} pages</span>
                            </>
                          )}
                        </div>
                        {pdf.tags && pdf.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {pdf.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="tag" className="text-[10px] px-2 py-0.5">
                                {tag}
                              </Badge>
                            ))}
                            {pdf.tags.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                +{pdf.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {currentUserId === pdf.userId && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(pdf.id);
                          }}
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* PDF Details Sheet */}
      <PDFDetailsSheet
        pdf={selectedPDF}
        open={selectedPDF !== null}
        onOpenChange={(open) => !open && setSelectedPDF(null)}
        onDownload={handleDownload}
        displayName={(selectedPDF as any)?.displayName}
      />

      {/* Delete Confirmation Dialog */}
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
              onClick={() => deleteId && handleDelete(deleteId)}
              className="rounded-full bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Google Login Prompt */}
      <GoogleLoginPrompt 
        open={showGooglePrompt} 
        onOpenChange={setShowGooglePrompt} 
      />
    </div>
  );
};

export default Home;
