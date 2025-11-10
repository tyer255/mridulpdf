import { useEffect, useState } from 'react';
import { mockStorage } from '@/lib/mockStorage';
import { PDFDocument, PDFTag } from '@/types/pdf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Clock, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SearchBar from '@/components/SearchBar';
import { Badge } from '@/components/ui/badge';

const Home = () => {
  const [publicPDFs, setPublicPDFs] = useState<PDFDocument[]>([]);
  const [filteredPDFs, setFilteredPDFs] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPublicPDFs();
  }, []);

  const loadPublicPDFs = async () => {
    try {
      const pdfs = mockStorage.getPublicPDFs();
      const sorted = pdfs.sort((a, b) => b.timestamp - a.timestamp);
      setPublicPDFs(sorted);
      setFilteredPDFs(sorted);
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

  const handleSearch = (query: string, tags: PDFTag[]) => {
    const results = mockStorage.searchPublicPDFs(query, tags);
    setFilteredPDFs(results.sort((a, b) => b.timestamp - a.timestamp));
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
        <h1 className="text-2xl font-bold text-foreground mb-4">Public PDFs</h1>
        
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
              {publicPDFs.length === 0 ? 'No public PDFs yet' : 'No PDFs match your search'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {publicPDFs.length === 0 ? 'Be the first to share a PDF!' : 'Try different search terms or tags'}
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
                          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-foreground truncate">
                            {pdf.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Clock className="w-3 h-3" />
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
                      <Button
                        size="icon"
                        variant="default"
                        onClick={() => handleDownload(pdf)}
                        className="ml-2 flex-shrink-0"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
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
