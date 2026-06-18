# Arcana Codex Operating Guide

## Mission

Maintain Arcana as a calm, premium reflection tool for people using real tarot or
playing cards. Preserve the physical-card ritual: users draw and arrange their
own cards; Arcana helps identify, interpret, save, and reflect on the spread.

## Non-negotiables

- Keep the browser app static: HTML, CSS, plain global JavaScript, and the
  existing small TypeScript/Tailwind build. Do not introduce React, Vue, Vite,
  or another runtime framework unless explicitly requested.
- Do not turn Arcana into an automatic/random card-drawing app.
- Preserve existing routes, element IDs, handlers, storage keys, premium gates,
  pricing, and reading behavior unless the task explicitly changes them.
- Treat AI readings as reflective guidance, never guaranteed prediction or
  medical, legal, financial, or mental-health advice.
- Keep manual card review and classic offline readings available; AI card
  recognition can be wrong.

## Architecture at a glance

- `index.html` is the static shell and contains embedded fallback templates and
  spread data for `file://` use.
- `templates/*.html` are fetched when served over HTTP(S).
- Runtime code is ordered global JavaScript under `js/`; it is not a module app.
- `src/premium-theme.css` builds to `css/premium.css`.
- `src/ai-identification.ts` builds to `js/ai-identification.js`.
- `server/cloudflare-worker.js` supplies Gumroad activation/webhooks and an
  optional hosted Gemini proxy. The frontend itself remains statically hosted.
- Browser state, settings, readings, journal entries, and premium state use
  `localStorage`; there is no user account database.

Consult the relevant sections of [`ARCHITECTURE.md`](ARCHITECTURE.md) before
changing flows, state, AI, monetization, persistence, template mechanics, build
behavior, or shared styling. Do not load the entire document when one section is
enough.

## High-value file map

- `index.html`: app shell, metadata, embedded templates/data, CSS/script order
- `templates/`: external screen and modal markup
- `js/ui.js`: rendering, routing, workflows, sharing, journal UI
- `js/reading-engine.js`: AI/classic reading prompts and output
- `js/state.js`: mutable application state
- `js/storage.js`: settings, autosave, reading persistence
- `js/subscription.js`: entitlements, activation UI, usage, narration
- `js/ai.js`: direct Gemini calls and Worker proxy fallback
- `js/config.js`: public runtime endpoints and local configuration
- `server/cloudflare-worker.js`: activation, webhook, and AI proxy endpoints
- `src/premium-theme.css`: authoritative Ritual Stage/Ritual Shell styles
- `tests/`: architecture-sensitive regression contracts
- `docs/superpowers/specs/`: approved design intent
- `design-qa.md`: browser and visual QA evidence

## Editing rules

1. When changing a screen/modal template, update both `templates/<name>.html`
   and its matching `<template id="template-<name>">` in `index.html`.
2. When changing spreads, keep `data/spreads.json` and embedded
   `#spreads-data` synchronized.
3. Edit generated assets through their sources:
   - `src/premium-theme.css` -> `npm run build:css`
   - `src/ai-identification.ts` -> `npm run build:ts`
4. Commit generated assets because production can run without a build server.
5. Respect global script load order. Do not add `import`/`export` to browser
   runtime files.
6. Prefer existing shared Ritual classes and component patterns over one-off
   CSS. Preserve semantic buttons, focus states, mobile touch targets,
   reduced-motion behavior, and print styles.
7. Preserve unrelated user changes. Do not perform broad refactors while
   handling a focused task.

## Security and data

- Never place private Gemini keys, webhook secrets, or activation allow-lists in
  browser code or documentation.
- A user-supplied Gemini key is stored locally in `arcana_settings`; do not log
  or expose it.
- Premium must be verified through the Worker/Gumroad flow, not trusted from a
  hardcoded browser key.
- Treat uploaded spread photos and journal content as private browser data.
- Public endpoint/product identifiers already in `js/config.js` and the Worker
  are configuration, not secret credentials.

## Verification

Run checks proportional to the change. Before claiming completion, use fresh
evidence:

```powershell
npm run build
npm test
node --check js\ui.js
node --check js\reading-engine.js
git diff --check
```

- `npm test` already compiles TypeScript and runs Worker, monetization, journal,
  reading-action, homepage, and app-shell regressions.
- Run `node --check` for every edited plain JavaScript file.
- For UI work, preview with `npm run serve` and verify desktop plus a 390px
  mobile viewport, keyboard focus, overflow, and console errors.
- Ensure external and embedded templates remain identical.

## Context routing

- Ordinary focused edit: start with this file and the directly affected source.
- Architecture/data-flow change: read `ARCHITECTURE.md`.
- Visual redesign or interaction change: read the relevant approved file under
  `docs/superpowers/specs/` and `design-qa.md`.
- Existing planned work: read the matching file under
  `docs/superpowers/plans/`.
- Do not load every document by default; pull deeper context only when relevant.

## Definition of done

The requested behavior or documentation is complete, source and generated files
are synchronized, relevant tests pass, UI changes are browser-checked when
applicable, no secrets are introduced, and the final diff contains no unrelated
changes.
