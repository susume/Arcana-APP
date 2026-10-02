# Arcana Homepage Design QA

## Source

- Approved reference: `C:\Users\admin\AppData\Local\Temp\codex-clipboard-45942ecc-d677-41bb-a3fc-94da5638bcbf.png`
- Rendered target: `http://127.0.0.1:4183/`
- Comparison viewport: 864px wide

## Result

The rebuilt homepage matches the approved reference's cinematic hero, gold/ivory typography, four-step photographic journey, paired comparison cards, journal band, and centered final CTA.

### P0-P2

None.

### P3

- Cropped photographic details have slight softness because the approved source is a raster screenshot.
- The live hero copy is marginally tighter than the reference to preserve responsive behavior and working controls.

## Validation

- Desktop reference-width layout has no horizontal overflow.
- Mobile 390px layout has no horizontal overflow.
- Primary reading CTA opens the spread selection flow.
- Settings gear opens the Reading Settings modal.
- Browser console has no warnings or errors.

final result: passed

---

# Arcana Ritual Shell Refinement QA

## Scope

- Restored the visible homepage Journal action and added the shared Journal utility to product screens.
- Converted primary selection surfaces to semantic buttons without changing handlers.
- Added reading loading/ready visibility states for result-only controls.
- Improved mobile copy contrast and added a safe-area-aware sticky action dock.
- Added restrained screen-family lighting and consolidated the Ritual Shell CSS.

## Browser Verification

- Live target: `http://127.0.0.1:4173/`
- In-app browser: default desktop viewport and 390x844 mobile viewport.
- Static visual fallback: local headless Chromium at 1280x900 and 390x844 because the in-app screenshot channel timed out.

### Results

- Homepage Journal CTA renders as `inline-flex`, remains fully visible, and preserves the existing history route.
- Product screens expose a compact Journal utility without horizontal overflow.
- Recommended spread is a semantic `button`, accepts selection, and visibly enters the selected state.
- Mobile spread copy renders at 14.5px with brighter muted text.
- Mobile navigation computes to `position: sticky` and `bottom: 0px`; the safe-area padding declaration remains active.
- Desktop life-stage selection displays the complete `Prefer not to say` value.
- Reading result-only controls compute to `display: none` before the screen is ready.
- Desktop and mobile document horizontal overflow measured 0px.
- Browser warning/error log remained empty during homepage and spread checks.

## Evidence Notes

- Desktop homepage and spread screenshots were inspected for hierarchy, clipping, contrast, and atmosphere.
- Mobile spread screenshot and computed layout checks were inspected for wrapping, touch sizing, utility placement, and overflow.
- The in-app browser completed real homepage-to-spread navigation, recommended spread selection, reflection navigation, and guided card-placement interactions before its CDP channel became intermittent.

final result: passed

---

# Arcana Ritual Shell Design QA

## Source and Method

- Visual source of truth: `docs/superpowers/specs/assets/arcana-ritual-stage-homepage-concept.png`
- Live target: `http://127.0.0.1:4173/`
- Interactive browser verification: in-app browser at 1280x900 and 390x844
- Static pixel captures: local headless Chrome at 1280x900 and 500x900
- The in-app screenshot channel timed out, so headless Chrome was used only for static visual evidence; all interaction and responsive-state checks remained in the in-app browser.

## Screens and Flows Verified

- Homepage remained unchanged and retained the approved Ritual Stage composition.
- Spread selection, recommended selection, and advanced-spread expansion.
- Preparation/reflection screen.
- Guided placement, upload-photo tab, and manual-entry tab.
- Mobile card picker and three-card manual entry.
- Spread overview and reading generation.
- Classic reading manuscript and Premium Journal.
- Quick upload workflow.
- History empty state.
- Settings and help modals.

## Fidelity Ledger

1. **Palette and atmosphere**
   - Reference: deep navy-black field, antique gold, ivory typography, moon and star details.
   - Render: product screens use the same cosmic field, gold ornamental frame, moonlight, stars, and restrained purple illumination.
   - Result: matched.

2. **Typography**
   - Reference: editorial serif display type with compact sans-serif utility copy.
   - Render: screen titles, choice names, reading sections, and modal headings use the display family; labels and controls use the UI family.
   - Fix made: excluded Ritual Shell screens from older 72px desktop and 58px mobile title rules.

3. **Controls**
   - Reference: gold primary actions and quiet outlined secondary controls.
   - Render: primary actions, selection cues, tabs, fields, chips, and navigation use the same gold hierarchy.
   - Result: matched without changing handlers.

4. **Container model**
   - Reference: open cinematic bands with a small number of purposeful framed surfaces.
   - Render: each workflow has one ceremonial shell with restrained internal panels; choice rows and work areas are grouped without nested-card overload.
   - Result: matched.

5. **Workspace clarity**
   - Reference: ritual table and spread are the focus.
   - Render: placement uses a wider worktable shell; guided, upload, and manual modes remain distinct and card-entry rows stay operable.
   - Result: matched.

6. **Reading experience**
   - Reference: premium oracle/book atmosphere.
   - Render: classic reading copy uses a manuscript measure and serif rhythm; journal treatment continues the homepage's tactile premium language.
   - Result: matched.

7. **Responsive behavior**
   - Render at 390x844: zero document horizontal overflow on spread, reflection, placement, quick upload, overview, results, history, settings, and help.
   - Fix made: legacy mobile title scaling was removed from Ritual Shell screens.
   - Manual card-entry rows became a two-column mobile grid with full-width position labels.

8. **Form readability**
   - Fix made: widened the desktop life-stage select so `Prefer not to say` is not clipped; it remains full-width on mobile.

## Interaction and Console Results

- Recommended spread selection visibly entered the selected state.
- Advanced readings expanded to reveal all premium spread choices.
- Guided, upload, and manual tabs changed real visible state.
- Three manual cards were selected through the real card picker.
- Review generated the real reading screen.
- Classic Reading replaced the AI loading state with four reading sections.
- Settings and help opened and remained scrollable.
- Browser warning/error log: empty.

## Responsive Measurements

- Desktop Ritual Shell width: 900px.
- Desktop workspace and reading width: 1080px.
- Mobile shell width: full 390px viewport.
- Mobile navigation buttons: 46px high and full width where grouped.
- Mobile upload zone: 358px wide by 160px high.
- Mobile manual-entry rows: 358px wide with no horizontal overflow.
- Mobile reading text: 18px with a 32.04px line height.

## Remaining Intentional Deviations

- Product screens extend the homepage design system rather than copying its photographic hero imagery. Dense workflows use atmospheric CSS and real tarot-card assets so controls remain readable.
- No new animation runtime was added; motion remains CSS-only to preserve the current architecture and performance.

final result: passed

## Quiet Atelier audit — 2026-10-02

The user authorized a redesign across all Arcana pages. Quiet Atelier replaces
indigo/celestial surfaces with parchment, forest ink, sage panels, brass accents,
and a shared utility header. Existing routes, physical-card behavior, premium
pricing, and static architecture remain intact.

Accepted screenshots and findings: [full audit](docs/qa/2026-10-02/audit.md).
Implementation intent: [theme specification](docs/superpowers/specs/2026-10-02-quiet-atelier-design.md).

- Verified desktop 1280px and mobile 390px layouts across the main routes; zero
  document horizontal overflow in recorded measurements.
- Exercised guided selection, physical/manual card entry, picker, overview edits,
  AI text generation, Classic mode, save/reopen, journal, share comment preview,
  settings, and help.
- Fixed storage failure feedback, resumed control state, late AI/photo responses,
  single-completion usage, dialog focus, nested picker semantics, and canvas
  helper collision / asynchronous rendering.
- Final share canvas displays card fallback names and the current comment.
- Settings/picker Escape returns focus to the opening control. Final clean
  browser warning/error logs are empty.
- Fresh build, full regression suite, edited JavaScript syntax checks, and diff
  whitespace checks pass. External and embedded templates are synchronized.
- Live payment/activation, personal photo recognition, screen-reader compliance,
  OS printing, and voice playback were not exercised. Parser and Worker behavior
  are covered by the existing automated regressions. Changes remain local.

final result: passed within the documented verification scope

## Quiet Atelier imagery and supplied logo — 2026-10-02

- Replaced all eight decorative homepage images: two generated daylight photos
  plus six original sage/brass SVG illustrations. Physical-card reference art in
  reading flows remains recognizable and unchanged.
- Integrated the supplied horizontal Arcana Guide logo into the homepage and
  shared app headers, preserving alpha and original gold/navy artwork. Added the
  stacked logo as a small favicon export.
- Optimized web photos/header logo as WebP, retained source assets and exact
  generation prompts, and added lazy loading below the fold.
- Fixed the legacy hero image minimum height so all three cards fit the arch.
  Comparison illustrations use contained proportions instead of clipping.
- Desktop 1280px and mobile 390px checks: images load, no document horizontal
  overflow, product utility buttons remain reachable, and console logs are clean.
- Accepted screenshots: `44-imagery-home-desktop.jpg`,
  `45-imagery-journey-desktop.jpg`, `46-imagery-home-mobile.jpg`, and
  `47-imagery-app-mobile.jpg` in
  `docs/qa/2026-10-02/`. Asset notes: `assets/homepage/atelier/README.md`.
- Fresh build, regression suite, JavaScript syntax checks, and diff whitespace
  checks passed after the imagery and logo changes. Changes remain local.

## Reading-engine homepage copy — 2026-10-02

- Replaced the real-card/random-generator comparison with an explanation of the
  ArcanaGuide reading engine: question, spread position, orientation, cross-card
  patterns, central message, practical guidance, and reflection questions.
- Claims were checked against `buildAIReadingPrompt()` and its output schema in
  `js/reading-engine.js`. The copy does not promise prediction or superior accuracy.
- Removed plus/minus badges and comparison illustrations. Two readable panels
  now give equal emphasis to contextual interpretation and useful reflection.
- Desktop 1280px and mobile 390px show readable copy, correctly stacked panels,
  and zero document horizontal overflow. Browser warning/error logs are empty.
- Screenshots: `49-reading-engine-desktop.jpg`,
  `50-reading-engine-mobile-context.jpg`, and
  `51-reading-engine-mobile-reflection.jpg` in `docs/qa/2026-10-02/`.
- Fresh build, full regression suite, JavaScript syntax checks, and diff whitespace
  checks passed. Embedded and external templates are synchronized. Changes are local.

## Three-benefit sales pitch — 2026-10-02

- Simplified the homepage into personal readings, a remembered journey, and a
  printable infographic keepsake. The three-image benefit gallery now comes
  directly after the hero. Hero, workflow, Premium offer, and closing copy were
  shortened and aligned with the same benefits.
- New generated reading/keepsake images use the existing daylight, sage, brass,
  and paper palette. Originals and exact prompts are preserved; 1000px WebP
  exports are approximately 182KB and 167KB. Journal art is reused.
- Cards have arched image tops and short benefit statements. A compact offer
  replaces the duplicate journal-photo promotion; existing pricing and gates
  remain in place. Journal's Premium status is visible in the gallery.
- Fixed inherited pale description text and clipped pricing in the offer. Both
  now render visibly in forest ink, including the $29 lifetime price.
- At 1280px the three cards share one row; at 390px they stack. Images load,
  page IDs are unique, and measured document horizontal overflow is zero.
- Keyboard Enter on Why Arcana reaches the benefit section with visible focus.
  Start a Free Reading opens the guided flow. Explore Premium opens the existing
  upgrade dialog; Escape closes it and restores the opening button's focus.
- Screenshots are saved as `52-benefit-pitch-hero-desktop.jpg`,
  `53-benefit-pitch-desktop.jpg`, `54-benefit-pitch-mobile-reading.jpg`, and
  `55-benefit-pitch-mobile-keepsake.jpg` in `docs/qa/2026-10-02/`.
- Offer and hero mobile evidence: `56-benefit-pitch-offer-mobile.jpg` and
  `57-benefit-pitch-hero-mobile.jpg`. Browser warning/error logs are empty.
- Fresh build, full regressions, JavaScript syntax checks, and diff whitespace
  checks pass. External and embedded templates remain synced. Changes are local.

## Pay-what-you-want pricing — 2026-10-03

- Updated the homepage, Settings, and upgrade modal from the fixed $29 price to
  a one-time Premium lifetime unlock starting at $5, with a $20 suggested
  contribution. Every contribution amount unlocks the same Premium features.
- Added the try-before-buy invitation and all-sales-final/no-refunds policy,
  qualified by applicable law and Gumroad's policies, on each purchase surface.
- Kept Gumroad purchase links, activation, free daily usage, and Premium gates.
  Actual checkout pricing and refund settings remain configured on Gumroad.
- Fixed inherited dark backgrounds behind the upgrade feature list so its forest
  text is readable on sage surfaces in Quiet Atelier.
- Desktop 1280px and mobile 390px previews show readable pricing and no document
  horizontal overflow. Settings and the upgrade dialog remain scrollable.
  Escape closes the upgrade dialog and restores focus to its opening button.
  Browser warning/error logs are empty.
- Screenshots in `docs/qa/2026-10-03/`: `pricing-desktop.jpg`,
  `pricing-mobile.jpg`, `upgrade-desktop.jpg`, `upgrade-mobile.jpg`, and
  `settings-mobile.jpg`.
- Fresh build, full regressions, JavaScript syntax checks, and diff whitespace
  checks pass. External and embedded templates are synchronized. Changes are local.

## Live founder activation deployment — 2026-10-03

- The production Worker was running an older version without founder activation.
  Added the private `ARCANA_ENTITLEMENT_SECRET` binding with user approval and
  deployed the existing tested `server/cloudflare-worker.js` to
  `ancient-smoke-2917`; active version is `df2fb356`.
- The approved founder key returns HTTP 200 with a signed Premium entitlement.
  An invalid founder key returns HTTP 403. Hosted AI returned HTTP 200 in a
  smoke check. No raw keys, signing secret, or entitlement tokens are recorded.
- Activation through Settings on `https://www.arcanaguide.com/` confirms
  "Premium activated on this browser." Evidence:
  `docs/qa/2026-10-03/founder-activation-live.jpg`.
- Full regressions and Worker syntax checks passed. This deployment updates
  the backend; the pay-what-you-want frontend copy remains local.
