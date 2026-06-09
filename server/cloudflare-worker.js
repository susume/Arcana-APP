const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
const RETRYABLE_GEMINI_STATUSES = [429, 500, 502, 503, 504];
const MAX_MODEL_ATTEMPTS = 2;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function json(data, status = 200, origin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin)
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retryDelayMs(status, attempt, responseText) {
  const retryDelay = String(responseText || '').match(/retryDelay.*?(\d+)s?/);
  if (retryDelay) return Math.min((Number(retryDelay[1]) + 1) * 1000, 8000);
  if (status === 429) return 1200 * (attempt + 1);
  return 700 * (attempt + 1);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
    if (!env.GOOGLE_API_KEY) return json({ error: 'GOOGLE_API_KEY is not configured on the proxy.' }, 500, origin);

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return json({ error: 'Invalid JSON body.' }, 400, origin);
    }

    const prompt = String(payload.prompt || '').trim();
    if (!prompt) return json({ error: 'Missing prompt.' }, 400, origin);

    const parts = [{ text: prompt }];
    if (payload.imageData) {
      const imageData = String(payload.imageData);
      const base64 = imageData.split(',')[1];
      const mime = imageData.split(';')[0].split(':')[1];
      if (base64 && mime) parts.push({ inline_data: { mime_type: mime, data: base64 } });
    }

    const body = JSON.stringify({ contents: [{ parts }] });
    const failures = [];
    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GOOGLE_API_KEY}`;
      for (let attempt = 0; attempt < MAX_MODEL_ATTEMPTS; attempt++) {
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        const text = await resp.text();
        if (resp.ok) {
          const data = JSON.parse(text);
          return json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.', model }, 200, origin);
        }

        failures.push({ model, status: resp.status });
        if (resp.status === 400) break;
        if (!RETRYABLE_GEMINI_STATUSES.includes(resp.status)) {
          return json({ error: `Gemini API error ${resp.status}` }, resp.status, origin);
        }
        if (attempt < MAX_MODEL_ATTEMPTS - 1) await sleep(retryDelayMs(resp.status, attempt, text));
      }
    }

    return json({ error: 'Gemini is temporarily busy. Please try again in a moment.', failures }, 503, origin);
  }
};
