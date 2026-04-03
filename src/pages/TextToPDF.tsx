import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Globe, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import TagSelector from '@/components/TagSelector';
import { mockStorage } from '@/lib/mockStorage';
import { useAuth } from '@/contexts/AuthContext';

import { useToast } from '@/hooks/use-toast';
import { PDFTag } from '@/types/pdf';

const TextToPDF = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userId = useAnonymousUser();
  const { getUserDisplayName } = useAuth();

  const [text, setText] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'world'>('private');
  const [tags, setTags] = useState<PDFTag[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleOk = () => {
    if (!text.trim()) {
      toast({ title: 'Please enter some text', description: 'The text field cannot be empty.', variant: 'destructive' });
      return;
    }
    setShowOptions(true);
  };

  const generatePDF = async () => {
    if (!text.trim()) return;
    setIsCreating(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = 7;
      let y = margin;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);

      const paragraphs = text.split('\n');

      for (const para of paragraphs) {
        if (para.trim() === '') {
          y += lineHeight * 0.5;
          if (y > pageHeight - margin) { doc.addPage(); y = margin; }
          continue;
        }

        const lines = doc.splitTextToSize(para, maxWidth);
        for (const line of lines) {
          if (y + lineHeight > pageHeight - margin) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += lineHeight;
        }
        y += lineHeight * 0.3; // paragraph spacing
      }

      const pdfBlob = doc.output('blob');
      const pdfDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(pdfBlob);
      });

      const pdfName = text.trim().slice(0, 40).replace(/[^a-zA-Z0-9\s]/g, '') || 'Text PDF';
      const totalPages = doc.internal.pages.length - 1;

      await mockStorage.savePDF(
        {
          name: pdfName,
          userId: userId || 'guest',
          timestamp: Date.now(),
          visibility,
          downloadUrl: pdfDataUrl,
          size: pdfBlob.size,
          tags,
          pageCount: totalPages,
        },
        getUserDisplayName()
      );

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate(visibility === 'world' ? '/home' : '/library');
      }, 1800);

      toast({ title: '✅ PDF Created!', description: `Your PDF has been saved to ${visibility === 'world' ? 'World' : 'My PDFs'}.` });
    } catch (err: any) {
      console.error('PDF creation failed:', err);
      toast({ title: 'Error', description: err.message || 'Failed to create PDF.', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background pb-24 safe-top">
      <Header />

      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
          <div className="flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-lg font-semibold text-foreground">PDF Created Successfully!</p>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 app-container">
        {/* Page Title */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Text to PDF</h1>
          </div>
          <p className="text-sm text-muted-foreground">Type or paste any text and convert it into a PDF</p>
        </div>

        {/* Text Editor */}
        <div className="mb-4">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing or paste your text here..."
            className="min-h-[220px] resize-y text-base leading-relaxed bg-card/60 border-border/50 backdrop-blur-sm rounded-2xl p-4 focus:ring-primary/30"
          />
          <p className="text-xs text-muted-foreground mt-1.5 text-right">
            {text.length} characters · {text.split(/\s+/).filter(Boolean).length} words
          </p>
        </div>

        {/* OK Button */}
        {!showOptions && (
          <Button
            onClick={handleOk}
            className="w-full h-12 rounded-xl text-base font-semibold"
            disabled={!text.trim()}
          >
            OK — Continue
          </Button>
        )}

        {/* Options Panel */}
        {showOptions && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
            {/* Visibility */}
            <div className="rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Visibility</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setVisibility('world')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                    visibility === 'world'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <span className="font-medium text-sm">World</span>
                </button>
                <button
                  onClick={() => setVisibility('private')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                    visibility === 'private'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <span className="font-medium text-sm">Private</span>
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm p-4">
              <TagSelector selectedTags={tags} onChange={setTags} />
            </div>

            {/* Create PDF Button */}
            <Button
              onClick={generatePDF}
              disabled={isCreating}
              className="w-full h-12 rounded-xl text-base font-semibold gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Creating PDF...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create PDF
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextToPDF;
