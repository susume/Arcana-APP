import assert from 'node:assert/strict';
import worker, { HostedUsage } from '../server/cloudflare-worker.js';

const values = new Map();
const licenses = new Map();
let alarm;
let transaction = Promise.resolve();
const storage = {
  async get(key) { return values.get(key); },
  async put(key, value) { values.set(key, value); },
  async getAlarm() { return alarm; },
  async setAlarm(value) { alarm = value; },
  async deleteAll() { values.clear(); },
  transaction(callback) {
    const result = transaction.then(() => callback(this));
    transaction = result.catch(() => {});
    return result;
  }
};
const meter = new HostedUsage({ storage });
const env = {
  GOOGLE_API_KEY: 'test-only',
  ARCANA_ENTITLEMENT_SECRET: 'hosted-ai-test-secret',
  ARCANA_AI_PLAN_START: '2026-10-01T00:00:00Z',
  ARCANA_AI_MONTHLY_BUDGET_USD: '10',
  ARCANA_HOSTED_USAGE: { idFromName: month => month, get: () => meter },
  ARCANA_RATE_LIMITER: { limit: async () => ({ success: true }) },
  ARCANA_LICENSES: {
    async get(key, type) { return type === 'json' ? JSON.parse(licenses.get(key) || 'null') : licenses.get(key); },
    async put(key, value) { licenses.set(key, value); }
  },
  GUMROAD_PRODUCT_ID: 'test-product',
  GUMROAD_SELLER_ID: 'test-seller'
};

async function call(path, body, token, bindings = env) {
  const headers = { 'Content-Type': 'application/json', Origin: 'https://www.arcanaguide.com' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await worker.fetch(new Request(`https://arcana.test${path}`, {
    method: 'POST', headers, body: JSON.stringify(body)
  }), bindings);
  return { status: response.status, body: await response.json() };
}

const upstream = globalThis.fetch;
const info = console.info;
let calls = 0;
let requestBody;
const events = [];
try {
  console.info = entry => events.push(JSON.parse(entry));
  globalThis.fetch = async (url, init) => {
    if (url === 'https://api.gumroad.com/v2/licenses/verify') {
      const old = init.body.get('license_key') === 'TEST-LEGACY-PURCHASE';
      return Response.json({ success: true, purchase: {
        product_id: env.GUMROAD_PRODUCT_ID, seller_id: env.GUMROAD_SELLER_ID,
        sale_timestamp: old ? '2026-09-01T12:00:00Z' : '2026-10-15T12:00:00Z'
      } });
    }
    calls++;
    assert.match(url, /gemini-3\.1-flash-lite:generateContent$/);
    requestBody = JSON.parse(init.body);
    return Response.json({ candidates: [{ content: { parts: [{ text: '{}' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, thoughtsTokenCount: 8 } });
  };
  const request = () => ({ operation: 'interpret', cardCount: 1, requestId: crypto.randomUUID(), prompt: 'Private sample question' });
  assert.equal((await call('/api/ai/v2', request())).status, 401);
  assert.equal((await call('/api/ai', request())).status, 401);
  assert.equal((await call('/', request())).status, 401);
  assert.equal(calls, 0);

  const activate = async key => (await call('/api/activate', { licenseKey: key })).body.entitlementToken;
  const newReceipt = await activate('TEST-NEW-PURCHASE');
  const oldReceipt = await activate('TEST-LEGACY-PURCHASE');
  const session = async receipt => (await call('/api/ai/session', { entitlementToken: receipt })).body;
  const premium = await session(newReceipt);
  const grandfathered = await session(oldReceipt);
  assert.equal(premium.aiMonthlyLimit, 30);
  assert.equal(grandfathered.aiMonthlyLimit, null);
  assert.equal((await call('/api/ai/v2', request(), newReceipt)).status, 401);
  const [version, claims, signature] = premium.aiToken.split('.');
  const forgedClaims = JSON.parse(Buffer.from(claims, 'base64url'));
  forgedClaims.limit = null;
  const forged = [version, Buffer.from(JSON.stringify(forgedClaims)).toString('base64url'), signature].join('.');
  assert.equal((await call('/api/ai/v2', request(), forged)).status, 401);
  assert.equal((await call('/api/ai/v2', { ...request(), imageData: 'sample' }, premium.aiToken)).status, 400);

  const once = request();
  const parallel = await Promise.all([call('/api/ai/v2', once, premium.aiToken), call('/api/ai/v2', once, premium.aiToken)]);
  assert.deepEqual(parallel.map(result => result.status).sort(), [200, 409]);
  assert.equal(calls, 1);
  assert.equal(parallel.find(result => result.status === 200).body.remaining, 29);
  assert.equal(requestBody.generationConfig.thinkingConfig.thinkingLevel, 'MINIMAL');
  assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
  assert.equal(events[0].thinkingTokens, 8);
  assert.doesNotMatch(JSON.stringify(events), /Private sample question/);

  for (let i = 0; i < 29; i++) assert.equal((await call('/api/ai/v2', request(), premium.aiToken)).status, 200);
  const refreshed = await session(newReceipt);
  assert.equal((await call('/api/ai/v2', request(), refreshed.aiToken)).body.code, 'monthly_limit');
  assert.equal(calls, 30);
  assert.equal((await call('/api/ai/v2', request(), grandfathered.aiToken)).body.remaining, null);
  const capped = await call('/api/ai/v2', request(), grandfathered.aiToken, { ...env, ARCANA_AI_MONTHLY_BUDGET_USD: '0.000001' });
  assert.equal(capped.body.code, 'service_limit');
  assert.equal(calls, 31);

  const receipt = JSON.parse(Buffer.from(newReceipt.split('.')[1], 'base64url'));
  const licenseKey = `license:${receipt.licenseHash}`;
  licenses.set(licenseKey, JSON.stringify({ ...JSON.parse(licenses.get(licenseKey)), active: false }));
  assert.equal((await call('/api/ai/session', { entitlementToken: newReceipt })).status, 403);
} finally {
  globalThis.fetch = upstream;
  console.info = info;
}

console.log('hosted AI entitlement, metering, privacy, and deduplication regressions passed');
