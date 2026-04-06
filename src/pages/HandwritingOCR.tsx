import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image, ArrowLeft, Lock, Globe, Tag, FileText, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import TagSelector from '@/components/TagSelector';
import { mockStorage } from '@/lib/mockStorage';
import { PDFTag } from '@/types/pdf';
import { getAppPreferences } from '@/lib/preferences';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ExitConfirmDialog from '@/components/ExitConfirmDialog';
import CopyButton from '@/components/CopyButton';
import LottieLoader from '@/components/LottieLoader';

type OCRStep = 'capture' | 'scanning' | 'results';

interface ExtractedPage {
  imageUrl: string;
  text: string;
}

interface ScanStatus {
  currentPage: number;
  totalPages: number;
  progress: number;
  message: string;
  isProcessing: boolean;
}

const HandwritingOCR = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getUserId, getUserDisplayName: getAuthDisplayName } = useAuth();
  const userId = getUserId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanAbortRef = useRef(false);

  const [step, setStep] = useState<OCRStep>('capture');
  const [images, setImages] = useState<string[]>([]);
  const [extractedPages, setExtractedPages] = useState<ExtractedPage[]>([]);
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    currentPage: 1,
    totalPages: 0,
    progress: 0,
    message: 'Preparing scan...',
    isProcessing: false
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'world'>('private');
  const [selectedTags, setSelectedTags] = useState<PDFTag[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [isCreatingPDF, setIsCreatingPDF] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pdfName, setPdfName] = useState('');
  const [showExitDialog, setShowExitDialog] = useState(false);

  const hasUnsavedContent = images.length > 0 || extractedPages.length > 0;

  const handleBackClick = () => {
    if (hasUnsavedContent) {
      setShowExitDialog(true);
    } else {
      navigate('/add');
    }
  };

  const handleSaveDraft = () => {
    // Save to local storage as draft
    const draft = {
      images,
      extractedPages,
      pdfName,
      visibility,
      selectedTags,
      step,
      timestamp: Date.now(),
    };
    localStorage.setItem('ocr_draft', JSON.stringify(draft));
    toast({ title: "Draft saved", description: "Your work has been saved" });
    setShowExitDialog(false);
    navigate('/add');
  };

  const handleResume = () => {
    setShowExitDialog(false);
  };

  const handleExit = () => {
    setShowExitDialog(false);
    stopCamera();
    navigate('/add');
  };

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('ocr_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
          setImages(draft.images || []);
          setExtractedPages(draft.extractedPages || []);
          setPdfName(draft.pdfName || '');
          setVisibility(draft.visibility || 'private');
          setSelectedTags(draft.selectedTags || []);
          if (draft.extractedPages?.length > 0) {
            setStep('results');
          }
          toast({ title: "Draft restored", description: "Your previous work has been loaded" });
        }
        localStorage.removeItem('ocr_draft');
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  // Voice announcement
  const speak = useCallback((text: string) => {
    const prefs = getAppPreferences();
    if (!prefs.voiceEnabled) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    utterance.pitch = 1.0;
    speechSynthesis.speak(utterance);
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (_error) {
      toast({ title: "Camera Error", description: "Could not access camera", variant: "destructive" });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
      setImages(prev => [...prev, imageUrl]);
      toast({ title: "Photo captured", description: `${images.length + 1} image(s) ready` });
    }
  };

  // Handle gallery selection
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Preprocess image for better OCR (resize + grayscale + binarize)
  // NOTE: Keep this lightweight to avoid UI lag on low-end devices.
  const preprocessImage = async (imageUrl: string): Promise<string> => {
    try {
      // Yield once to keep UI responsive before heavy work
      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const bitmap = await createImageBitmap(blob);

      // Downscale large images to reduce payload, but keep enough detail for OCR
      const maxDim = 2000;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return imageUrl;

      ctx.drawImage(bitmap, 0, 0, w, h);

      // Light enhancement only - NO binarization (destroys detail for OCR)
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Gentle contrast boost + slight shadow lift — preserve all tonal detail
      for (let i = 0; i < data.length; i += 4) {
        // Mild contrast (1.15x) to sharpen text edges without destroying gradients
        data[i]     = Math.min(255, Math.max(0, (data[i]     - 128) * 1.15 + 128 + 8));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.15 + 128 + 8));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.15 + 128 + 8));
      }

      ctx.putImageData(imageData, 0, 0);

      // High quality JPEG to preserve text detail
      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (e) {
      console.warn('preprocessImage failed, using original image:', e);
      return imageUrl;
    }
  };


  // Process OCR with Lovable AI - returns progress updates (optimized for speed)
  const processOCR = async (
    imageUrl: string, 
    onProgress: (progress: number, message: string) => void
  ): Promise<{ success: boolean; text: string }> => {
    try {
      // Phase 1: Preprocessing (0-20%)
      onProgress(0, 'Preparing image...');
      onProgress(5, 'Denoising scan...');
      
      const processedImage = await preprocessImage(imageUrl);
      
      onProgress(15, 'Sharpening edges...');

      // Phase 2: OCR Processing (20-90%) with gradual simulation
      onProgress(20, 'Extracting text...');
      
      // Simulate gradual progress during API call
      let simProgress = 20;
      const progressInterval = setInterval(() => {
        simProgress += Math.random() * 8 + 2;
        if (simProgress > 85) simProgress = 85;
        onProgress(Math.round(simProgress), simProgress < 50 ? 'Analyzing layout...' : simProgress < 70 ? 'Recognizing characters...' : 'Processing tables...');
      }, 800);

      const { data, error } = await supabase.functions.invoke('ocr-handwriting', {
        body: { image: processedImage },
        headers: {
          'X-Guest-ID': userId || ''
        }
      });

      clearInterval(progressInterval);
      if (error) throw error;

      // Phase 3: Post-processing (90-100%)
      onProgress(92, 'Formatting output...');
      onProgress(100, 'Complete');

      return { success: true, text: data.text || '' };
    } catch (error) {
      console.error('OCR Error:', error);
      return { success: false, text: '' };
    }
  };


  // Start scanning process
  const startScanning = async () => {
    if (images.length === 0) {
      toast({ title: "No images", description: "Please capture or select images first", variant: "destructive" });
      return;
    }

    stopCamera();
    scanAbortRef.current = false;
    setStep('scanning');
    setExtractedPages([]);
    setScanStatus({
      currentPage: 1,
      totalPages: images.length,
      progress: 0,
      message: 'Starting scan...',
      isProcessing: true
    });

    speak("Starting scan");
    const results: ExtractedPage[] = [];
    
    for (let i = 0; i < images.length; i++) {
      if (scanAbortRef.current) break;

      const pageNum = i + 1;
      setIsTransitioning(false);
      
      // Reset for new page
      setScanStatus(prev => ({
        ...prev,
        currentPage: pageNum,
        progress: 0,
        message: `Scanning Page ${pageNum}...`,
        isProcessing: true
      }));

      // Process with progress updates (faster animation)
      const result = await processOCR(images[i], (progress, message) => {
        setScanStatus(prev => ({
          ...prev,
          progress,
          message
        }));
      });

      if (result.success) {
        results.push({ imageUrl: images[i], text: result.text });
        speak(`Page ${pageNum} done${i < images.length - 1 ? `. Scanning Page ${pageNum + 1}` : ''}`);
        
        // Show completion message
        setScanStatus(prev => ({
          ...prev,
          progress: 100,
          message: `Page ${pageNum} completed.${i < images.length - 1 ? ` Scanning Page ${pageNum + 1}...` : ''}`
        }));
      } else {
        // Handle failed page
        speak(`Skipped Page ${pageNum} due to unreadable content`);
        setScanStatus(prev => ({
          ...prev,
          progress: 100,
          message: `Skipped Page ${pageNum} due to unreadable content.`
        }));
        toast({ 
          title: "Page Skipped", 
          description: `Page ${pageNum} could not be read`,
          variant: "destructive"
        });
      }

      // Transition to next page (reduced delay)
      if (i < images.length - 1) {
        setIsTransitioning(true);
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setExtractedPages(results);
    
    // Final message
    setScanStatus(prev => ({
      ...prev,
      progress: 100,
      message: 'All pages scanned successfully.',
      isProcessing: false
    }));
    
    speak("All pages scanned");
    await new Promise(r => setTimeout(r, 300));
    setStep('results');
  };

  // Parse layout tags from OCR output — strips ALL tags from visible text
  const parseLayoutLine = (line: string) => {
    const tags: { align?: 'center' | 'right'; size?: 'h1' | 'h2' | 'h3' | 'small'; bold?: boolean; indent?: boolean; isLine?: boolean; isSpace?: boolean; isHeader?: boolean; isFooter?: boolean; isTable?: boolean; isDiagram?: boolean; isTableImage?: boolean; rightText?: string } = {};
    let text = line;

    if (text.trim() === '[LINE]') return { text: '', ...tags, isLine: true };
    if (text.trim() === '[SPACE]') return { text: '', ...tags, isSpace: true };
    if (text.trim() === '[TABLE]' || text.trim() === '[/TABLE]' || text.trim().startsWith('[TABLE ')) return { text: '', ...tags, isTable: true };
    if (text.trim() === '[TABLE_IMAGE]') return { text: '', ...tags, isTableImage: true };
    if (text.trim() === '[/TABLE_IMAGE]') return { text: '', ...tags, isTableImage: true };
    if (text.trim() === '[DIAGRAM]') return { text: '', ...tags, isDiagram: true };
    if (text.trim() === '[/DIAGRAM]') return { text: '', ...tags, isDiagram: true };

    // Extract right-aligned portion from same line
    const rightMatch = text.match(/\[RIGHT\](.*?)\[\/RIGHT\]/);
    if (rightMatch) {
      tags.rightText = rightMatch[1].trim();
      text = text.replace(/\[RIGHT\].*?\[\/RIGHT\]/, '');
      if (!text.trim()) {
        tags.align = 'right';
        text = tags.rightText;
        tags.rightText = undefined;
      }
    }

    // Alignment
    if (text.includes('[CENTER]')) { tags.align = 'center'; text = text.replace(/\[CENTER\]/g, '').replace(/\[\/CENTER\]/g, ''); }

    // Size
    if (text.includes('[H1]')) { tags.size = 'h1'; tags.bold = true; text = text.replace(/\[H1\]/g, '').replace(/\[\/H1\]/g, ''); }
    if (text.includes('[H2]')) { tags.size = 'h2'; tags.bold = true; text = text.replace(/\[H2\]/g, '').replace(/\[\/H2\]/g, ''); }
    if (text.includes('[H3]')) { tags.size = 'h3'; tags.bold = true; text = text.replace(/\[H3\]/g, '').replace(/\[\/H3\]/g, ''); }
    if (text.includes('[SMALL]')) { tags.size = 'small'; text = text.replace(/\[SMALL\]/g, '').replace(/\[\/SMALL\]/g, ''); }

    // Bold
    if (text.includes('[BOLD]')) { tags.bold = true; text = text.replace(/\[BOLD\]/g, '').replace(/\[\/BOLD\]/g, ''); }

    // Indent
    if (text.includes('[INDENT]')) { tags.indent = true; text = text.replace(/\[INDENT\]/g, '').replace(/\[\/INDENT\]/g, ''); }

    // Header/Footer
    if (text.includes('[HEADER]')) { tags.isHeader = true; text = text.replace(/\[HEADER\]/g, '').replace(/\[\/HEADER\]/g, ''); }
    if (text.includes('[FOOTER]')) { tags.isFooter = true; tags.size = 'small'; text = text.replace(/\[FOOTER\]/g, '').replace(/\[\/FOOTER\]/g, ''); }

    // AGGRESSIVE final cleanup: remove ANY remaining square-bracket tags
    text = text.replace(/\[\/?[A-Z][A-Z0-9_]*(?:\s[^\]]*)?\]/g, '');

    // Fix merged words
    text = text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      .replace(/(\d)([a-zA-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

    // Also strip tags from rightText
    if (tags.rightText) {
      tags.rightText = tags.rightText.replace(/\[\/?[A-Z][A-Z0-9_]*\]/g, '').trim();
    }

    return { text: text.trim(), ...tags };
  };

  // Parse grid-format table into structured data
  interface GridCell {
    text: string;
    colspan: number;
    rowspan: number;
    bold: boolean;
  }
  type GridRow = GridCell[];

  const parseGridTable = (tableLines: string[]): GridRow[] => {
    const rows: GridRow[] = [];
    let currentRow: GridCell[] | null = null;

    for (const line of tableLines) {
      const trimmed = line.trim();
      if (trimmed === '[ROW]') {
        currentRow = [];
        continue;
      }
      if (trimmed === '[/ROW]') {
        if (currentRow) rows.push(currentRow);
        currentRow = null;
        continue;
      }
      if (currentRow !== null) {
        // Parse [CELL colspan=N rowspan=N]...[/CELL]
        const cellRegex = /\[CELL([^\]]*)\](.*?)\[\/CELL\]/g;
        let match;
        while ((match = cellRegex.exec(trimmed)) !== null) {
          const attrs = match[1];
          let cellText = match[2];
          const colspanMatch = attrs.match(/colspan=(\d+)/);
          const rowspanMatch = attrs.match(/rowspan=(\d+)/);
          const bold = cellText.includes('[BOLD]');
          cellText = cellText.replace(/\[\/?[A-Z][A-Z0-9_]*(?:\s[^\]]*)?\]/g, '').trim();
          currentRow.push({
            text: cellText,
            colspan: colspanMatch ? parseInt(colspanMatch[1]) : 1,
            rowspan: rowspanMatch ? parseInt(rowspanMatch[1]) : 1,
            bold,
          });
        }
      }
    }
    return rows;
  };

  const isGridTable = (tableLines: string[]): boolean => {
    return tableLines.some(l => l.trim().startsWith('[ROW]'));
  };
  // Preprocess OCR text: merge consecutive plain-text lines into paragraphs
  // so text fills the full page width instead of creating narrow columns.
  const mergeTextIntoParagraphs = (rawText: string): string => {
    const lines = rawText.split('\n');
    const merged: string[] = [];
    let paragraphBuffer = '';

    const isSpecialLine = (line: string): boolean => {
      const t = line.trim();
      return (
        t === '' ||
        t === '[LINE]' ||
        t === '[SPACE]' ||
        t.startsWith('[TABLE') ||
        t === '[/TABLE]' ||
        t === '[TABLE_IMAGE]' ||
        t === '[/TABLE_IMAGE]' ||
        t.startsWith('[DIAGRAM') ||
        t === '[/DIAGRAM]' ||
        t.startsWith('[ROW]') ||
        t === '[/ROW]' ||
        t.startsWith('[CELL') ||
        t === '[/CELL]' ||
        t.startsWith('[H1]') ||
        t.startsWith('[H2]') ||
        t.startsWith('[H3]') ||
        t.startsWith('[HEADER]') ||
        t.startsWith('[FOOTER]') ||
        t.startsWith('[CENTER]') ||
        t.startsWith('[RIGHT]') ||
        t.includes('[RIGHT]') // mixed left+right line
      );
    };

    const flushParagraph = () => {
      if (paragraphBuffer.trim()) {
        merged.push(paragraphBuffer.trim());
        paragraphBuffer = '';
      }
    };

    for (const line of lines) {
      if (isSpecialLine(line)) {
        flushParagraph();
        merged.push(line);
      } else {
        // Append to current paragraph with a space
        paragraphBuffer += (paragraphBuffer ? ' ' : '') + line.trim();
      }
    }
    flushParagraph();

    return merged.join('\n');
  };

  // Create PDF from extracted text - layout-aware rendering with dynamic sizing
  const createPDF = async () => {
    if (extractedPages.length === 0) return;
    
    setIsCreatingPDF(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      for (let i = 0; i < extractedPages.length; i++) {
        if (i > 0) pdf.addPage();
        
        const page = extractedPages[i];
        // Merge plain text lines into paragraphs for full-width layout
        const processedText = mergeTextIntoParagraphs(page.text);
        
        const canvas = document.createElement('canvas');
        const scale = 3;
        const pxPerMm = 3.78;
        canvas.width = contentWidth * scale * pxPerMm;
        canvas.height = contentHeight * scale * pxPerMm;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) continue;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const leftMargin = 20 * scale;
        const rightMargin = 20 * scale;
        const topMargin = 20 * scale;
        const indentMargin = 45 * scale;
        const maxWidth = canvas.width - leftMargin - rightMargin;
        
        const fontFamily = '"Noto Sans Devanagari", "Mangal", "Arial Unicode MS", sans-serif';

        // --- First pass: measure total height needed ---
        const measureLines = (baseFontSize: number) => {
          const fontSizes = {
            h1: baseFontSize * 1.54,
            h2: baseFontSize * 1.31,
            h3: baseFontSize * 1.15,
            small: baseFontSize * 0.77,
            normal: baseFontSize,
          };
          const lineHeights = {
            h1: fontSizes.h1 * 1.4,
            h2: fontSizes.h2 * 1.4,
            h3: fontSizes.h3 * 1.4,
            small: fontSizes.small * 1.5,
            normal: fontSizes.normal * 1.46,
          };

          let totalHeight = topMargin;
          const lines = processedText.split('\n');
          let inTable = false;
          let inDiag = false;
          let tableBuffer: string[] = [];

          const measureTable = (tLines: string[]) => {
            let h = 0;
            const cellPad = 4 * scale;
            if (isGridTable(tLines)) {
              const gridRows = parseGridTable(tLines);
              // Determine total columns
              let tCols = 0;
              for (const row of gridRows) {
                let cols = 0;
                for (const cell of row) cols += cell.colspan;
                tCols = Math.max(tCols, cols);
              }
              if (tCols === 0) tCols = 1;
              // Estimate proportional col widths
              const colMinW = new Array(tCols).fill(0);
              for (const row of gridRows) {
                let ci = 0;
                for (const cell of row) {
                  if (cell.colspan === 1) {
                    const w = cell.bold ? 'bold' : 'normal';
                    ctx.font = `${w} ${fontSizes.normal}px ${fontFamily}`;
                    colMinW[ci] = Math.max(colMinW[ci], ctx.measureText(cell.text).width + cellPad * 2);
                  }
                  ci += cell.colspan;
                }
              }
              const totalIdeal = colMinW.reduce((a, b) => a + b, 0) || 1;
              const colW = colMinW.map(w => Math.max((w / totalIdeal) * maxWidth, maxWidth / (tCols * 2)));
              const sumW = colW.reduce((a, b) => a + b, 0);
              for (let c = 0; c < tCols; c++) colW[c] = (colW[c] / sumW) * maxWidth;

              for (const row of gridRows) {
                let maxRowH = lineHeights.normal;
                let ci = 0;
                for (const cell of row) {
                  let cWidth = 0;
                  for (let c = ci; c < ci + cell.colspan && c < tCols; c++) cWidth += colW[c];
                  const availW = cWidth - cellPad * 2;
                  const w = cell.bold ? 'bold' : 'normal';
                  ctx.font = `${w} ${fontSizes.normal}px ${fontFamily}`;
                  // Count wrapped lines
                  const words = cell.text.split(' ');
                  let cur = '';
                  let lines = 0;
                  for (const word of words) {
                    const test = cur + (cur ? ' ' : '') + word;
                    if (ctx.measureText(test).width > Math.max(availW, 20) && cur) { lines++; cur = word; }
                    else cur = test;
                  }
                  if (cur) lines++;
                  if (lines === 0) lines = 1;
                  if (cell.rowspan === 1) {
                    maxRowH = Math.max(maxRowH, lines * lineHeights.normal + cellPad);
                  }
                  ci += cell.colspan;
                }
                h += maxRowH;
              }
            } else {
              for (const tl of tLines) {
                const parsed2 = parseLayoutLine(tl);
                if (!parsed2.text.includes('|')) continue;
                const cells = parsed2.text.split('|').filter(c => c.trim() !== '');
                if (cells.length > 0 && !cells[0].match(/^[\s-]+$/)) {
                  h += lineHeights.normal;
                } else {
                  h += 2 * scale;
                }
              }
            }
            return h;
          };

          for (const rawLine of lines) {
            const parsed = parseLayoutLine(rawLine);
            if (parsed.isTable) {
              if (inTable) {
                // End of table — measure collected buffer
                totalHeight += measureTable(tableBuffer);
                tableBuffer = [];
              }
              inTable = !inTable;
              continue;
            }

            if (inTable) {
              tableBuffer.push(rawLine);
              continue;
            }

            if (parsed.isDiagram) {
              inDiag = !inDiag;
              if (!inDiag) totalHeight += canvas.height * 0.35; // reserve space for embedded image
              continue;
            }
            if (inDiag) continue;

            if (parsed.isLine) { totalHeight += 8 * scale; continue; }
            if (parsed.isSpace) { totalHeight += 12 * scale; continue; }
            if (!parsed.text && !parsed.rightText) { totalHeight += 6 * scale; continue; }

            const sizeKey = (parsed.size || 'normal') as keyof typeof fontSizes;
            const lh = lineHeights[sizeKey];
            const fs = fontSizes[sizeKey];
            const weight = parsed.bold ? 'bold' : 'normal';
            ctx.font = `${weight} ${fs}px ${fontFamily}`;
            const availW = parsed.indent ? maxWidth - 25 * scale : maxWidth;

            if (parsed.rightText && parsed.text) {
              totalHeight += lh;
              continue;
            }

            // Word wrap count
            const words = parsed.text.split(' ');
            let currentLine = '';
            let wrappedCount = 0;
            for (const word of words) {
              const testLine = currentLine + (currentLine ? ' ' : '') + word;
              if (ctx.measureText(testLine).width > availW && currentLine) {
                wrappedCount++;
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) wrappedCount++;
            totalHeight += lh * wrappedCount;
          }
          return totalHeight;
        };

        // Dynamic font sizing: start at 13 and shrink until content fits
        let baseFontSize = 13 * scale;
        const maxHeight = canvas.height - topMargin;
        let attempts = 0;
        while (measureLines(baseFontSize) > maxHeight && baseFontSize > 6 * scale && attempts < 20) {
          baseFontSize -= 0.5 * scale;
          attempts++;
        }

        const fontSizes = {
          h1: baseFontSize * 1.54,
          h2: baseFontSize * 1.31,
          h3: baseFontSize * 1.15,
          small: baseFontSize * 0.77,
          normal: baseFontSize,
        };
        const lineHeights = {
          h1: fontSizes.h1 * 1.4,
          h2: fontSizes.h2 * 1.4,
          h3: fontSizes.h3 * 1.4,
          small: fontSizes.small * 1.5,
          normal: fontSizes.normal * 1.46,
        };

        const setFont = (size: string | undefined, bold: boolean | undefined) => {
          const fontSize = fontSizes[(size as keyof typeof fontSizes) || 'normal'];
          const weight = bold ? 'bold' : 'normal';
          ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
        };
        
        let y = topMargin;
        const renderLines = processedText.split('\n');
        let inTableRender = false;
        let renderTableBuffer: string[] = [];
        let inDiagramBlock = false;

        // Render a grid-format table with colspan/rowspan — proportional column widths + text wrapping
        const renderGridTable = (tLines: string[], startY: number): number => {
          const gridRows = parseGridTable(tLines);
          if (gridRows.length === 0) return startY;

          // Determine total logical columns
          let totalCols = 0;
          for (const row of gridRows) {
            let cols = 0;
            for (const cell of row) cols += cell.colspan;
            totalCols = Math.max(totalCols, cols);
          }
          if (totalCols === 0) totalCols = 1;

          const cellPadding = 4 * scale;

          // --- Step 1: Measure ideal width per column based on cell content ---
          const colMinWidths = new Array(totalCols).fill(0);
          for (const row of gridRows) {
            let ci = 0;
            for (const cell of row) {
              if (cell.colspan === 1) {
                const w = cell.bold ? 'bold' : 'normal';
                ctx.font = `${w} ${fontSizes.normal}px ${fontFamily}`;
                const tw = ctx.measureText(cell.text).width + cellPadding * 2;
                colMinWidths[ci] = Math.max(colMinWidths[ci], tw);
              }
              ci += cell.colspan;
            }
          }

          // Distribute widths proportionally across maxWidth
          const totalIdeal = colMinWidths.reduce((a, b) => a + b, 0);
          const colWidths: number[] = [];
          if (totalIdeal > 0) {
            for (let c = 0; c < totalCols; c++) {
              colWidths.push(Math.max((colMinWidths[c] / totalIdeal) * maxWidth, maxWidth / (totalCols * 2)));
            }
          } else {
            for (let c = 0; c < totalCols; c++) colWidths.push(maxWidth / totalCols);
          }
          // Normalize to exactly maxWidth
          const sumW = colWidths.reduce((a, b) => a + b, 0);
          for (let c = 0; c < totalCols; c++) colWidths[c] = (colWidths[c] / sumW) * maxWidth;

          // Helper: get X position for column index
          const colX = (ci: number) => {
            let x = leftMargin;
            for (let c = 0; c < ci; c++) x += colWidths[c];
            return x;
          };
          const spanWidth = (ci: number, span: number) => {
            let w = 0;
            for (let c = ci; c < ci + span && c < totalCols; c++) w += colWidths[c];
            return w;
          };

          // --- Step 2: Wrap text and compute row heights ---
          const wrapText = (text: string, maxW: number, font: string): string[] => {
            ctx.font = font;
            const words = text.split(' ');
            const lines: string[] = [];
            let cur = '';
            for (const word of words) {
              const test = cur + (cur ? ' ' : '') + word;
              if (ctx.measureText(test).width > maxW && cur) {
                lines.push(cur);
                cur = word;
              } else {
                cur = test;
              }
            }
            if (cur) lines.push(cur);
            if (lines.length === 0) lines.push('');
            return lines;
          };

          // Build occupancy map
          const occupied: boolean[][] = [];
          const totalRows = gridRows.length;
          for (let r = 0; r < totalRows + 20; r++) occupied[r] = new Array(totalCols).fill(false);

          // Pre-compute wrapped lines + row heights
          const cellWrapped: string[][][] = []; // [row][cellIdx] = string[]
          const rowHeights: number[] = new Array(totalRows).fill(lineHeights.normal);

          for (let ri = 0; ri < totalRows; ri++) {
            cellWrapped[ri] = [];
            const row = gridRows[ri];
            let colIdx = 0;
            for (let ci2 = 0; ci2 < row.length; ci2++) {
              const cell = row[ci2];
              while (colIdx < totalCols && occupied[ri][colIdx]) colIdx++;
              const cW = spanWidth(colIdx, cell.colspan) - cellPadding * 2;
              const w = cell.bold ? 'bold' : 'normal';
              const font = `${w} ${fontSizes.normal}px ${fontFamily}`;
              const wrapped = wrapText(cell.text, Math.max(cW, 20), font);
              cellWrapped[ri].push(wrapped);

              const neededH = wrapped.length * lineHeights.normal + cellPadding;
              // For rowspan=1, update row height; for multi-row, distribute later
              if (cell.rowspan === 1) {
                rowHeights[ri] = Math.max(rowHeights[ri], neededH);
              }

              // Mark occupied
              for (let rs = 0; rs < cell.rowspan; rs++) {
                for (let cs = 0; cs < cell.colspan; cs++) {
                  if (ri + rs < totalRows + 20 && colIdx + cs < totalCols) {
                    occupied[ri + rs][colIdx + cs] = true;
                  }
                }
              }
              colIdx += cell.colspan;
            }
          }

          // Reset occupancy for render pass
          for (let r = 0; r < totalRows + 20; r++) occupied[r] = new Array(totalCols).fill(false);

          // --- Step 3: Render ---
          // Compute Y positions for each row
          const rowY: number[] = [];
          let cy = startY;
          for (let r = 0; r < totalRows; r++) {
            rowY.push(cy);
            cy += rowHeights[r];
          }

          for (let ri = 0; ri < totalRows; ri++) {
            const row = gridRows[ri];
            let colIdx = 0;

            for (let ci2 = 0; ci2 < row.length; ci2++) {
              const cell = row[ci2];
              while (colIdx < totalCols && occupied[ri][colIdx]) colIdx++;
              if (colIdx >= totalCols) break;

              const cellW = spanWidth(colIdx, cell.colspan);
              let cellH = 0;
              for (let rs = 0; rs < cell.rowspan && ri + rs < totalRows; rs++) cellH += rowHeights[ri + rs];
              if (cellH === 0) cellH = rowHeights[ri];
              const cellX2 = colX(colIdx);
              const cellY2 = rowY[ri];

              // Mark occupied
              for (let rs = 0; rs < cell.rowspan; rs++) {
                for (let cs = 0; cs < cell.colspan; cs++) {
                  if (ri + rs < totalRows + 20 && colIdx + cs < totalCols) {
                    occupied[ri + rs][colIdx + cs] = true;
                  }
                }
              }

              // Draw cell border
              ctx.strokeStyle = '#333333';
              ctx.lineWidth = 1.2 * scale;
              ctx.strokeRect(cellX2, cellY2, cellW, cellH);

              // Draw wrapped text
              ctx.fillStyle = '#000000';
              const weight = cell.bold ? 'bold' : 'normal';
              ctx.font = `${weight} ${fontSizes.normal}px ${fontFamily}`;
              const wrapped = cellWrapped[ri][ci2] || [cell.text];
              const textBlockH = wrapped.length * lineHeights.normal;
              const textStartY = cellY2 + (cellH - textBlockH) / 2 + lineHeights.normal * 0.75;
              for (let li = 0; li < wrapped.length; li++) {
                const tx = cellX2 + cellPadding;
                const ty = textStartY + li * lineHeights.normal;
                if (ty < cellY2 + cellH) {
                  ctx.fillText(wrapped[li], tx, ty);
                }
              }

              colIdx += cell.colspan;
            }
          }
          return cy;
        };

        // Render a markdown table — proportional column widths + text wrapping
        const renderMarkdownTable = (tLines: string[], startY: number): number => {
          const cellPadding = 4 * scale;
          // Parse all data rows first to measure column widths
          const dataRows: { cells: string[]; bold: boolean }[] = [];
          let numCols = 0;
          for (const tl of tLines) {
            const parsed = parseLayoutLine(tl);
            if (!parsed.text.includes('|')) continue;
            const cells = parsed.text.split('|').filter(c => c.trim() !== '');
            if (cells.length > 0 && !cells[0].match(/^[\s-]+$/)) {
              dataRows.push({ cells: cells.map(c => c.trim()), bold: !!parsed.bold });
              numCols = Math.max(numCols, cells.length);
            }
          }
          if (dataRows.length === 0 || numCols === 0) return startY;

          // Measure ideal widths
          const colMinW = new Array(numCols).fill(0);
          for (const row of dataRows) {
            const w = row.bold ? 'bold' : 'normal';
            ctx.font = `${w} ${fontSizes.normal}px ${fontFamily}`;
            for (let ci = 0; ci < row.cells.length; ci++) {
              const tw = ctx.measureText(row.cells[ci]).width + cellPadding * 2;
              colMinW[ci] = Math.max(colMinW[ci], tw);
            }
          }
          const totalIdeal = colMinW.reduce((a, b) => a + b, 0);
          const colWidths: number[] = [];
          for (let c = 0; c < numCols; c++) {
            colWidths.push(totalIdeal > 0 ? Math.max((colMinW[c] / totalIdeal) * maxWidth, maxWidth / (numCols * 2)) : maxWidth / numCols);
          }
          const sumW = colWidths.reduce((a, b) => a + b, 0);
          for (let c = 0; c < numCols; c++) colWidths[c] = (colWidths[c] / sumW) * maxWidth;

          let curY = startY;
          for (const row of dataRows) {
            const weight = row.bold ? 'bold' : 'normal';
            ctx.font = `${weight} ${fontSizes.normal}px ${fontFamily}`;
            ctx.fillStyle = '#000000';

            // Wrap text per cell to compute row height
            const wrappedCells: string[][] = [];
            let maxLines = 1;
            for (let ci = 0; ci < numCols; ci++) {
              const text = ci < row.cells.length ? row.cells[ci] : '';
              const availW = colWidths[ci] - cellPadding * 2;
              const words = text.split(' ');
              const lines: string[] = [];
              let cur = '';
              for (const word of words) {
                const test = cur + (cur ? ' ' : '') + word;
                if (ctx.measureText(test).width > availW && cur) { lines.push(cur); cur = word; }
                else cur = test;
              }
              if (cur) lines.push(cur);
              if (lines.length === 0) lines.push('');
              wrappedCells.push(lines);
              maxLines = Math.max(maxLines, lines.length);
            }
            const rowH = maxLines * lineHeights.normal + cellPadding;

            let cx = leftMargin;
            for (let ci = 0; ci < numCols; ci++) {
              ctx.strokeStyle = '#333333';
              ctx.lineWidth = 1.2 * scale;
              ctx.strokeRect(cx, curY, colWidths[ci], rowH);
              const lines = wrappedCells[ci] || [''];
              const textStartY = curY + lineHeights.normal * 0.75 + cellPadding / 2;
              for (let li = 0; li < lines.length; li++) {
                ctx.fillText(lines[li], cx + cellPadding, textStartY + li * lineHeights.normal);
              }
              cx += colWidths[ci];
            }
            curY += rowH;
          }
          return curY;
        };
        
        for (const rawLine of renderLines) {
          const parsed = parseLayoutLine(rawLine);
          
          // Table markers
          if (parsed.isTable) {
            if (inTableRender) {
              // End of table — render collected buffer
              if (isGridTable(renderTableBuffer)) {
                y = renderGridTable(renderTableBuffer, y);
              } else {
                y = renderMarkdownTable(renderTableBuffer, y);
              }
              renderTableBuffer = [];
            }
            inTableRender = !inTableRender;
            continue;
          }

          if (inTableRender) {
            renderTableBuffer.push(rawLine);
            continue;
          }

          // Diagram block — embed original image region
          if (parsed.isDiagram) {
            inDiagramBlock = !inDiagramBlock;
            if (!inDiagramBlock) {
              // End of diagram block — embed the original image scaled to fit
              try {
                const img = document.createElement('img');
                img.crossOrigin = 'anonymous';
                await new Promise<void>((resolve, reject) => {
                  img.onload = () => resolve();
                  img.onerror = reject;
                  img.src = page.imageUrl;
                });
                const imgAspect = img.width / img.height;
                const availH = Math.min(maxWidth / imgAspect, canvas.height * 0.4);
                const imgW = availH * imgAspect;
                const imgX = leftMargin + (maxWidth - imgW) / 2;
                ctx.drawImage(img, imgX, y, imgW, availH);
                y += availH + 10 * scale;
              } catch {
                // Fallback: show placeholder
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(leftMargin, y, maxWidth, 80 * scale);
                ctx.fillStyle = '#999';
                ctx.font = `${fontSizes.normal}px ${fontFamily}`;
                ctx.fillText('[Diagram — see original image]', leftMargin + 10 * scale, y + 40 * scale);
                y += 90 * scale;
              }
            }
            continue;
          }

          if (inDiagramBlock) {
            continue; // Skip lines inside diagram block
          }
          
          // Horizontal separator line
          if (parsed.isLine) {
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1.5 * scale;
            ctx.beginPath();
            ctx.moveTo(leftMargin, y);
            ctx.lineTo(canvas.width - rightMargin, y);
            ctx.stroke();
            y += 8 * scale;
            continue;
          }
          
          // Extra vertical space
          if (parsed.isSpace) {
            y += 12 * scale;
            continue;
          }
          
          if (!parsed.text && !parsed.rightText) {
            y += 6 * scale;
            continue;
          }
          
          const sizeKey = (parsed.size || 'normal') as keyof typeof fontSizes;
          const lineHeight = lineHeights[sizeKey];
          const xStart = parsed.indent ? indentMargin : leftMargin;
          const availWidth = parsed.indent ? maxWidth - 25 * scale : maxWidth;
          
          ctx.fillStyle = '#000000';
          setFont(parsed.size, parsed.bold);

          // Handle mixed left+right on same line
          if (parsed.rightText && parsed.text) {
            ctx.fillText(parsed.text, xStart, y);
            const rightWidth = ctx.measureText(parsed.rightText).width;
            ctx.fillText(parsed.rightText, canvas.width - rightMargin - rightWidth, y);
            y += lineHeight;
            continue;
          }
          
          // Word wrap the text
          const words = parsed.text.split(' ');
          let currentLine = '';
          const wrappedLines: string[] = [];
          
          for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            if (ctx.measureText(testLine).width > availWidth && currentLine) {
              wrappedLines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) wrappedLines.push(currentLine);
          
          for (const wLine of wrappedLines) {
            // Prevent drawing beyond canvas
            if (y > canvas.height - 10 * scale) break;
            
            let x = xStart;
            if (parsed.align === 'center') {
              x = (canvas.width - ctx.measureText(wLine).width) / 2;
            } else if (parsed.align === 'right') {
              x = canvas.width - rightMargin - ctx.measureText(wLine).width;
            }
            
            ctx.fillText(wLine, x, y);
            y += lineHeight;
          }
        }
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
      }

      const pdfBlob = pdf.output('blob');
      const pdfDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(pdfBlob);
      });

      // Generate thumbnail from first page text preview
      const thumbnailCanvas = document.createElement('canvas');
      thumbnailCanvas.width = 150;
      thumbnailCanvas.height = 200;
      const ctx = thumbnailCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 150, 200);
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('OCR Document', 10, 25);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px Arial';
        const previewText = extractedPages[0].text.substring(0, 200);
        const words = previewText.split(' ');
        let line = '';
        let y = 45;
        words.forEach(word => {
          if (ctx.measureText(line + word).width > 130) {
            ctx.fillText(line, 10, y);
            line = word + ' ';
            y += 12;
          } else {
            line += word + ' ';
          }
        });
        ctx.fillText(line, 10, y);
      }
      const thumbnailUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.8);

      const fileName = pdfName.trim() || `OCR_${new Date().toLocaleDateString().replace(/\//g, '-')}_${Date.now()}`;
      
      // Combine all extracted text for AI context
      const fullOCRText = extractedPages.map(p => p.text).join('\n\n--- Page Break ---\n\n');
      
      const savedPdf = await mockStorage.savePDF({
        name: fileName,
        userId: userId || 'anonymous',
        timestamp: Date.now(),
        downloadUrl: pdfDataUrl,
        thumbnailUrl,
        visibility,
        tags: selectedTags,
        pageCount: extractedPages.length,
        size: pdfBlob.size,
        isOCR: true,
      }, getAuthDisplayName());

      // Store OCR text in localStorage for AI chat
      try {
        localStorage.setItem(`ocr_text_${savedPdf.id}`, fullOCRText);
      } catch (e) {
        console.warn('Could not save OCR text for AI:', e);
      }

      // Also upload OCR text to cloud storage so other users can use Ask AI
      try {
        const ocrBlob = new Blob([fullOCRText], { type: 'text/plain' });
        const ocrPath = `ocr_texts/${savedPdf.id}.txt`;
        await supabase.storage.from('pdfs').upload(ocrPath, ocrBlob, { upsert: true, contentType: 'text/plain' });
      } catch (e) {
        console.warn('Could not upload OCR text to cloud:', e);
      }

      toast({ title: "PDF created successfully" });
      speak("PDF created successfully");
      navigate('/library');
    } catch (error) {
      console.error('PDF creation error:', error);
      toast({ title: "Error", description: "Failed to create PDF", variant: "destructive" });
    } finally {
      setIsCreatingPDF(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <ExitConfirmDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onSaveDraft={handleSaveDraft}
        onResume={handleResume}
        onExit={handleExit}
        hasContent={hasUnsavedContent}
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackClick}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Handwriting to Text</h1>
        </div>
      </div>

      {/* Capture Step */}
      {step === 'capture' && (
        <div className="p-4 space-y-4">
          {/* Camera Preview */}
          <div className="relative aspect-[3/4] bg-secondary rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            {!cameraActive && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Camera className="w-16 h-16 mb-4 opacity-50" />
                <p>Camera preview</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Image count badge */}
          {images.length > 0 && (
            <div className="flex items-center justify-center">
              <span className="px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium">
                {images.length} image(s) ready
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="grid grid-cols-2 gap-3">
            {!cameraActive ? (
              <Button onClick={startCamera} className="h-14 gap-2">
                <Camera className="w-5 h-5" />
                Open Camera
              </Button>
            ) : (
              <>
                <Button onClick={capturePhoto} className="h-14 gap-2 bg-primary">
                  <Camera className="w-5 h-5" />
                  Capture
                </Button>
                <Button onClick={stopCamera} variant="outline" className="h-14">
                  Close Camera
                </Button>
              </>
            )}
            
            <Button 
              variant="outline" 
              className="h-14 gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="w-5 h-5" />
              Gallery
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleGallerySelect}
            />
          </div>

          {/* Start Scan Button */}
          {images.length > 0 && (
            <Button 
              onClick={startScanning}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-blue-400"
            >
              Start OCR Scan ({images.length} images)
            </Button>
          )}
        </div>
      )}

      {/* Scanning Step - Full screen with scroll support */}
      {step === 'scanning' && (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
          <div className="min-h-full flex flex-col">
            {/* Scanning Animation Container */}
            <div className={`flex-1 relative overflow-hidden transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              {/* Current image being scanned */}
              <div className="relative w-full h-full min-h-[50vh]">
                <img 
                  src={images[scanStatus.currentPage - 1]} 
                  alt="Scanning"
                  className="w-full h-full object-contain"
                />
                
                {/* Neon scan line - continuous loop animation */}
                {scanStatus.isProcessing && scanStatus.progress < 100 && (
                  <div 
                    className="absolute left-0 right-0 h-1 pointer-events-none animate-scan-line"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 20%, hsl(var(--primary)) 80%, transparent 100%)',
                      boxShadow: '0 0 20px hsl(var(--primary) / 0.8), 0 0 40px hsl(var(--primary) / 0.4)',
                    }}
                  />
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30 pointer-events-none" />
              </div>
            </div>
            
            {/* Progress display - always visible and scrollable */}
            <div className="sticky bottom-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 sm:p-6 space-y-4">
              {/* Page indicator */}
              <div className="flex items-center justify-center">
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                  Page {scanStatus.currentPage} of {scanStatus.totalPages}
                </span>
              </div>
              
              {/* Lottie animation + percentage side by side */}
              <div className="flex items-center justify-center gap-4">
                <LottieLoader size={80} className="shrink-0" />
                <span 
                  className="text-5xl sm:text-6xl md:text-7xl font-bold text-primary transition-all duration-150"
                  style={{
                    textShadow: '0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--primary) / 0.3)'
                  }}
                >
                  {scanStatus.progress}%
                </span>
              </div>
              
              {/* Status message - wraps on small screens */}
              <p className="text-center text-sm sm:text-base text-muted-foreground break-words px-2">
                {scanStatus.message}
              </p>
              
              {/* Progress bar */}
              <Progress value={scanStatus.progress} className="h-2 sm:h-3" />
            </div>
          </div>
          
          {/* CSS for scan line animation */}
          <style>{`
            @keyframes scanLine {
              0% {
                top: 0%;
              }
              100% {
                top: 100%;
              }
            }
            .animate-scan-line {
              animation: scanLine 1.5s ease-in-out infinite;
              will-change: top;
              transform: translateZ(0);
            }
          `}</style>
        </div>
      )}

      {/* Results Step */}
      {step === 'results' && (
        <div className="p-4 space-y-4">
          {/* Extracted text display */}
          <Card className="p-4 max-h-[50vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Extracted Text</h2>
              <CopyButton 
                text={extractedPages.map(p => p.text).join('\n\n--- Page Break ---\n\n')}
                className="shrink-0"
              />
            </div>
            {extractedPages.map((page, index) => (
              <div key={index} className="mb-4 pb-4 border-b border-border last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Page {index + 1}</p>
                  {extractedPages.length > 1 && (
                    <CopyButton text={page.text} size="icon" variant="ghost" />
                  )}
                </div>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {page.text}
                </p>
              </div>
            ))}
          </Card>

          {/* PDF Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Edit className="w-4 h-4" />
              PDF Name
            </label>
            <Input
              value={pdfName}
              onChange={(e) => setPdfName(e.target.value)}
              placeholder="Enter PDF name (optional)"
              className="bg-secondary/50"
            />
          </div>

          {/* Action Cards */}
          <div className="space-y-3">
            <Card 
              className={`p-4 cursor-pointer transition-all ${visibility === 'private' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-secondary/50'}`}
              onClick={() => setVisibility('private')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Save to Private</h3>
                  <p className="text-sm text-muted-foreground">Visible only to you</p>
                </div>
              </div>
            </Card>

            <Card 
              className={`p-4 cursor-pointer transition-all ${visibility === 'world' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-secondary/50'}`}
              onClick={() => setVisibility('world')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Save to World</h3>
                  <p className="text-sm text-muted-foreground">Publish publicly</p>
                </div>
              </div>
            </Card>

            <Card 
              className={`p-4 cursor-pointer transition-all hover:bg-secondary/50 ${showTagSelector ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setShowTagSelector(!showTagSelector)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Tag className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Select Tags</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTags.length > 0 ? selectedTags.join(', ') : 'Choose tags before saving'}
                  </p>
                </div>
              </div>
            </Card>

            {showTagSelector && (
              <Card className="p-4">
                <TagSelector
                  selectedTags={selectedTags}
                  onChange={setSelectedTags}
                />
              </Card>
            )}
          </div>

          {/* Create PDF Button */}
          <Button 
            onClick={createPDF}
            disabled={isCreatingPDF}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-blue-400 gap-2"
          >
            <FileText className="w-5 h-5" />
            {isCreatingPDF ? 'Creating PDF...' : 'Create PDF'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default HandwritingOCR;
