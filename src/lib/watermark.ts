import type { jsPDF } from 'jspdf';
import { getWatermarkEnabled } from './preferences';

let cachedLogoDataUrl: string | null = null;
let logoLoadPromise: Promise<string | null> | null = null;

/**
 * Load and cache a downscaled version of the app logo for use as a PDF watermark.
 * Downscaling keeps the embedded image tiny (~few KB) so PDFs don't bloat.
 */
async function getLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  if (logoLoadPromise) return logoLoadPromise;

  logoLoadPromise = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const targetW = 64;
        const ratio = img.height / img.width;
        const targetH = Math.round(targetW * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, targetW, targetH);
        cachedLogoDataUrl = canvas.toDataURL('image/png');
        resolve(cachedLogoDataUrl);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/mridulpdf_logo.png';
  });

  return logoLoadPromise;
}

/**
 * Apply a small "Mridul PDF" watermark with logo at the bottom-right corner
 * of every page in the given jsPDF document. No-op when the user has disabled
 * watermarks in preferences or when the override flag is false.
 */
export async function applyWatermarkToPdf(
  pdf: jsPDF,
  enabled: boolean = getWatermarkEnabled()
): Promise<void> {
  if (!enabled) return;

  const logo = await getLogoDataUrl();
  const pageCount = pdf.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Sizes are in the PDF's current unit (mm for most pages, pt for compressed pages).
    // Detect roughly which unit by page width: A4 mm ≈ 210, A4 pt ≈ 595.
    const isPt = pageWidth > 400;
    const padding = isPt ? 14 : 5;
    const logoSize = isPt ? 22 : 8;
    const fontSize = isPt ? 9 : 7;
    const textGap = isPt ? 4 : 1.5;

    const text = 'Mridul PDF';
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(120, 120, 120);
    const textWidth = pdf.getTextWidth(text);

    const totalWidth = (logo ? logoSize + textGap : 0) + textWidth;
    let x = pageWidth - padding - totalWidth;
    const yBaseline = pageHeight - padding;

    if (logo) {
      try {
        pdf.addImage(logo, 'PNG', x, yBaseline - logoSize + (isPt ? 4 : 1.5), logoSize, logoSize);
      } catch {
        // ignore logo errors – still draw text
      }
      x += logoSize + textGap;
    }

    pdf.text(text, x, yBaseline);
  }
}