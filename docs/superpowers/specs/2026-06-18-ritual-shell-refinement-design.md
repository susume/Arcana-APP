# Arcana Ritual Shell Refinement Design

## Goal

Polish the completed Ritual Shell for readability, accessibility, navigation, and maintainability while preserving all existing reading, premium, storage, AI, and payment behavior.

## Approved Direction

Use a focused refinement rather than another redesign:

- Keep the existing cosmic palette, typography, imagery, and layout identity.
- Improve mobile body text to a 14–15px minimum and brighten secondary copy.
- Make long guided screens easier to complete with a sticky mobile Back/Continue action dock.
- Restore a visible homepage Journal action and add Journal access to the product shell.
- Give screen families restrained distinguishing motifs without adding more panels.
- Replace key clickable `div`/`span` controls with semantic buttons.
- Hide result-only actions until reading content is ready.
- Remove the duplicated final CSS cascade-lock block and keep one authoritative Ritual Shell layer.

## Journal Access

The homepage `Open Tarot Journal` control must be visible. It keeps the existing
`goScreen('screen-history')` handler and premium entitlement behavior.

Every non-homepage screen receives a compact `Journal` utility button through the
shared application shell. It uses the same history route and premium gate. The
button must remain visible when locked so users can discover the feature and open
the existing upgrade modal.

## Mobile Navigation

At 760px and below, `.nav-row` on guided workflow screens becomes a sticky bottom
action dock. It uses a dark translucent surface, safe-area padding, and full-width
buttons. Desktop navigation remains in normal document flow.

## Accessibility

Convert primary selection and toggle surfaces to `<button type="button">`:

- Deck choices
- Reading choices and advanced-spread toggle
- Concern topic chips
- Placement tabs
- Reflection prompts already remain buttons

Preserve existing classes, handlers, data attributes, and visible copy. Add CSS
resets so semantic buttons retain the approved visual appearance.

## Reading Readiness

The static journal and reading-actions containers begin hidden. `generateReading`
and AI/classic mode switching mark the reading screen loading before work begins.
`renderReading` marks it ready and reveals result-only controls. Error states keep
result-only controls hidden until actual reading content exists.

Quick-upload results already append controls after completion and retain that flow.

## Visual Refinement

Screen families receive one subtle identity cue:

- Focus: violet halo
- Choice: gold radial glint
- Workspace: teal table glow
- Review: archival gold top light
- Reading: warm manuscript light
- Archive: cool moonlit glow

These cues use background illumination only; they do not create new cards or copy.

## CSS Maintenance

Integrate necessary final-lock declarations into the main Ritual Shell section,
then delete the duplicated `Final cascade lock for product screens` block.
Legacy global selectors must exclude `.ritual-screen` where necessary.

## Verification

- Regression tests protect Journal visibility, semantic buttons, loading/ready
  state hooks, sticky mobile navigation, and external/embedded template sync.
- Run `npm run build`, `npm test`, and `git diff --check`.
- Browser-check desktop and 390px mobile spread, placement, reading loading/ready,
  Journal access, and keyboard focus.
