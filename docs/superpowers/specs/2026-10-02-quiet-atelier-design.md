# Quiet Atelier

Implemented on 2026-10-02 under the user's authorization to redesign all Arcana
pages and rearrange elements. This replaces the earlier dark visual direction.

## Character

A calm reading room: warm paper, forest ink, restrained sage and brass accents,
serif typography, clear controls, and real-card imagery. The interface supports
the user's physical-card ritual and gives long readings a comfortable measure.

| Token | Value |
| --- | --- |
| Paper | `#f4f0e7` |
| Panel | `#fffcf6` |
| Ink | `#203b33` |
| Body text | `#46594f` |
| Secondary text | `#606c60` |
| Border | `#d5d4c5` |
| Brass | `#876427` |
| Focus | `#2c6458` |

## Coverage

- Homepage: editorial hero, arched existing ritual-table image, quieter sections,
  green primary buttons, responsive navigation and stacked mobile calls to action.
- Guided flow: concerns, deck choice, spread choice, preparation, card placement,
  manual picker, spread review, reading results, and journal reflection.
- Upload flow: question, life stage, spread/deck selection, photo entry, results.
- Archive: saved readings, journal entries, comparisons, edit and confirmation dialogs.
- Shared surfaces: settings, help, activation, upgrade, save, and sharing dialogs.

Product screens share a semantic utility header and light panel treatment. The
Journal shortcut sits within the header, avoiding overlap on narrow screens.
Reading text uses an 820px maximum measure and 18px mobile body text. Primary
actions, selected options, keyboard focus, and destructive actions have distinct
treatments. Filter strips may scroll horizontally within the card picker; the
document itself should not overflow.

## Implementation

`index.html` declares `data-theme="atelier"`. The final `@layer base` block in
`src/premium-theme.css` overrides older theme layers with scoped selectors.
Earlier structure is retained for compatibility. CSS and TypeScript outputs are
built and committed with the sources. External templates and embedded fallbacks
are synchronized by the existing build script.

Reuse existing assets and self-hosted fonts. No new image service, framework,
runtime dependency, random-card generator, pricing change, or storage-key
migration is required. Exported reading/share canvases retain their own dark
palette. Reduced motion and print rules remain supported.

### Imagery follow-up

The user supplied a new gold-and-navy Arcana Guide logo and asked for imagery
that matches Quiet Atelier. The horizontal logo now appears in homepage and
shared app headers; a small stacked export supplies the favicon. Original artwork
is retained without recoloring. Daylit oak/linen tarot and journal photographs
replace the dark promotional imagery. Sage/brass SVG illustrations replace the
journey and comparison crops. Deployed photos and header logos use WebP; lower
homepage images load lazily. Asset provenance and full prompts are recorded in
`assets/homepage/atelier/README.md`.

## Verification

### Reading-engine story

The homepage's former physical-card versus random-generator comparison now
explains the ArcanaGuide reading engine. Two equally readable panels describe
context and spread patterns, then the central message, practical suggestions,
and reflection questions. Copy is grounded in `buildAIReadingPrompt()` and its
structured output; it makes no accuracy, exclusivity, or guaranteed prediction
claims. Comparison badges and decorative card/device icons were removed so the
emphasis stays on the engine and its benefits.

### Benefit campaign follow-up

The user's next revision simplifies the pitch into three illustrated benefits:
personal AI readings, a Premium journal for saved thoughts/readings, and a
printable infographic keepsake. The benefit gallery follows the hero, ahead of
the four-step workflow. The hero and final invitation emphasize perspective and
direction; a compact Premium offer replaces the repeated journal promotion.
Two newly generated daylight scenes match the existing journal photograph.
Cards use arched image tops, paper surfaces, brass labels, and forest typography.
AI copy describes a tuned reading engine without promising measured accuracy or
guaranteed predictions. Source files and exact prompts are retained with the
optimized WebP exports. Navigation, journal access, pricing, and premium gates
keep their existing behavior.

See `docs/qa/2026-10-02/audit.md` and `design-qa.md` for accepted screenshots,
interaction checks, regressions, and evidence limits.
