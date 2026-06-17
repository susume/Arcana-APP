# Ritual Stage Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Ritual Stage homepage redesign while preserving all existing Arcana Guide workflows.

**Architecture:** The app remains a static vanilla JavaScript SPA. The homepage markup lives in `templates/welcome.html` and must be mirrored into the embedded `template-welcome` block in `index.html`; visual polish lives in `src/premium-theme.css` and compiles to `css/premium.css`.

**Tech Stack:** Static HTML templates, CSS custom properties, Tailwind CLI build for `premium.css`, vanilla JavaScript event handlers, PowerShell regression tests, npm build/test scripts.

---

## File Structure

- Create: `tests/homepage-ui.ps1`  
  Verifies the homepage template keeps required CTAs, section anchors, handler names, production-safe asset references, and embedded-template sync.
- Modify: `package.json`  
  Adds the homepage regression script to `npm test`.
- Modify: `templates/welcome.html`  
  Replaces the current homepage structure with the Ritual Stage homepage sections while preserving existing handlers.
- Modify: `index.html`  
  Mirrors the updated `template-welcome` fallback exactly.
- Modify: `src/premium-theme.css`  
  Adds homepage-specific Ritual Stage layout, hero, journey, comparison, journal, final CTA, responsive, and reduced-motion styling.
- Generated: `css/premium.css`  
  Built from `src/premium-theme.css`.

## Task 1: Homepage Regression Test

**Files:**
- Create: `tests/homepage-ui.ps1`
- Modify: `package.json`

- [ ] **Step 1: Write the failing homepage test**

Create `tests/homepage-ui.ps1`:

```powershell
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $root "templates/welcome.html"
$indexPath = Join-Path $root "index.html"

$template = Get-Content -LiteralPath $templatePath -Raw
$index = Get-Content -LiteralPath $indexPath -Raw

function Assert-Contains($content, $needle, $message) {
  if ($content -notlike "*$needle*") {
    throw $message
  }
}

Assert-Contains $template 'Read Your Real Tarot Cards With AI' "Homepage hero headline is missing."
Assert-Contains $template 'onclick="startGuided()"' "Guided reading CTA handler changed or disappeared."
Assert-Contains $template 'onclick="startQuick()"' "Quick upload CTA handler changed or disappeared."
Assert-Contains $template 'onclick="openModal(''modal-settings'')"' "Settings modal handler changed or disappeared."
Assert-Contains $template 'id="how-it-works"' "How It Works section anchor is missing."
Assert-Contains $template 'id="premium"' "Premium section anchor is missing."
Assert-Contains $template 'id="journal"' "Journal section anchor is missing."
Assert-Contains $template 'Real Cards With Arcana Guide' "Real-card comparison message is missing."
Assert-Contains $template 'Random Generators' "Random-generator comparison message is missing."
Assert-Contains $template 'Your Cards Have A Story. Let AI Help You Read It.' "Final CTA headline is missing."

if ($template -match 'generated_images|\.codex') {
  throw "Homepage template references a local Codex generated image path."
}

$match = [regex]::Match($index, '(?s)<template id="template-welcome">\s*(.*?)\s*</template>')
if (-not $match.Success) {
  throw "Embedded template-welcome block is missing from index.html."
}

$embedded = $match.Groups[1].Value.Trim()
$external = $template.Trim()

if ($embedded -ne $external) {
  throw "Embedded template-welcome in index.html is not synced with templates/welcome.html."
}

Write-Output "homepage-ui regression passed"
```

Modify the `test` script in `package.json` so it runs the new test after the existing UI regressions:

```json
"test": "npm run build:ts && node tests\\worker-activation.mjs && powershell -ExecutionPolicy Bypass -File tests\\monetization-config.ps1 && powershell -ExecutionPolicy Bypass -File tests\\journal-ui.ps1 && powershell -ExecutionPolicy Bypass -File tests\\reading-actions.ps1 && powershell -ExecutionPolicy Bypass -File tests\\homepage-ui.ps1"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test
```

Expected: FAIL from `tests/homepage-ui.ps1` because the current homepage does not use the approved headline and section anchors yet.

- [ ] **Step 3: Commit the failing test**

Run:

```powershell
git add package.json tests/homepage-ui.ps1
git commit -m "test: add homepage ritual stage regression"
```

## Task 2: Ritual Stage Homepage Markup

**Files:**
- Modify: `templates/welcome.html`
- Modify: `index.html`

- [ ] **Step 1: Replace `templates/welcome.html` with the Ritual Stage structure**

Use the approved sections:

- Header with brand, `How It Works`, `Premium`, `Journal`, and settings button
- Hero headline and CTAs preserving `startGuided()` and `startQuick()`
- Journey section with `id="how-it-works"`
- Comparison section with real cards vs random generators
- Journal/Premium section with `id="journal"` and `id="premium"` targets
- Final CTA preserving both CTA handlers

- [ ] **Step 2: Sync embedded template in `index.html`**

Replace only the content inside:

```html
<template id="template-welcome">
...
</template>
```

with the exact content of `templates/welcome.html`.

- [ ] **Step 3: Run homepage test**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\homepage-ui.ps1
```

Expected: PASS with `homepage-ui regression passed`.

## Task 3: Ritual Stage Homepage Styling

**Files:**
- Modify: `src/premium-theme.css`
- Generated: `css/premium.css`

- [ ] **Step 1: Add homepage-specific styling**

Add CSS for:

- Cinematic full-height homepage shell
- Transparent/glass header
- Ritual table hero with CSS atmospheric background and code-native cards
- Gold primary CTA and outlined secondary CTA
- Four-step journey cards connected by constellation lines
- Real-cards comparison panels
- Journal and premium editorial section
- Final night-sky CTA
- Mobile stack layout
- `prefers-reduced-motion` support

- [ ] **Step 2: Compile CSS**

Run:

```powershell
npm run build:css
```

Expected: PASS and `css/premium.css` updated.

- [ ] **Step 3: Run homepage test**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\homepage-ui.ps1
```

Expected: PASS with `homepage-ui regression passed`.

## Task 4: Full Verification and Commit

**Files:**
- Verify all modified files

- [ ] **Step 1: Run full build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 2: Run full regression suite**

Run:

```powershell
npm test
```

Expected: PASS with:

- `worker activation regression passed`
- `monetization-config regression passed`
- `journal-ui regression passed`
- `reading-actions regression passed`
- `homepage-ui regression passed`

- [ ] **Step 3: Start static preview**

Run:

```powershell
npm run serve
```

Expected: the app is available at `http://127.0.0.1:4173/`.

- [ ] **Step 4: Manually verify homepage flows**

Open `http://127.0.0.1:4173/` and verify:

- Homepage first viewport matches the Ritual Stage direction.
- `Start a Free Reading` enters the guided reading flow.
- `Upload a Spread` opens the quick upload flow.
- Settings icon opens the existing settings modal.
- Header anchors scroll to the homepage sections.
- Mobile width has no obvious text overlap or clipped CTAs.

- [ ] **Step 5: Commit implementation**

Run:

```powershell
git add package.json tests/homepage-ui.ps1 templates/welcome.html index.html src/premium-theme.css css/premium.css
git commit -m "feat: redesign homepage as ritual stage"
```

## Self-Review Notes

- Spec coverage: homepage structure, visual system, handlers, template sync, mobile, and regression coverage are represented.
- Placeholder scan: no placeholders or deferred implementation steps.
- Type consistency: no new JavaScript APIs are introduced; existing handler names remain unchanged.
