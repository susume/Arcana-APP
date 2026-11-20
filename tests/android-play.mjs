import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, verify } from 'node:crypto';
import worker from '../server/cloudflare-worker.js';

const appOrigin = 'https://www.arcanaguide.com';
const productId = 'arcana_premium_lifetime';
const packageName = 'com.arcanaguide.app';
const purchaseToken = 'test-purchase-token';
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});
const reports = [];
const env = {
  ARCANA_ENTITLEMENT_SECRET: 'local regression test only',
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: 'billing-test@example.invalid',
    private_key: privateKey
  }),
  ARCANA_REPORTS: { async put(...args) { reports.push(args); } }
};

let oauthRequests = 0;
let acknowledgements = 0;
let acknowledgementResponse = 503;
let googleHttpStatus = 200;
const purchase = {
  purchaseStateContext: { purchaseState: 'PURCHASED' },
  acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
  productLineItem: [{ productId, productOfferDetails: { refundableQuantity: 1 } }]
};

const actualFetch = globalThis.fetch;
globalThis.fetch = async (resource, options) => {
  const url = new URL(resource);
  if (url.href === 'https://oauth2.googleapis.com/token') {
    oauthRequests += 1;
    assert.equal(options.method, 'POST');
    const [header, claims, signature] = options.body.get('assertion').split('.');
    assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'RS256');
    assert.equal(JSON.parse(Buffer.from(claims, 'base64url')).aud, url.href);
    assert.ok(verify('RSA-SHA256', Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, 'base64url')));
    return Response.json({ access_token: 'test-access-token', expires_in: 3600 });
  }
  assert.equal(options.headers.Authorization, 'Bearer test-access-token');
  assert.equal(url.hostname, 'androidpublisher.googleapis.com');
  const root = `/androidpublisher/v3/applications/${packageName}/purchases/`;
  if (url.pathname === `${root}productsv2/tokens/${purchaseToken}`) {
    return Response.json(purchase, { status: googleHttpStatus });
  }
  assert.equal(url.pathname, `${root}products/${productId}/tokens/${purchaseToken}:acknowledge`);
  assert.equal(options.method, 'POST');
  acknowledgements += 1;
  if (acknowledgementResponse === 204) purchase.acknowledgementState = 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';
  return new Response(null, { status: acknowledgementResponse });
};

async function call(route, body, bindings = env) {
  const response = await worker.fetch(new Request(`https://arcana.example${route}`, {
    method: 'POST',
    headers: { Origin: appOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }), bindings);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), appOrigin);
  return { code: response.status, body: await response.json() };
}
const restore = () => call('/api/play/verify', { purchaseToken });

try {
  assert.equal((await call('/api/play/status', {}, {})).code, 503);
  assert.deepEqual(await call('/api/play/status', {}), { code: 200, body: { ready: true } });
  assert.equal((await call('/api/play/verify', { purchaseToken: 'invalid token' })).code, 400);
  purchase.purchaseStateContext.purchaseState = 'PENDING';
  assert.equal((await restore()).body.status, 'pending');
  purchase.purchaseStateContext.purchaseState = 'PURCHASED';
  purchase.productLineItem[0].productId = 'another-product';
  assert.equal((await restore()).body.status, 'inactive');
  assert.equal(acknowledgements, 0);
  purchase.productLineItem[0].productId = productId;
  assert.equal((await restore()).code, 503, 'An acknowledgement failure is retryable.');
  acknowledgementResponse = 204;
  const active = await restore();
  assert.equal(active.body.status, 'active');
  const metadata = JSON.parse(Buffer.from(active.body.entitlementToken.split('.')[1], 'base64url'));
  assert.equal(metadata.productId, productId);
  assert.equal(metadata.source, 'google-play');
  assert.equal(JSON.stringify(active.body).includes(purchaseToken), false);
  assert.equal((await restore()).body.status, 'active', 'A completed purchase restores on the next request.');
  assert.equal(acknowledgements, 2, 'A completed purchase is acknowledged only once after retries.');
  assert.equal(oauthRequests, 1, 'Requests reuse the service account access token.');
  purchase.productLineItem[0].productOfferDetails.refundableQuantity = 0;
  assert.equal((await restore()).body.status, 'inactive');
  purchase.productLineItem[0].productOfferDetails.refundableQuantity = 1;
  purchase.purchaseStateContext.purchaseState = 'CANCELLED';
  assert.equal((await restore()).body.status, 'inactive');
  googleHttpStatus = 404;
  assert.equal((await restore()).body.status, 'inactive');
  googleHttpStatus = 403;
  assert.equal((await restore()).code, 503, 'API access errors are distinct from lost ownership.');

  const testerCode = 'ARCANA-TEST-ABCDEF01-23456789-ABCDEF01-23456789';
  const testerHash = createHash('sha256').update(testerCode).digest('hex');
  const testerEnv = { ...env, ARCANA_ANDROID_TESTER_CODE_HASH: testerHash };
  const tester = (body, bindings = testerEnv) => call('/api/android/tester', body, bindings);
  assert.equal((await tester({ code: testerCode }, env)).code, 503);
  assert.equal((await tester({ code: 'ARCANA-TEST-WRONG' })).code, 403);
  assert.equal((await tester({ code: testerCode, testerPass: 'other' })).code, 400);
  const activation = await tester({ code: ' ' + testerCode.toLowerCase() + ' ' });
  assert.equal(activation.code, 200);
  assert.equal(activation.body.active, true);
  assert.match(activation.body.testerPass, /^v1\./);
  assert.doesNotMatch(JSON.stringify(activation.body), new RegExp(testerHash + '|' + testerCode));
  const pass = { testerPass: activation.body.testerPass };
  assert.deepEqual(await tester(pass), activation, 'A saved pass is verified again on restart.');
  assert.equal((await tester({ testerPass: pass.testerPass + 'x' })).code, 403);
  assert.equal((await tester(pass, { ...testerEnv, ARCANA_ANDROID_TESTER_CODE_HASH: 'f'.repeat(64) })).code, 403);
  assert.equal((await tester(pass, env)).code, 410);
  assert.equal((await call('/api/activate', { licenseKey: testerCode }, testerEnv)).code, 403);

  const reviewCode = 'ARCANA-REVIEW-ABCDEF01-23456789-ABCDEF01-23456789';
  const reviewHash = createHash('sha256').update(reviewCode).digest('hex');
  const reviewEnv = { ...testerEnv, ARCANA_ANDROID_REVIEW_CODE_HASH: reviewHash };
  const review = (body, bindings = reviewEnv) => call('/api/android/review', body, bindings);
  assert.equal((await review({ code: reviewCode }, testerEnv)).code, 503);
  assert.equal((await review({ code: testerCode })).code, 403);
  assert.equal((await tester({ code: reviewCode }, reviewEnv)).code, 403);
  const reviewAccess = await review({ code: reviewCode.toLowerCase() });
  assert.equal(reviewAccess.code, 200);
  const reviewPass = reviewAccess.body.reviewPass;
  assert.match(reviewPass, /^v1\./);
  assert.equal(JSON.parse(Buffer.from(reviewPass.split('.')[1], 'base64url')).source, 'android-review');
  assert.deepEqual(await review({ reviewPass }), reviewAccess);
  assert.equal((await tester({ testerPass: reviewPass }, reviewEnv)).code, 403);
  assert.equal((await review({ reviewPass: pass.testerPass })).code, 403);
  assert.equal((await review({ reviewPass }, { ...reviewEnv, ARCANA_ANDROID_REVIEW_CODE_HASH: 'f'.repeat(64) })).code, 403);
  assert.doesNotMatch(JSON.stringify(reviewAccess.body), new RegExp(reviewHash + '|' + reviewCode));

  assert.equal((await call('/api/reading-report', { reason: 'unsupported', reading: 'Text' })).code, 400);
  assert.equal((await call('/api/reading-report', { reason: 'unsafe', reading: 'Text', journal: 'private' })).code, 201);
  assert.equal(reports.length, 1);
  const [, serialized, options] = reports[0];
  assert.equal(JSON.parse(serialized).reading, 'Text');
  assert.equal(JSON.parse(serialized).journal, undefined);
  assert.equal(options.expirationTtl, 7_776_000);
} finally {
  globalThis.fetch = actualFetch;
}
console.log('Play purchase, Android tester access, and report regressions passed');
