# Monetization And Gemini Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a one-time $29 Gumroad license-key Premium unlock and user-provided Gemini API key setup for Arcana.

**Architecture:** Keep Arcana as a static app with browser-local settings and premium state. Extend the existing Cloudflare Worker into a small route-based backend for Gumroad activation/webhook handling, while Gemini calls prefer the user's saved browser-local key.

**Tech Stack:** Vanilla HTML/CSS/global JavaScript, Cloudflare Worker module syntax, Cloudflare KV binding, Gumroad license API, Google Gemini REST API, PowerShell and Node regression tests.

---

## File Structure

- Modify `package.json`: add the new monetization and Worker activation regression tests to `npm test`.
- Create `tests/monetization-config.ps1`: static regression checks for pricing copy, Settings UI, Gemini key persistence, and direct Gemini auth.
- Create `tests/worker-activation.mjs`: executable Worker API tests with mocked Gumroad responses and mocked KV.
- Modify `js/config.js`: add activation endpoint, Gumroad product URL, Gemini guide route helpers, and keep the optional AI proxy.
- Modify `server/cloudflare-worker.js`: route requests, preserve optional AI proxy behavior, add `/api/activate` and `/api/gumroad/webhook`.
- Modify `js/subscription.js`: remove hardcoded activation keys, call the activation API, and update Premium copy/status.
- Modify `js/storage.js`: persist `geminiKey`, wire Settings actions, preserve existing reading preferences, and avoid clearing the key unintentionally.
- Modify `js/ai.js`: prefer explicit/saved Gemini keys, call Gemini with `x-goog-api-key`, implement `testApiKey()`, and keep proxy fallback optional.
- Modify `templates/settings.html` and embedded `template-settings` in `index.html`: add Premium Access and AI Configuration sections.
- Modify `templates/help.html` and embedded `template-help` in `index.html`: add the Google AI Studio key guide.
- Modify `templates/welcome.html` and embedded welcome copy in `index.html`: replace subscription/monthly language with one-time $29 lifetime unlock copy.
- Modify `ARCHITECTURE.md`: update the monetization and Gemini configuration notes after implementation.

---

### Task 1: Add Failing Regression Tests

**Files:**
- Create: `tests/monetization-config.ps1`
- Create: `tests/worker-activation.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing static regression test**

Create `tests/monetization-config.ps1`:

```powershell
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$subscription = Get-Content -LiteralPath (Join-Path $root 'js/subscription.js') -Raw
$storage = Get-Content -LiteralPath (Join-Path $root 'js/storage.js') -Raw
$ai = Get-Content -LiteralPath (Join-Path $root 'js/ai.js') -Raw
$config = Get-Content -LiteralPath (Join-Path $root 'js/config.js') -Raw
$settings = Get-Content -LiteralPath (Join-Path $root 'templates/settings.html') -Raw
$help = Get-Content -LiteralPath (Join-Path $root 'templates/help.html') -Raw
$welcome = Get-Content -LiteralPath (Join-Path $root 'templates/welcome.html') -Raw
$index = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw
$worker = Get-Content -LiteralPath (Join-Path $root 'server/cloudflare-worker.js') -Raw

function Assert-Contains($Haystack, $Needle, $Message) {
  if ($Haystack -notmatch [regex]::Escape($Needle)) { throw $Message }
}

function Assert-NotContains($Haystack, $Needle, $Message) {
  if ($Haystack -match [regex]::Escape($Needle)) { throw $Message }
}

Assert-NotContains $subscription 'ARCANA_ACTIVATION_KEYS' 'Activation keys must not be hardcoded in browser JavaScript.'
Assert-Contains $subscription 'activatePremiumKey' 'Expected activation helper to remain available.'
Assert-Contains $subscription 'getActivationApiUrl()' 'Expected premium activation to call the configured backend endpoint.'
Assert-Contains $subscription '$29 lifetime unlock' 'Expected premium copy to advertise a one-time $29 lifetime unlock.'
Assert-NotContains $subscription '$4.99/month' 'Expected subscription pricing copy to be removed.'

Assert-Contains $config 'ARCANA_ACTIVATION_API_URL' 'Expected activation endpoint configuration.'
Assert-Contains $config 'ARCANA_GUMROAD_PRODUCT_URL' 'Expected Gumroad product URL configuration.'

Assert-Contains $settings 'Premium Access' 'Expected Settings to include Premium Access section.'
Assert-Contains $settings 'AI Configuration' 'Expected Settings to include AI Configuration section.'
Assert-Contains $settings 'gemini-key-input' 'Expected Settings to include Gemini key input.'
Assert-Contains $settings 'testAndSaveGeminiKey()' 'Expected Settings to test and save Gemini keys.'
Assert-Contains $settings 'openGeminiKeyGuide()' 'Expected Settings to link to the Gemini key guide.'

Assert-Contains $storage 'geminiKey:saved.geminiKey' 'Expected loadSettings to preserve saved Gemini key.'
Assert-Contains $storage 'function testAndSaveGeminiKey(' 'Expected Settings Gemini key save helper.'
Assert-Contains $storage 'function removeGeminiKey(' 'Expected Settings Gemini key removal helper.'

Assert-Contains $ai "'x-goog-api-key':apiKey" 'Expected direct Gemini calls to authenticate through x-goog-api-key.'
Assert-Contains $ai 'function getSavedGeminiKey(' 'Expected AI helper to read saved Gemini key.'
Assert-Contains $ai 'async function testApiKey(' 'Expected Gemini key validation helper.'

Assert-Contains $help 'How to get a free Gemini API key' 'Expected help guide for Gemini keys.'
Assert-Contains $help 'aistudio.google.com' 'Expected guide to link users to Google AI Studio.'
Assert-Contains $help 'Create API key in a new project' 'Expected non-technical setup step.'
Assert-Contains $index 'How to get a free Gemini API key' 'Expected embedded help fallback to include Gemini key guide.'

Assert-Contains $welcome 'Premium lifetime unlock' 'Expected homepage Premium copy to use lifetime language.'
Assert-Contains $welcome '$29' 'Expected homepage to show the one-time price.'
Assert-NotContains $welcome '$4.99/month' 'Expected homepage subscription pricing to be removed.'
Assert-Contains $index 'Premium lifetime unlock' 'Expected embedded welcome fallback to use lifetime language.'

Assert-Contains $worker 'handleActivate' 'Expected Worker activation route handler.'
Assert-Contains $worker 'GUMROAD_PRODUCT_ID' 'Expected Worker to use Gumroad product id.'
Assert-Contains $worker 'ARCANA_LICENSES' 'Expected Worker to persist activation metadata to KV.'
Assert-Contains $worker '/api/gumroad/webhook' 'Expected Worker Gumroad webhook route.'

Write-Host 'monetization-config regression passed'
```

- [ ] **Step 2: Write the failing Worker activation test**

Create `tests/worker-activation.mjs`:

```javascript
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
    const response = await post('/api/activate', { licenseKey: 'TEST-LICENSE-123' }, {
      ARCANA_LICENSES: createKv()
    });
    const data = await response.json();

    assert.equal(response.status, 500);
    assert.match(data.error, /GUMROAD_PRODUCT_ID/);
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
} finally {
  globalThis.fetch = originalFetch;
}

console.log('worker activation regression passed');
```

- [ ] **Step 3: Wire the new tests into `npm test`**

Modify `package.json`:

```json
"test": "npm run build:ts && node tests\\worker-activation.mjs && powershell -ExecutionPolicy Bypass -File tests\\monetization-config.ps1 && powershell -ExecutionPolicy Bypass -File tests\\journal-ui.ps1 && powershell -ExecutionPolicy Bypass -File tests\\reading-actions.ps1"
```

- [ ] **Step 4: Run tests to verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because the current code still has hardcoded activation keys, missing Worker activation route, missing Gemini key UI, and old pricing copy.

- [ ] **Step 5: Commit the failing tests**

```powershell
git add package.json tests\monetization-config.ps1 tests\worker-activation.mjs
git commit -m "test: cover monetization and gemini setup"
```

---

### Task 2: Implement Worker Activation And Webhook Routes

**Files:**
- Modify: `server/cloudflare-worker.js`

- [ ] **Step 1: Run the focused Worker test to confirm it fails**

Run:

```powershell
node tests\worker-activation.mjs
```

Expected: FAIL because `handleActivate` and `/api/activate` do not exist yet.

- [ ] **Step 2: Replace the Worker request entry with route dispatch**

In `server/cloudflare-worker.js`, preserve the existing AI proxy body as `handleAiProxy(request, env, origin)`. Add:

```javascript
const GUMROAD_LICENSE_VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';

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
```

- [ ] **Step 3: Add activation helpers**

Add helpers:

```javascript
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
```

- [ ] **Step 4: Add `handleActivate()`**

Add:

```javascript
async function handleActivate(request, env, origin) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
  if (!env.GUMROAD_PRODUCT_ID) return json({ error: 'GUMROAD_PRODUCT_ID is not configured.' }, 500, origin);

  const body = await parseBody(request).catch(() => null);
  if (!body) return json({ error: 'Invalid request body.' }, 400, origin);

  const licenseKey = normalizeLicenseKey(body.licenseKey || body.license_key);
  if (!licenseKey) return json({ error: 'Enter your Gumroad license key.' }, 400, origin);

  const form = new URLSearchParams();
  form.set('product_id', env.GUMROAD_PRODUCT_ID);
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
    productId: purchase.product_id || env.GUMROAD_PRODUCT_ID,
    refunded: !!purchase.refunded,
    chargebacked: !!purchase.chargebacked
  };

  if (env.ARCANA_LICENSES) {
    await env.ARCANA_LICENSES.put(`license:${await licenseHash(licenseKey)}`, JSON.stringify(record));
  }

  return json({ isPremium: true, source: 'gumroad', activatedAt }, 200, origin);
}
```

- [ ] **Step 5: Add `handleGumroadWebhook()`**

Add:

```javascript
async function handleGumroadWebhook(request, env, origin) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
  const payload = await parseBody(request).catch(() => ({}));
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
```

- [ ] **Step 6: Run focused Worker test to verify GREEN**

Run:

```powershell
node tests\worker-activation.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit Worker route implementation**

```powershell
git add server\cloudflare-worker.js
git commit -m "feat: add gumroad activation worker routes"
```

---

### Task 3: Implement Client Config And Premium Activation

**Files:**
- Modify: `js/config.js`
- Modify: `js/subscription.js`

- [ ] **Step 1: Run the static monetization test to confirm RED remains**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\monetization-config.ps1
```

Expected: FAIL on missing client config and subscription changes.

- [ ] **Step 2: Add config helpers**

In `js/config.js`, add:

```javascript
const ARCANA_ACTIVATION_API_URL = '';
const ARCANA_GUMROAD_PRODUCT_URL = 'https://gumroad.com/l/arcana-premium';

function getActivationApiUrl(){
  const configured = String(ARCANA_ACTIVATION_API_URL || '').trim();
  if (configured) return configured;
  const proxy = getAIProxyUrl();
  if (!proxy) return '';
  return proxy.replace(/\/$/, '') + '/api/activate';
}

function getGumroadProductUrl(){
  return String(ARCANA_GUMROAD_PRODUCT_URL || '').trim();
}
```

- [ ] **Step 3: Replace hardcoded activation in `js/subscription.js`**

Remove `ARCANA_ACTIVATION_KEYS`. Change `activatePremiumKey` to:

```javascript
async function activatePremiumKey(key){
  const clean = normalizeActivationKey(key);
  if(!clean) throw new Error('Enter your Gumroad license key.');
  const url = getActivationApiUrl();
  if(!url) throw new Error('Activation service is not configured yet.');
  const resp = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({licenseKey:clean})
  });
  const data = await resp.json().catch(()=>({}));
  if(!resp.ok || !data.isPremium) throw new Error(data.error || 'That Gumroad license key was not recognized.');
  saveSubscription({tier:'premium', key:clean, source:data.source||'gumroad', activatedAt:data.activatedAt||new Date().toISOString()});
  return true;
}
```

- [ ] **Step 4: Update activation form submit behavior**

Change `submitActivationKey()` to `async function submitActivationKey()` and await `activatePremiumKey(input.value)`, with loading text and catch messages.

- [ ] **Step 5: Update premium copy**

Change upgrade modal copy to:

```javascript
<div class="plan-pill">Premium - $29 lifetime unlock</div>
```

Add Gumroad buy link in the modal when `getGumroadProductUrl()` exists.

- [ ] **Step 6: Run syntax checks**

Run:

```powershell
node --check js\config.js
node --check js\subscription.js
```

Expected: PASS.

- [ ] **Step 7: Commit client activation**

```powershell
git add js\config.js js\subscription.js
git commit -m "feat: verify premium activation through backend"
```

---

### Task 4: Implement Gemini Key Settings And Direct Gemini Calls

**Files:**
- Modify: `js/storage.js`
- Modify: `js/ai.js`

- [ ] **Step 1: Run static test to confirm RED remains**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\monetization-config.ps1
```

Expected: FAIL on Gemini settings and AI helper checks.

- [ ] **Step 2: Preserve Gemini key in `loadSettings()`**

Return:

```javascript
geminiKey:saved.geminiKey||'',
readingStyle:saved.readingStyle||'Traditional',
readingTone:saved.readingTone||'Gentle',
narratorVoice:saved.narratorVoice||''
```

- [ ] **Step 3: Add Settings helpers**

Add:

```javascript
async function testAndSaveGeminiKey(){
  const input=document.getElementById('gemini-key-input');
  const status=document.getElementById('gemini-key-status');
  const key=(input&&input.value.trim())||loadSettings().geminiKey;
  if(!key){ if(status)status.textContent='Paste your Gemini API key first.'; return; }
  if(status)status.textContent='Testing Gemini key...';
  try{
    await testApiKey(key);
    const s=loadSettings();
    localStorage.setItem('arcana_settings',JSON.stringify({...s,geminiKey:key}));
    if(input)input.value='';
    if(status)status.textContent='Gemini key saved on this browser.';
  }catch(e){
    if(status)status.textContent=e.message||'This key could not be validated.';
  }
}

function removeGeminiKey(){
  const s=loadSettings();
  delete s.geminiKey;
  localStorage.setItem('arcana_settings',JSON.stringify(s));
  loadSettingsUI();
  showToast('Gemini key removed from this browser.');
}

function openGeminiKeyGuide(){
  closeModal('modal-settings');
  openModal('modal-help');
  setTimeout(()=>document.getElementById('gemini-key-guide')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
}
```

- [ ] **Step 4: Update `saveSettings()`**

When writing `arcana_settings`, include the existing saved `geminiKey`:

```javascript
const previous=loadSettings();
const s={
  geminiKey:previous.geminiKey||'',
  readingStyle:document.getElementById('reading-style').value,
  readingTone:document.getElementById('reading-tone').value,
  narratorVoice:document.getElementById('narrator-voice')?.value||''
};
```

- [ ] **Step 5: Add saved-key helpers in `js/ai.js`**

Add:

```javascript
function getSavedGeminiKey(){
  return loadSettings().geminiKey || '';
}
```

Update `hasAIConfiguration()` to return true for saved Gemini key, explicit config key, or proxy.

- [ ] **Step 6: Update direct Gemini auth**

In `callGemini()`, before proxy fallback:

```javascript
apiKey = apiKey || getSavedGeminiKey() || getGoogleApiKey();
if(apiKey){
  headers['x-goog-api-key']=apiKey;
  // use Gemini URL without ?key=
}
```

Make the URL:

```javascript
const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
```

- [ ] **Step 7: Add `testApiKey()`**

Add:

```javascript
async function testApiKey(key){
  const result=await callGemini('Reply with the single word Arcana.', key, null, null);
  if(!result)throw new Error('This key could not be validated.');
  return true;
}
```

- [ ] **Step 8: Run syntax checks**

Run:

```powershell
node --check js\storage.js
node --check js\ai.js
```

Expected: PASS.

- [ ] **Step 9: Commit Gemini settings and AI helper**

```powershell
git add js\storage.js js\ai.js
git commit -m "feat: support user gemini api keys"
```

---

### Task 5: Update Settings, Help Guide, Homepage Copy, And Embedded Fallbacks

**Files:**
- Modify: `templates/settings.html`
- Modify: `templates/help.html`
- Modify: `templates/welcome.html`
- Modify: `index.html`

- [ ] **Step 1: Run static test to confirm RED remains**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\monetization-config.ps1
```

Expected: FAIL on template copy and embedded fallback checks.

- [ ] **Step 2: Update `templates/settings.html`**

Replace the current Premium section with:

```html
<div class="settings-section">
  <h3>Premium Access</h3>
  <p id="premium-settings-status" class="settings-status">Free plan active</p>
  <p class="settings-note">Premium is a one-time $29 lifetime unlock for unlimited readings, advanced spreads, journal history, narration, and comparison tools.</p>
  <label>Gumroad license key</label>
  <input type="text" id="premium-key-input" placeholder="Paste your Gumroad license key">
  <p id="premium-key-status" class="activation-status"></p>
  <div class="settings-actions">
    <button class="btn btn-primary btn-sm" onclick="submitSettingsActivationKey()">Activate Premium</button>
    <button class="btn btn-sm" onclick="window.open(getGumroadProductUrl(),'_blank','noopener,noreferrer')">Buy Premium - $29</button>
    <button class="btn btn-sm" onclick="deactivatePremium();renderEntitlementsUI();showToast('Premium deactivated on this device.')">Deactivate on this browser</button>
  </div>
</div>

<div class="settings-section">
  <h3>AI Configuration</h3>
  <p class="settings-note">Use your own Google Gemini API key for AI readings and photo identification. Arcana saves it only in this browser.</p>
  <label>Gemini API key</label>
  <input type="password" id="gemini-key-input" placeholder="Paste your Gemini API key">
  <p id="gemini-key-status" class="activation-status"></p>
  <div class="settings-actions">
    <button class="btn btn-primary btn-sm" onclick="testAndSaveGeminiKey()">Test & Save Key</button>
    <button class="btn btn-sm" onclick="removeGeminiKey()">Remove Key</button>
    <button class="btn btn-sm" onclick="openGeminiKeyGuide()">How to get a free Gemini API key</button>
  </div>
</div>
```

- [ ] **Step 3: Add Settings activation wrapper**

In `js/subscription.js` or `js/storage.js`, add:

```javascript
async function submitSettingsActivationKey(){
  const input=document.getElementById('premium-key-input');
  const status=document.getElementById('premium-key-status');
  if(!input||!input.value.trim()){ if(status)status.textContent='Paste your Gumroad license key first.'; return; }
  try{
    if(status)status.textContent='Verifying license key...';
    await activatePremiumKey(input.value);
    if(status)status.textContent='Premium activated on this browser.';
    input.value='';
    renderEntitlementsUI();
  }catch(e){
    if(status)status.textContent=e.message||'Activation failed.';
  }
}
```

- [ ] **Step 4: Update `templates/help.html`**

Add:

```html
<div class="help-section" id="gemini-key-guide">
  <h3>How to get a free Gemini API key</h3>
  <ol>
    <li>Go to <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.</li>
    <li>Log in with your standard Google or Gmail account.</li>
    <li>Open API keys and click the prominent "Create API Key" button.</li>
    <li>Select "Create API key in a new project."</li>
    <li>Copy the generated key.</li>
    <li>Keep it secret and never share it.</li>
    <li>Return to Arcana, open Settings, and paste the key into AI Configuration.</li>
  </ol>
  <p>Google may adjust button labels over time. If a key is ever exposed, return to Google AI Studio and revoke it.</p>
</div>
```

- [ ] **Step 5: Update homepage Premium copy**

In `templates/welcome.html`, change:

```html
<h3>What does Premium include?</h3>
<p>Premium supports unlimited readings, journal history, narration, advanced spreads, comparison tools, and priority AI processing.</p>
```

to:

```html
<h3>Premium lifetime unlock</h3>
<p>Upgrade once for $29 to unlock unlimited readings, journal history, narration, advanced spreads, comparison tools, and your full personal archive.</p>
```

- [ ] **Step 6: Sync embedded fallbacks in `index.html`**

Apply the same Settings, Help, and Welcome edits to the embedded templates:

- `template-settings`
- `template-help`
- `template-welcome`

- [ ] **Step 7: Run the static monetization test to verify GREEN**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\monetization-config.ps1
```

Expected: PASS.

- [ ] **Step 8: Commit UI and copy updates**

```powershell
git add templates\settings.html templates\help.html templates\welcome.html index.html js\subscription.js
git commit -m "feat: add premium and gemini setup ui"
```

---

### Task 6: Update Architecture Docs And Run Full Verification

**Files:**
- Modify: `ARCHITECTURE.md`

- [ ] **Step 1: Update architecture notes**

Update the persistence table and AI/monetization sections:

```markdown
| `arcana_settings` | `{ geminiKey, readingStyle, readingTone, narratorVoice }` | Gemini key is saved locally in the browser. |
| `arcana_subscription` | `{ tier, key, source, activatedAt }` | Premium state after Gumroad license verification. |
```

Add deployment notes for `GUMROAD_PRODUCT_ID`, `ARCANA_LICENSES`, and `ARCANA_GUMROAD_PRODUCT_URL`.

- [ ] **Step 2: Run all verification**

Run:

```powershell
npm test
node --check js\config.js
node --check js\subscription.js
node --check js\storage.js
node --check js\ai.js
node --check server\cloudflare-worker.js
```

Expected: all commands pass with no syntax errors.

- [ ] **Step 3: Preview locally**

Run:

```powershell
npm run serve
```

Open `http://127.0.0.1:4173/` and check:

- Homepage Premium copy shows `$29` lifetime language.
- Settings opens from the homepage.
- Premium Access section is visible.
- AI Configuration section is visible.
- Gemini key guide opens from Settings.
- Existing reading flow still starts.

- [ ] **Step 4: Commit docs and final verification fixes**

```powershell
git add ARCHITECTURE.md
git commit -m "docs: update monetization architecture notes"
```

---

## Self-Review Checklist

- Spec coverage: Gumroad one-time license activation, Premium state, Settings Gemini key setup, Gemini guide, premium gating, and Worker webhook are all covered.
- No placeholders: every task has exact files, commands, expected outcomes, and implementation snippets.
- Type/name consistency: `geminiKey`, `ARCANA_LICENSES`, `GUMROAD_PRODUCT_ID`, `ARCANA_ACTIVATION_API_URL`, `getActivationApiUrl()`, and `testAndSaveGeminiKey()` are named consistently across tasks.
- TDD path: tests are written and verified failing before implementation tasks change production code.
