import { PDFDocument, PDFTag } from '@/types/pdf';
import { supabase } from '@/integrations/supabase/client';

const PDFS_KEY = 'scan_share_pdfs';

// Helper to upload file to Supabase Storage
async function uploadToStorage(
  bucket: string,
  path: string,
  dataUrl: string
): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    upsert: true,
    contentType: blob.type,
  });

  if (error) throw error;
  return path;
}

// Helper to get public URL from storage path or return data URL as-is
function getStorageUrl(bucket: string, path: string): string {
  if (path.startsWith('data:')) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Upload to world via edge function
async function uploadWorldPdfViaEdge(
  pdf: Omit<PDFDocument, 'id'>,
  displayName: string
): Promise<PDFDocument> {
  const { data: { session } } = await supabase.auth.getSession();
  const guestId = localStorage.getItem('anonymous_user_id');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  if (guestId) headers['X-Guest-ID'] = guestId;
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

// Save private PDF to cloud for authenticated users
async function savePrivatePdfToCloud(
  pdf: Omit<PDFDocument, 'id'>,
  authUserId: string
): Promise<PDFDocument> {
  const pdfId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const pdfPath = `users/${authUserId}/pdfs/${pdfId}.pdf`;

  // Upload PDF file
  if (pdf.downloadUrl && pdf.downloadUrl.startsWith('data:')) {
    await uploadToStorage('pdfs', pdfPath, pdf.downloadUrl);
  }

  // Upload thumbnail
  let thumbnailPath: string | null = null;
  if (pdf.thumbnailUrl && pdf.thumbnailUrl.startsWith('data:')) {
    try {
      thumbnailPath = `users/${authUserId}/thumbnails/${pdfId}.jpg`;
      await uploadToStorage('thumbnails', thumbnailPath, pdf.thumbnailUrl);
    } catch {
      thumbnailPath = null;
    }
  }

  // Insert into user_pdfs table
  const { data, error } = await supabase
    .from('user_pdfs')
    .insert({
      user_id: authUserId,
      name: pdf.name.trim(),
      download_url: pdfPath,
      thumbnail_url: thumbnailPath,
      size: pdf.size || 0,
      tags: pdf.tags || [],
      page_count: pdf.pageCount || null,
      is_ocr: pdf.isOCR || false,
      timestamp: pdf.timestamp || Date.now(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    userId: data.user_id,
    timestamp: data.timestamp,
    visibility: 'private',
    downloadUrl: getStorageUrl('pdfs', data.download_url),
    thumbnailUrl: data.thumbnail_url ? getStorageUrl('thumbnails', data.thumbnail_url) : undefined,
    size: data.size ?? undefined,
    tags: data.tags as PDFTag[],
    pageCount: data.page_count ?? undefined,
    isOCR: data.is_ocr ?? false,
  };
}

// Save private PDF to localStorage for guest users (fallback)
async function savePrivatePdfLocally(
  pdf: Omit<PDFDocument, 'id'>
): Promise<PDFDocument> {
  const pdfId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let storedDownloadUrl = pdf.downloadUrl;
  let storedThumbnailUrl = pdf.thumbnailUrl;

  if (pdf.downloadUrl && pdf.downloadUrl.startsWith('data:')) {
    try {
      const pdfPath = `private/${pdfId}.pdf`;
      storedDownloadUrl = await uploadToStorage('pdfs', pdfPath, pdf.downloadUrl);
    } catch (err) {
      console.error('Failed to upload private PDF to storage:', err);
      throw new Error('Failed to save PDF. Please try again.');
    }
  }

  if (pdf.thumbnailUrl && pdf.thumbnailUrl.startsWith('data:')) {
    try {
      const thumbPath = `private/${pdfId}.jpg`;
      storedThumbnailUrl = await uploadToStorage('thumbnails', thumbPath, pdf.thumbnailUrl);
    } catch {
      storedThumbnailUrl = undefined;
    }
  }

  const pdfs = getLocalPDFs();
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

function getLocalPDFs(): PDFDocument[] {
  const stored = localStorage.getItem(PDFS_KEY);
  if (!stored) return [];
  const pdfs: PDFDocument[] = JSON.parse(stored);
  return pdfs.map(pdf => ({
    ...pdf,
    downloadUrl: pdf.downloadUrl ? getStorageUrl('pdfs', pdf.downloadUrl) : pdf.downloadUrl,
    thumbnailUrl: pdf.thumbnailUrl ? getStorageUrl('thumbnails', pdf.thumbnailUrl) : pdf.thumbnailUrl,
  }));
}

export const mockStorage = {
  async savePDF(pdf: Omit<PDFDocument, 'id'>, displayName?: string): Promise<PDFDocument> {
    if (pdf.visibility === 'private') {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return savePrivatePdfToCloud(pdf, session.user.id);
      }
      // Guest fallback: localStorage
      return savePrivatePdfLocally(pdf);
    }

    // World visibility
    return uploadWorldPdfViaEdge(pdf, displayName || 'Guest User');
  },

  // Get private PDFs for a user (cloud + local fallback)
  async getUserPDFs(userId: string): Promise<PDFDocument[]> {
    // Try fetching from cloud first (authenticated users)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data, error } = await supabase
        .from('user_pdfs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('timestamp', { ascending: false });

      if (!error && data) {
        return data.map(pdf => ({
          id: pdf.id,
          name: pdf.name,
          userId: pdf.user_id,
          timestamp: pdf.timestamp,
          visibility: 'private' as const,
          downloadUrl: getStorageUrl('pdfs', pdf.download_url),
          thumbnailUrl: pdf.thumbnail_url ? getStorageUrl('thumbnails', pdf.thumbnail_url) : undefined,
          size: pdf.size ?? undefined,
          tags: pdf.tags as PDFTag[],
          pageCount: pdf.page_count ?? undefined,
          isOCR: pdf.is_ocr ?? false,
        }));
      }
    }

    // Guest fallback: localStorage
    return getLocalPDFs().filter(pdf => pdf.userId === userId && pdf.visibility === 'private');
  },

  // Keep sync version for backward compat but prefer async
  getPDFs(): PDFDocument[] {
    return getLocalPDFs();
  },

  async getWorldPDFs(limit: number = 50, offset: number = 0): Promise<PDFDocument[]> {
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
      downloadUrl: '',
      thumbnailUrl: pdf.thumbnail_url ? getStorageUrl('thumbnails', pdf.thumbnail_url) : undefined,
      size: pdf.size,
      tags: pdf.tags as PDFTag[],
      pageCount: pdf.page_count,
      isOCR: pdf.is_ocr ?? false,
    }));
  },

  async getPDFDownloadUrl(pdfId: string): Promise<string> {
    // Try world_pdfs first
    const { data: worldData } = await supabase
      .from('world_pdfs')
      .select('download_url')
      .eq('id', pdfId)
      .single();

    if (worldData) return getStorageUrl('pdfs', worldData.download_url);

    // Try user_pdfs
    const { data: userData } = await supabase
      .from('user_pdfs')
      .select('download_url')
      .eq('id', pdfId)
      .single();

    if (userData) return getStorageUrl('pdfs', userData.download_url);

    throw new Error('PDF not found');
  },

  async searchWorldPDFs(query: string, tags: PDFTag[], limit: number = 50): Promise<PDFDocument[]> {
    let dbQuery = supabase
      .from('world_pdfs')
      .select('id, name, user_id, timestamp, thumbnail_url, size, tags, page_count, display_name, is_ocr');

    if (query) {
      const sanitized = query.trim().slice(0, 100)
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      dbQuery = dbQuery.or(`name.ilike.%${sanitized}%,user_id.ilike.%${sanitized}%`);
    }

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
      downloadUrl: '',
      thumbnailUrl: pdf.thumbnail_url ? getStorageUrl('thumbnails', pdf.thumbnail_url) : undefined,
      size: pdf.size,
      tags: pdf.tags as PDFTag[],
      pageCount: pdf.page_count,
      isOCR: pdf.is_ocr ?? false,
    }));
  },

  async deletePDF(pdfId: string, visibility: 'private' | 'world'): Promise<void> {
    if (visibility === 'world') {
      const { data } = await supabase
        .from('world_pdfs')
        .select('download_url, thumbnail_url, user_id')
        .eq('id', pdfId)
        .single();

      if (data) {
        await supabase.storage.from('pdfs').remove([data.download_url]);
        if (data.thumbnail_url) {
          await supabase.storage.from('thumbnails').remove([data.thumbnail_url]);
        }
      }

      const { error } = await supabase.from('world_pdfs').delete().eq('id', pdfId);
      if (error) throw error;
    } else {
      // Check if authenticated → delete from cloud
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('user_pdfs')
          .select('download_url, thumbnail_url')
          .eq('id', pdfId)
          .single();

        if (data) {
          await supabase.storage.from('pdfs').remove([data.download_url]);
          if (data.thumbnail_url) {
            await supabase.storage.from('thumbnails').remove([data.thumbnail_url]);
          }
        }

        const { error } = await supabase.from('user_pdfs').delete().eq('id', pdfId);
        if (error) throw error;
        return;
      }

      // Guest fallback: localStorage
      const pdfs = getLocalPDFs();
      const pdf = pdfs.find(p => p.id === pdfId);

      if (pdf) {
        if (!pdf.downloadUrl.startsWith('data:')) {
          const pdfUrl = new URL(pdf.downloadUrl);
          const pdfPath = pdfUrl.pathname.split('/storage/v1/object/public/pdfs/')[1];
          if (pdfPath) await supabase.storage.from('pdfs').remove([pdfPath]);
        }
        if (pdf.thumbnailUrl && !pdf.thumbnailUrl.startsWith('data:')) {
          const thumbUrl = new URL(pdf.thumbnailUrl);
          const thumbPath = thumbUrl.pathname.split('/storage/v1/object/public/thumbnails/')[1];
          if (thumbPath) await supabase.storage.from('thumbnails').remove([thumbPath]);
        }
      }

      const filtered = pdfs.filter(p => p.id !== pdfId);
      localStorage.setItem(PDFS_KEY, JSON.stringify(filtered));
    }
  },
};
