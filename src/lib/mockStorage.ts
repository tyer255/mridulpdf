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

// Upload to world via edge function (works for both guests and authenticated users)
async function uploadWorldPdfViaEdge(
  pdf: Omit<PDFDocument, 'id'>,
  displayName: string
): Promise<PDFDocument> {
  const { data: { session } } = await supabase.auth.getSession();
  const guestId = localStorage.getItem('anonymous_user_id');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  if (guestId) {
    headers['X-Guest-ID'] = guestId;
  }
  headers['X-Display-Name'] = displayName;
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-world-pdf`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: pdf.name,
        pdfDataUrl: pdf.downloadUrl,
        thumbnailDataUrl: pdf.thumbnailUrl,
        size: pdf.size,
        tags: pdf.tags,
        pageCount: pdf.pageCount,
        isOCR: pdf.isOCR || false,
      }),
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload PDF to World');
  }
  
  const result = await response.json();
  return result.pdf as PDFDocument;
}

export const mockStorage = {
  async savePDF(pdf: Omit<PDFDocument, 'id'>, displayName?: string): Promise<PDFDocument> {
    // Private PDFs: upload files to storage, save metadata in localStorage
    if (pdf.visibility === 'private') {
      const pdfId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let storedDownloadUrl = pdf.downloadUrl;
      let storedThumbnailUrl = pdf.thumbnailUrl;

      // Upload PDF to storage under 'private/' folder (guest-accessible)
      if (pdf.downloadUrl && pdf.downloadUrl.startsWith('data:')) {
        try {
          const pdfPath = `private/${pdfId}.pdf`;
          storedDownloadUrl = await uploadToStorage('pdfs', pdfPath, pdf.downloadUrl);
        } catch (err) {
          console.error('Failed to upload private PDF to storage:', err);
          throw new Error('Failed to save PDF. Please try again.');
        }
      }

      // Upload thumbnail to storage
      if (pdf.thumbnailUrl && pdf.thumbnailUrl.startsWith('data:')) {
        try {
          const thumbPath = `private/${pdfId}.jpg`;
          storedThumbnailUrl = await uploadToStorage('thumbnails', thumbPath, pdf.thumbnailUrl);
        } catch (err) {
          console.warn('Failed to upload thumbnail, skipping:', err);
          storedThumbnailUrl = undefined;
        }
      }

      const pdfs = this.getPDFs();
      const newPDF: PDFDocument = {
        ...pdf,
        id: pdfId,
        downloadUrl: storedDownloadUrl,
        thumbnailUrl: storedThumbnailUrl,
        isOCR: pdf.isOCR,
      };

      pdfs.push(newPDF);
      localStorage.setItem(PDFS_KEY, JSON.stringify(pdfs));
      
      return newPDF;
    }
    
    // World visibility: use edge function for both guests and authenticated users
    return uploadWorldPdfViaEdge(pdf, displayName || 'Guest User');
  },

  getPDFs(): PDFDocument[] {
    const stored = localStorage.getItem(PDFS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  async getWorldPDFs(limit: number = 50, offset: number = 0): Promise<PDFDocument[]> {
    // Don't fetch download_url initially for old base64 data to avoid timeout
    const { data, error } = await supabase
      .from('world_pdfs')
      .select('id, name, user_id, timestamp, thumbnail_url, size, tags, page_count, display_name, is_ocr')
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
      isOCR: pdf.is_ocr ?? false,
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
      .select('id, name, user_id, timestamp, thumbnail_url, size, tags, page_count, display_name, is_ocr');

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
      isOCR: pdf.is_ocr ?? false,
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
