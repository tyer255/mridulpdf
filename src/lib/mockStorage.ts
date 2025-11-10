// Temporary mock storage - replace with Firebase later
import { PDFDocument, PDFTag } from '@/types/pdf';

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

  searchPublicPDFs(query: string, tags: PDFTag[]): PDFDocument[] {
    const publicPDFs = this.getPublicPDFs();
    const lowerQuery = query.toLowerCase();

    return publicPDFs.filter(pdf => {
      // Check if query matches title or user ID
      const matchesQuery = !query || 
        pdf.name.toLowerCase().includes(lowerQuery) ||
        pdf.userId.toLowerCase().includes(lowerQuery);

      // Check if PDF has any of the selected tags
      const matchesTags = tags.length === 0 || 
        tags.some(tag => pdf.tags.includes(tag));

      return matchesQuery && matchesTags;
    });
  },
};
