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

const MAX_PAGE_LEN = 10000;
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
      .map((p: unknown) => (typeof p === 'string' ? p.slice(0, MAX_PAGE_LEN) : ''));

    const issues = Array.isArray(body.issues) ? body.issues : [];

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

    const pagesBlock = pages.map((p, i) => `===== PAGE ${i + 1} =====\n${p}`).join('\n\n');
    const issuesBlock = issues.length
      ? issues.map((i: any) => `- Page ${i?.page ?? '?'} [${i?.type ?? 'other'}]: ${i?.detail ?? ''}`).join('\n')
      : '(none listed — auto-detect and fix)';

    const systemPrompt = `You are an expert document quality CORRECTOR for an OCR PDF app. You receive extracted text per page with layout tags ([H1], [H2], [H3], [SPACE], [MATH], [RIGHT]...[/RIGHT], [TABLE_IMAGE x= y= w= h=]...[/TABLE_IMAGE], [DIAGRAM x= y= w= h=]...[/DIAGRAM]).

Fix EVERY auto-fixable issue without inventing new content:
- Re-join sentences split incorrectly across lines/pages; keep numbered list items on their own line.
- Fix list numbering gaps caused by OCR (1, 2, 4 -> 1, 2, 3, 4) ONLY when clearly an OCR mistake.
- Separate two questions that were merged into one line.
- Clean garbage characters, stray symbols, mojibake, repeated unknowns; replace truly unreadable spots with [अपठनीय] (Hindi doc) or [unreadable] (English doc).
- Repair obvious math: missing =, +, -, ×, ÷, mismatched brackets, broken fractions, lost exponents — but ONLY when the correction is unambiguous from context. Never guess answers.
- Restore [H1]/[H2]/[H3] tags where headings clearly exist; collapse runs of [SPACE].
- Keep [TABLE_IMAGE ...] and [DIAGRAM ...] blocks exactly as-is, including their coordinates and three-line structure. Never OCR text inside them.
- Preserve language: keep Hindi as clean Devanagari, English as English. Never romanize Hindi.
- Do NOT merge pages. Return the same number of pages in the same order.

If a page is genuinely blank/unreadable/cut-off and CANNOT be reconstructed from text alone, leave its text mostly intact and set "rescan_required": true for that page.

Respond ONLY with valid JSON (no markdown):
{
  "pages": [ { "page": number, "text": string, "rescan_required": boolean } ],
  "summary": string,           // one short sentence in the document's language
  "unfixable_pages": [ number ] // page numbers that need a rescan
}`;

    const userPrompt = `Detected issues:\n${issuesBlock}\n\nDocument pages:\n\n${pagesBlock}\n\nReturn the corrected pages as JSON.`;

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
          { role: 'user', content: userPrompt },
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
      parsed = m ? JSON.parse(m[0]) : null;
    }

    if (!parsed || !Array.isArray(parsed.pages)) {
      return new Response(JSON.stringify({ error: 'Could not parse fixed output' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize: preserve original page count/order
    const fixed: { page: number; text: string; rescan_required: boolean }[] = pages.map((orig, idx) => {
      const match = parsed.pages.find((p: any) => Number(p?.page) === idx + 1) || parsed.pages[idx];
      return {
        page: idx + 1,
        text: typeof match?.text === 'string' && match.text.trim().length > 0 ? match.text : orig,
        rescan_required: !!match?.rescan_required,
      };
    });

    return new Response(JSON.stringify({
      pages: fixed,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      unfixable_pages: Array.isArray(parsed.unfixable_pages) ? parsed.unfixable_pages : fixed.filter(p => p.rescan_required).map(p => p.page),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('fix-ocr-pdf error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});