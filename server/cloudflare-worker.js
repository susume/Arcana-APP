const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
const RETRYABLE_GEMINI_STATUSES = [429, 500, 502, 503, 504];
const MAX_MODEL_ATTEMPTS = 2;
const GUMROAD_LICENSE_VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';
const ARCANA_GUMROAD_PRODUCT_ID = 'HOp54WHc-rZtK8nTrqtFcg==';
const ARCANA_GUMROAD_SELLER_ID = 'dNW90VHgyFlXSIHD7Xr6Sw==';

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

async function parseBody(request) {
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) return request.json();
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(await request.formData());
  }
  return {};
}

function normalizeLicenseKey(key) {
  return String(key || '').trim();
}

async function licenseHash(key) {
  const bytes = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function purchaseIsValid(purchase) {
  return !!purchase && !purchase.refunded && !purchase.chargebacked && !purchase.disputed && !purchase.cancelled;
}

async function handleActivate(request, env, origin) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
  const gumroadProductId = env.GUMROAD_PRODUCT_ID || ARCANA_GUMROAD_PRODUCT_ID;
  if (!gumroadProductId) return json({ error: 'GUMROAD_PRODUCT_ID is not configured.' }, 500, origin);

  const body = await parseBody(request).catch(() => null);
  if (!body) return json({ error: 'Invalid request body.' }, 400, origin);

  const licenseKey = normalizeLicenseKey(body.licenseKey || body.license_key);
  if (!licenseKey) return json({ error: 'Enter your Gumroad license key.' }, 400, origin);

  const form = new URLSearchParams();
  form.set('product_id', gumroadProductId);
  form.set('license_key', licenseKey);
  form.set('increment_uses_count', 'false');

  const gumroadResponse = await fetch(GUMROAD_LICENSE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form
  });
  const gumroad = await gumroadResponse.json().catch(() => ({}));
  const purchase = gumroad.purchase || {};

  if (!gumroad.success || !purchaseIsValid(purchase)) {
    return json({ isPremium: false, error: 'That Gumroad license key was not recognized.' }, 403, origin);
  }

  const activatedAt = new Date().toISOString();
  const record = {
    source: 'gumroad',
    activatedAt,
    purchaseId: purchase.id || '',
    email: purchase.email || '',
    productId: purchase.product_id || gumroadProductId,
    refunded: !!purchase.refunded,
    chargebacked: !!purchase.chargebacked
  };

  if (env.ARCANA_LICENSES) {
    await env.ARCANA_LICENSES.put(`license:${await licenseHash(licenseKey)}`, JSON.stringify(record));
  }

  return json({ isPremium: true, source: 'gumroad', activatedAt }, 200, origin);
}

async function handleGumroadWebhook(request, env, origin) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
  const payload = await parseBody(request).catch(() => ({}));
  const expectedSellerId = env.GUMROAD_SELLER_ID || ARCANA_GUMROAD_SELLER_ID;
  const sellerId = String(payload.seller_id || payload.sellerId || '');
  if (sellerId && expectedSellerId && sellerId !== expectedSellerId) {
    return json({ ok: false, error: 'Gumroad seller id did not match Arcana.' }, 403, origin);
  }
  const saleId = String(payload.sale_id || payload.id || Date.now());
  const licenseKey = normalizeLicenseKey(payload.license_key || payload.licenseKey);
  const receivedAt = new Date().toISOString();

  if (env.ARCANA_LICENSES) {
    await env.ARCANA_LICENSES.put(`event:gumroad:${saleId}:${receivedAt}`, JSON.stringify({ receivedAt, payload }));
    if (licenseKey) {
      await env.ARCANA_LICENSES.put(`license:${await licenseHash(licenseKey)}`, JSON.stringify({
        source: 'gumroad-webhook',
        receivedAt,
        saleId,
        email: payload.email || '',
        refunded: payload.refunded === 'true' || payload.refunded === true
      }));
    }
  }

  return json({ ok: true }, 200, origin);
}

async function handleAiProxy(request, env, origin) {
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

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) });

    const url = new URL(request.url);
    if (url.pathname === '/api/activate') return handleActivate(request, env, origin);
    if (url.pathname === '/api/gumroad/webhook') return handleGumroadWebhook(request, env, origin);

    return handleAiProxy(request, env, origin);
  }
};
