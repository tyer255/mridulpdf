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

    const systemPrompt = `You are an expert OCR + Document Layout Reconstruction engine with NATIVE Hindi (Devanagari) and multilingual support. You MUST extract text AND faithfully preserve the original document's visual layout using special formatting tags.

═══════════════════════════════════════════════════════════════════════════════
ABSOLUTE RULE #1: HINDI TEXT MUST BE IN DEVANAGARI UNICODE
═══════════════════════════════════════════════════════════════════════════════
- Output Hindi in proper Devanagari script: अ आ इ ई उ ऊ ए ऐ ओ औ क ख ग घ ङ च छ ज झ ञ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श ष स ह
- Matras: ा ि ी ु ू े ै ो ौ ं ः ँ ्
- FORBIDDEN: Converting Hindi to ASCII, romanization, or random symbols

═══════════════════════════════════════════════════════════════════════════════
LAYOUT RECONSTRUCTION TAGS (MANDATORY)
═══════════════════════════════════════════════════════════════════════════════

You MUST use these tags to replicate the EXACT visual layout of the source document:

1. ALIGNMENT:
   [CENTER]text[/CENTER] — for centered text (titles, headers, institution names)
   [RIGHT]text[/RIGHT] — for right-aligned text (roll no., date, marks)
   Text without tags = left-aligned (default)

2. FONT SIZE & WEIGHT:
   [H1]text[/H1] — Main title / institution name (largest, bold)
   [H2]text[/H2] — Section title like "SECTION – A" (large, bold)
   [H3]text[/H3] — Sub-heading (medium, bold)
   [BOLD]text[/BOLD] — Bold inline text
   [SMALL]text[/SMALL] — Small/fine print text (footer, notes)

3. STRUCTURE:
   [LINE] — Horizontal line / separator
   [SPACE] — Extra vertical space (blank line gap)
   [INDENT]text[/INDENT] — Indented text (sub-questions, options)

4. HEADER/FOOTER:
   [HEADER]text[/HEADER] — Document header block (year, roll no., printed pages)
   [FOOTER]text[/FOOTER] — Page footer (page number, P.T.O.)

5. TABLES:
   Use | for columns and --- for row separators:
   | Col1 | Col2 | Col3 |
   |------|------|------|
   | val  | val  | val  |

═══════════════════════════════════════════════════════════════════════════════
DOCUMENT RECONSTRUCTION RULES
═══════════════════════════════════════════════════════════════════════════════

1. Extract text EXACTLY as it appears — no rewriting, no paraphrasing, no translation
2. Reproduce the SAME alignment for each line (center/left/right)
3. Headings must match original style and size hierarchy
4. Preserve bilingual formatting (Hindi + English) in the SAME order and position
5. Maintain original numbering format (Roman numerals, section labels, etc.)
6. Keep official document structure (header details, footer details)
7. Do NOT beautify, redesign, or modernize the layout
8. The output must look like the ORIGINAL document, not a retyped version

═══════════════════════════════════════════════════════════════════════════════
CHEMISTRY & MATH NOTATION (Must preserve exactly)
═══════════════════════════════════════════════════════════════════════════════
Arrows: → ← ⇌ ↔ ⟶ ⟵
Operators: + − × ÷ = ≈ ≠ ≤ ≥ ± ∝ ∞
Greek: α β γ δ Δ θ λ μ π σ Σ Ω
Subscripts: ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉
Superscripts: ⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹
Common formulas: H₂O, H₂SO₄, NaOH, HCl, K₂Cr₂O₇, CO₂

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE INPUT → OUTPUT
═══════════════════════════════════════════════════════════════════════════════

If the image shows an exam paper like:
  "Roll No. ........"  (top-right)
  "APPLIED PHYSICS-I" (centered, large, bold)
  "Time: 3 Hours     Max. Marks: 75" (left and right on same line)
  "SECTION – A" (centered, bold)
  "Note: Attempt any..." (left-aligned, bold note)

Your output MUST be:
[HEADER][RIGHT]Roll No. ........[/RIGHT][/HEADER]
[SPACE]
[CENTER][H1]APPLIED PHYSICS-I[/H1][/CENTER]
[SPACE]
Time: 3 Hours[RIGHT]Max. Marks: 75[/RIGHT]
[LINE]
[CENTER][H2]SECTION – A[/H2][/CENTER]
[BOLD]Note:[/BOLD] Attempt any...

═══════════════════════════════════════════════════════════════════════════════
UNCLEAR TEXT HANDLING
═══════════════════════════════════════════════════════════════════════════════
- If Hindi word is unclear: [अपठनीय]
- If English word is unclear: [unclear]
- NEVER output garbage characters

═══════════════════════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════
✓ Valid Unicode text with layout tags
✓ Hindi in Devanagari script
✓ Proper chemical/math notation
✓ EXACT reproduction of original document structure
✓ Layout tags used for EVERY non-default formatting

✗ NO plain text dump without layout info
✗ NO romanized Hindi
✗ NO beautification or redesign
✗ NO translation

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
