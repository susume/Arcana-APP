const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
const RETRYABLE_GEMINI_STATUSES = [429, 500, 502, 503, 504];
const MAX_MODEL_ATTEMPTS = 2;
const MAX_AI_BODY_BYTES = 5_500_000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_PROMPT_CHARS = 16_000;
const MAX_ACTIVATE_BODY_BYTES = 32 * 1024;
const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;
const AI_UPSTREAM_TIMEOUT_MS = 20_000;
const GUMROAD_UPSTREAM_TIMEOUT_MS = 12_000;
const GUMROAD_LICENSE_VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';
const ARCANA_GUMROAD_PRODUCT_ID = 'HOp54WHc-rZtK8nTrqtFcg==';
const ARCANA_GUMROAD_SELLER_ID = 'dNW90VHgyFlXSIHD7Xr6Sw==';
const DEFAULT_ALLOWED_ORIGINS = ['https://www.arcanaguide.com', 'https://arcanaguide.com'];
const localRateBuckets = new Map();

function allowedOrigins(env) {
  const configured = String(env.ARCANA_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function isAllowedOrigin(origin, env) {
  return !origin || allowedOrigins(env).has(origin);
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Arcana-Webhook-Secret',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin'
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(data, status = 200, origin = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin)
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retryDelayMs(status, attempt, responseText) {
  const retryDelay = String(responseText || '').match(/retryDelay[^\d]*(\d+)s?/i);
  if (retryDelay) return Math.min((Number(retryDelay[1]) + 1) * 1000, 4000);
  if (status === 429) return 700 * (attempt + 1);
  return 450 * (attempt + 1);
}

function bodyError(message) {
  const error = new Error(message);
  error.code = message;
  return error;
}

async function parseBody(request, maxBytes) {
  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > maxBytes) throw bodyError('BODY_TOO_LARGE');

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw bodyError('BODY_TOO_LARGE');
  const text = new TextDecoder().decode(bytes);
  const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
  if (contentType.includes('application/json')) return JSON.parse(text);
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  return {};
}

function normalizeLicenseKey(key) {
  return String(key || '').trim().toUpperCase().replace(/\s+/g, '');
}

async function licenseHash(key) {
  const bytes = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function asBool(value) {
  return value === true || String(value || '').trim().toLowerCase() === 'true' || String(value || '').trim() === '1';
}

function purchaseIsValid(purchase) {
  return !!purchase && !asBool(purchase.refunded) && !asBool(purchase.chargebacked) && !asBool(purchase.disputed) && !asBool(purchase.cancelled);
}

function constantTimeEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlText(text) {
  return base64Url(new TextEncoder().encode(text));
}

async function signEntitlement(payload, secret) {
  const encodedPayload = base64UrlText(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return `v1.${encodedPayload}.${base64Url(new Uint8Array(signature))}`;
}

async function fetchWithTimeout(resource, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function clientKey(request, route) {
  const address = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'anonymous';
  return `${route}:${address.split(',')[0].trim()}`;
}

async function isRateLimited(request, env, route, limit, windowMs) {
  const key = clientKey(request, route);
  if (env.ARCANA_RATE_LIMITER && typeof env.ARCANA_RATE_LIMITER.limit === 'function') {
    try {
      const result = await env.ARCANA_RATE_LIMITER.limit({ key });
      return result && result.success === false;
    } catch {
      // Fall back to a best-effort isolate-local limiter if the binding is unavailable.
    }
  }
  const now = Date.now();
  const current = localRateBuckets.get(key);
  if (!current || current.expiresAt <= now) {
    localRateBuckets.set(key, { count: 1, expiresAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

function parseImageData(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;
  const base64 = match[2];
  const decodedBytes = Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  if (!decodedBytes || decodedBytes > MAX_IMAGE_BYTES) return null;
  return { mime: match[1].toLowerCase(), base64 };
}

async function handleActivate(request, env, origin) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
  if (await isRateLimited(request, env, 'activate', 5, 10 * 60 * 1000)) return json({ error: 'Too many activation attempts. Please try again later.' }, 429, origin);
  const productId = env.GUMROAD_PRODUCT_ID || ARCANA_GUMROAD_PRODUCT_ID;
  const sellerId = env.GUMROAD_SELLER_ID || ARCANA_GUMROAD_SELLER_ID;
  if (!productId || !env.ARCANA_ENTITLEMENT_SECRET) return json({ error: 'Activation service is not configured.' }, 503, origin);

  let body;
  try {
    body = await parseBody(request, MAX_ACTIVATE_BODY_BYTES);
  } catch (error) {
    return json({ error: error.code === 'BODY_TOO_LARGE' ? 'Request is too large.' : 'Invalid request body.' }, error.code === 'BODY_TOO_LARGE' ? 413 : 400, origin);
  }

  const licenseKey = normalizeLicenseKey(body && (body.licenseKey || body.license_key));
  if (!licenseKey || licenseKey.length > 256) return json({ error: 'Enter a valid Gumroad license key.' }, 400, origin);

  const form = new URLSearchParams();
  form.set('product_id', productId);
  form.set('license_key', licenseKey);
  form.set('increment_uses_count', 'false');

  let gumroadResponse;
  try {
    gumroadResponse = await fetchWithTimeout(GUMROAD_LICENSE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    }, GUMROAD_UPSTREAM_TIMEOUT_MS);
  } catch {
    return json({ error: 'Activation service is temporarily unavailable.' }, 502, origin);
  }

  const gumroad = await gumroadResponse.json().catch(() => ({}));
  const purchase = gumroad.purchase || {};
  const productMatches = String(purchase.product_id || '') === String(productId);
  const sellerMatches = !!purchase.seller_id && String(purchase.seller_id) === String(sellerId);
  if (!gumroad.success || !productMatches || !sellerMatches || !purchaseIsValid(purchase)) {
    return json({ isPremium: false, error: 'That Gumroad license key was not recognized.' }, 403, origin);
  }

  const activatedAt = new Date().toISOString();
  const licenseIdentifier = await licenseHash(licenseKey);
  const record = {
    source: 'gumroad',
    activatedAt,
    purchaseId: String(purchase.id || ''),
    productId: String(productId),
    licenseHash: licenseIdentifier,
    active: true
  };
  if (env.ARCANA_LICENSES) {
    await env.ARCANA_LICENSES.put(`license:${licenseIdentifier}`, JSON.stringify(record));
  }

  const entitlementToken = await signEntitlement({
    tier: 'premium',
    productId: String(productId),
    purchaseId: String(purchase.id || ''),
    licenseHash: licenseIdentifier,
    issuedAt: activatedAt
  }, env.ARCANA_ENTITLEMENT_SECRET);
  return json({ isPremium: true, source: 'gumroad', activatedAt, entitlementToken }, 200, origin);
}

async function handleGumroadWebhook(request, env, origin) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
  if (await isRateLimited(request, env, 'gumroad-webhook', 30, 60 * 1000)) return json({ error: 'Too many webhook attempts.' }, 429, origin);
  if (!env.GUMROAD_WEBHOOK_SECRET || !env.ARCANA_LICENSES) return json({ ok: false, error: 'Webhook service is not configured.' }, 503, origin);

  const url = new URL(request.url);
  const suppliedSecret = request.headers.get('X-Arcana-Webhook-Secret') || url.searchParams.get('token') || '';
  if (!constantTimeEqual(suppliedSecret, env.GUMROAD_WEBHOOK_SECRET)) return json({ ok: false, error: 'Webhook authentication failed.' }, 401, origin);

  let payload;
  try {
    payload = await parseBody(request, MAX_WEBHOOK_BODY_BYTES);
  } catch (error) {
    return json({ ok: false, error: error.code === 'BODY_TOO_LARGE' ? 'Webhook body is too large.' : 'Malformed webhook body.' }, error.code === 'BODY_TOO_LARGE' ? 413 : 400, origin);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return json({ ok: false, error: 'Malformed webhook body.' }, 400, origin);

  const expectedProductId = String(env.GUMROAD_PRODUCT_ID || ARCANA_GUMROAD_PRODUCT_ID);
  const expectedSellerId = String(env.GUMROAD_SELLER_ID || ARCANA_GUMROAD_SELLER_ID);
  const sellerId = String(payload.seller_id || payload.sellerId || '');
  const productId = String(payload.product_id || payload.productId || '');
  if (!sellerId || sellerId !== expectedSellerId) return json({ ok: false, error: 'Gumroad seller validation failed.' }, 403, origin);
  if (!productId || productId !== expectedProductId) return json({ ok: false, error: 'Gumroad product validation failed.' }, 403, origin);

  const saleId = String(payload.sale_id || payload.saleId || payload.id || '').trim();
  const licenseKey = normalizeLicenseKey(payload.license_key || payload.licenseKey);
  if (!saleId || !licenseKey || licenseKey.length > 256) return json({ ok: false, error: 'Malformed webhook body.' }, 400, origin);
  const active = purchaseIsValid(payload);
  const eventType = active ? 'purchase' : 'revocation';
  const eventId = String(payload.event_id || payload.webhook_id || payload.id || `${saleId}:${eventType}`).trim();
  const eventKey = `event:gumroad:${eventId}:${eventType}`;
  const existing = await env.ARCANA_LICENSES.get(eventKey);
  if (existing) return json({ ok: true, duplicate: true }, 200, origin);

  const receivedAt = new Date().toISOString();
  const identifier = await licenseHash(licenseKey);
  const eventRecord = {
    receivedAt,
    saleId,
    productId,
    sellerId,
    licenseHash: identifier,
    active,
    event: eventType
  };
  await env.ARCANA_LICENSES.put(eventKey, JSON.stringify(eventRecord));
  await env.ARCANA_LICENSES.put(`license:${identifier}`, JSON.stringify({
    source: 'gumroad-webhook',
    receivedAt,
    saleId,
    productId,
    licenseHash: identifier,
    active
  }));
  return json({ ok: true }, 200, origin);
}

async function handleAiProxy(request, env, origin) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
  if (await isRateLimited(request, env, 'ai', 20, 60 * 1000)) return json({ error: 'Too many AI requests. Please try again later.' }, 429, origin);
  if (!env.GOOGLE_API_KEY) return json({ error: 'AI service is not configured.' }, 503, origin);

  let payload;
  try {
    payload = await parseBody(request, MAX_AI_BODY_BYTES);
  } catch (error) {
    return json({ error: error.code === 'BODY_TOO_LARGE' ? 'AI request is too large.' : 'Invalid JSON body.' }, error.code === 'BODY_TOO_LARGE' ? 413 : 400, origin);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return json({ error: 'Invalid JSON body.' }, 400, origin);

  const prompt = String(payload.prompt || '').trim();
  if (!prompt) return json({ error: 'Missing prompt.' }, 400, origin);
  if (prompt.length > MAX_PROMPT_CHARS) return json({ error: 'Prompt is too long.' }, 413, origin);

  const parts = [{ text: prompt }];
  if (payload.imageData) {
    const image = parseImageData(payload.imageData);
    if (!image) return json({ error: 'Image must be a valid JPEG, PNG, or WebP under 4 MB.' }, 400, origin);
    parts.push({ inline_data: { mime_type: image.mime, data: image.base64 } });
  }

  const body = JSON.stringify({ contents: [{ parts }] });
  for (const model of GEMINI_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GOOGLE_API_KEY)}`;
    for (let attempt = 0; attempt < MAX_MODEL_ATTEMPTS; attempt += 1) {
      let response;
      try {
        response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        }, AI_UPSTREAM_TIMEOUT_MS);
      } catch {
        response = null;
      }
      if (response && response.ok) {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          return json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.' }, 200, origin);
        } catch {
          return json({ error: 'AI returned an invalid response.' }, 502, origin);
        }
      }
      const status = response ? response.status : 503;
      const upstreamText = response ? await response.text().catch(() => '') : '';
      if (status === 400) break;
      if (!RETRYABLE_GEMINI_STATUSES.includes(status)) break;
      if (attempt < MAX_MODEL_ATTEMPTS - 1) await sleep(retryDelayMs(status, attempt, upstreamText));
    }
  }
  return json({ error: 'Arcana AI is temporarily unavailable. Please try again or use Classic Reading.' }, 503, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (!isAllowedOrigin(origin, env)) return json({ error: 'Origin not allowed.' }, 403, null);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    const url = new URL(request.url);
    if (url.pathname === '/api/activate') return handleActivate(request, env, origin);
    if (url.pathname === '/api/gumroad/webhook') return handleGumroadWebhook(request, env, origin);
    if (url.pathname === '/' || url.pathname === '/api/ai') return handleAiProxy(request, env, origin);
    return json({ error: 'Not found.' }, 404, origin);
  }
};
