# Arcana Codex Context and Architecture Documentation Design

## Goal

Create a low-context instruction system for Codex and replace the outdated
architecture reference with a current, code-backed description of Arcana.

The documentation should let Codex begin ordinary work with a small amount of
always-loaded context, then consult the detailed architecture only when the task
requires it.

## Deliverables

### `AGENTS.md`

Add a very small repository entry point that Codex discovers automatically.

It should:

- Direct Codex to read and follow `system.md`.
- Avoid duplicating project rules or architecture.
- Keep the always-loaded discovery layer as small as possible.

### `system.md`

Add a concise operating guide intended to be read in every Codex session.

It should cover only high-value instructions:

- Product identity: Arcana is a reflective tarot tool built around real,
  physical cards.
- Runtime shape: static HTML, CSS, and global JavaScript with a small build step.
- Product and architecture constraints that should not be changed accidentally.
- The files most likely to matter during normal work.
- The external-template and embedded-template synchronization rule.
- Generated CSS and JavaScript asset rules.
- Existing coding patterns and preservation requirements.
- Build, test, syntax-check, and diff-check commands.
- Security and privacy constraints for Gemini keys, license activation, and
  local browser data.
- A short routing table showing when to read `ARCHITECTURE.md`, design specs,
  plans, or QA notes.

The guide should be compact enough to reduce context pressure. It should link to
details rather than restating the full architecture.

### `ARCHITECTURE.md`

Rewrite the architecture document as the detailed source of truth for the
current repository.

It should be based on current code, configuration, templates, tests, and recent
approved design work rather than preserving stale descriptions.

## Architecture Document Structure

The refreshed document should include:

1. Product and system overview
2. Runtime and deployment topology
3. Technology stack
4. Current visual system and Ritual Stage/Ritual Shell direction
5. Repository layout
6. Build, preview, and generated assets
7. Static application shell and script load order
8. Dual-source template and spread-data strategy
9. Routing, screen families, and utility modals
10. Guided and quick reading flows
11. Global state and imperative UI lifecycle
12. Card systems, spreads, and card-entry modes
13. Gemini configuration, direct calls, proxy fallback, and identification
14. Reading generation and reading-ready UI states
15. Journal, history, sharing, printing, and narration
16. Premium entitlements, Gumroad activation, and Worker endpoints
17. Persistence keys and record shapes
18. Homepage, search metadata, and visual assets
19. CSS architecture and responsive/accessibility conventions
20. Test suite and recommended verification
21. Non-negotiable implementation constraints

## Accuracy Corrections

The rewrite must correct outdated or contradictory claims, including:

- Arcana has a static frontend, but it now also has a Cloudflare Worker for
  premium activation, Gumroad webhook handling, and optional hosted AI proxying.
- The frontend supports direct user-supplied Gemini keys and can fall back to
  the configured Worker proxy.
- The current design includes the image-led Ritual Stage homepage and shared
  Ritual Shell across product screens and modals.
- The test suite includes Worker activation, monetization configuration,
  homepage, app-shell, journal, and reading-action regressions.
- Reading result-only controls are hidden until content is ready.
- Non-homepage screens include a shared Journal utility.
- The current package scripts and generated assets must match `package.json`.

When documentation and code disagree, the current code and tests take priority.
Approved recent specs may clarify intended design behavior, but they must not
override working runtime behavior without explicit evidence.

## Context-Efficiency Rules

- Keep `AGENTS.md` tiny.
- Keep `system.md` concise and directive.
- Put descriptive detail in `ARCHITECTURE.md`.
- Do not repeat large file inventories, data shapes, or flow explanations in
  both `system.md` and `ARCHITECTURE.md`.
- Point to exact source files for deeper investigation.
- Prefer stable architectural rules over volatile line-by-line descriptions.
- Exclude implementation history unless it explains a current constraint.

## Preservation and Safety

Documentation work must not change runtime behavior.

Do not expose or introduce secrets. Public configuration values already present
in the repository may be described by purpose, but the architecture should
avoid encouraging hardcoded private keys or browser-side activation secrets.

Existing unrelated user changes must be preserved.

## Verification

After implementation:

- Confirm `AGENTS.md` points to `system.md`.
- Check that `system.md` is concise and contains the core operating rules.
- Cross-check architecture claims against source files, `package.json`, and
  tests.
- Search for stale contradictions such as “no backend,” incomplete test lists,
  or obsolete homepage descriptions.
- Run `npm test` to ensure documentation changes did not disturb generated or
  runtime files.
- Run `git diff --check`.

## Acceptance Criteria

- Codex automatically discovers the repository instructions through
  `AGENTS.md`.
- The default context guide is compact, actionable, and avoids architecture
  duplication.
- `ARCHITECTURE.md` accurately describes the current frontend, Worker services,
  product flows, visual system, monetization, persistence, and tests.
- The three documents have clear, non-overlapping responsibilities.
- No runtime behavior or unrelated files are changed.
