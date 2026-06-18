# Arcana Ritual Shell Design

## Summary

Extend the approved Ritual Stage homepage visual language across every remaining Arcana Guide HTML template. This is a presentation and experience-polish pass over the existing static single-page application. It must preserve all current behavior, element IDs, event handlers, forms, premium gates, AI integration, local storage, reading logic, and user workflows.

The completed homepage is the visual source of truth.

## Scope

This specification covers:

- `templates/concerns.html`
- `templates/card-system.html`
- `templates/choose-reading.html`
- `templates/reflection.html`
- `templates/placement.html`
- `templates/overview.html`
- `templates/results.html`
- `templates/history.html`
- `templates/quick.html`
- `templates/settings.html`
- `templates/help.html`
- The corresponding embedded templates in `index.html`
- Shared non-homepage styling in `src/premium-theme.css`
- Generated `css/premium.css`
- Regression coverage for the shared application shell

## Non-Goals

- Do not rebuild the app or replace its vanilla HTML, CSS, and JavaScript architecture.
- Do not change screen IDs, routes, navigation order, click handlers, input IDs, premium attributes, API behavior, storage keys, pricing, or reading logic.
- Do not add new required runtime dependencies or animation libraries.
- Do not rewrite product copy except where a tiny typographic correction is necessary.
- Do not turn every element into a decorative card or introduce unrelated product features.
- Do not redesign the approved homepage.

## Visual Source of Truth

The remaining product should look like it belongs inside the completed Ritual Stage homepage:

- Deep indigo and near-black atmospheric backgrounds
- Antique-gold borders, rules, focus states, and primary controls
- Ivory and moon-silver text
- Editorial serif display typography
- Crisp sans-serif utility and form typography
- Restrained celestial geometry, stars, glows, and orbital motifs
- Translucent ceremonial surfaces with thin borders
- Eight-pixel corner radii and controlled elevation
- Slow, subtle motion that respects reduced-motion preferences

The product should feel sacred and premium without reducing clarity or making ordinary controls difficult to recognize.

## Shared Ritual Shell

Every non-homepage screen receives a shared `ritual-screen` class plus a purpose-specific variant. The first element remains the existing `.screen`, preserving its ID and active-state behavior.

Screen variants:

- `ritual-screen-focus`: questions, intentions, and preparation
- `ritual-screen-choice`: deck and spread selection
- `ritual-screen-workspace`: upload, guided placement, and manual entry
- `ritual-screen-review`: spread confirmation
- `ritual-screen-reading`: generated reading and journal
- `ritual-screen-archive`: saved reading history

Modal variants:

- `ritual-modal ritual-settings-modal`
- `ritual-modal ritual-help-modal`

The shared shell includes:

- A layered cosmic background with quiet radial illumination
- A restrained celestial frame or corner detail
- Consistent content width and vertical rhythm
- Gold-accented step indicators
- Shared heading hierarchy and ornamental divider treatment
- Consistent navigation placement
- Mobile-safe spacing and touch targets

Decorative elements must not intercept clicks, obscure content, or enter the accessibility tree.

## Screen Designs

### Focus Screens

Applies to concerns and reflection.

The concerns screen should feel like setting an intention before a ritual. The main question remains dominant, while the input row and topic chips become calm, tactile controls with clear selected and focus states.

The reflection screen should feel quieter and more spacious. Its breathing element remains functional and becomes the visual center, supported by a subtle halo and an ordered preparation sequence. The screen must avoid excessive ornament that competes with reading the instructions.

### Choice Screens

Applies to card system and spread selection.

Deck and spread choices become artifact-like selection rows rather than generic software cards. Selection must remain unmistakable through a gold border, radio treatment, glow, and check or star cue already supported by the markup.

The recommended spread remains visually prioritized without overpowering other options. Advanced premium spreads retain their collapsed behavior and premium gate. Context fields and disclaimers remain readable and visually secondary to the primary decision.

### Workspace Screens

Applies to guided placement and quick upload.

These are the densest product surfaces and should resemble a refined ritual worktable:

- Tabs become a compact gold-accented mode switcher.
- Upload zones become framed celestial drop areas with clear camera/upload symbolism.
- Guided spread diagrams remain central and legible.
- Manual-entry rows use consistent labels, card selectors, and orientation controls.
- Optional context and dropped-card areas remain visually subordinate.
- Primary continuation controls remain easy to find after long content.

The quick-upload workflow uses the same workspace language but keeps its shorter linear sequence visually obvious.

### Review Screen

The spread overview should present selected cards as treasured artifacts arranged in an orderly archive. Card names, positions, orientations, and correction affordances must remain immediately understandable. The generate-reading action is the clear culmination of the screen.

### Reading Screen

The generated reading should feel like an oracle manuscript, not a software response:

- Reading mode controls remain compact and clearly selected.
- Major reading sections receive consistent editorial headings and gold markers.
- Long-form text retains comfortable measure, line height, and contrast.
- Tarot card imagery and summaries remain visually connected to their interpretation.
- The Premium Journal section continues the tactile book-like treatment introduced on the homepage.
- Save, share, print, voice, and restart actions remain distinct and functional.

Print-specific styles must remain intact and readable.

### Archive Screen

Reading history becomes a quiet celestial archive. Saved readings remain expandable in the same way, while dates, titles, comparison tools, limits, and journal content gain stronger hierarchy. Empty and limited-history states must remain clear without invented data.

### Settings Modal

Settings should feel like an instrument panel housed inside the ritual world, not a separate SaaS form:

- Premium access and AI configuration remain distinct sections.
- License and API-key controls remain recognizable and readable.
- Destructive actions remain visually separated.
- Primary save and activation actions use the gold control system.
- The modal remains scrollable on small screens.

No secret or key value should be exposed through visual changes.

### Help Modal

Help becomes a readable field guide with strong section rhythm. It retains all current educational content and the Gemini key instructions. Long text, lists, and links must be optimized for scanning, with a comfortable reading measure and sticky or reliably accessible close control where existing structure permits.

## Component System

### Typography

- Display headings: the existing self-hosted Cormorant Garamond family
- Body and controls: the existing sans-serif stack
- Main screen titles: large serif, ivory, centered where the workflow already centers them
- Section headings: serif with a restrained gold marker or rule
- Labels and utility text: compact sans-serif with deliberate size and tracking
- Long-form reading copy: serif at a comfortable reading size

Inline heading styles in templates may be replaced by shared classes or overridden by purpose-specific CSS, but visible wording and semantic heading levels remain unchanged.

### Controls

- Primary buttons: antique-gold surface, dark text, subtle highlight and glow
- Secondary buttons: translucent dark surface with fine gold or silver border
- Destructive buttons: restrained red treatment, never visually equivalent to primary actions
- Inputs and selects: dark translucent fields with clear labels and gold focus rings
- Tabs and chips: compact, tactile, and visibly selected
- Buttons retain a minimum touch target appropriate for mobile

### Panels

Panels are used only where they clarify grouped content. The design should avoid nested-card overload. Use open spacing, rules, and background bands where a full container is unnecessary.

### Motion

Use CSS-only motion:

- Screen entrance fade and slight rise
- Slow ambient star or glow movement
- Small selection and hover transitions
- A restrained breathing animation on the preparation screen
- No continuous movement on dense reading or settings content

All nonessential motion is disabled under `prefers-reduced-motion: reduce`.

## Responsive Design

Desktop and mobile receive intentional compositions.

Desktop:

- Maintain a focused reading width rather than stretching forms edge to edge.
- Let workspace screens use additional width where diagrams and card rows benefit.
- Keep primary and secondary actions clearly grouped.

Mobile:

- Reduce decorative framing before reducing content space.
- Stack rows and action groups without clipping or horizontal scrolling.
- Keep controls at comfortable touch sizes.
- Keep modal close controls visible and modal content scrollable.
- Preserve reading typography and avoid excessively small text.
- Ensure upload zones, spread choices, and card-entry controls remain operable at 390 pixels wide.

## Accessibility

- Preserve semantic controls, labels, headings, and button elements.
- Maintain visible keyboard focus for every interactive element.
- Do not use color as the only selected-state signal.
- Keep text contrast strong against atmospheric surfaces.
- Decorative celestial elements use `pointer-events: none` and remain hidden from assistive technology where markup is introduced.
- Preserve `aria-live`, labels, titles, and premium-state semantics already present.
- Respect reduced-motion preferences.

## Implementation Architecture

The app remains a static vanilla JavaScript SPA.

Template strategy:

- Add only visual-purpose classes and minimal nonfunctional decorative wrappers where required.
- Preserve every existing ID, `onclick`, `onchange`, drag/drop handler, `data-*` attribute, and input type.
- Synchronize each changed external template with its embedded counterpart in `index.html`.

Styling strategy:

- Add a dedicated Ritual Shell section to `src/premium-theme.css`.
- Prefer shared primitives and screen variants over one-off selectors.
- Keep homepage selectors isolated so its approved appearance does not regress.
- Compile `css/premium.css` through the existing build command.

Testing strategy:

- Use the existing `tests/app-shell-ui.ps1` contract to verify screen and modal classes.
- Add or extend regression assertions only where they protect IDs, handlers, template synchronization, or required visual classes.
- Do not encode fragile pixel values in regression tests.

## Data Flow and Error Handling

No new data flow or error-handling logic is introduced.

Existing upload errors, AI-key errors, premium states, activation messages, loading states, validation, and empty states must continue to render correctly. New styling must accommodate long error messages, disabled controls, loading indicators, and dynamically generated content without overflow.

## Verification

Automated verification:

- Run `npm run build`.
- Run `npm test`.
- Confirm external and embedded templates remain synchronized.
- Confirm the existing homepage regression still passes.

Browser verification:

- Inspect every screen and modal at desktop width.
- Inspect every screen and modal at a 390-pixel mobile width.
- Exercise the guided reading path from concerns through results.
- Exercise quick upload entry, settings, help, history, advanced-spread expansion, tab switching, and card-picker presentation.
- Confirm no horizontal overflow, clipped controls, obscured text, or broken fixed overlays.
- Confirm visible focus and selected states.
- Confirm browser console has no new errors.

Visual comparison points:

- Palette and background atmosphere match the homepage.
- Typography and heading hierarchy match the homepage.
- Gold control and border treatment match the homepage.
- Panel radius and elevation match the homepage.
- Celestial decoration remains restrained and coherent.
- Dense workflow screens remain clearer, not merely more decorative.
- Mobile layouts feel composed rather than compressed.

## Acceptance Criteria

- All remaining templates visibly belong to the approved Ritual Stage design system.
- Every existing product workflow and handler remains unchanged.
- Homepage appearance and behavior do not regress.
- All automated tests pass.
- All screens and modals work at desktop and 390-pixel mobile widths.
- No material accessibility, overflow, or console issues remain.
- The final product feels like one coherent premium oracle experience from homepage through reading and reflection.
