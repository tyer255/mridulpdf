// Temporary mock storage - replace with Firebase later
import { PDFDocument } from '@/types/pdf';

const PDFS_KEY = 'scan_share_pdfs';

export const mockStorage = {
  async savePDF(pdf: Omit<PDFDocument, 'id'>): Promise<PDFDocument> {
    const pdfs = this.getPDFs();
    const newPDF: PDFDocument = {
      ...pdf,
      id: Date.now().toString(),
    };
    pdfs.push(newPDF);
    localStorage.setItem(PDFS_KEY, JSON.stringify(pdfs));
    return newPDF;
  },

  getPDFs(): PDFDocument[] {
    const stored = localStorage.getItem(PDFS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  getPublicPDFs(): PDFDocument[] {
    return this.getPDFs().filter(pdf => pdf.visibility === 'public');
  },

  getUserPDFs(userId: string): PDFDocument[] {
    return this.getPDFs().filter(pdf => pdf.userId === userId);
  },
};
