// Four Fits — Cloudflare Worker AI proxy
//
// Holds the Anthropic API key as a Worker secret, takes the system+user prompts
// from the browser, calls Claude, returns the JSON analysis.
//
// Deploy:
//   wrangler login
//   wrangler secret put ANTHROPIC_API_KEY     # paste your sk-ant-... key
//   wrangler deploy
//
// Then set the resulting Worker URL as the value of <meta name="four-fits-api">
// in index.html (e.g. https://four-fits-api.<your-subdomain>.workers.dev).

const ALLOWED_ORIGINS = [
  'https://dpowert2.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

const MODEL = 'claude-sonnet-4-5-20250929'; // current Sonnet — swap if needed
const MAX_TOKENS = 4000;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
      });
    }

    // Origin gate — only allow requests from the deployed site or localhost
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
      });
    }

    if (!env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
      });
    }

    const { system, user } = body || {};
    if (!system || !user) {
      return new Response(JSON.stringify({ error: 'Missing system or user prompt' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
      });
    }

    // Cap input size to prevent abuse
    if (system.length + user.length > 30000) {
      return new Response(JSON.stringify({ error: 'Prompt too long' }), {
        status: 413,
        headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
      });
    }

    try {
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });

      const data = await upstream.json();

      if (!upstream.ok) {
        return new Response(JSON.stringify({
          error: 'Upstream error',
          detail: data,
        }), {
          status: 502,
          headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
        });
      }

      const text = (data.content && data.content[0] && data.content[0].text) || '';

      return new Response(JSON.stringify({ text }), {
        status: 200,
        headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({
        error: 'Request failed',
        detail: err && err.message ? err.message : String(err),
      }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
      });
    }
  },
};
