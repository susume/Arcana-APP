const MAX_AI_BODY_BYTES = 5_500_000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_PROMPT_CHARS = 16_000;
const HOSTED_AI_LIMIT = 30;
const HOSTED_TOKEN_SECONDS = 15 * 60;
const AI_OPERATIONS = new Set(['interpret', 'identify', 'compare']);
const FLASH_LITE = 'gemini-3.1-flash-lite';
const FLASH = 'gemini-3.6-flash';
const MAX_ACTIVATE_BODY_BYTES = 32 * 1024;
const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;
const AI_UPSTREAM_TIMEOUT_MS = 20_000;
const GUMROAD_UPSTREAM_TIMEOUT_MS = 12_000;
const GUMROAD_LICENSE_VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';
const PLAY_PACKAGE = 'com.arcanaguide.app';
const PLAY_PRODUCT = 'arcana_premium_lifetime';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PLAY_API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PACKAGE}`;
const PLAY_TIMEOUT_MS = 8_000;
const REPORT_REASONS = new Set(['unsafe', 'offensive', 'misleading', 'other']);
const ARCANA_GUMROAD_PRODUCT_ID = 'HOp54WHc-rZtK8nTrqtFcg==';
const ARCANA_GUMROAD_SELLER_ID = 'dNW90VHgyFlXSIHD7Xr6Sw==';
// Approved founder entitlement; only the digest belongs in server code.
const ARCANA_FOUNDER_LICENSE_HASH = '64fe0c8a6456a665f33b31bb1df11a29b244a4c3d9dc4875590fa1dcb90c81ee';
const DEFAULT_ALLOWED_ORIGINS = ['https://www.arcanaguide.com', 'https://arcanaguide.com'];
const ANDROID_TEST_ACCESS = { label: 'tester', prefix: 'ARCANA-TEST-', secret: 'ARCANA_ANDROID_TESTER_CODE_HASH', source: 'android-tester', passField: 'testerPass' };
const ANDROID_REVIEW_ACCESS = { label: 'review', prefix: 'ARCANA-REVIEW-', secret: 'ARCANA_ANDROID_REVIEW_CODE_HASH', source: 'android-review', passField: 'reviewPass' };
const localRateBuckets = new Map();
let playAuthorization;

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
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Arcana-Webhook-Secret',
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

function decodeBase64Url(value) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), character => character.charCodeAt(0));
}

async function readSignedEntitlement(token, secret) {
  if (!secret || typeof token !== 'string' || token.length > 2048) return null;
  const match = /^v1\.([\w-]+)\.([\w-]+)$/.exec(token);
  if (!match) return null;
  const [, encoded, signature] = match;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, decodeBase64Url(signature), new TextEncoder().encode(encoded));
    return valid ? JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) : null;
  } catch {
    return null;
  }
}

async function hostedSession(env, subject, purchasedAt, unlimited = false) {
  const start = Date.parse(subject.startsWith('play:') ? env.ARCANA_PLAY_AI_PLAN_START : env.ARCANA_AI_PLAN_START);
  const purchased = Date.parse(purchasedAt);
  const legacy = unlimited || !Number.isFinite(start) || (Number.isFinite(purchased) && purchased < start);
  const expiresAt = Math.floor(Date.now() / 1000) + HOSTED_TOKEN_SECONDS;
  const limit = legacy ? null : HOSTED_AI_LIMIT;
  const aiToken = await signEntitlement({ scope: 'hosted-ai', sub: subject, exp: expiresAt, limit }, env.ARCANA_ENTITLEMENT_SECRET);
  return { aiToken, aiTokenExpiresAt: expiresAt, aiMonthlyLimit: limit };
}

async function handleHostedSession(request, env, origin) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);
  if (await isRateLimited(request, env, 'ai-session', 30, 60_000)) return json({ error: 'Too many session requests.' }, 429, origin);
  if (!env.ARCANA_LICENSES || !env.ARCANA_ENTITLEMENT_SECRET) return json({ error: 'Premium verification is unavailable.' }, 503, origin);
  const body = await parseBody(request, 4096).catch(() => null);
  const receipt = await readSignedEntitlement(body?.entitlementToken, env.ARCANA_ENTITLEMENT_SECRET);
  const productId = String(env.GUMROAD_PRODUCT_ID || ARCANA_GUMROAD_PRODUCT_ID);
  if (receipt?.tier !== 'premium' || receipt.productId !== productId || !/^[a-f0-9]{64}$/.test(receipt.licenseHash || '')) {
    return json({ error: 'Activate Premium to use hosted AI.' }, 401, origin);
  }
  if (receipt.source === 'founder') {
    const founderHash = String(env.ARCANA_FOUNDER_LICENSE_HASH ?? ARCANA_FOUNDER_LICENSE_HASH).trim().toLowerCase();
    if (!constantTimeEqual(receipt.licenseHash, founderHash)) return json({ error: 'Premium activation is no longer valid.' }, 403, origin);
    return json(await hostedSession(env, `founder:${receipt.licenseHash}`, null, true), 200, origin);
  }
  const license = await env.ARCANA_LICENSES.get(`license:${receipt.licenseHash}`, 'json');
  if (!license) {
    return json({ error: 'Re-enter your original activation key once in Settings → Premium Access.', code: 'reactivation_required' }, 409, origin);
  }
  if (license.active !== true || license.productId !== productId) {
    return json({ error: 'This Premium license is no longer active.' }, 403, origin);
  }
  return json(await hostedSession(env, `gumroad:${receipt.licenseHash}`, license.purchasedAt || receipt.purchasedAt || receipt.issuedAt), 200, origin);
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

async function createPlayAccessToken(secret) {
  const { client_email: issuer, private_key: pem } = JSON.parse(secret);
  if (!issuer || !pem) throw new Error('Google Play service account is incomplete.');
  const keyBytes = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, '')), char => char.charCodeAt(0));
  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
  const key = await crypto.subtle.importKey('pkcs8', keyBytes, algorithm, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: issuer, aud: GOOGLE_TOKEN_URL, iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/androidpublisher'
  };
  const message = `${base64UrlText('{"alg":"RS256","typ":"JWT"}')}.${base64UrlText(JSON.stringify(claims))}`;
  const signature = await crypto.subtle.sign(algorithm, key, new TextEncoder().encode(message));
  const response = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${message}.${base64Url(new Uint8Array(signature))}`
    })
  }, PLAY_TIMEOUT_MS);
  if (!response.ok) throw new Error('Google Play authentication failed.');
  const token = await response.json();
  if (!token.access_token || !Number.isFinite(token.expires_in)) throw new Error('Invalid Google OAuth response.');
  return token;
}

async function playAccessToken(secret) {
  if (playAuthorization?.secret === secret && playAuthorization.expiresAt > Date.now()) {
    return (await playAuthorization.token).access_token;
  }
  const authorization = {
    secret,
    expiresAt: Date.now() + PLAY_TIMEOUT_MS,
    token: createPlayAccessToken(secret)
  };
  playAuthorization = authorization;
  try {
    const token = await authorization.token;
    authorization.expiresAt = Date.now() + Math.max(0, token.expires_in - 60) * 1000;
    return token.access_token;
  } catch (error) {
    if (playAuthorization === authorization) playAuthorization = undefined;
    throw error;
  }
}

async function handlePlay(request, env, origin, verify) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);
  if (await isRateLimited(request, env, verify ? 'play-verify' : 'play-status', 20, 60_000)) {
    return json({ error: 'Too many requests. Try again shortly.' }, 429, origin);
  }
  if (!env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || !env.ARCANA_ENTITLEMENT_SECRET) {
    return json({ error: 'Google Play purchase verification is unavailable.' }, 503, origin);
  }

  let purchaseToken;
  if (verify) {
    const body = await parseBody(request, 8_192).catch(() => null);
    purchaseToken = body?.purchaseToken;
    if (typeof purchaseToken !== 'string' || !/^[A-Za-z0-9._~+=/-]{10,4096}$/.test(purchaseToken)) {
      return json({ error: 'A valid Google Play purchase token is required.' }, 400, origin);
    }
  }

  try {
    const accessToken = await playAccessToken(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
    if (!verify) return json({ ready: true }, 200, origin);

    const headers = { Authorization: `Bearer ${accessToken}` };
    const encodedToken = encodeURIComponent(purchaseToken);
    const verifyUrl = `${PLAY_API}/purchases/productsv2/tokens/${encodedToken}`;
    const response = await fetchWithTimeout(verifyUrl, { headers }, PLAY_TIMEOUT_MS);
    if (response.status === 404 || response.status === 410) return json({ status: 'inactive' }, 200, origin);
    if (!response.ok) throw new Error('Google Play verification failed.');
    const purchase = await response.json();
    const items = purchase.productLineItem;
    const item = Array.isArray(items) && items.length === 1 ? items[0] : null;
    const offer = item?.productOfferDetails;
    const state = purchase.purchaseStateContext?.purchaseState;
    if (item?.productId !== PLAY_PRODUCT || offer?.rentOfferDetails || state === 'CANCELLED') {
      return json({ status: 'inactive' }, 200, origin);
    }
    if (state === 'PENDING') return json({ status: 'pending' }, 200, origin);
    if (state !== 'PURCHASED') throw new Error('Unknown Google Play purchase state.');
    if (offer?.refundableQuantity === 0 || offer?.consumptionState === 'CONSUMPTION_STATE_CONSUMED') {
      return json({ status: 'inactive' }, 200, origin);
    }

    const purchaseHash = await licenseHash(purchaseToken);
    const entitlementToken = await signEntitlement({
      source: 'google-play',
      tier: 'premium',
      productId: PLAY_PRODUCT,
      purchaseHash,
      iat: Math.floor(Date.now() / 1000)
    }, env.ARCANA_ENTITLEMENT_SECRET);
    if (purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
      const ackUrl = `${PLAY_API}/purchases/products/${PLAY_PRODUCT}/tokens/${encodedToken}:acknowledge`;
      const ack = await fetchWithTimeout(ackUrl, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}'
      }, PLAY_TIMEOUT_MS);
      if (!ack.ok) throw new Error('Google Play acknowledgement failed.');
    } else if (purchase.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
      throw new Error('Unknown Google Play acknowledgement state.');
    }
    const ai = await hostedSession(env, `play:${purchaseHash}`, purchase.purchaseCompletionTime);
    return json({ status: 'active', entitlementToken, ...ai }, 200, origin);
  } catch {
    return json({ error: 'Google Play purchase verification is unavailable. Please try again.' }, 503, origin);
  }
}

async function handleAndroidAccess(request, env, origin, access) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);
  const body = await parseBody(request, 2_048).catch(() => null);
  const code = typeof body?.code === 'string' ? normalizeLicenseKey(body.code) : '';
  const pass = typeof body?.[access.passField] === 'string' ? body[access.passField] : '';
  if ((!code && !pass) || (code && pass) || code.length > 128 || pass.length > 512) {
    return json({ error: `Enter a valid ${access.label} code.` }, 400, origin);
  }
  const action = `${access.source}-${code ? 'code' : 'restore'}`;
  if (await isRateLimited(request, env, action, code ? 15 : 60, 60_000)) {
    return json({ error: `Too many ${access.label} access attempts. Try again shortly.` }, 429, origin);
  }
  const unavailable = `Android ${access.label} access is unavailable.`;
  const codeHash = String(env[access.secret] || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(codeHash)) {
    return json({ error: unavailable }, pass ? 410 : 503, origin);
  }
  if (!env.ARCANA_ENTITLEMENT_SECRET) {
    return json({ error: unavailable }, 503, origin);
  }
  if (code && (!code.startsWith(access.prefix) || !constantTimeEqual(await licenseHash(code), codeHash))) {
    return json({ error: `That ${access.label} code was not recognized.` }, 403, origin);
  }

  // Each access type has its own signing scope, and rotating its code revokes its passes.
  const signingSecret = JSON.stringify([access.source, env.ARCANA_ENTITLEMENT_SECRET, codeHash]);
  const issuedPass = await signEntitlement({ source: access.source, packageName: PLAY_PACKAGE }, signingSecret);
  if (pass && !constantTimeEqual(pass, issuedPass)) {
    return json({ error: `This ${access.label} pass is no longer valid.` }, 403, origin);
  }
  const ai = await hostedSession(env, `${access.source}:${codeHash}`, null, true);
  return json({ active: true, [access.passField]: issuedPass, ...ai }, 200, origin);
}

async function handleReadingReport(request, env, origin) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);
  if (!env.ARCANA_REPORTS) return json({ error: 'Reading reports are temporarily unavailable.' }, 503, origin);
  if (await isRateLimited(request, env, 'reading-report', 5, 60_000)) {
    return json({ error: 'Too many reports. Please try again later.' }, 429, origin);
  }
  const body = await parseBody(request, 96_000).catch(() => null);
  if (!REPORT_REASONS.has(body?.reason) || typeof body?.reading !== 'string'
      || !body.reading.trim() || body.reading.length > 20_000) {
    return json({ error: 'Choose a reason and provide the reading text.' }, 400, origin);
  }
  try {
    const reportedAt = new Date().toISOString();
    await env.ARCANA_REPORTS.put(`reading:${reportedAt}:${crypto.randomUUID()}`, JSON.stringify({
      reason: body.reason, reading: body.reading, reportedAt
    }), { expirationTtl: 90 * 24 * 60 * 60 });
    return json({ received: true }, 201, origin);
  } catch {
    return json({ error: 'Reading reports are temporarily unavailable.' }, 503, origin);
  }
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
  if (!licenseKey || licenseKey.length > 256) return json({ error: 'Enter a valid activation key.' }, 400, origin);

  const licenseIdentifier = await licenseHash(licenseKey);
  const founderHash = String(env.ARCANA_FOUNDER_LICENSE_HASH ?? ARCANA_FOUNDER_LICENSE_HASH).trim().toLowerCase();
  if (/^[a-f0-9]{64}$/.test(founderHash) && constantTimeEqual(licenseIdentifier, founderHash)) {
    const activatedAt = new Date().toISOString();
    const record = { source: 'founder', activatedAt, licenseHash: licenseIdentifier, active: true };
    if (env.ARCANA_LICENSES) {
      await env.ARCANA_LICENSES.put(`license:${licenseIdentifier}`, JSON.stringify(record));
    }
    const entitlementToken = await signEntitlement({
      tier: 'premium', source: 'founder', productId: String(productId),
      licenseHash: licenseIdentifier, issuedAt: activatedAt
    }, env.ARCANA_ENTITLEMENT_SECRET);
    return json({ isPremium: true, source: 'founder', activatedAt, entitlementToken }, 200, origin);
  }
  // Keep Arcana-issued credentials on the Worker.
  if (licenseKey.startsWith('ARCANA-FOUNDER-') || licenseKey.startsWith('ARCANA-TEST-')) {
    return json({ isPremium: false, error: 'That activation key was not recognized.' }, 403, origin);
  }

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
    return json({ isPremium: false, error: 'That activation key was not recognized.' }, 403, origin);
  }

  const activatedAt = new Date().toISOString();
  const purchasedAt = String(purchase.sale_timestamp || purchase.created_at || '');
  const record = {
    source: 'gumroad',
    activatedAt,
    purchasedAt,
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
    source: 'gumroad',
    productId: String(productId),
    purchaseId: String(purchase.id || ''),
    licenseHash: licenseIdentifier,
    purchasedAt,
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
  const licenseKeyId = `license:${identifier}`;
  const priorLicense = await env.ARCANA_LICENSES.get(licenseKeyId, 'json');
  const eventRecord = {
    receivedAt,
    saleId,
    productId,
    sellerId,
    licenseHash: identifier,
    active,
    event: eventType
  };
  await env.ARCANA_LICENSES.put(licenseKeyId, JSON.stringify({
    source: 'gumroad-webhook',
    receivedAt,
    saleId,
    productId,
    purchasedAt: String(payload.sale_timestamp || payload.created_at || priorLicense?.purchasedAt || ''),
    licenseHash: identifier,
    active: active && priorLicense?.active !== false
  }));
  await env.ARCANA_LICENSES.put(eventKey, JSON.stringify(eventRecord));
  return json({ ok: true }, 200, origin);
}


function hostedModel(operation, cardCount) {
  const simple = operation === 'interpret' && cardCount <= 3;
  const model = simple ? FLASH_LITE : FLASH;
  const thinkingLevel = operation === 'interpret' && !simple ? 'LOW' : 'MINIMAL';
  const maxOutputTokens = operation === 'identify' ? 1152
    : operation === 'compare' ? 1024 : Math.min(4096, 800 + 140 * cardCount);
  const generationConfig = { maxOutputTokens, thinkingConfig: { thinkingLevel } };
  if (operation !== 'compare') generationConfig.responseMimeType = 'application/json';
  return { model, generationConfig };
}

function tokenRates(model, now) {
  // Nano-USD per token, including thinking at the output rate.
  if (model === FLASH_LITE) return [250, 1500];
  return now < Date.UTC(2027, 0, 1) ? [750, 3750] : [1500, 7500];
}

export class HostedUsage {
  constructor(state) {
    this.storage = state.storage;
  }

  async fetch(request) {
    const { action, subject, id, limit, reserve, budget, actual, expiresAt } = await request.json();
    if (action === 'reserve' && !await this.storage.getAlarm()) await this.storage.setAlarm(expiresAt);
    return this.storage.transaction(async tx => {
      const spent = await tx.get('spent') || 0;
      const requestKey = 'request:' + subject + ':' + id;
      const previous = await tx.get(requestKey);
      if (action === 'settle') {
        if (typeof previous === 'number') {
          await tx.put('spent', spent + actual - previous);
          await tx.put(requestKey, true);
        }
        return Response.json({ ok: true });
      }
      const usageKey = 'usage:' + subject;
      const used = limit === null ? 0 : (await tx.get(usageKey) || 0);
      const remaining = limit === null ? null : Math.max(0, limit - used);
      if (previous !== undefined) return Response.json({ code: 'duplicate', remaining }, { status: 409 });
      if (remaining === 0) return Response.json({ code: 'monthly_limit', remaining }, { status: 429 });
      if (spent + reserve > budget) return Response.json({ code: 'service_limit', remaining }, { status: 503 });
      await tx.put('spent', spent + reserve);
      await tx.put(requestKey, reserve);
      if (limit !== null) await tx.put(usageKey, used + 1);
      return Response.json({ remaining: remaining === null ? null : remaining - 1 });
    });
  }

  async alarm() {
    await this.storage.deleteAll();
  }
}

async function handleAiProxy(request, env, origin, legacyRoute) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);
  const token = request.headers.get('Authorization')?.match(/^Bearer (v1\.[\w.-]+)$/i)?.[1];
  const now = Date.now();
  const legacy = legacyRoute && !token && now < Date.parse(env.ARCANA_AI_LEGACY_UNTIL);
  const identity = legacy
    ? { sub: await licenseHash(clientKey(request, 'legacy-ai')), limit: 30 }
    : await readSignedEntitlement(token, env.ARCANA_ENTITLEMENT_SECRET);
  if (!identity || (!legacy && (identity.scope !== 'hosted-ai' || !Number.isSafeInteger(identity.exp) || identity.exp * 1000 <= now))) {
    return json({ error: 'Activate Premium with the current version of Arcana to use hosted AI.', code: 'premium_required' }, 401, origin);
  }
  if (await isRateLimited(request, env, 'ai', 20, 60_000)) return json({ error: 'Too many AI requests. Please try again later.' }, 429, origin);
  const budget = Math.round(Number(env.ARCANA_AI_MONTHLY_BUDGET_USD) * 1e9);
  if (!env.GOOGLE_API_KEY || !env.ARCANA_HOSTED_USAGE || !Number.isSafeInteger(budget) || budget <= 0) {
    return json({ error: 'Hosted AI is temporarily unavailable. You can use Classic Reading.' }, 503, origin);
  }

  let payload;
  try {
    payload = await parseBody(request, MAX_AI_BODY_BYTES);
  } catch (error) {
    return json({ error: error.code === 'BODY_TOO_LARGE' ? 'AI request is too large.' : 'Invalid JSON body.' }, error.code === 'BODY_TOO_LARGE' ? 413 : 400, origin);
  }
  const prompt = typeof payload?.prompt === 'string' ? payload.prompt.trim() : '';
  const operation = legacy ? (payload?.imageData ? 'identify' : 'interpret') : payload?.operation;
  const requestId = legacy ? crypto.randomUUID() : payload?.requestId;
  const cardCount = legacy ? 21 : payload?.cardCount;
  if (!prompt || !AI_OPERATIONS.has(operation) || typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(requestId)
    || (operation === 'interpret' && (!Number.isInteger(cardCount) || cardCount < 1 || cardCount > 21))) {
    return json({ error: 'Invalid AI operation.' }, 400, origin);
  }
  if (prompt.length > MAX_PROMPT_CHARS) return json({ error: 'Prompt is too long.' }, 413, origin);

  const parts = [{ text: prompt }];
  if (operation === 'identify') {
    const image = parseImageData(payload.imageData);
    if (!image) return json({ error: 'Image must be a valid JPEG, PNG, or WebP under 4 MB.' }, 400, origin);
    parts.push({ inline_data: { mime_type: image.mime, data: image.base64 } });
  } else if (payload.imageData) {
    return json({ error: 'Only card identification accepts photos.' }, 400, origin);
  }

  const { model, generationConfig } = hostedModel(operation, cardCount);
  if (legacy) delete generationConfig.responseMimeType;
  const [inputRate, outputRate] = tokenRates(model, now);
  const inputReserve = new TextEncoder().encode(prompt).length + 256 + (operation === 'identify' ? 16_384 : 0);
  const reserve = inputReserve * inputRate + generationConfig.maxOutputTokens * outputRate;
  const month = new Date(now).toISOString().slice(0, 7);
  const expiresAt = Date.UTC(Number(month.slice(0, 4)), Number(month.slice(-2)), 2);
  const meter = env.ARCANA_HOSTED_USAGE.get(env.ARCANA_HOSTED_USAGE.idFromName(month));
  const metering = { subject: identity.sub, id: requestId, limit: identity.limit, reserve, budget, expiresAt };
  const meterRequest = (action, extra) => meter.fetch(new Request('https://meter.internal/', {
    method: 'POST',
    body: JSON.stringify({ ...metering, action, ...extra })
  }));
  let admission;
  let allowance;
  try {
    admission = await meterRequest('reserve');
    allowance = await admission.json();
  } catch {
    return json({ error: 'Could not check your hosted AI allowance.' }, 503, origin);
  }
  if (!admission.ok) {
    const messages = {
      duplicate: 'This AI request has already been submitted.',
      monthly_limit: 'You have used this month’s hosted AI allowance. Classic readings and poster exports are still available.',
      service_limit: 'Hosted AI has reached its service budget. You can continue with Classic Reading.'
    };
    return json({ ...allowance, error: messages[allowance.code] || 'Hosted AI is unavailable.' }, admission.status, origin);
  }

  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GOOGLE_API_KEY },
      body: JSON.stringify({ contents: [{ parts }], generationConfig })
    }, AI_UPSTREAM_TIMEOUT_MS);
    const data = await response.json().catch(() => null);
    const usage = data?.usageMetadata;
    if (Number.isSafeInteger(usage?.promptTokenCount)) {
      const output = (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0);
      const actual = usage.promptTokenCount * inputRate + output * outputRate;
      console.info(JSON.stringify({
        event: 'arcana-hosted-ai', operation, model: data.modelVersion || model,
        inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount || 0,
        thinkingTokens: usage.thoughtsTokenCount || 0, attempts: 1,
        finishReason: data.candidates?.[0]?.finishReason
      }));
      await meterRequest('settle', { actual }).catch(() => {});
    }
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('');
    if (response.ok && text && candidate.finishReason !== 'MAX_TOKENS') {
      return json({ ...allowance, text }, 200, origin);
    }
  } catch {
    // Keep the reservation if the outcome is unknown and avoid a second paid attempt.
  }
  return json({ ...allowance, error: 'Arcana AI could not finish this request. You can continue with Classic Reading.' }, 503, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (!isAllowedOrigin(origin, env)) return json({ error: 'Origin not allowed.' }, 403, null);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    const url = new URL(request.url);
    if (url.pathname === '/api/activate') return handleActivate(request, env, origin);
    if (url.pathname === '/api/gumroad/webhook') return handleGumroadWebhook(request, env, origin);
    if (url.pathname === '/api/play/status') return handlePlay(request, env, origin, false);
    if (url.pathname === '/api/play/verify') return handlePlay(request, env, origin, true);
    if (url.pathname === '/api/android/tester') return handleAndroidAccess(request, env, origin, ANDROID_TEST_ACCESS);
    if (url.pathname === '/api/android/review') return handleAndroidAccess(request, env, origin, ANDROID_REVIEW_ACCESS);
    if (url.pathname === '/api/reading-report') return handleReadingReport(request, env, origin);
    if (url.pathname === '/api/ai/session') return handleHostedSession(request, env, origin);
    if (url.pathname === '/api/ai/v2') return handleAiProxy(request, env, origin, false);
    if (url.pathname === '/' || url.pathname === '/api/ai') return handleAiProxy(request, env, origin, true);
    return json({ error: 'Not found.' }, 404, origin);
  }
};
