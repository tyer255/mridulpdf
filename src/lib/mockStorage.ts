import { PDFDocument, PDFTag } from '@/types/pdf';
import { supabase } from '@/integrations/supabase/client';

const PDFS_KEY = 'scan_share_pdfs';

export const mockStorage = {
  async savePDF(pdf: Omit<PDFDocument, 'id'>, displayName?: string): Promise<PDFDocument> {
    if (pdf.visibility === 'world') {
      // Save to global database
      const { data, error } = await supabase
        .from('world_pdfs')
        .insert({
          name: pdf.name,
          user_id: pdf.userId,
          timestamp: pdf.timestamp,
          download_url: pdf.downloadUrl,
          thumbnail_url: pdf.thumbnailUrl,
          size: pdf.size,
          tags: pdf.tags,
          page_count: pdf.pageCount,
          display_name: displayName || 'Guest User',
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        userId: data.user_id,
        timestamp: data.timestamp,
        visibility: 'world',
        downloadUrl: data.download_url,
        thumbnailUrl: data.thumbnail_url,
        size: data.size,
        tags: data.tags as PDFTag[],
        pageCount: data.page_count,
      };
    } else {
      // Save private PDFs to localStorage
      const pdfs = this.getPDFs();
      const newPDF: PDFDocument = {
        ...pdf,
        id: Date.now().toString(),
      };
      pdfs.push(newPDF);
      localStorage.setItem(PDFS_KEY, JSON.stringify(pdfs));
      return newPDF;
    }
  },

  getPDFs(): PDFDocument[] {
    const stored = localStorage.getItem(PDFS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  async getWorldPDFs(limit: number = 50, offset: number = 0): Promise<PDFDocument[]> {
    // Don't load download_url initially to avoid timeout with large base64 PDFs
    const { data, error } = await supabase
      .from('world_pdfs')
      .select('id, name, user_id, timestamp, thumbnail_url, size, tags, page_count, display_name')
      .order('timestamp', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data.map(pdf => ({
      id: pdf.id,
      name: pdf.name,
      userId: pdf.user_id,
      timestamp: pdf.timestamp,
      visibility: 'world' as const,
      downloadUrl: '', // Will be fetched on-demand when downloading
      thumbnailUrl: pdf.thumbnail_url,
      size: pdf.size,
      tags: pdf.tags as PDFTag[],
      pageCount: pdf.page_count,
    }));
  },

  async getPDFDownloadUrl(pdfId: string): Promise<string> {
    // Fetch download URL only when needed
    const { data, error } = await supabase
      .from('world_pdfs')
      .select('download_url')
      .eq('id', pdfId)
      .single();

    if (error) throw error;
    return data.download_url;
  },

  getUserPDFs(userId: string): PDFDocument[] {
    return this.getPDFs().filter(pdf => pdf.userId === userId && pdf.visibility === 'private');
  },

  async searchWorldPDFs(query: string, tags: PDFTag[], limit: number = 50): Promise<PDFDocument[]> {
    let dbQuery = supabase
      .from('world_pdfs')
      .select('id, name, user_id, timestamp, thumbnail_url, size, tags, page_count, display_name');

    // Add search conditions with input sanitization and escape SQL wildcards
    if (query) {
      const sanitized = query.trim().slice(0, 100)
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      dbQuery = dbQuery.or(`name.ilike.%${sanitized}%,user_id.ilike.%${sanitized}%`);
    }

    // Add tag filter if tags are selected
    if (tags.length > 0) {
      dbQuery = dbQuery.overlaps('tags', tags);
    }

    const { data, error } = await dbQuery
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(pdf => ({
      id: pdf.id,
      name: pdf.name,
      userId: pdf.user_id,
      timestamp: pdf.timestamp,
      visibility: 'world' as const,
      downloadUrl: '', // Will be fetched on-demand
      thumbnailUrl: pdf.thumbnail_url,
      size: pdf.size,
      tags: pdf.tags as PDFTag[],
      pageCount: pdf.page_count,
    }));
  },

  async deletePDF(pdfId: string, visibility: 'private' | 'world'): Promise<void> {
    if (visibility === 'world') {
      const { error } = await supabase
        .from('world_pdfs')
        .delete()
        .eq('id', pdfId);

      if (error) throw error;
    } else {
      const pdfs = this.getPDFs();
      const filtered = pdfs.filter(pdf => pdf.id !== pdfId);
      localStorage.setItem(PDFS_KEY, JSON.stringify(filtered));
    }
  },
};
