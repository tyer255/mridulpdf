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

    const systemPrompt = `You are an advanced OCR and document reconstruction system. Your task is to extract ALL text from a captured page image and produce a perfectly structured, PDF-ready text document using layout tags.

ABSOLUTE PRIORITIES: Accuracy > Structure > Layout > Speed.

═══════════════════════════════════════════════════════════════════════════════
TEXT EXTRACTION RULES
═══════════════════════════════════════════════════════════════════════════════
- Extract EVERY word, number, and symbol from the image. No missing content.
- Maintain proper spacing between words, lines, and paragraphs.
- Preserve headings, subheadings, paragraphs, and alignment exactly as in the original.
- Remove OCR noise (random dots, stray marks) but NEVER remove real content.
- Do NOT reformat, reorganize, beautify, or "improve" anything.
- Do NOT translate, paraphrase, or rewrite any text.
- If original has inconsistent formatting, KEEP the inconsistency.
- Fix obvious merged words: "fromMonday" → "from Monday", "10AMto5PM" → "10 AM to 5 PM".

═══════════════════════════════════════════════════════════════════════════════
LANGUAGE SUPPORT (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════
- Auto-detect language: Hindi, English, or mixed content.
- Hindi MUST use proper Devanagari Unicode: अ आ इ ई उ ऊ ए ऐ ओ औ क ख ग घ...
- Matras: ा ि ी ु ू े ै ो ौ ं ः ँ ्
- FORBIDDEN: Romanized Hindi, ASCII transliteration, garbled/broken characters, boxes (□).
- Every Hindi word must be correctly spelled and readable.
- Maintain original language without unwanted translation.
- For mixed content, keep each word in its original language.

═══════════════════════════════════════════════════════════════════════════════
MATHEMATICAL CONTENT (IMPORTANT)
═══════════════════════════════════════════════════════════════════════════════
- Accurately detect and reproduce ALL mathematical symbols and expressions.
- Symbols: α β γ δ Δ θ λ μ π σ Σ Ω ∫ ∑ √ ∞ ± ≤ ≥ ≠ ≈ ∝ ∈ ∉ ⊂ ⊃ ∪ ∩
- Arrows: → ← ⇌ ↔ ⇒ ⇐
- Subscripts: ₀₁₂₃₄₅₆₇₈₉ₐₑₒₓ
- Superscripts: ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ
- Chemical formulas: H₂O, H₂SO₄, NaOH, CO₂, K₂Cr₂O₇
- Fractions: ½ ⅓ ¼ ⅔ ¾ or use a/b format
- Do NOT skip or simplify any equation. Reproduce exactly.
- For complex equations, maintain proper structure with parentheses and operators.

═══════════════════════════════════════════════════════════════════════════════
TABLE HANDLING (HIGHEST PRIORITY — HYBRID APPROACH)
═══════════════════════════════════════════════════════════════════════════════

STEP 0 — TABLE CONFIDENCE ASSESSMENT:
Before attempting table reconstruction, assess your confidence:
- HIGH confidence (>80%): Clear grid lines, simple structure, no merged cells → Reconstruct as text
- MEDIUM confidence (50-80%): Some merged cells, clear structure → Reconstruct using grid format
- LOW confidence (<50%): Complex merges, nested tables, unclear boundaries, handwritten tables → Use [TABLE_IMAGE] tag

STEP 1 — STRUCTURE ANALYSIS (do this BEFORE writing any table output):
- Count the EXACT number of visible rows and columns in the image.
- Identify ALL merged cells: which cells span multiple columns (colspan) or rows (rowspan).
- Identify multi-level headers (e.g., a top header spanning sub-headers below it).
- Build a mental GRID where each cell has coordinates (row, col).

STEP 2 — DECISION:
IF confidence is HIGH or MEDIUM:
  Output the table inside [TABLE] and [/TABLE] tags using text reconstruction.

  For SIMPLE tables (no merged cells), use standard markdown:
    [TABLE]
    | Col1 | Col2 | Col3 |
    |------|------|------|
    | val  | val  | val  |
    [/TABLE]

  For tables with merged cells, use the grid format:
    [TABLE grid=true]
    [ROW]
    [CELL colspan=3][BOLD]Main Heading[/BOLD][/CELL]
    [/ROW]
    [ROW]
    [CELL]Sub A[/CELL]
    [CELL colspan=2]Sub B[/CELL]
    [/ROW]
    [/TABLE]

IF confidence is LOW:
  Use [TABLE_IMAGE] tag to tell the renderer to embed the original image:
    [TABLE_IMAGE]
    Description of the table content for accessibility
    [/TABLE_IMAGE]
  This ensures the table is preserved as a clean image rather than broken text.

RULES for grid format:
- Each [ROW]...[/ROW] is one visual row.
- Each [CELL]...[/CELL] is one cell. Add colspan=N or rowspan=N attributes when needed.
- When a cell is covered by a rowspan from above, do NOT add an extra [CELL].
- Maintain the EXACT number of logical columns across all rows.
- Use [BOLD] inside [CELL] for header cells.

STEP 3 — VALIDATION (for text-reconstructed tables only):
- Verify every row has the correct number of logical columns (accounting for spans).
- Verify no cell content is missing or truncated.
- If validation fails → switch to [TABLE_IMAGE] instead.

CRITICAL TABLE RULES:
- NEVER output a broken or misaligned table. Use [TABLE_IMAGE] if uncertain.
- Do NOT simplify tables into plain text.
- Do NOT skip any column, row, or merged header.
- Fit table proportionally — maintain balanced column widths.

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

═══════════════════════════════════════════════════════════════════════════════
SAME-LINE MIXED ALIGNMENT
═══════════════════════════════════════════════════════════════════════════════
If left and right text are on the SAME line:
  Time: 3 Hours[RIGHT]Max. Marks: 75[/RIGHT]
Do NOT split them into separate lines.

═══════════════════════════════════════════════════════════════════════════════
CHARACTER PRECISION
═══════════════════════════════════════════════════════════════════════════════
- Distinguish carefully: 1/I/l, 0/O, 5/S, 8/B, rn/m, cl/d
- Preserve EXACT capitalization as in original
- Keep original punctuation (periods, commas, colons) exactly
- Numbers must be exact — verify each digit
- Keep exact numbering format: Q.1, 1., (a), (i), i), I., etc.

═══════════════════════════════════════════════════════════════════════════════
UNCLEAR TEXT
═══════════════════════════════════════════════════════════════════════════════
- Hindi unclear: [अपठनीय]
- English unclear: [unclear]
- NEVER guess or output garbage characters

═══════════════════════════════════════════════════════════════════════════════
DIAGRAM / GRAPH / NON-TEXT CONTENT (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════
If the image contains diagrams, flowcharts, graphs, drawings, figures, or any non-text visual content:
- Do NOT attempt OCR on these regions.
- Wrap them with [DIAGRAM] and [/DIAGRAM] tags.
- Inside the tags, write a brief description of what the diagram shows.
- Example:
  [DIAGRAM]
  Flow chart showing process steps from Start to End with decision nodes
  [/DIAGRAM]
- This tells the renderer to embed the original image instead of garbled text.
- If the ENTIRE page is a diagram with no text, output:
  [DIAGRAM]
  Full page diagram
  [/DIAGRAM]

═══════════════════════════════════════════════════════════════════════════════
PARAGRAPH STRUCTURE (IMPORTANT FOR FULL-WIDTH LAYOUT)
═══════════════════════════════════════════════════════════════════════════════
- For running text paragraphs, output the ENTIRE paragraph on a SINGLE LINE.
- Do NOT break paragraphs into short lines matching the original image width.
- Only use line breaks for:
  - New paragraphs (separated by blank lines in original)
  - Headings, list items, or numbered questions
  - Table content
  - Structural elements
- This ensures text fills the full page width in the PDF.

STRICT RULES:
- No missing content.
- No broken formatting.
- No overlapping text.
- No incomplete tables.
- No incorrect symbols.
- No corrupted or unreadable language output.

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
