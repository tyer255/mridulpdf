import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Allowed origins for CORS
const allowedOrigins = [
  'https://mridulpdf.lovable.app',
  'https://id-preview--7f8e89ff-e9ec-4537-b519-88a84e118974.lovable.app',
  'https://7f8e89ff-e9ec-4537-b519-88a84e118974.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080'
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-guest-id, x-display-name',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const guestId = req.headers.get('X-Guest-ID');
    const displayName = req.headers.get('X-Display-Name') || 'Guest User';
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    let userId: string | null = null;
    let userDisplayName = displayName;
    
    // Try to authenticate if token provided
    if (authHeader && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError && user) {
        userId = user.id;
        userDisplayName = user.user_metadata?.full_name || user.email?.split('@')[0] || displayName;
      }
    }
    
    // If not authenticated, use guest ID
    if (!userId) {
      if (!guestId || guestId.length < 10) {
        return new Response(
          JSON.stringify({ error: 'Guest ID required for unauthenticated users' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = `guest_${guestId}`;
    }

    // Parse request body
    const { name, pdfDataUrl, thumbnailDataUrl, size, tags, pageCount } = await req.json();
    
    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'PDF name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pdfDataUrl || typeof pdfDataUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: 'PDF data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit PDF size (~15MB from base64)
    if (pdfDataUrl.length > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'PDF too large. Maximum size is 15MB.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for storage operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const timestamp = Date.now();
    const pdfId = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert data URLs to blobs and upload to storage
    const pdfPath = `pdfs/${userId}/${pdfId}.pdf`;
    
    // Upload PDF
    const pdfResponse = await fetch(pdfDataUrl);
    const pdfBlob = await pdfResponse.blob();
    
    const { error: pdfUploadError } = await supabaseAdmin.storage
      .from('pdfs')
      .upload(pdfPath, pdfBlob, {
        upsert: true,
        contentType: 'application/pdf',
      });

    if (pdfUploadError) {
      console.error('PDF upload error:', pdfUploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload thumbnail if provided
    let thumbnailPath: string | null = null;
    if (thumbnailDataUrl && typeof thumbnailDataUrl === 'string' && thumbnailDataUrl.startsWith('data:image/')) {
      thumbnailPath = `thumbnails/${userId}/${pdfId}.jpg`;
      const thumbResponse = await fetch(thumbnailDataUrl);
      const thumbBlob = await thumbResponse.blob();
      
      const { error: thumbUploadError } = await supabaseAdmin.storage
        .from('thumbnails')
        .upload(thumbnailPath, thumbBlob, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (thumbUploadError) {
        console.error('Thumbnail upload error:', thumbUploadError);
        // Don't fail the whole operation for thumbnail
        thumbnailPath = null;
      }
    }

    // Insert metadata into world_pdfs table
    const { data, error: insertError } = await supabaseAdmin
      .from('world_pdfs')
      .insert({
        name: name.trim(),
        user_id: userId,
        timestamp: timestamp,
        download_url: pdfPath,
        thumbnail_url: thumbnailPath,
        size: size || pdfBlob.size,
        tags: tags || [],
        page_count: pageCount || null,
        display_name: userDisplayName,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Clean up uploaded files
      await supabaseAdmin.storage.from('pdfs').remove([pdfPath]);
      if (thumbnailPath) {
        await supabaseAdmin.storage.from('thumbnails').remove([thumbnailPath]);
      }
      return new Response(
        JSON.stringify({ error: 'Failed to save PDF metadata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URLs
    const { data: pdfUrlData } = supabaseAdmin.storage.from('pdfs').getPublicUrl(pdfPath);
    const thumbnailUrl = thumbnailPath 
      ? supabaseAdmin.storage.from('thumbnails').getPublicUrl(thumbnailPath).data.publicUrl 
      : null;

    console.log({
      timestamp: new Date().toISOString(),
      userId: userId,
      action: 'world_pdf_upload',
      pdfId: data.id,
      name: name.trim(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        pdf: {
          id: data.id,
          name: data.name,
          userId: data.user_id,
          timestamp: data.timestamp,
          visibility: 'world',
          downloadUrl: pdfUrlData.publicUrl,
          thumbnailUrl: thumbnailUrl,
          size: data.size,
          tags: data.tags,
          pageCount: data.page_count,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to upload PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
