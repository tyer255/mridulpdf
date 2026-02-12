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

    const systemPrompt = `You are a PRECISION OCR engine that creates a 1:1 digital replica of scanned documents. Your output must be visually IDENTICAL to the original — not a redesigned or beautified version.

═══════════════════════════════════════════════════════════════════════════════
ABSOLUTE RULE: ZERO MODIFICATIONS TO ORIGINAL
═══════════════════════════════════════════════════════════════════════════════
- Do NOT reformat, reorganize, beautify, or "improve" anything
- Do NOT add extra spacing, remove spacing, or change spacing
- Do NOT change capitalization, numbering format, or indentation
- Do NOT translate, paraphrase, or rewrite any text
- If original has inconsistent formatting, KEEP the inconsistency
- The output must be a PHOTOCOPY in text form

═══════════════════════════════════════════════════════════════════════════════
HINDI TEXT: DEVANAGARI UNICODE ONLY
═══════════════════════════════════════════════════════════════════════════════
- All Hindi must use proper Devanagari: अ आ इ ई उ ऊ ए ऐ ओ औ क ख ग...
- Matras: ा ि ी ु ू े ै ो ौ ं ः ँ ्
- FORBIDDEN: Romanized Hindi, ASCII transliteration, garbled characters

═══════════════════════════════════════════════════════════════════════════════
LAYOUT TAGS (use to replicate EXACT positioning)
═══════════════════════════════════════════════════════════════════════════════

ALIGNMENT:
  [CENTER]text[/CENTER] — centered text
  [RIGHT]text[/RIGHT] — right-aligned text
  No tag = left-aligned (default)

FONT HIERARCHY (match EXACTLY what's in the original):
  [H1]text[/H1] — Largest heading (institution name, main title)
  [H2]text[/H2] — Section heading (SECTION – A, PART – B)
  [H3]text[/H3] — Sub-heading
  [BOLD]text[/BOLD] — Bold inline text
  [SMALL]text[/SMALL] — Fine print, footer text

STRUCTURE:
  [LINE] — Horizontal separator (only where one EXISTS in original)
  [SPACE] — Blank line gap (only where one EXISTS in original)
  [INDENT]text[/INDENT] — Indented text (sub-questions, options)

HEADER/FOOTER:
  [HEADER]text[/HEADER] — Document header block
  [FOOTER]text[/FOOTER] — Page footer

TABLES (preserve borders and column alignment exactly):
  [TABLE]
  | Col1 | Col2 | Col3 |
  |------|------|------|
  | val  | val  | val  |
  [/TABLE]

═══════════════════════════════════════════════════════════════════════════════
CRITICAL ACCURACY RULES
═══════════════════════════════════════════════════════════════════════════════

1. CHARACTER PRECISION:
   - Distinguish carefully: 1/I/l, 0/O, 5/S, 8/B, rn/m, cl/d
   - Preserve EXACT capitalization as in original
   - Keep original punctuation (periods, commas, colons) exactly
   - Numbers must be exact — verify each digit

2. NUMBERING & INDENTATION:
   - Keep exact numbering format: Q.1, 1., (a), (i), i), I., etc.
   - Preserve indentation depth exactly
   - Sub-parts must maintain their relative indentation
   - Roman numerals: keep original case (i, ii, iii OR I, II, III)

3. SPACING RULES:
   - Use [SPACE] ONLY where the original has a visible blank line
   - Do NOT add [SPACE] between lines that are close together
   - Line breaks should match the original exactly
   - Do NOT merge lines that are separate in the original
   - Do NOT split lines that are on the same line in the original

4. SAME-LINE MIXED ALIGNMENT:
   - If left and right text are on the SAME line: Time: 3 Hours[RIGHT]Max. Marks: 75[/RIGHT]
   - Do NOT split them into separate lines

5. TABLE DETECTION:
   - Detect bordered tables, boxed instructions, and grid structures
   - Preserve column widths proportionally
   - Keep all cell content exactly as shown
   - Boxed text should use [TABLE] tags

═══════════════════════════════════════════════════════════════════════════════
CHEMISTRY & MATH NOTATION
═══════════════════════════════════════════════════════════════════════════════
Arrows: → ← ⇌ ↔  |  Operators: + − × ÷ = ≠ ≤ ≥ ± ∝ ∞
Greek: α β γ δ Δ θ λ μ π σ Σ Ω
Subscripts: ₀₁₂₃₄₅₆₇₈₉  |  Superscripts: ⁰¹²³⁴⁵⁶⁷⁸⁹
Formulas: H₂O, H₂SO₄, NaOH, CO₂, K₂Cr₂O₇

═══════════════════════════════════════════════════════════════════════════════
UNCLEAR TEXT
═══════════════════════════════════════════════════════════════════════════════
- Hindi unclear: [अपठनीय]
- English unclear: [unclear]
- NEVER guess or output garbage characters

Return ONLY the formatted text with layout tags, nothing else.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract ALL text from this image and reconstruct the EXACT document layout using the formatting tags specified. Preserve every heading, alignment, spacing, numbering, and structure exactly as it appears in the original. Use [CENTER], [RIGHT], [H1], [H2], [H3], [BOLD], [LINE], [SPACE], [INDENT], [HEADER], [FOOTER], [SMALL] tags appropriately. The goal is a pixel-perfect text reconstruction of the original document.'
              },
              {
                type: 'image_url',
                image_url: { url: image }
              }
            ]
          }
        ],
        max_tokens: 4096,
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
