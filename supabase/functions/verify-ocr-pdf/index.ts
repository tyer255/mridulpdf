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

    const systemPrompt = `You are a strict, meticulous PDF quality reviewer for an OCR app. You receive extracted text per page (with layout tags like [H1], [TABLE_IMAGE], [DIAGRAM], [SPACE], [MATH], [RIGHT]).

Review EVERY page in fine detail. Check ALL of the following:
1. Garbled / unknown / unreadable characters, mojibake, random symbols (□□, ###, repeated ??? , broken unicode).
2. Half-empty pages where a paragraph ends abruptly and clearly continues on the next page (broken flow).
3. Pages that look mostly blank while neighbouring pages are full.
4. Content cut off at the bottom, or a sentence that jumps mid-word/mid-sentence to the next page.
5. Wrong page order (next page starts in the middle of a previous sentence).
6. Heavy OCR noise: too many [अपठनीय], "???", repeated unknown chars.
7. MATH & NUMBERS: equations missing operators (=, +, -, ×, ÷), broken fractions, wrong digits, exponents/subscripts lost, mismatched brackets, formula split across lines incorrectly, [MATH] blocks that look incomplete.
8. QUESTIONS / NUMBERED LISTS: numbering gaps (1, 2, 4 with 3 missing), two questions merged into one line, sub-parts (a), (b), (i), (ii) merged or out of order, a question without its answer choices when choices clearly belong to it.
9. TABLES: any plain-text table that should have been a [TABLE_IMAGE] block but is rendered as broken text, table rows missing cells, headers separated from body, [TABLE_IMAGE] tag without coordinates.
10. DIAGRAMS / FIGURES: [DIAGRAM] tag missing coordinates, diagram description leaked outside the tag, figure caption attached to the wrong paragraph.
11. HEADINGS & STRUCTURE: heading text wrongly merged into paragraph, missing [H1]/[H2] where the source clearly had a heading, extra blank [SPACE] runs.
12. LANGUAGE INTEGRITY: Hindi accidentally romanized, English words inserted into Hindi mid-sentence, punctuation duplicated or missing.

Tagged [TABLE_IMAGE] and [DIAGRAM] with valid coordinates count as valid content — do NOT flag them as missing text.

For every problem, also decide if it is auto-fixable by re-formatting the existing text (without re-scanning the image): fixing list numbering, re-joining split sentences, separating merged questions, cleaning stray symbols, fixing obvious typos in math operators, restoring [H1]/[SPACE] tags, etc. Missing visual content (blank pages, cut-off image regions, unreadable handwriting) is NOT auto-fixable.

Respond ONLY with valid JSON (no markdown, no commentary):
{
  "perfect": boolean,          // true ONLY if every page is clean and publication ready
  "score": number,             // 0-100 overall quality
  "fixable": boolean,          // true if ALL detected issues can be auto-fixed from existing text
  "message": string,           // one short sentence in the same language as the document (Hindi if document is Hindi, else English)
  "issues": [                  // empty array if perfect
    {
      "page": number,
      "type": "garbled" | "half_empty" | "split_content" | "blank" | "cutoff" | "math" | "numbering" | "table" | "diagram" | "heading" | "language" | "other",
      "detail": string,
      "fixable": boolean
    }
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

    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    const fixable = typeof parsed.fixable === 'boolean'
      ? parsed.fixable
      : (issues.length > 0 && issues.every((i: any) => i?.fixable !== false));

    return new Response(JSON.stringify({
      perfect: !!parsed.perfect,
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      fixable,
      message: typeof parsed.message === 'string' ? parsed.message : '',
      issues,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('verify-ocr-pdf error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});