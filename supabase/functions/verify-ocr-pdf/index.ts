import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigins = [
  'https://mridulpdf.lovable.app',
  'https://id-preview--7f8e89ff-e9ec-4537-b519-88a84e118974.lovable.app',
  'https://7f8e89ff-e9ec-4537-b519-88a84e118974.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && allowedOrigins.some(a => origin.startsWith(a.replace(/\/$/, '')));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-guest-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const MAX_PAGE_LEN = 8000;
const MAX_PAGES = 50;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.pages)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pages: string[] = body.pages
      .slice(0, MAX_PAGES)
      .map((p: unknown) => (typeof p === 'string' ? p.slice(0, MAX_PAGE_LEN) : ''))
      .filter((p: string) => p.length > 0);

    if (pages.length === 0) {
      return new Response(JSON.stringify({
        perfect: false,
        score: 0,
        message: 'No text extracted from any page.',
        issues: ['Extracted text is empty.'],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

    const pagesBlock = pages.map((p, i) => `===== PAGE ${i + 1} =====\n${p}`).join('\n\n');

    const systemPrompt = `You are a strict PDF quality reviewer for an OCR app. The user has scanned pages; you receive the extracted text per page (with layout tags like [H1], [TABLE_IMAGE], [DIAGRAM], [SPACE]).

Check each page for problems:
1. Garbled / unknown / unreadable characters or random symbols that don't belong (e.g. "□□", "###", "अपठनीय" markers, mojibake).
2. Half-empty pages where a paragraph ends abruptly and continues on the next page (broken flow).
3. Pages that look mostly blank (very little text while neighboring pages have lots).
4. Pages where content is clearly cut off at the bottom or jumps mid-sentence to next page.
5. Wrong page order (next page starts in the middle of a sentence from previous).
6. Heavy OCR noise: too many [अपठनीय], "???", repeated unknown chars.

Treat tagged tables / diagrams ([TABLE_IMAGE], [DIAGRAM]) as valid content, NOT as missing text.

Respond ONLY with valid JSON (no markdown, no commentary):
{
  "perfect": boolean,        // true ONLY if every page is clean and readable
  "score": number,           // 0-100 overall quality
  "message": string,         // one short sentence in the same language as the document (Hindi if document is Hindi, else English)
  "issues": [                // empty array if perfect
    { "page": number, "type": "garbled" | "half_empty" | "split_content" | "blank" | "cutoff" | "other", "detail": string }
  ]
}

Be strict: only return perfect=true if the document truly looks clean and ready to publish.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Review these OCR pages and return the JSON verdict.\n\n${pagesBlock}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { perfect: false, score: 0, message: 'Could not parse AI response', issues: [] };
    }

    return new Response(JSON.stringify({
      perfect: !!parsed.perfect,
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      message: typeof parsed.message === 'string' ? parsed.message : '',
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('verify-ocr-pdf error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});