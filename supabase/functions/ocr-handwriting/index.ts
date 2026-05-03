import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Allowed origins for CORS
const allowedOrigins = [
  'https://mridulpdf.lovable.app',
  'https://id-preview--7f8e89ff-e9ec-4537-b519-88a84e118974.lovable.app',
  // Lovable preview also uses lovableproject.com domain
  'https://7f8e89ff-e9ec-4537-b519-88a84e118974.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080'
];


function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-guest-id',
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
    // Get authentication header (optional for guest users)
    const authHeader = req.headers.get('Authorization');
    const guestId = req.headers.get('X-Guest-ID');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    let userId: string | null = null;
    let _isGuest = false;
    
    // Try to authenticate if token provided
    if (authHeader && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError && user) {
        userId = user.id;
      }
    }
    
    // If not authenticated, allow as guest with guest ID
    if (!userId) {
      if (!guestId || guestId.length < 10) {
        return new Response(
          JSON.stringify({ error: 'Guest ID required for unauthenticated users' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = `guest_${guestId}`;
      _isGuest = true;
    }

    // Parse and validate request body
    const { image } = await req.json();
    
    // Validate image format and size
    if (!image || typeof image !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid image data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!image.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid image format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit size (~7.5MB actual from base64)
    if (image.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Image too large. Maximum size is 7.5MB.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log request for monitoring (without sensitive data)
    console.log({
      timestamp: new Date().toISOString(),
      userId: userId,
      action: 'ocr_request',
      imageSizeKB: Math.round(image.length / 1024)
    });

    const systemPrompt = `You are a fast, accurate OCR + document-layout extractor for Mridul PDF. Return PDF-ready text with layout tags only.

PRIORITY ORDER: readability > correct structure > speed. Never output broken table text.

LANGUAGE:
- Preserve Hindi as clean Devanagari Unicode. Never romanize Hindi. Use [अपठनीय] only when truly unreadable.
- Preserve English, numbers, punctuation, formulas and symbols exactly.

OUTPUT TAGS:
- Headings: [H1]...[/H1], [H2]...[/H2], [H3]...[/H3]
- Blank line: [SPACE]
- Display formula: [MATH] formula on its own line
- Same-line right text: left text[RIGHT]right text[/RIGHT]
- Tables: default to image region using [TABLE_IMAGE x=0.000 y=0.000 w=0.000 h=0.000] description [/TABLE_IMAGE]
- Diagrams/figures: [DIAGRAM x=0.000 y=0.000 w=0.000 h=0.000] description [/DIAGRAM]

STRICT LIST RULES:
- Every numbered/bulleted item MUST be on its own line.
- Split points like 1., 2., 3., 1), (i), (ii), क), ख), १., २., •, -, – onto separate lines.
- Never merge two points into one sentence. Keep notebook-like line breaks for lists and steps.

HYBRID TABLE/DIAGRAM RULES:
- Use [TABLE_IMAGE] for every complex table, Hindi table, handwritten table, merged-cell table, or multi-line-cell table.
- Bbox coordinates are normalized 0-1 with 3 decimals.
- Bbox must include full table/diagram border, first/last columns, full header row, and no clipped content.
- Keep visual tags in the exact top-to-bottom location where the table/diagram appears relative to nearby text.
- Do not OCR inside [TABLE_IMAGE] or [DIAGRAM] regions.

PARAGRAPH RULES:
- Running paragraph text can be one full-width line.
- Lists, headings, formulas, table tags, diagram tags, and real blank gaps must remain separate lines.
- Preserve original reading order from top to bottom.

Return ONLY formatted text with tags. No explanations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract ALL text using STRICT HYBRID MODE with structure-based detection. CRITICAL: (a) Hindi must be perfect Devanagari Unicode — read each akshara/matra carefully, never romanize or guess. (b) Numbered/bulleted list items each go on their OWN line, never merged. (c) Display math equations on their own line prefixed with [MATH]; use real Unicode symbols, never raw LaTeX. (d) Preserve blank-line section breaks with [SPACE]. For ANY table that is complex (merged cells, multi-line cells, long-text columns like addresses, mixed alignment, handwritten, Hindi) → output [TABLE_IMAGE x=.. y=.. w=.. h=..] with TIGHT normalized bbox (0-1, 3 decimals). For diagrams/charts/drawings/figures/circuits → [DIAGRAM x=.. y=.. w=.. h=..] with TIGHT normalized bbox. Do NOT include extra whitespace margins in the bbox; do NOT clip content. For plain text: merge wrapped lines of the SAME paragraph into full-width paragraphs. Use layout tags ([CENTER], [RIGHT], [H1]-[H3], [BOLD], [MATH], [LINE], [SPACE], [INDENT], [HEADER], [FOOTER], [SMALL]). Preserve top-to-bottom flow exactly. NEVER mix table content with paragraph text.'
              },
              {
                type: 'image_url',
                image_url: { url: image }
              }
            ]
          }
        ],
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to process image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ text: extractedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OCR Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process image' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
