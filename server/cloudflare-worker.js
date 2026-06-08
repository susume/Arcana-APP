const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];

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
    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GOOGLE_API_KEY}`;
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const text = await resp.text();
      if (resp.ok) {
        const data = JSON.parse(text);
        return json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.', model }, 200, origin);
      }
      if (![400, 429].includes(resp.status)) return json({ error: `Gemini API error ${resp.status}` }, resp.status, origin);
    }

    return json({ error: 'All Gemini models failed or were rate limited.' }, 503, origin);
  }
};
