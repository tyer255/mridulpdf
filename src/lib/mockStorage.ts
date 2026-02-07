import { PDFDocument, PDFTag } from '@/types/pdf';
import { supabase } from '@/integrations/supabase/client';

const PDFS_KEY = 'scan_share_pdfs';

// Helper to upload file to Supabase Storage
async function uploadToStorage(
  bucket: string,
  path: string,
  dataUrl: string
): Promise<string> {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    upsert: true,
    contentType: blob.type,
  });

  if (error) throw error;

  // Return the storage path
  return path;
}

// Helper to get public URL from storage path or return data URL as-is
function getStorageUrl(bucket: string, path: string): string {
  // If it's already a data URL (old format), return as-is
  if (path.startsWith('data:')) {
    return path;
  }
  // Otherwise, it's a storage path - get public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export const mockStorage = {
  async savePDF(pdf: Omit<PDFDocument, 'id'>, displayName?: string): Promise<PDFDocument> {
    if (pdf.visibility === 'world') {
      const pdfId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload PDF and thumbnail to storage
      const pdfPath = `pdfs/${pdf.userId}/${pdfId}.pdf`;
      const thumbnailPath = pdf.thumbnailUrl ? `thumbnails/${pdf.userId}/${pdfId}.jpg` : undefined;

      await uploadToStorage('pdfs', pdfPath, pdf.downloadUrl);
      if (pdf.thumbnailUrl && thumbnailPath) {
        await uploadToStorage('thumbnails', thumbnailPath, pdf.thumbnailUrl);
      }

      // Save metadata to database with storage paths
      const { data, error } = await supabase
        .from('world_pdfs')
        .insert({
          name: pdf.name,
          user_id: pdf.userId,
          timestamp: pdf.timestamp,
          download_url: pdfPath,
          thumbnail_url: thumbnailPath,
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
        downloadUrl: getStorageUrl('pdfs', data.download_url),
        thumbnailUrl: data.thumbnail_url ? getStorageUrl('thumbnails', data.thumbnail_url) : undefined,
        size: data.size,
        tags: data.tags as PDFTag[],
        pageCount: data.page_count,
      };
    } else {
      // Guest/private PDFs: keep everything local to avoid requiring authenticated storage uploads.
      // This preserves the "no signup required" flow and removes upload failures for guests.
      const pdfId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const pdfs = this.getPDFs();
      const newPDF: PDFDocument = {
        ...pdf,
        id: pdfId,
        // Keep data URLs as-is for private PDFs
        downloadUrl: pdf.downloadUrl,
        thumbnailUrl: pdf.thumbnailUrl,
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
    // Don't fetch download_url initially for old base64 data to avoid timeout
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
      downloadUrl: '', // Will be fetched on-demand
      thumbnailUrl: pdf.thumbnail_url ? getStorageUrl('thumbnails', pdf.thumbnail_url) : undefined,
      size: pdf.size,
      tags: pdf.tags as PDFTag[],
      pageCount: pdf.page_count,
    }));
  },

  async getPDFDownloadUrl(pdfId: string): Promise<string> {
    const { data, error } = await supabase
      .from('world_pdfs')
      .select('download_url')
      .eq('id', pdfId)
      .single();

    if (error) throw error;
    // Handle both old base64 data and new storage paths
    return getStorageUrl('pdfs', data.download_url);
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
      thumbnailUrl: pdf.thumbnail_url ? getStorageUrl('thumbnails', pdf.thumbnail_url) : undefined,
      size: pdf.size,
      tags: pdf.tags as PDFTag[],
      pageCount: pdf.page_count,
    }));
  },

  async deletePDF(pdfId: string, visibility: 'private' | 'world'): Promise<void> {
    if (visibility === 'world') {
      // Get the storage paths before deleting from database
      const { data } = await supabase
        .from('world_pdfs')
        .select('download_url, thumbnail_url, user_id')
        .eq('id', pdfId)
        .single();

      if (data) {
        // Delete from storage
        await supabase.storage.from('pdfs').remove([data.download_url]);
        if (data.thumbnail_url) {
          await supabase.storage.from('thumbnails').remove([data.thumbnail_url]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('world_pdfs')
        .delete()
        .eq('id', pdfId);

      if (error) throw error;
    } else {
      // Get PDF info to delete from storage
      const pdfs = this.getPDFs();
      const pdf = pdfs.find(p => p.id === pdfId);
      
      if (pdf) {
          // Extract storage path from URL (skip if it's a data URL)
          if (pdf.downloadUrl.startsWith('data:')) {
            // nothing to delete from storage
          } else {
            const pdfUrl = new URL(pdf.downloadUrl);
            const pdfPath = pdfUrl.pathname.split('/storage/v1/object/public/pdfs/')[1];
            if (pdfPath) {
              await supabase.storage.from('pdfs').remove([pdfPath]);
            }
          }

          if (pdf.thumbnailUrl) {
            if (pdf.thumbnailUrl.startsWith('data:')) {
              // nothing to delete from storage
            } else {
              const thumbUrl = new URL(pdf.thumbnailUrl);
              const thumbPath = thumbUrl.pathname.split('/storage/v1/object/public/thumbnails/')[1];
              if (thumbPath) {
                await supabase.storage.from('thumbnails').remove([thumbPath]);
              }
            }
          }
      }

      // Remove from localStorage
      const filtered = pdfs.filter(p => p.id !== pdfId);
      localStorage.setItem(PDFS_KEY, JSON.stringify(filtered));
    }
  },
};
