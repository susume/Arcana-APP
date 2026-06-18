# Arcana Ritual Shell Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Ritual Shell readability, navigation, accessibility, Journal discoverability, result readiness, and CSS maintainability.

**Architecture:** Preserve the vanilla SPA and existing handlers. Add regression contracts first, update synchronized templates and small UI state helpers, then consolidate the scoped Ritual Shell CSS and verify rendered behavior.

**Tech Stack:** Static HTML, vanilla JavaScript, Tailwind CLI CSS build, PowerShell regressions, in-app browser.

---

### Task 1: Regression Contracts

**Files:**
- Modify: `tests/homepage-ui.ps1`
- Modify: `tests/app-shell-ui.ps1`
- Modify: `tests/reading-actions.ps1`

- [ ] Assert the homepage Journal button exists and is not hidden by the theme.
- [ ] Assert key selection surfaces are semantic buttons.
- [ ] Assert reading loading/ready helpers and hidden result-only markup exist.
- [ ] Assert sticky mobile navigation and mobile readability declarations exist.
- [ ] Run focused tests and confirm they fail for the missing refinements.

### Task 2: Journal, Semantics, and Readiness

**Files:**
- Modify: `templates/welcome.html`
- Modify: `templates/card-system.html`
- Modify: `templates/choose-reading.html`
- Modify: `templates/concerns.html`
- Modify: `templates/placement.html`
- Modify: `templates/results.html`
- Modify: `index.html`
- Modify: `js/reading-engine.js`
- Modify: `js/ui.js`

- [ ] Restore the visible homepage Journal action.
- [ ] Add the shared Journal utility to non-homepage screens.
- [ ] Convert static selection/toggle surfaces to buttons.
- [ ] Add reading loading/ready state transitions.
- [ ] Keep external and embedded templates synchronized.
- [ ] Run focused regressions until green.

### Task 3: Consolidated Visual Refinement

**Files:**
- Modify: `src/premium-theme.css`
- Generate: `css/premium.css`

- [ ] Raise mobile body copy and muted contrast.
- [ ] Add sticky mobile action dock and safe-area spacing.
- [ ] Add restrained screen-family background motifs.
- [ ] Style semantic selection buttons and Journal utility.
- [ ] Fold required cascade-lock declarations into the main Ritual Shell rules.
- [ ] Delete the duplicated final cascade-lock block.
- [ ] Compile CSS and run all regressions.

### Task 4: Browser QA and Completion

**Files:**
- Modify: `design-qa.md`

- [ ] Verify homepage Journal visibility and premium gate.
- [ ] Verify keyboard focus and selection behavior.
- [ ] Verify sticky mobile navigation at 390px.
- [ ] Verify reading actions hidden while loading and shown when ready.
- [ ] Verify desktop/mobile overflow and console health.
- [ ] Run final build, tests, and diff check; commit the refinement.
