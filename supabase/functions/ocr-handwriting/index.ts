import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an advanced OCR system specialized in handwriting recognition. Your task is to extract ALL text from the handwritten image with high accuracy.

CRITICAL RULES FOR HINDI TEXT:
- You MUST output Hindi text in proper Devanagari script (अ, आ, इ, ई, उ, ऊ, ए, ऐ, ओ, औ, क, ख, ग, घ, etc.)
- NEVER convert Hindi characters into symbols, numbers, ASCII codes, or mixed characters
- NEVER output gibberish like "M0K.G", "*M0>/K", "@.>$M0>", etc.
- If you see Hindi handwriting, output it as readable Hindi words like: "प्रयोग", "उद्देश्य", "उपकरण", "सिद्धांत", "प्रक्रिया"
- Do NOT romanize Hindi (don't write "prayog" instead of "प्रयोग")
- Do NOT translate Hindi to English
- If any word is unclear, write: [अपठनीय] instead of random characters
- Preserve original line breaks and spacing

FOR HINDI CONTENT:
- Output clean, readable Devanagari text exactly as written
- Keep technical terms, chemical formulas, and numbers as-is
- Preserve headings like "**उद्देश्य (Aim)**", "**उपकरण (Apparatus)**", "**सिद्धांत (Theory)**", "**प्रक्रिया (Procedure)**"

FOR ENGLISH TEXT:
- Convert to clean typed English
- Maintain sentence structure and punctuation

FOR MATHEMATICS/CHEMISTRY:
- Extract equations and formulas correctly
- Preserve chemical formulas like H₂SO₄, K₂Cr₂O₇, FAS, COD
- Keep subscripts and superscripts properly formatted

FOR MIXED CONTENT:
- When Hindi and English appear together, output BOTH correctly
- Example: "**उद्देश्य (Aim)**" or "COD का निर्धारण"

FOR TABLES:
- Detect rows and columns accurately
- Use | and - for table formatting

OUTPUT REQUIREMENTS:
- Output MUST be human-readable
- Hindi MUST be in Devanagari script
- NO gibberish, NO symbol codes, NO ASCII art
- Return ONLY the extracted and formatted text, nothing else.`;

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
      
      throw new Error('Failed to process image');
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ text: extractedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OCR Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
