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
- Accurately detect and reproduce ALL mathematical symbols and expressions using
  REAL UNICODE characters — never raw LaTeX commands like \\frac, \\sqrt, \\alpha, ^{}, _{}.
- Symbols: α β γ δ Δ θ λ μ π σ Σ Ω ∫ ∑ √ ∞ ± ≤ ≥ ≠ ≈ ∝ ∈ ∉ ⊂ ⊃ ∪ ∩
- Arrows: → ← ⇌ ↔ ⇒ ⇐
- Subscripts: ₀₁₂₃₄₅₆₇₈₉ₐₑₒₓ — use these for chemical/physics subscripts.
- Superscripts: ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ — use these for powers/exponents.
- Chemical formulas: H₂O, H₂SO₄, NaOH, CO₂, K₂Cr₂O₇
- Fractions: prefer ½ ⅓ ¼ ⅔ ¾ when matching, otherwise write a/b on one line.
- Display equations (the ones that sit on their OWN line in the original) MUST be
  output on their OWN line, prefixed with the [MATH] tag, e.g.
    [MATH] F = m × a
    [MATH] यांत्रिक लाभ (M.A.) = W / P
- Inline math inside a sentence stays inline — no [MATH] tag for those.
- Do NOT skip, simplify, romanize, or "approximate" any equation.
- If a symbol is unclear, output [unclear] — never guess wrong characters.

═══════════════════════════════════════════════════════════════════════════════
LISTS, BULLETS & NUMBERED ITEMS (CRITICAL — DO NOT MERGE)
═══════════════════════════════════════════════════════════════════════════════
Numbered lists ("1.", "2.", "3.", "1)", "(i)", "(ii)", "क)", "१.", "२.") and
bulleted lines (•, –, —, *, ●, ○, ▪) MUST each go on their OWN line.
- NEVER merge multiple numbered points into one paragraph, even if they look short.
- This applies to sections like Method / Procedure / Steps / Precautions / Observations
  / प्रक्रिया / सावधानियाँ / विधि / उद्देश्य.
- A line that BEGINS with a number-and-dot (e.g. "1.", "2.", "10."), a number-and-paren
  ("1)", "2)"), a roman numeral in parens ("(i)", "(ii)"), a Devanagari numeral
  ("१.", "२."), or a bullet glyph IS a list item — keep it on its own line.
- A multi-line list item should be joined into ONE line per item (wrap text from the
  same item together), but DIFFERENT items always stay on separate lines.
- Preserve the original numbering exactly — never renumber or skip.

═══════════════════════════════════════════════════════════════════════════════
TABLE HANDLING — STRICT HYBRID MODE (HIGHEST PRIORITY)
═══════════════════════════════════════════════════════════════════════════════

DEFAULT BEHAVIOR: USE [TABLE_IMAGE] FOR ALL TABLES.
Use STRUCTURE-BASED detection (not just fixed limits). Reconstruct as text ONLY if ALL true:
  1. Truly simple grid: visible regular grid lines, no merged cells, no multi-level headers
  2. Every cell text is SHORT (≤ 15 chars) and SINGLE-LINE
  3. Uniform alignment in every column (no mixed left/right/center)
  4. No long-text columns (no addresses, descriptions, paragraphs)
  5. Confidence ≥ 95% on every cell value

If ANY of these is uncertain → USE [TABLE_IMAGE] immediately.

COORDINATE OUTPUT (CRITICAL — required for image cropping):
You MUST output the bounding box of the table region as NORMALIZED coordinates
(values between 0 and 1, relative to the full image: x = left/width, y = top/height,
 w = box_width/width, h = box_height/height). Use 3 decimal places.

FOR SIMPLE TABLES (all 5 conditions met):
  [TABLE]
  | Col1 | Col2 | Col3 |
  |------|------|------|
  | val  | val  | val  |
  [/TABLE]

FOR ALL OTHER TABLES (DEFAULT):
  [TABLE_IMAGE x=0.05 y=0.32 w=0.90 h=0.28]
  Brief description of the table for accessibility
  [/TABLE_IMAGE]

CRITICAL TABLE RULES:
- When in doubt, ALWAYS use [TABLE_IMAGE]. Never guess.
- A broken text table is WORSE than an image table.
- Handwritten tables → ALWAYS [TABLE_IMAGE]
- Tables with Hindi text → ALWAYS [TABLE_IMAGE]
- Tables with merged cells → ALWAYS [TABLE_IMAGE]
- Tables with multi-line cells (e.g., address columns) → ALWAYS [TABLE_IMAGE]
- Tables with mixed alignment within a column → ALWAYS [TABLE_IMAGE]
- Coordinates MUST tightly fit the table (include borders, exclude surrounding text/margins).
- Do NOT mix table cell text with surrounding paragraph text — the cropped region replaces it.

BOUNDING BOX ACCURACY (CRITICAL — most common failure):
- The bbox MUST include EVERY column from the leftmost border to the rightmost border.
  Look carefully — small narrow columns at the left (e.g. "क्र.सं", "S.No", "#") and
  at the right (e.g. "Avg", "औसत", "Remarks") are OFTEN missed. Include them.
- The bbox MUST include the FULL header row(s) at the top, including any multi-level
  headers, AND any sub-header rows directly below.
- Add a small safety margin of ~0.01 (1% of image) on each side so no border line is clipped.
- Verify mentally: if you cropped the image at (x, y, x+w, y+h), would EVERY cell of the
  table — including the first/last columns and the topmost header — be fully visible?
  If not, EXPAND the bbox before outputting it.
- Prefer slightly LARGER over slightly smaller. Clipping a column is a critical failure.

PAGE BOUNDARIES (avoid duplicate content):
- Each input image is ONE page. Extract ONLY content that visually belongs to THIS page.
- If the image shows a sliver of the previous page at the top (e.g. a footer like
  "Page 1 of 2", a chapter title, or the bottom of a previous figure), DO NOT extract
  that sliver. Skip it entirely and start with this page's actual content.
- Never repeat content that obviously belongs to a different page.

═══════════════════════════════════════════════════════════════════════════════
DIAGRAM / GRAPH / NON-TEXT CONTENT (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════
If the image contains diagrams, flowcharts, graphs, drawings, figures, chemical structures, circuits, maps, or any non-text visual content:
- Do NOT attempt OCR on these regions.
- Wrap them with [DIAGRAM x=.. y=.. w=.. h=..] and [/DIAGRAM] tags using NORMALIZED bbox
  coordinates (0–1, 3 decimal places) that TIGHTLY enclose the diagram (no extra margin,
  no clipping).
- Inside the tags, write a brief description.
- Example:
  [DIAGRAM x=0.10 y=0.45 w=0.80 h=0.30]
  Flow chart showing process steps from Start to End with decision nodes
  [/DIAGRAM]
- If the ENTIRE page is a diagram with no text, output:
  [DIAGRAM x=0.000 y=0.000 w=1.000 h=1.000]
  Full page diagram/figure
  [/DIAGRAM]

═══════════════════════════════════════════════════════════════════════════════
LAYOUT TAGS
═══════════════════════════════════════════════════════════════════════════════

ALIGNMENT:
  [CENTER]text[/CENTER] — centered text
  [RIGHT]text[/RIGHT] — right-aligned text
  No tag = left-aligned (default)

FONT HIERARCHY:
  [H1]text[/H1] — Largest heading
  [H2]text[/H2] — Section heading
  [H3]text[/H3] — Sub-heading
  [BOLD]text[/BOLD] — Bold inline text
  [SMALL]text[/SMALL] — Fine print, footer text

STRUCTURE:
  [LINE] — Horizontal separator (only where one EXISTS in original)
  [SPACE] — Blank line gap (only where one EXISTS in original)
  [INDENT]text[/INDENT] — Indented text

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
PARAGRAPH STRUCTURE (IMPORTANT FOR FULL-WIDTH LAYOUT)
═══════════════════════════════════════════════════════════════════════════════
- For running text paragraphs, output the ENTIRE paragraph on a SINGLE LINE.
- Do NOT break paragraphs into short lines matching the original image width.
- Only use line breaks for:
  - New paragraphs (separated by blank lines in original)
  - Headings (H1/H2/H3)
  - List items, bullets, numbered points (each on its OWN line — see LIST rules above)
  - Display math equations ([MATH] lines)
  - Table/diagram markers
  - Structural elements
- This ensures text fills the full page width in the PDF.
- Preserve vertical spacing: where the original has a clear blank line between
  paragraphs/sections, output a [SPACE] tag on its own line. Do NOT omit section breaks.

═══════════════════════════════════════════════════════════════════════════════
CHARACTER PRECISION
═══════════════════════════════════════════════════════════════════════════════
- Distinguish carefully: 1/I/l, 0/O, 5/S, 8/B, rn/m, cl/d
- Preserve EXACT capitalization as in original
- Keep original punctuation exactly
- Numbers must be exact — verify each digit

═══════════════════════════════════════════════════════════════════════════════
UNCLEAR TEXT
═══════════════════════════════════════════════════════════════════════════════
- Hindi unclear: [अपठनीय]
- English unclear: [unclear]
- NEVER guess or output garbage characters

STRICT RULES:
- No missing content. No broken formatting. No overlapping text.
- No incomplete or broken tables — use [TABLE_IMAGE] instead.
- No incorrect symbols. No corrupted language output.
- Accuracy is MORE important than speed.

Return ONLY the formatted text with layout tags, nothing else.`;

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
