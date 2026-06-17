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

async function post(path, body, env) {
  return worker.fetch(new Request('https://worker.test' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://www.arcanaguide.com' },
    body: JSON.stringify(body)
  }), env);
}

const originalFetch = globalThis.fetch;

try {
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
          product_id: 'prod_123'
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const env = { GUMROAD_PRODUCT_ID: 'prod_123', ARCANA_LICENSES: kv };
    const response = await post('/api/activate', { licenseKey: 'TEST-LICENSE-123' }, env);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.isPremium, true);
    assert.equal(data.source, 'gumroad');
    assert.match(gumroadBody, /product_id=prod_123/);
    assert.match(gumroadBody, /license_key=TEST-LICENSE-123/);
    assert.match(gumroadBody, /increment_uses_count=false/);
    assert.equal(kv.data.size, 1);
  }

  {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const env = { GUMROAD_PRODUCT_ID: 'prod_123', ARCANA_LICENSES: createKv() };
    const response = await post('/api/activate', { licenseKey: 'BAD-LICENSE' }, env);
    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.isPremium, false);
  }

  {
    let gumroadBody = '';
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://api.gumroad.com/v2/licenses/verify');
      gumroadBody = init.body.toString();
      return new Response(JSON.stringify({
        success: true,
        purchase: {
          id: 'sale_default',
          email: 'buyer@example.com',
          refunded: false,
          chargebacked: false,
          product_id: 'HOp54WHc-rZtK8nTrqtFcg=='
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const response = await post('/api/activate', { licenseKey: 'TEST-LICENSE-123' }, { ARCANA_LICENSES: createKv() });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.isPremium, true);
    assert.match(gumroadBody, /product_id=HOp54WHc-rZtK8nTrqtFcg%3D%3D/);
  }

  {
    const kv = createKv();
    const response = await worker.fetch(new Request('https://worker.test/api/gumroad/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        sale_id: 'sale_123',
        license_key: 'TEST-LICENSE-123',
        email: 'buyer@example.com'
      }).toString()
    }), { ARCANA_LICENSES: kv });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(kv.data.size, 2);
  }

  {
    const response = await worker.fetch(new Request('https://worker.test/api/gumroad/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        seller_id: 'not-the-arcana-seller',
        sale_id: 'sale_wrong'
      }).toString()
    }), { ARCANA_LICENSES: createKv() });
    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.ok, false);
    assert.match(data.error, /seller/);
  }
} finally {
  globalThis.fetch = originalFetch;
}

console.log('worker activation regression passed');
