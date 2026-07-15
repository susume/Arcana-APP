# Arcana Architecture

## 1. System overview

Arcana is a tarot and cartomancy reflection application built around the user's
physical cards. It guides a reader through selecting a spread, preparing a
question, drawing and arranging real cards, uploading a spread photo or entering
cards manually, receiving an AI-assisted or classic interpretation, and saving
the result and personal reflection.

The product deliberately is not a random-card generator. The user supplies the
deck, draw, layout, intention, and final judgment. AI supports identification and
interpretation but does not replace manual review or make guaranteed predictions.

Arcana has two deployment layers:

1. A statically hosted browser SPA made from HTML, CSS, and ordered global
   JavaScript.
2. A Cloudflare Worker used for Gumroad premium activation, Gumroad webhook
   ingestion, and optional Arcana-hosted Gemini proxying.

There is no application server, account system, or user-profile database.
Browser data stays in `localStorage`. Cloudflare KV, when configured, stores
license and Gumroad event metadata rather than tarot readings or journal entries.

## 2. Technology stack

| Layer | Current choice |
|---|---|
| Browser runtime | Vanilla JavaScript globals, HTML5, CSS |
| Build-time code | TypeScript for the AI identification parser |
| Styling build | Tailwind CSS CLI v4 compiling a large custom source stylesheet |
| Frontend hosting | Static files; supports HTTP(S) and embedded fallbacks for `file://` |
| Service layer | Cloudflare Worker |
| AI | Google Gemini REST API with text and image input |
| Payments/licenses | Gumroad license verification |
| Service persistence | Optional Cloudflare KV binding `ARCANA_LICENSES` |
| Browser persistence | `localStorage` |
| Fonts | Self-hosted WOFF2 files, including Cormorant Garamond |
| Runtime frameworks | None |

`package.json` is intentionally small. Its dependencies are build tools, not
browser runtime libraries.

## 3. Runtime and deployment topology

```text
Browser
  |
  |-- static HTML/CSS/JS ----------------------> static host / local server
  |
  |-- user Gemini key (preferred) ------------> Google Gemini REST API
  |
  |-- no user key + proxy configured ----------> Cloudflare Worker
  |                                                |
  |                                                +--> Gemini API
  |
  |-- premium license activation --------------> Cloudflare Worker
                                                   |
                                                   +--> Gumroad verify API
                                                   +--> ARCANA_LICENSES KV (optional)

Gumroad sale/refund events --------------------> Worker webhook
                                                   |
                                                   +--> ARCANA_LICENSES KV (optional)
```

The static frontend can be deployed independently. AI and premium services
depend on runtime endpoint configuration in `js/config.js` and Worker
environment bindings/secrets.

## 4. Product and visual direction

The current design system has two connected layers:

- **Ritual Stage homepage**: an image-led, editorial landing experience with a
  dark indigo atmosphere, antique-gold accents, physical-card imagery, the
  reading journey, real-card comparison, Premium/Journal promotion, and repeated
  guided/upload calls to action.
- **Ritual Shell product UI**: shared visual treatment across focus, choice,
  workspace, review, reading, archive, settings, and help surfaces.

The intended character is premium self-reflection, celestial minimalism, modern
mysticism, dark academia, and spiritual editorial design. The interface should
remain calm and legible rather than ornamental for its own sake.

Current shared screen variants:

| Variant | Purpose |
|---|---|
| `ritual-screen-focus` | concerns and preparation |
| `ritual-screen-choice` | deck and spread choices |
| `ritual-screen-workspace` | placement, upload, and quick reading |
| `ritual-screen-review` | spread confirmation |
| `ritual-screen-reading` | generated reading and journal |
| `ritual-screen-archive` | saved reading history |

Settings and help use `ritual-modal` plus purpose-specific modal classes.
Non-homepage screens receive a shared Journal shortcut through
`ensureRitualUtilities()` in `js/ui.js`.

The approved design sources are under `docs/superpowers/specs/`; current browser
verification and intentional deviations are recorded in `design-qa.md`.

## 5. Repository map

```text
Arcana APP/
  AGENTS.md                    Codex discovery entry point
  system.md                    concise repository operating guide
  ARCHITECTURE.md              detailed technical source of truth
  index.html                   shell, metadata, embedded templates/data
  llms.txt                     product summary for AI/search readers
  package.json                 build, test, and preview scripts
  tsconfig.json                TypeScript compilation into js/

  assets/
    fonts/                     self-hosted fonts
    homepage/                  deployed homepage imagery
      reference-crops/         cropped source/reference imagery used by UI

  css/
    main.css                   original/core styles and font declarations
    onboarding.css             reserved/stub domain stylesheet
    reading.css                reserved/stub domain stylesheet
    settings.css               reserved/stub domain stylesheet
    premium.css                generated Ritual theme output

  data/
    spreads.json               HTTP-loaded spread definitions
    tarot-cards.json           reference card data
    playing-cards.json         reference card data

  js/
    tarot.js                   runtime card database and deck builders
    spreads.js                 spread loading and fallback
    state.js                   global mutable state
    card-art.js                public-domain tarot and playing-card art helpers
    subscription.js            premium, usage, upgrade, narration
    config.js                  public runtime endpoint configuration
    storage.js                 settings/autosave/history persistence
    ai-identification.js       generated parser from TypeScript
    ui.js                      rendering, routing, interactions, sharing
    reading-engine.js          AI/classic readings and output rendering
    ai.js                      Gemini client and proxy fallback
    app.js                     initialization, routing listener, atmosphere

  src/
    premium-theme.css          authoritative Ritual styles
    ai-identification.ts       typed identification response parser

  templates/                   HTTP-loaded screen/modal partials
  server/
    cloudflare-worker.js       activation, webhook, AI proxy
    README.md                  Worker deployment notes
  scripts/
    serve-static.mjs           local static server
  tests/                       contract/regression checks
  docs/superpowers/
    specs/                     approved design specifications
    plans/                     implementation plans
```

## 6. Build, preview, and generated assets

Available scripts:

| Command | Purpose |
|---|---|
| `npm run build:css` | Compile `src/premium-theme.css` to minified `css/premium.css` |
| `npm run build:ts` | Compile TypeScript sources into `js/` |
| `npm run build` | Run CSS and TypeScript builds |
| `npm test` | Compile TypeScript and run all repository regressions |
| `npm run serve` | Serve the repository at `http://127.0.0.1:4173/` |

The browser does not bundle modules. Generated assets are ordinary deployed
files and must remain committed:

- `css/premium.css`
- `js/ai-identification.js`

Plain runtime JavaScript is outside TypeScript coverage. Use `node --check` on
every edited file under `js/` or `server/` where syntax checking is applicable.

## 7. Static shell and load order

`index.html` provides:

- Search and social metadata
- JSON-LD `SoftwareApplication` and `FAQPage` data
- The atmospheric page background and `<main id="app">`
- Embedded fallback templates
- Embedded spread JSON
- Settings/help modal templates
- Stylesheet and script tags in dependency order

Stylesheets load in this order:

```text
css/main.css
css/onboarding.css
css/reading.css
css/settings.css
css/premium.css
```

`premium.css` intentionally loads last and is the active theme/override layer.
Edit its source in `src/premium-theme.css`, not the minified output directly.

Browser scripts load as globals in this order:

```text
tarot.js
spreads.js
state.js
card-art.js
subscription.js
config.js
storage.js
ai-identification.js
ui.js
reading-engine.js
ai.js
app.js
```

Later files depend on functions and state introduced earlier. Adding ES module
syntax to these runtime scripts would break the current loading model.

## 8. Dual-source templates and spread data

`renderScreen()` in `js/ui.js` builds the application UI at startup.

- Over HTTP(S), it fetches `templates/<name>.html`.
- Under `file://`, or when a fetch fails, it reads the matching embedded
  `<template id="template-<name>">` from `index.html`.

Current template names:

```text
welcome
concerns
card-system
choose-reading
reflection
placement
overview
results
history
quick
settings
help
```

External and embedded versions are runtime alternatives and must be identical.
The homepage and app-shell tests explicitly enforce synchronization.

Spread definitions follow the same principle:

- `data/spreads.json` is loaded over HTTP.
- `<script type="application/json" id="spreads-data">` is the embedded fallback.

Changes to either template or spread data must update both sources.

## 9. Routing and screen lifecycle

Arcana uses hash routing rather than a router library. Routes have the form
`#welcome`, `#spread`, or `#reading`.

Key functions in `js/ui.js`:

- `routeForScreen()` and `screenForRoute()` translate IDs and hashes.
- `navigate()` and `goScreen()` activate screens and update the hash.
- `updateDots()` and `updateProgressEstimate()` update guided progress.
- `ensureRitualUtilities()` installs shared shell utilities, including Journal.

`js/app.js`:

- Loads spreads and templates
- Restores settings/autosave state
- Initializes the default route
- Handles `hashchange` for browser back/forward behavior
- Initializes ambient visual behavior

`goScreen()` performs imperative side effects for particular screens, including
building choices, card-entry controls, overview data, readings, history, and
autosave. Modals are overlays and are not routes.

The main guided progress sequence is:

```js
[
  'screen-spread',
  'screen-reflection',
  'screen-card-entry',
  'screen-overview',
  'screen-reading'
]
```

Concerns and card-system screens remain available but are not part of the short
default guided route.

## 10. User flows

### Guided reading

```text
Homepage
  -> choose spread
  -> prepare/reflection
  -> guided draw, upload, or manual card entry
  -> review identified/entered cards
  -> AI or classic reading
  -> journal, save, share, print, voice, or restart
```

`startGuided()` resets reading state and starts at spread selection.

### Quick upload

```text
Homepage
  -> quick workspace
  -> choose the already-used spread
  -> upload spread photo
  -> identify cards and generate interpretation
  -> dynamically append journal/actions
```

`startQuick()` resets state for the shorter flow. Quick results use the same
underlying reading, sharing, and persistence concepts but are rendered into the
quick screen rather than the guided results template.

## 11. Global state and UI model

`js/state.js` defines one mutable global state object. There is no framework
reactivity; functions mutate state and then update DOM elements explicitly.

Important state domains include:

- Current mode: guided or quick
- User concerns and optional reader context
- Active card system and spread
- Cards keyed by spread position
- Dropped/jumper card and orientation
- Uploaded image data
- Generated narrative and reading mode
- Guided step, reversals, and quick spread selection

`currentCards` contains the active deck's card records. `getCards()` and
`getSpread()` are shared accessors.

Screen navigation calls `autoSaveState()`. Autosave is a recovery aid rather
than permanent reading history and expires after one hour.

## 12. Cards, spreads, and entry modes

### Card systems

`js/tarot.js` creates:

- Traditional 78-card tarot
- Standard 52-card playing-card cartomancy
- Playing cards plus Joker

Runtime card records include identity, system, arcana/suit/number metadata,
keywords, and upright/reversed meanings.

### Card artwork

`js/card-art.js` renders both card systems through one shared remote-art
pipeline:

- Public-domain Rider-Waite-Smith tarot images from Wikimedia Commons
- Dmitry Fomin's CC0 English-pattern SVG set for the standard 52 playing cards

The helper derives Wikimedia upload URLs from canonical filenames and is reused
by picker, search, overview, and dropped-card surfaces. Playing-card files use
names such as `English pattern ace of hearts.svg` and
`English pattern queen of spades.svg`.

The English-pattern set does not include a matching Joker. The optional Joker,
malformed card names, failed remote requests, and offline use retain Arcana's
existing suit/star fallback. Card selection and reading behavior never depend
on artwork availability.

### Spreads

Spread records include ID, name, category, description, card count, ordered
positions, and a layout key.

The default visible choices are:

- `one-card`
- `three-card`
- `six-card`

Advanced premium choices are:

- `celtic-cross`
- `romany`
- `yearly`
- `two-pathways`
- `relationship`

`ACTIVE_SPREAD_IDS` in `js/ui.js` prevents legacy duplicate definitions from
appearing in active selectors and prompt references.

### Card entry

The placement screen has three modes that converge on `state.cards`:

1. **Guided Draw** steps through positions while the user places physical cards.
2. **Upload Photo** sends a completed spread image to Gemini identification.
3. **Manual Entry** uses searchable card pickers, orientation controls, and
   separate Tarot and Playing Cards tabs.

Upload-first flows also expose an optional deck selector: Auto-detect, Tarot,
or Playing cards. An explicit selection establishes the deck before the image
request and constrains validation to that deck. Auto-detect remains available
for users who are unsure. Playing-card prompts explicitly ignore spread-position
numbers and reject tarot substitutions for unclear ranks or suits.

Manual correction remains required product behavior. Orientation is stored as
`upright` or `reversed`, including the optional dropped card.

The active card system has a separate establishment marker. Browsing between
manual-picker tabs changes the available cards but does not establish a deck.
The first actual card selection establishes the selected card's system;
choosing a system explicitly during onboarding establishes it immediately.
When the active deck is Playing Cards plus Joker, selecting any playing card,
including The Joker, preserves the `playing-joker` variant and its full card
list.

Switching picker tabs while spread cards or a dropped/jumper card are selected
requires confirmation. Cancellation preserves the deck and every selection.
Confirmation clears the incompatible spread and dropped-card state, leaves the
new tab unestablished, and the replacement card selection establishes the new
deck.

## 13. Gemini and card identification

### Configuration priority

`js/ai.js` prefers:

1. An explicit or locally saved user Gemini API key
2. The configured Arcana Worker proxy when no user key is available

The user key is sent directly to Google using the `x-goog-api-key` header. It is
stored in `arcana_settings` in the current browser and can be tested or removed
from Settings.

`js/config.js` contains public runtime configuration:

- AI proxy URL
- Optional separate activation API URL
- Gumroad product URL
- Empty legacy/local Google key override

Private API keys and webhook secrets must not be shipped in browser JavaScript.

### Gemini client

`callGemini()` supports text prompts and base64 image input. It handles:

- Direct and proxy request shapes
- Multiple Gemini model attempts
- Retryable rate-limit/server statuses
- Countdown/status messaging
- Useful configuration and error messages

The Worker has its own model fallback and retry logic for proxied requests.

### Identification parser

`src/ai-identification.ts` compiles to `js/ai-identification.js` and exposes:

```js
window.ArcanaAI.parseIdentifiedCards(responseText, currentCards, allowedPositions)
```

It extracts a JSON array from Gemini text, normalizes orientation, and returns
cards keyed by position. Every name must match the supplied references either
exactly or through approved normalization; unknown or out-of-deck names are
omitted.

Identification UI supplies the current spread's position IDs as
`allowedPositions`. With that argument present, only positive scalar
string/number positions whose normalized value belongs to the spread are
accepted; malformed, arbitrary, and out-of-range positions are omitted. Empty
results fail before replacement, and replacement removes stale non-spread keys
from the spread-scoped `state.cards` object.

For playing-card references, safe aliases include numeric ranks, tarot-suit
equivalents (`Cups` -> `Hearts`, `Pentacles` -> `Diamonds`, `Wands` -> `Clubs`,
and `Swords` -> `Spades`), and `Page` -> `Jack`. `Knight`, unknown ranks or
suits, and any normalized name absent from the supplied deck are rejected.

Photo-first guided identification uses `cardSystemEstablished === false` as the
unestablished-state marker. Its prompt requests deck detection and validates
against the combined tarot and standard-playing-card references. Valid results
must be non-empty and belong to exactly one system; mixed or empty results are
rejected before replacing spread state. Once detected, that system is
established and later identification validates only exact or safely normalized
names against the active deck. If the parser helper is unavailable,
identification fails closed so the user can review cards manually.

Quick photo readings follow the same established/unestablished distinction.
When detection is required, the AI response must begin with the machine-readable
`CARD_SYSTEM: tarot` or `CARD_SYSTEM: playing` marker. Arcana establishes and
persists the detected deck before storing or rendering the marker-free
narrative. Once a deck is established, a conflicting marker is rejected rather
than overriding it.

## 14. Reading generation and readiness

`generateReading()` in `js/reading-engine.js` chooses AI or classic output:

```text
AI configured and not forced to classic
  -> generate AI reading
  -> on failure, fall back to classic

otherwise
  -> generate classic reading
```

AI prompts include:

- Spread and layout context
- Position names and meanings
- Card names and orientations
- Card keywords and the full meaning for each card's active orientation
- Dropped card
- Concerns and reader context
- Reading style and tone
- Safety language and advanced-layout guidance
- Deck-specific role, terminology, and pattern-analysis instructions

Guided tarot prompts use tarot terminology and Major/Minor Arcana pattern
guidance. Playing-card prompts retain Hearts, Diamonds, Clubs, Spades, and
playing-card cartomancy terminology; they analyze suits, ranks, court patterns,
reversals, and interactions without discussing Major Arcana.

Classic readings are fully local. They combine card meanings with pattern
analysis such as dominant suits, Major Arcana count, reversals, repeated
numbers, and reflection prompts.

The guided results screen uses loading/ready classes:

- Before generation, it is not `reading-ready`.
- `.result-only` Journal and action controls remain hidden.
- `renderReading()` adds `reading-ready` after real content is rendered.
- Errors do not reveal result-only controls as if a reading succeeded.

This prevents empty journal/actions UI from appearing during generation.

## 15. Post-reading capabilities

### Reflection journal

Guided results include a static Journal component; quick results inject the same
concept dynamically. Prompt chips can seed the textarea, and the Save button is
enabled only when content exists.

`saveJournal()` writes lightweight entries to `arcana-journal`, capped at 50.
Journal entries are separate from saved reading records and remain local.

### Saved readings and history

`saveReading()` writes richer records to `arcana_readings`, also capped at 50.
History renders saved spreads, notes, and premium comparison/archive behavior.

### Sharing

Sharing is implemented in `js/ui.js` with a modal and canvas renderer.
`getShareSlots()` maps known layouts—including Celtic, yearly, Romany,
two-pathways, and relationship spreads—to visual card positions. Unknown layouts
use a grid fallback.

The structured reading pipeline also renders a downloadable infographic in
`js/reading-engine.js`. It selects an adaptive template from the active spread:
a featured card for one-card readings, a three-column sequence for Past / Present /
Future, a balanced two-column grid for six-card and Celtic Cross readings, a
quarter-by-quarter timeline for yearly readings, paired comparison rows for Two
Pathways and Relationship spreads, and a Past / Present / Future matrix for the
Romany spread. Position labels use bounded pills, repeated per-card reflection
actions are omitted from the export, and the guidance/footer areas reserve enough
height for wrapped text.

### Printing

`printReading()` prepares a print view and coordinates cleanup through
`afterprint`. Theme changes must preserve print-specific readability and hide
non-print controls.

### Narration

Premium narration uses the browser Speech Synthesis API. Voice preference is
stored in settings, and reading markdown is reduced to narration-friendly text.

## 16. Premium and monetization

Arcana Premium is a one-time **$29 lifetime unlock**, not a recurring
subscription.

`js/subscription.js` owns:

- Free daily reading usage
- Premium spread IDs
- Local entitlement state
- Upgrade modal content
- Activation forms
- Premium UI rendering
- Narration and comparison entry points

The browser does not contain an activation allow-list. `activatePremiumKey()`
posts the entered key to `getActivationApiUrl()`, which uses an explicit
activation endpoint when configured or the Worker/proxy base otherwise.

After successful verification, the browser stores premium state in
`arcana_subscription`. This local state controls the UI, but its source of truth
at activation time is the Worker/Gumroad response.

## 17. Cloudflare Worker services

`server/cloudflare-worker.js` handles CORS, request parsing, JSON responses, and
three service paths.

### `POST /api/activate`

- Normalizes and hashes the submitted license key
- Calls Gumroad's license verification endpoint
- Uses the configured product ID or the checked-in public fallback product ID
- Rejects failed, refunded, or chargebacked purchases
- Optionally stores activation metadata in `ARCANA_LICENSES`
- Returns premium entitlement metadata to the browser

### `POST /api/gumroad/webhook`

- Accepts Gumroad form-encoded event data
- Validates the seller ID against configuration/public fallback
- Optionally validates a shared webhook secret
- Stores sale/refund/event metadata in `ARCANA_LICENSES` when bound
- Does not store browser reading or journal data

### AI proxy route

Other accepted POST traffic is handled by the Gemini proxy path. It requires the
Worker secret `GOOGLE_API_KEY`, forwards a Gemini request, and applies model
fallback/retry behavior.

Expected Worker configuration:

| Binding/variable | Purpose |
|---|---|
| `GOOGLE_API_KEY` | private Gemini key for hosted proxy fallback |
| `GUMROAD_PRODUCT_ID` | optional override for the Arcana product |
| `GUMROAD_SELLER_ID` | optional seller override |
| `GUMROAD_WEBHOOK_SECRET` | optional shared webhook verification |
| `ARCANA_LICENSES` | optional KV namespace for activation/events |

## 18. Browser persistence

| Key | Purpose |
|---|---|
| `arcana_autosave` | temporary state recovery, one-hour expiry |
| `arcana_settings` | Gemini key, reading style/tone, narrator voice |
| `arcana_subscription` | local premium entitlement metadata |
| `arcana_usage` | daily/monthly usage counters |
| `arcana_readings` | saved reading archive, capped at 50 |
| `arcana-journal` | lightweight reflection entries, capped at 50 |

Saved reading records contain the mode, spread, cards, dropped card, narrative,
concerns, notes, and display metadata. Journal records contain date, spread, and
reflection text.

Current autosaves persist the explicit card-system establishment marker. During
restore, legacy autosaves without that field infer establishment only when they
contain at least one spread or dropped card and every saved name is valid for
the saved active deck. An explicit modern `false` value is preserved.

There is no cloud sync. Clearing browser storage removes this local data.
Uploaded photos are used in the active flow and should be treated as private.

## 19. Homepage, metadata, and assets

`templates/welcome.html` and its embedded counterpart implement the current
homepage:

- Ritual navigation to How It Works, Premium, and Journal sections
- Guided and quick-upload calls to action
- Image-led physical-card hero
- Four-step reading journey
- Real cards versus random generators comparison
- Journal/Premium promotion and lifetime price
- Final repeated call to action

Deployed homepage images live under `assets/homepage/`. Template references must
never point to local Codex output directories or developer-only paths.

Search/answer-engine support includes:

- Descriptive metadata in `index.html`
- Static, answer-oriented homepage/help copy
- JSON-LD software and FAQ schemas
- `llms.txt`

Important product explanations should remain present in static HTML rather than
existing only after client-side interaction.

## 20. CSS, responsiveness, and accessibility

`src/premium-theme.css` is the authoritative current visual layer and generates
`css/premium.css`. It contains both homepage and product-shell styling.

Core conventions:

- Near-black/deep-indigo backgrounds
- Ivory text with brighter secondary copy
- Antique-gold primary controls, rules, borders, and focus rings
- Editorial serif headings and readable sans-serif controls
- Restrained translucent surfaces and celestial light effects
- Eight-pixel premium surface radii
- CSS-only motion with `prefers-reduced-motion` support

At 760px and below, guided `.nav-row` controls become a sticky safe-area-aware
bottom action dock. Mobile copy has an explicit readability floor, and major
controls must remain usable at a 390px viewport without horizontal overflow.

Selection surfaces use semantic `<button type="button">` elements. Preserve:

- Visible keyboard focus
- Non-color selection cues
- Appropriate touch targets
- `aria-live` feedback
- Decorative `aria-hidden` behavior
- Modal scrolling and accessible close controls
- Print styles

## 21. Tests and verification

`npm test` runs:

1. TypeScript compilation
2. `tests/card-art.mjs`
3. `tests/ai-identification.mjs`
4. `tests/deck-selection.mjs`
5. `tests/worker-activation.mjs`
6. `tests/monetization-config.ps1`
7. `tests/journal-ui.ps1`
8. `tests/reading-actions.ps1`
9. `tests/homepage-ui.ps1`
10. `tests/app-shell-ui.ps1`

Coverage is contract-oriented:

- Worker activation success/failure/default configuration and webhook validation
- No hardcoded browser activation keys
- Current lifetime pricing and Gemini-key settings
- Journal wiring and post-reading actions
- Spread/layout/card-orientation behavior
- Tarot and playing-card artwork filenames, URLs, rendering, and fallback
- Homepage content, assets, handlers, and embedded-template sync
- Ritual Shell classes, semantic controls, Journal utility, mobile navigation,
  reading-ready behavior, and modal/template sync

Recommended verification by change type:

```powershell
npm run build
npm test
node --check js\ui.js
node --check js\reading-engine.js
node --check server\cloudflare-worker.js
git diff --check
```

For visual changes, also use `npm run serve` and browser-check desktop plus 390px
mobile, keyboard navigation, loading/error states, overflow, and console output.

## 22. Implementation constraints

1. Preserve the static, framework-free browser runtime.
2. Preserve the physical-card-first product model.
3. Keep the default guided onboarding short.
4. Synchronize external and embedded templates.
5. Synchronize external and embedded spread data.
6. Edit theme and TypeScript generated outputs through their source files.
7. Commit generated deployable assets.
8. Preserve global script dependency order.
9. Keep manual card correction and classic fallback working.
10. Do not expose Gemini keys, webhook secrets, or activation secrets.
11. Verify premium licenses through the Worker/Gumroad path.
12. Keep browser readings, photos, and journal data private and local.
13. Preserve Ritual Stage/Ritual Shell accessibility and responsive behavior.
14. Keep result-only controls hidden until a reading is ready.
15. Run current tests and syntax checks before claiming completion.

When code, tests, and documentation disagree, inspect the running code and
regression contracts first, then update this document to match verified current
behavior.
