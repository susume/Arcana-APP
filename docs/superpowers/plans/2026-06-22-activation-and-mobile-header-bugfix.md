# Activation And Mobile Header Bugfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accept the approved Arcana developer key alongside valid Gumroad licenses and make the homepage section navigation readable at a 390-pixel mobile viewport.

**Architecture:** Keep the browser activation flow server-verified. The Worker recognizes the developer key through a SHA-256 hash comparison before falling back to the existing Gumroad API, while homepage-scoped CSS changes the mobile header into a two-row grid.

**Tech Stack:** Plain JavaScript, Cloudflare Worker APIs, PowerShell regression contracts, Tailwind CLI CSS build, static HTML, in-app browser testing.

---

## File Map

- Modify `tests/worker-activation.mjs`: prove developer-key activation succeeds without a Gumroad request and invalid keys still fail.
- Modify `tests/monetization-config.ps1`: protect generic activation wording and prevent the plaintext developer key from entering browser code.
- Modify `tests/homepage-ui.ps1`: protect the two-row mobile header CSS contract.
- Modify `server/cloudflare-worker.js`: add server-side developer-key hash recognition and preserve Gumroad fallback.
- Modify `js/subscription.js`: make activation prompts source-neutral.
- Modify `templates/settings.html`: make the Settings activation label and placeholder source-neutral.
- Modify `index.html`: synchronize the embedded Settings template.
- Modify `src/premium-theme.css`: add the final homepage-scoped mobile header layout.
- Regenerate `css/premium.css`: commit deployable CSS output.

### Task 1: Developer-Key Worker Regression

**Files:**
- Modify: `tests/worker-activation.mjs`
- Test: `tests/worker-activation.mjs`

- [ ] **Step 1: Write the failing developer-key test**

Add a test before the existing Gumroad success case:

```js
{
  let gumroadCalled = false;
  globalThis.fetch = async () => {
    gumroadCalled = true;
    throw new Error('Developer activation must not call Gumroad.');
  };

  const response = await post('/api/activate', {
    licenseKey: 'ARCANA-FOUNDER-4F99-2026'
  }, { ARCANA_LICENSES: createKv() });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.isPremium, true);
  assert.equal(data.source, 'developer');
  assert.equal(gumroadCalled, false);
}
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node tests\worker-activation.mjs
```

Expected: FAIL because the Worker calls Gumroad for the developer key.

- [ ] **Step 3: Commit the failing regression**

```powershell
git add tests\worker-activation.mjs
git commit -m "test: cover developer premium activation"
```

### Task 2: Worker Developer-Key Verification

**Files:**
- Modify: `server/cloudflare-worker.js`
- Test: `tests/worker-activation.mjs`

- [ ] **Step 1: Add hash-based developer-key recognition**

Add the approved SHA-256 digest:

```js
const ARCANA_DEVELOPER_LICENSE_HASH = '64fe0c8a6456a665f33b31bb1df11a29b244a4c3d9dc4875590fa1dcb90c81ee';
```

Normalize activation keys with the same case and whitespace behavior used by the
former browser activation:

```js
function normalizeLicenseKey(key) {
  return String(key || '').trim().toUpperCase().replace(/\s+/g, '');
}
```

Add:

```js
async function isDeveloperLicenseKey(key) {
  return await licenseHash(key) === ARCANA_DEVELOPER_LICENSE_HASH;
}
```

In `handleActivate()`, after empty-key validation and before constructing the
Gumroad form:

```js
if (await isDeveloperLicenseKey(licenseKey)) {
  const activatedAt = new Date().toISOString();
  const record = { source: 'developer', activatedAt };

  if (env.ARCANA_LICENSES) {
    await env.ARCANA_LICENSES.put(
      `license:${await licenseHash(licenseKey)}`,
      JSON.stringify(record)
    );
  }

  return json({ isPremium: true, source: 'developer', activatedAt }, 200, origin);
}
```

- [ ] **Step 2: Run the focused test and verify GREEN**

Run:

```powershell
node tests\worker-activation.mjs
```

Expected: `worker activation regression passed`.

- [ ] **Step 3: Check Worker syntax**

Run:

```powershell
node --check server\cloudflare-worker.js
```

Expected: exit code 0 with no output.

- [ ] **Step 4: Commit the Worker fix**

```powershell
git add server\cloudflare-worker.js
git commit -m "fix: accept developer premium key"
```

### Task 3: Source-Neutral Activation Copy Regression

**Files:**
- Modify: `tests/monetization-config.ps1`
- Test: `tests/monetization-config.ps1`

- [ ] **Step 1: Write failing copy and security assertions**

Add:

```powershell
Assert-NotContains $subscription 'ARCANA-FOUNDER-4F99-2026' 'Developer key must not be exposed in browser JavaScript.'
Assert-NotContains $settings 'ARCANA-FOUNDER-4F99-2026' 'Developer key must not be exposed in Settings markup.'
Assert-Contains $settings 'Activation key' 'Expected Settings to accept developer or Gumroad activation keys.'
Assert-Contains $subscription 'Paste your activation key' 'Expected upgrade activation copy to be source-neutral.'
```

- [ ] **Step 2: Run the regression and verify RED**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\monetization-config.ps1
```

Expected: FAIL because Settings and upgrade activation copy still say Gumroad
license key.

- [ ] **Step 3: Commit the failing regression**

```powershell
git add tests\monetization-config.ps1
git commit -m "test: require generic activation key copy"
```

### Task 4: Source-Neutral Activation UI

**Files:**
- Modify: `js/subscription.js`
- Modify: `templates/settings.html`
- Modify: `index.html`
- Test: `tests/monetization-config.ps1`

- [ ] **Step 1: Update browser messages and upgrade markup**

In `js/subscription.js`, replace activation-only Gumroad wording with:

```js
if(!clean) throw new Error('Enter your activation key.');
```

```js
if(!resp.ok || !data.isPremium) throw new Error(data.error || 'That activation key was not recognized.');
```

Use this upgrade form:

```html
<label>Activation Key</label>
<input id="activation-key-input" type="text" placeholder="Paste your activation key">
```

Use `Verifying activation key...`, `Paste your activation key first.`, and
`That activation key was not recognized.` in the related submit handlers.

- [ ] **Step 2: Update and synchronize Settings markup**

In both `templates/settings.html` and its embedded counterpart in `index.html`,
use:

```html
<label>Activation key</label>
<input type="text" id="premium-key-input" placeholder="Paste your activation key">
```

Do not change IDs or handlers.

- [ ] **Step 3: Run focused regressions**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\monetization-config.ps1
powershell -ExecutionPolicy Bypass -File tests\app-shell-ui.ps1
node --check js\subscription.js
```

Expected: both regressions pass and syntax check exits 0.

- [ ] **Step 4: Commit activation UI changes**

```powershell
git add js\subscription.js templates\settings.html index.html
git commit -m "fix: support both activation key sources"
```

### Task 5: Mobile Header Regression

**Files:**
- Modify: `tests/homepage-ui.ps1`
- Test: `tests/homepage-ui.ps1`

- [ ] **Step 1: Write the failing CSS contract**

Add these assertions after loading `$theme`:

```powershell
Assert-Contains $theme '.ritual-home .ritual-nav {' "Homepage mobile header rule is missing."
Assert-Contains $theme 'grid-template-columns: minmax(0, 1fr) auto !important;' "Mobile header must keep brand and Settings on the first row."
Assert-Contains $theme 'grid-column: 1 / -1 !important;' "Mobile section navigation must span the second row."
Assert-Contains $theme 'grid-template-columns: repeat(3, minmax(0, 1fr));' "Mobile section navigation must use three equal columns."
```

- [ ] **Step 2: Run the regression and verify RED**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\homepage-ui.ps1
```

Expected: FAIL because the final mobile override retains the squeezed desktop
grid.

- [ ] **Step 3: Commit the failing regression**

```powershell
git add tests\homepage-ui.ps1
git commit -m "test: protect mobile homepage navigation"
```

### Task 6: Two-Row Mobile Header

**Files:**
- Modify: `src/premium-theme.css`
- Regenerate: `css/premium.css`
- Test: `tests/homepage-ui.ps1`

- [ ] **Step 1: Add final mobile header overrides**

Inside the final `@media (max-width: 720px)` block, use:

```css
.ritual-home .ritual-nav {
  position: relative !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  gap: 12px 16px !important;
  width: min(calc(100% - 32px), 1180px) !important;
}

.ritual-home .ritual-brand {
  grid-column: 1;
  grid-row: 1;
}

.ritual-home .ritual-settings {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
}

.ritual-home .ritual-nav-links {
  grid-column: 1 / -1 !important;
  grid-row: 2;
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100% !important;
  padding: 8px !important;
}

.ritual-home .ritual-nav-links button {
  min-width: 0;
  min-height: 42px;
  padding: 8px 4px;
  font-size: 12px !important;
  line-height: 1.2;
  white-space: nowrap;
}
```

- [ ] **Step 2: Rebuild generated CSS**

Run:

```powershell
npm run build:css
```

Expected: Tailwind build completes and updates `css/premium.css`.

- [ ] **Step 3: Run focused homepage regression**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\homepage-ui.ps1
```

Expected: `homepage-ui regression passed`.

- [ ] **Step 4: Commit mobile header changes**

```powershell
git add src\premium-theme.css css\premium.css
git commit -m "fix: arrange homepage header on mobile"
```

### Task 7: Full Verification And Browser QA

**Files:**
- Verify all modified files

- [ ] **Step 1: Run the full build and test suite**

```powershell
npm run build
npm test
```

Expected: all builds and regressions pass.

- [ ] **Step 2: Run syntax and diff checks**

```powershell
node --check js\subscription.js
node --check server\cloudflare-worker.js
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Verify mobile behavior in the visible browser**

At `http://127.0.0.1:4173/`, reload after the CSS build and set the viewport to
390 by 844. Confirm:

- Brand and Settings share the first header row.
- `How It Works`, `Premium`, and `Journal` appear in one readable second row.
- No label overlaps or clips.
- The document has zero horizontal overflow.
- Each section button scrolls to its existing target.
- Settings still opens.
- Browser console contains no errors.

- [ ] **Step 4: Verify activation behavior**

Run `node tests\worker-activation.mjs` as the authoritative local activation
check. Confirm the developer source and Gumroad source both pass while an invalid
key returns 403.

- [ ] **Step 5: Review final repository state**

```powershell
git status --short
git log -8 --oneline
```

Expected: only intentional changes remain and task commits are present.
