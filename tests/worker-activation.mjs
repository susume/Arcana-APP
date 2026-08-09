import assert from 'node:assert/strict';
import worker from '../server/cloudflare-worker.js';

function createKv() {
  const data = new Map();
  return {
    data,
    async get(key) { return data.get(key) || null; },
    async put(key, value) { data.set(key, value); }
  };
}

const origin = 'https://www.arcanaguide.com';
const baseEnv = () => ({
  GUMROAD_PRODUCT_ID: 'prod_123',
  GUMROAD_SELLER_ID: 'seller_123',
  ARCANA_ENTITLEMENT_SECRET: 'test-entitlement-secret',
  GUMROAD_WEBHOOK_SECRET: 'test-webhook-secret'
});

async function request(path, { body, headers = {}, method = 'POST' } = {}, env = {}) {
  const mergedHeaders = { Origin: origin, ...headers };
  if (body && !mergedHeaders['Content-Type']) mergedHeaders['Content-Type'] = 'application/json';
  return worker.fetch(new Request(`https://worker.test${path}`, {
    method,
    headers: mergedHeaders,
    body: typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined
  }), env);
}

const originalFetch = globalThis.fetch;
try {
  {
    const response = await request('/api/unknown', { method: 'GET' }, baseEnv());
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  }

  {
    const response = await worker.fetch(new Request('https://worker.test/api/ai', {
      method: 'OPTIONS',
      headers: { Origin: origin }
    }), baseEnv());
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  }

  {
    const response = await worker.fetch(new Request('https://worker.test/api/ai', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example' }
    }), baseEnv());
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }

  {
    const kv = createKv();
    let gumroadBody = '';
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://api.gumroad.com/v2/licenses/verify');
      gumroadBody = init.body.toString();
      return new Response(JSON.stringify({
        success: true,
        purchase: {
          id: 'sale_123',
          email: 'buyer@example.com',
          refunded: false,
          chargebacked: false,
          seller_id: 'seller_123',
          product_id: 'prod_123'
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const env = { ...baseEnv(), ARCANA_LICENSES: kv };
    const response = await request('/api/activate', { body: { licenseKey: ' test-license-123 ' } }, env);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.isPremium, true);
    assert.equal(data.source, 'gumroad');
    assert.match(data.entitlementToken, /^v1\./);
    assert.match(gumroadBody, /product_id=prod_123/);
    assert.match(gumroadBody, /license_key=TEST-LICENSE-123/);
    assert.match(gumroadBody, /increment_uses_count=false/);
    assert.equal(kv.data.size, 1);
    const record = [...kv.data.values()].join('\n');
    assert.doesNotMatch(record, /TEST-LICENSE-123|buyer@example\.com/);
  }

  {
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true,
      purchase: { id: 'sale_wrong_product', seller_id: 'seller_123', product_id: 'other_product', refunded: false }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const response = await request('/api/activate', { body: { licenseKey: 'BAD-PRODUCT' } }, { ...baseEnv(), ARCANA_LICENSES: createKv() });
    const data = await response.json();
    assert.equal(response.status, 403);
    assert.equal(data.isPremium, false);
  }

  {
    const response = await request('/api/gumroad/webhook', {
      body: { seller_id: 'seller_123', product_id: 'prod_123', sale_id: 'sale_missing_auth', license_key: 'LICENSE' }
    }, { ...baseEnv(), ARCANA_LICENSES: createKv() });
    assert.equal(response.status, 401);
  }

  {
    const kv = createKv();
    const env = { ...baseEnv(), ARCANA_LICENSES: kv };
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Arcana-Webhook-Secret': 'test-webhook-secret' };
    const purchaseBody = new URLSearchParams({
      seller_id: 'seller_123', product_id: 'prod_123', sale_id: 'sale_webhook_123', license_key: 'WEBHOOK-LICENSE', email: 'buyer@example.com'
    }).toString();
    const first = await request('/api/gumroad/webhook', { headers, body: purchaseBody }, env);
    const firstData = await first.json();
    assert.equal(first.status, 200);
    assert.equal(firstData.ok, true);
    assert.equal(kv.data.size, 2);
    assert.doesNotMatch([...kv.data.values()].join('\n'), /WEBHOOK-LICENSE|buyer@example\.com/);

    const duplicate = await request('/api/gumroad/webhook', { headers, body: purchaseBody }, env);
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).duplicate, true);

    const refundBody = new URLSearchParams({
      seller_id: 'seller_123', product_id: 'prod_123', sale_id: 'sale_webhook_123', license_key: 'WEBHOOK-LICENSE', refunded: 'true'
    }).toString();
    const refund = await request('/api/gumroad/webhook', { headers, body: refundBody }, env);
    assert.equal(refund.status, 200);
    const licenseRecords = [...kv.data.entries()].filter(([key]) => key.startsWith('license:'));
    assert.equal(JSON.parse(licenseRecords[0][1]).active, false);
  }

  {
    const response = await request('/api/gumroad/webhook', {
      headers: { 'X-Arcana-Webhook-Secret': 'test-webhook-secret' },
      body: { seller_id: 'wrong', product_id: 'prod_123', sale_id: 'sale_wrong', license_key: 'LICENSE' }
    }, { ...baseEnv(), ARCANA_LICENSES: createKv() });
    assert.equal(response.status, 403);
  }
} finally {
  globalThis.fetch = originalFetch;
}

console.log('worker security regression passed');
