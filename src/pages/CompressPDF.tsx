import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileDown, Upload, Check, Loader2, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  savings: number;
  blob: Blob;
  name: string;
}

/**
 * Real PDF compression: re-renders each page at lower image quality.
 * Works by drawing PDF pages onto canvas and re-encoding as compressed JPEG images
 * in a new PDF built with jsPDF.
 */
const compressPDFReal = async (
  file: File,
  quality: number,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; compressedSize: number }> => {
  const { jsPDF } = await import('jspdf');

  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Use pdfjsLib via CDN (already available or load dynamically)
  let pdfjsLib: any;
  if ((window as any).pdfjsLib) {
    pdfjsLib = (window as any).pdfjsLib;
  } else {
    // Dynamically load pdf.js
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
    pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  onProgress(10);

  const loadingTask = pdfjsLib.getDocument({ data: uint8 });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  onProgress(20);

  // Get first page to determine orientation
  const firstPage = await pdfDoc.getPage(1);
  const firstVp = firstPage.getViewport({ scale: 1 });
  const isLandscape = firstVp.width > firstVp.height;

  const newPdf = new jsPDF(isLandscape ? 'l' : 'p', 'pt', [firstVp.width, firstVp.height]);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    // Use scale 1.5 for reasonable quality while reducing size
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert to JPEG at specified quality (this is where real compression happens)
    const imgData = canvas.toDataURL('image/jpeg', quality);

    if (i > 1) {
      const pageVp = page.getViewport({ scale: 1 });
      newPdf.addPage([pageVp.width, pageVp.height], pageVp.width > pageVp.height ? 'l' : 'p');
    }

    const pageVpUnscaled = page.getViewport({ scale: 1 });
    newPdf.addImage(imgData, 'JPEG', 0, 0, pageVpUnscaled.width, pageVpUnscaled.height);

    onProgress(20 + Math.round((i / numPages) * 70));
  }

  onProgress(95);
  const blob = newPdf.output('blob');
  onProgress(100);

  return { blob, compressedSize: blob.size };
};

const CompressPDF = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CompressionResult | null>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      setSelectedFile(file);
      setResult(null);
    }
  };

  const compressPDF = async () => {
    if (!selectedFile) return;

    setIsCompressing(true);
    setProgress(0);

    try {
      const { blob, compressedSize } = await compressPDFReal(
        selectedFile,
        0.6, // JPEG quality 60% for good compression
        (p) => setProgress(p)
      );

      const savings = Math.round((1 - compressedSize / selectedFile.size) * 100);

      setResult({
        originalSize: selectedFile.size,
        compressedSize,
        savings: Math.max(savings, 0),
        blob,
        name: selectedFile.name.replace('.pdf', '_compressed.pdf'),
      });

      toast.success('PDF compressed successfully!');
    } catch (error) {
      console.error('Compression error:', error);
      toast.error('Failed to compress PDF');
    } finally {
      setIsCompressing(false);
    }
  };

  const downloadCompressed = () => {
    if (!result) return;

    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Compressed PDF downloaded!');
  };

  const resetState = () => {
    setSelectedFile(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-[hsl(224,71%,4%)] via-[hsl(224,47%,8%)] to-[hsl(224,71%,4%)] pb-24 safe-top">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-dark-strong border-b border-white/10">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate('/add')}
            className="w-10 h-10 rounded-xl glass-dark flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white">Compress PDF</h1>
            <p className="text-xs text-white/50">Reduce file size with real compression</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 app-container">
        {/* Info Card */}
        <div className="glass-dark rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl glass-dark-strong flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-white text-sm mb-1">Real Compression</h3>
              <p className="text-xs text-white/50">
                Re-renders each page at optimized quality, compressing images while preserving text readability.
              </p>
            </div>
          </div>
        </div>

        {/* File Selection */}
        {!selectedFile && !result && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="glass-dark rounded-2xl p-8 border-2 border-dashed border-white/20 hover:border-primary/50 transition-colors cursor-pointer"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl glass-dark-strong flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-white font-medium mb-1">Select PDF to compress</p>
                <p className="text-sm text-white/50">Tap to browse your files</p>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Selected File */}
        {selectedFile && !result && (
          <div className="space-y-4">
            <div className="glass-dark rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-white/50">{formatSize(selectedFile.size)}</p>
                </div>
                <button
                  onClick={resetState}
                  className="text-white/50 hover:text-white text-sm"
                >
                  Change
                </button>
              </div>
            </div>

            {isCompressing ? (
              <div className="glass-dark rounded-2xl p-6">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <div className="w-full">
                    <Progress value={progress} className="h-2" />
                    <p className="text-center text-sm text-white/60 mt-2">
                      Compressing... {Math.round(progress)}%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={compressPDF}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold"
              >
                <FileDown className="w-5 h-5 mr-2" />
                Compress PDF
              </Button>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Success Card */}
            <div className="glass-dark rounded-2xl p-6 border border-green-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Compression Complete!</p>
                  <p className="text-sm text-green-400">
                    {result.savings > 0 ? `${result.savings}% size reduced` : 'File already optimized'}
                  </p>
                </div>
              </div>

              {/* Size Comparison */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="glass-dark-strong rounded-xl p-3 text-center">
                  <p className="text-xs text-white/50 mb-1">Original</p>
                  <p className="text-lg font-bold text-white">{formatSize(result.originalSize)}</p>
                </div>
                <div className="glass-dark-strong rounded-xl p-3 text-center">
                  <p className="text-xs text-white/50 mb-1">Compressed</p>
                  <p className="text-lg font-bold text-green-400">{formatSize(result.compressedSize)}</p>
                </div>
              </div>

              {/* Savings Bar */}
              <div className="glass-dark-strong rounded-xl p-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Space Saved</span>
                  <span className="text-green-400 font-medium">
                    {formatSize(result.originalSize - result.compressedSize)}
                  </span>
                </div>
                <Progress value={result.savings} className="h-2" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={resetState}
                variant="outline"
                className="flex-1 h-12 rounded-xl border-white/20 text-white"
              >
                Compress Another
              </Button>
              <Button
                onClick={downloadCompressed}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompressPDF;
