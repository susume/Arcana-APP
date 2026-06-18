# Arcana Ritual Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the approved Ritual Stage homepage design across all remaining Arcana Guide screens and modals without changing product behavior.

**Architecture:** Keep the existing static vanilla JavaScript SPA. Add purpose-specific classes to external and embedded HTML templates, then implement the shared Ritual Shell as an isolated CSS layer in `src/premium-theme.css` and compile it to `css/premium.css`.

**Tech Stack:** Static HTML templates, vanilla JavaScript handlers, Tailwind CLI CSS build, PowerShell regression tests, in-app browser verification.

---

## File Structure

- Modify: `tests/app-shell-ui.ps1` — protects required screen/modal classes and embedded-template synchronization.
- Modify: `package.json` — keeps the app-shell regression in the complete test command.
- Modify: `templates/*.html` — adds visual-purpose classes without changing handlers or data attributes.
- Modify: `index.html` — mirrors all changed external templates.
- Modify: `src/premium-theme.css` — owns the Ritual Shell visual system, responsive behavior, and motion.
- Generate: `css/premium.css` — compiled production stylesheet.
- Modify: `design-qa.md` — records browser verification and remaining intentional deviations.

### Task 1: Ritual Shell Markup Contract

**Files:**
- Test: `tests/app-shell-ui.ps1`
- Modify: `package.json`
- Modify: `templates/concerns.html`
- Modify: `templates/card-system.html`
- Modify: `templates/choose-reading.html`
- Modify: `templates/reflection.html`
- Modify: `templates/placement.html`
- Modify: `templates/overview.html`
- Modify: `templates/results.html`
- Modify: `templates/history.html`
- Modify: `templates/quick.html`
- Modify: `templates/settings.html`
- Modify: `templates/help.html`
- Modify: `index.html`

- [ ] **Step 1: Run the app-shell regression and verify it fails**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\app-shell-ui.ps1
```

Expected: FAIL because the required `ritual-screen` and `ritual-modal` classes are absent.

- [ ] **Step 2: Add purpose-specific root classes**

Apply these exact class contracts to both external and embedded templates:

```text
screen-concerns     -> screen ritual-screen ritual-screen-focus
screen-card-system  -> screen ritual-screen ritual-screen-choice
screen-spread       -> screen ritual-screen ritual-screen-choice
screen-reflection   -> screen ritual-screen ritual-screen-focus
screen-card-entry   -> screen ritual-screen ritual-screen-workspace
screen-overview     -> screen ritual-screen ritual-screen-review
screen-reading      -> screen ritual-screen ritual-screen-reading
screen-history      -> screen ritual-screen ritual-screen-archive
screen-quick        -> screen ritual-screen ritual-screen-workspace
modal-settings      -> modal ritual-modal ritual-settings-modal
modal-help          -> modal ritual-modal ritual-help-modal
```

Do not modify IDs, handlers, fields, or `data-*` attributes.

- [ ] **Step 3: Extend the regression to verify embedded templates**

For every external template, extract its matching `<template id="template-*">` content from `index.html` and assert exact trimmed equality. Keep the existing class assertions.

- [ ] **Step 4: Run the focused regression**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\app-shell-ui.ps1
```

Expected: `app-shell-ui regression passed`.

- [ ] **Step 5: Commit the markup contract**

Commit only the test, package script, templates, and synchronized `index.html`.

### Task 2: Shared Ritual Shell Styling

**Files:**
- Modify: `src/premium-theme.css`
- Generate: `css/premium.css`

- [ ] **Step 1: Add the shared shell**

Create an isolated final CSS layer covering:

- Cosmic screen background and ornamental frame
- Purpose-based width variants
- Serif heading hierarchy and gold title rule
- Gold step indicators
- Antique-gold primary buttons and refined secondary buttons
- Inputs, selects, chips, tabs, toggles, upload zones, and navigation rows
- Artifact-like choice and overview cards
- Focus-screen breathing and preparation treatment
- Workspace upload/manual-entry layout
- Reading manuscript typography and journal surface
- Archive rows
- Settings/help modal treatment
- Visible focus states and disabled states
- Reduced-motion behavior

Scope new selectors beneath `.ritual-screen` or `.ritual-modal` wherever practical so the approved homepage remains unchanged.

- [ ] **Step 2: Add intentional mobile composition**

At `760px` and below:

- Remove nonessential outer framing
- Reduce screen padding without shrinking touch targets
- Stack navigation and settings actions
- Keep card-entry rows operable
- Keep upload zones and modals within the viewport
- Preserve long-form reading size and line height
- Prevent horizontal overflow

- [ ] **Step 3: Compile CSS**

Run:

```powershell
npm run build:css
```

Expected: exit code 0 and updated `css/premium.css`.

- [ ] **Step 4: Run build and regressions**

Run:

```powershell
npm run build
npm test
```

Expected: both commands exit 0 and all regression scripts pass.

- [ ] **Step 5: Commit the shared visual system**

Commit `src/premium-theme.css` and generated `css/premium.css`.

### Task 3: Browser Verification and Refinement

**Files:**
- Modify as required: `src/premium-theme.css`
- Generate as required: `css/premium.css`
- Modify: `design-qa.md`

- [ ] **Step 1: Start or reuse the local preview**

Open `http://127.0.0.1:4173/` in the in-app browser.

- [ ] **Step 2: Verify desktop workflows**

At the standard desktop viewport, inspect:

- Homepage regression
- Concerns
- Card system
- Spread selection and advanced expansion
- Reflection
- Guided placement, upload, and manual tabs
- Overview
- Reading and journal
- History
- Quick upload
- Settings
- Help

Fix visible hierarchy, overflow, control, and interaction issues as they are found.

- [ ] **Step 3: Verify mobile workflows**

Set the browser viewport to 390 pixels wide and inspect the same screens and modals. Fix wrapping, clipping, overflow, spacing, and touch-target issues.

- [ ] **Step 4: Record the fidelity ledger**

Update `design-qa.md` with:

- Browser and viewport methods
- Homepage comparison result
- At least five inspected design-system points
- Material mismatches found and fixed
- Console result
- Remaining intentional deviations

- [ ] **Step 5: Run final verification**

Run:

```powershell
npm run build
npm test
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit browser refinements**

Commit final CSS, generated CSS, and `design-qa.md`.

## Self-Review

- Spec coverage: every screen family, both modals, responsive behavior, accessibility, template synchronization, build, regressions, and browser QA are assigned to a task.
- Placeholder scan: no deferred implementation language remains.
- Contract consistency: class names exactly match the existing failing app-shell regression and the approved design specification.
