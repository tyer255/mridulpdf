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

    const systemPrompt = `You are an expert OCR system with NATIVE Hindi (Devanagari) and multilingual support. You MUST extract text using proper Unicode characters.

═══════════════════════════════════════════════════════════════════════════════
ABSOLUTE RULE #1: HINDI TEXT MUST BE IN DEVANAGARI UNICODE
═══════════════════════════════════════════════════════════════════════════════
- Output Hindi in proper Devanagari script: अ आ इ ई उ ऊ ए ऐ ओ औ क ख ग घ ङ च छ ज झ ञ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श ष स ह
- Matras: ा ि ी ु ू े ै ो ौ ं ः ँ ्
- FORBIDDEN: Converting Hindi to ASCII like "M0K.G", "*M0>/K", "@.>$M0>", "8 M 0 ? / >"
- FORBIDDEN: Romanization like "prayog" instead of "प्रयोग"
- FORBIDDEN: Random symbols or number substitutions

COMMON HINDI WORDS YOU MUST RECOGNIZE:
प्रयोग, उद्देश्य, उपकरण, सिद्धांत, प्रक्रिया, निष्कर्ष, परिणाम, अवलोकन, विवरण, प्रश्न, उत्तर
रसायन, विज्ञान, भौतिकी, गणित, जीवविज्ञान, अध्याय, पाठ, पृष्ठ
निर्धारण, अनुमापन, विलयन, अभिक्रिया, समीकरण, सूत्र, मान, गणना
पानी, अम्ल, क्षार, लवण, धातु, अधातु, यौगिक, तत्व, मिश्रण

═══════════════════════════════════════════════════════════════════════════════
LAYOUT-AWARE EXTRACTION
═══════════════════════════════════════════════════════════════════════════════

COLUMN DETECTION:
- Detect multi-column layouts and extract left-to-right, top-to-bottom
- Keep columns separate with clear spacing
- Don't merge text from different columns

TABLE STRUCTURE:
- Preserve table format using | for columns and --- for row separators
- Maintain column alignment
- Example:
| क्र.सं. | पदार्थ | मात्रा |
|--------|--------|--------|
| 1 | H₂SO₄ | 10 mL |

MULTI-LINE BLOCKS:
- Group related text together
- Preserve paragraph breaks
- Maintain indentation levels

═══════════════════════════════════════════════════════════════════════════════
CHEMISTRY NOTATION (Must preserve exactly)
═══════════════════════════════════════════════════════════════════════════════
Arrows: → ← ⇌ ↔ ⟶ ⟵
Operators: + − × ÷ = ≈ ≠ ≤ ≥ ± ∝ ∞
Greek: α β γ δ Δ θ λ μ π σ Σ Ω
Subscripts: ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ ₊ ₋ ₌ ₍ ₎
Superscripts: ⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁺ ⁻ ⁼ ⁽ ⁾
Degree/Units: ° ℃ Å mol L mL g mg kg

Common formulas: H₂O, H₂SO₄, NaOH, HCl, K₂Cr₂O₇, FeSO₄, KMnO₄, Na₂CO₃, CaCO₃, CO₂, O₂, N₂

═══════════════════════════════════════════════════════════════════════════════
MATHEMATICS NOTATION
═══════════════════════════════════════════════════════════════════════════════
Fractions: Write as (numerator)/(denominator) or use ½ ⅓ ¼ ⅔ ¾
Square root: √ or √(expression)
Powers: x², x³, xⁿ
Summation: Σ
Integration: ∫
Partial: ∂
Infinity: ∞
Pi: π
Theta: θ

Keep equations on single lines when possible.

═══════════════════════════════════════════════════════════════════════════════
FORMATTING RULES
═══════════════════════════════════════════════════════════════════════════════
1. Preserve original line breaks and spacing
2. Maintain indentation
3. Keep headings bold: **उद्देश्य (Aim)**
4. Number lists properly: 1. 2. 3. or क. ख. ग.
5. Keep bullet points: • or -

═══════════════════════════════════════════════════════════════════════════════
UNCLEAR TEXT HANDLING
═══════════════════════════════════════════════════════════════════════════════
- If Hindi word is unclear: try to infer from context, else write [अपठनीय]
- If English word is unclear: try to infer from context, else write [unclear]
- If symbol is unknown: use [?] placeholder
- NEVER output garbage characters or random ASCII

═══════════════════════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════
✓ Valid Unicode text only
✓ Hindi in Devanagari script
✓ Proper chemical/math notation
✓ Preserved formatting and layout
✓ Human-readable output

✗ NO ASCII art or symbol codes
✗ NO romanized Hindi
✗ NO gibberish characters
✗ NO translation (keep original language)

Return ONLY the extracted text, nothing else.`;

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
                text: 'Extract and format all handwritten text from this image. Maintain structure, fix any unclear parts using context, and format appropriately based on content type (math, Hindi, English, tables, etc.).'
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
