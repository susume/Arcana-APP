# Arcana - Architecture

## Overview

Arcana is a **client-side-only Single-Page Application** for tarot and playing-card cartomancy readings. It has no backend and no runtime app framework dependency. The app runs as static HTML, CSS, and plain global JavaScript, with a small build step that generates static CSS and JavaScript assets.

The product model is a **physical-card reflection tool**, not a digital card-drawing game. Users handle their own deck, choose a spread, create a quiet space, formulate a question, shuffle and draw real cards, lay out the spread, then upload a photo for AI identification and interpretation. Manual entry remains available for correction and non-AI use.

The app can be served over HTTP or opened directly via `file://` as long as the compiled assets are present. AI features require a Google Gemini API key supplied by the user; everything else runs entirely offline.

---

## Technology Stack

| Layer | Choice |
|---|---|
| Runtime language | Vanilla JavaScript, ES2020 globals |
| Build-time language | Small TypeScript helper compiled to plain JS |
| Markup | HTML5 with embedded `<template>` fallbacks and external template partials |
| Styling | CSS custom properties + Tailwind CLI-generated premium override layer |
| AI | Google Gemini REST API, including multimodal image input |
| Persistence | `localStorage` only |
| Fonts | Cormorant Garamond WOFF2, self-hosted |
| Build | `npm run build` for CSS and TypeScript assets |
| Runtime frameworks | None. Do not use React/Vue/Angular/Vite unless product direction explicitly changes. |

---

## Current Design Direction

The visual system should feel like:

- Premium self-reflection tool wrapped in celestial luxury
- Dark celestial atmosphere
- Modern mysticism, luxury occult, celestial minimalism
- Spiritual editorial, dark academia meets astrology
- Calm, slow UX with breathing room and low visual noise
- Editorial typography closer to luxury magazines, book publishing, and premium blogs

The redesign is a **theme layer**, not a product rewrite. Preserve the physical-card reading workflow and the existing onboarding length.

---

## Directory Layout

```text
Arcana APP/
  index.html                 # Static shell, embedded fallbacks, stylesheet/script tags
  ARCHITECTURE.md            # This file
  llms.txt                   # AI/LLM-readable project and content summary
  package.json               # Tailwind/TypeScript build scripts only
  package-lock.json          # Locked build-tool dependency versions
  tsconfig.json              # Compiles src/*.ts into js/
  .gitignore                 # Ignores env files, node_modules, dist, logs

  assets/
    fonts/                   # Cormorant Garamond WOFF2 files

  css/
    main.css                 # Original core styles and font-face declarations
    onboarding.css           # Stub placeholder
    reading.css              # Stub placeholder
    settings.css             # Stub placeholder
    premium.css              # Compiled premium celestial/luxury theme override

  data/
    spreads.json             # Spread definitions for HTTP loading

  js/
    tarot.js                 # Card database, glyphs, constants
    spreads.js               # Spread loader with JSON + embedded fallback
    state.js                 # Global state singleton and card helpers
    card-art.js              # Public-domain card art helpers
    subscription.js          # Premium/entitlement UI helpers
    config.js                # Runtime config and local config override point
    storage.js               # localStorage persistence
    ai-identification.js     # Compiled TypeScript AI card-identification parser
    ui.js                    # Screen rendering, navigation, interactions
    reading-engine.js        # AI/classic reading generation and markdown rendering
    ai.js                    # Gemini API client
    app.js                   # App initialization, routing, star animation

  src/
    premium-theme.css        # Tailwind source for premium theme layer
    ai-identification.ts     # TypeScript source for AI identification parser

  scripts/
    serve-static.mjs         # Local static preview server for project root

  templates/
    welcome.html
    concerns.html
    card-system.html
    choose-reading.html
    reflection.html
    placement.html
    overview.html
    results.html
    history.html
    quick.html
    settings.html
    help.html

  tests/
    journal-ui.ps1
    reading-actions.ps1
```

Important: most screen templates have **two runtime sources**:

1. External partials in `templates/*.html`
2. Embedded fallback templates in `index.html`

When changing a template, update both sources or run a deliberate sync step. HTTP preview usually fetches external templates; `file://` usage relies on the embedded fallback templates.

---

## Build & Preview

The app remains deployable as static files. Build tools only generate assets loaded by `index.html`.

| Command | Purpose |
|---|---|
| `npm run build:css` | Compiles `src/premium-theme.css` to minified `css/premium.css` |
| `npm run build:ts` | Compiles `src/ai-identification.ts` to `js/ai-identification.js` |
| `npm run build` | Runs CSS and TypeScript builds |
| `npm test` | Runs TypeScript compile plus journal and reading-action regression checks |
| `npm run serve` | Serves the static project root at `http://127.0.0.1:4173/` |

Generated files that must exist for the static app:

- `css/premium.css`
- `js/ai-identification.js`

The build does **not** bundle the app and does **not** replace the original HTML/templates/global JS runtime.

Additional verification commands used for plain-JS changes:

```powershell
node --check js\ui.js
node --check js\reading-engine.js
```

Use these when editing large global JavaScript files because TypeScript compilation does not parse most runtime files.

---

## Stylesheet Load Order

Stylesheets are declared in `index.html` in this order:

```html
<link rel="stylesheet" href="css/main.css">
<link rel="stylesheet" href="css/onboarding.css">
<link rel="stylesheet" href="css/reading.css">
<link rel="stylesheet" href="css/settings.css">
<link rel="stylesheet" href="css/premium.css">
```

`premium.css` intentionally loads last. It is an override/theme layer over the original app, not a replacement for `main.css`.

---

## Script Load Order

Scripts are declared at the bottom of `index.html` and loaded in dependency order:

```text
tarot.js              card data, glyphs, constants, buildPlayingCards()
spreads.js            SPREADS array loader
state.js              global state object, getCards(), getSpread()
card-art.js           public-domain card art URL/render helpers
subscription.js       entitlement/premium UI helpers
config.js             runtime config
storage.js            localStorage helpers
ai-identification.js  window.ArcanaAI.parseIdentifiedCards()
ui.js                 navigation, screen rendering, event handlers
reading-engine.js     reading generation and markdown rendering
ai.js                 callGemini(), testApiKey()
app.js                initApp(), routing, star animation
```

All runtime scripts are plain globals. There is no browser module system. TypeScript is used only at build time to produce `js/ai-identification.js`.

---

## Template Loading Strategy

`renderScreen()` in `ui.js` runs once on init and populates `<main id="app">`.

- `file://` protocol: reads content from embedded `<template id="template-*">` tags in `index.html`, so the app can open locally without a server.
- `http(s)://` protocol: fetches each partial from `templates/<name>.html`, with embedded template fallback if fetch fails.

Template names:

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

Template editing rule:

- Keep `templates/<name>.html` and the matching `<template id="template-<name>">` in `index.html` synchronized.
- `templates/results.html` is the guided reading output screen; it includes the reading toggle, `#reading-content`, reflection journal, and post-reading action controls.
- `templates/quick.html` renders the quick/upload entry screen; quick reading results are inserted dynamically by `quickRead()` in `ui.js`.

---

## Core User Flow

The app should preserve this physical-card workflow:

1. Choose the deck/spread path: Quick Insight, Standard Reading, Deep Exploration, or an advanced spread.
2. Create the reading space: quiet place, optionally candle/incense/music, clear the deck.
3. Formulate the question or intention.
4. Shuffle and draw real cards from the user's physical deck.
5. Lay out the spread position by position.
6. Take a clear photo of the completed spread and upload it, or enter cards manually.
7. Let AI identify/analyze the spread, or use classic offline interpretation.
8. Read or listen to results.
9. Save, share, print, or start again.
10. Write a reflection journal entry to track progress and build a relationship with the deck.

The app must not become a random-card generator unless explicitly requested as a new product feature.

---

## Screen Flow

### Guided Mode

```text
screen-welcome
  -> screen-spread        choose Quick/Standard/Deep or advanced spread
  -> screen-reflection    preparation and mindfulness pause
  -> screen-card-entry    guided draw, upload photo, or manual entry
  -> screen-overview      review spread before reading
  -> screen-reading       AI/classic reading output and journal
```

`startGuided()` resets state and navigates directly to `screen-spread`.

Optional/legacy screens still exist:

- `screen-concerns`: topic/focus input
- `screen-card-system`: tarot vs playing cards

They are available in the codebase, but the default guided onboarding should remain short.

### Quick Mode

```text
screen-welcome
  -> screen-quick         choose spread + upload photo; AI reads inline
```

Quick mode still uses the same reading/share/journal helpers as guided mode where possible:

- `getReadingSpread()` resolves `state.quickSpreadId` before `state.spreadId` when `state.mode === 'quick'`.
- `quickRead()` renders `#quick-reading-content`, the post-reading action controls, and the same premium reflection journal component used by guided readings.
- Quick/upload readings must expose `Share`, `Print`, and `Save Reading` after the narrative is generated.

### Utility Screens

- `screen-history`: premium reading archive and journal history
- `modal-settings`: Premium activation, Gemini API key, reading style, reading tone
- `modal-help`: tarot guide and FAQ

---

## Global State

Defined in `state.js`. One mutable singleton; no reactivity framework.

```js
let state = {
  mode:           'guided' | 'quick',
  concerns:       string[],
  cardSystem:     'tarot' | 'playing' | 'playing-joker',
  spreadId:       string | null,
  cards:          { [positionId]: { name: string, orientation: 'upright'|'reversed' } },
  droppedCard:    { name, orientation } | null,
  hasDroppedCard: boolean,
  uploadedImage:  string | null,
  narrative:      string,
  readingMode:    'ai' | 'classic',
  readerLifeStage:string,
  guidedStep:     number,
  reversals:      boolean,
  quickSpreadId:  string | null
};

let currentCards = [];
```

State is mutated directly throughout `ui.js` and `reading-engine.js`. `autoSaveState()` serializes it to `localStorage` on screen navigation.

---

## Navigation & Routing

Hash-based SPA routing is managed in `ui.js`.

- URL format: `index.html#<route>`, for example `#spread`, `#reading`, `#welcome`
- `goScreen(screenId)` hides inactive `.screen` elements, shows the target, updates the hash, triggers screen-specific side effects, and autosaves
- `window.addEventListener('hashchange', ...)` in `app.js` handles back/forward navigation
- `GUIDED_SCREENS` drives progress dots:

```js
['screen-spread', 'screen-reflection', 'screen-card-entry', 'screen-overview', 'screen-reading']
```

Modals are overlays and do not affect routing.

---

## Card Systems

Defined in `tarot.js`.

### Tarot

- 78 cards total
- Major Arcana hardcoded
- Minor Arcana generated from suit/rank meaning maps

### Playing Cards

- 52-card and 53-card-with-Joker modes
- Meanings generated from playing-card suit/rank maps

### Card Shape

```js
{
  system:    'tarot' | 'playing',
  name:      string,
  arcana:    'major' | 'minor',
  suit:      string | null,
  number:    number,
  keywords:  string[],
  upright:   string,
  reversed:  string
}
```

`currentCards` holds the active card array and is rebuilt when `cardSystem` changes.

---

## Spreads

Spread definitions live in `data/spreads.json` and are also embedded in `index.html` as `<script type="application/json" id="spreads-data">` for `file://` fallback.

```js
{
  id:          string,
  name:        string,
  category:    'Daily' | 'Classic' | 'Relationships' | 'Life & Decisions' | 'Custom',
  description: string,
  cardCount:   number,
  positions:   [{ id: number, name: string, description: string }],
  layout:      string
}
```

Core visible spread choices in default guided mode:

- `one-card`: Quick Insight
- `three-card`: Standard Reading
- `six-card`: Deep Exploration

Advanced spreads are kept behind the advanced/premium panel.

Canonical visible spread ids are controlled by `ACTIVE_SPREAD_IDS` in `ui.js`:

```js
['one-card', 'three-card', 'six-card', 'celtic-cross', 'romany', 'yearly', 'two-pathways', 'relationship']
```

This allow-list prevents legacy duplicate spread definitions from appearing in quick spread selection and spread-reference prompts.

---

## Card Entry Screen

`screen-card-entry` has three tabs, all writing to the same `state.cards` object.

### Guided Draw

- Steps through spread positions one by one.
- Shows ritual prompts and a visual spread diagram.
- User physically draws and places each card.
- After all positions are placed, the photo upload section is shown.

### Upload Photo

- Drag-and-drop or click-to-upload for JPG, PNG, WEBP.
- File is read as base64 and stored in `state.uploadedImage`.
- "Identify Cards with AI" sends the photo plus spread/position context to Gemini.
- Returned JSON is parsed into `state.cards`.

### Manual Entry

- One row per spread position.
- Card picker/search uses the active deck.
- Orientation toggle supports upright/reversed.
- Orientation buttons carry `data-pos` and write back to `state.cards[positionId].orientation` through `syncOrientationState(el)`.
- `confirmCards()` reads picker button selections as well as legacy text inputs, so reversed cards persist even when the user chooses cards through the picker.
- Dropped/jumper card orientation uses the same `data-pos="drop"` pattern and stores to `state.droppedCard.orientation`.
- Manual review remains important because photo recognition can be imperfect.

---

## AI Card Identification Helper

Source: `src/ai-identification.ts`

Build output: `js/ai-identification.js`

Runtime API:

```js
window.ArcanaAI.parseIdentifiedCards(responseText, currentCards)
```

Purpose:

- Extracts the first JSON array from Gemini's response.
- Normalizes orientation to `upright` or `reversed`.
- Canonicalizes card names against the active deck when possible.
- Returns `{ [position]: { name, orientation } }`.

`ui.js` uses this helper when available and keeps the original inline JSON parsing as fallback.

---

## Reading Generation

`generateReading()` in `reading-engine.js` runs when the user reaches `screen-reading`.

```text
Gemini key available and not classic-forced?
  yes -> generateAIReading()
         on failure -> generateClassicReading()
  no  -> generateClassicReading()
```

### AI Reading

`generateAIReading()` builds a structured markdown prompt with:

- Spread name and layout hint
- Each position, card name, orientation, and keywords
- Dropped card, if any
- User concerns, reading style, and tone
- Special spread notes for larger layouts

The result is stored in `state.narrative` and rendered as markdown sections.

### Classic Reading

`generateClassicReading()` works fully offline using:

- Card upright/reversed meaning text
- Dominant suit analysis
- Major Arcana count
- Reversal count
- Repeated numbers
- Reflection questions

---

## Post-Reading Reflection & Actions

The guided reading result screen is defined in `templates/results.html` and embedded in `index.html`.

The post-reading screen includes:

- Reading mode controls: AI, Classic, Voice
- `#reading-content`: generated reading markdown rendered by `reading-engine.js`
- `.journal-section`: premium reflection journal card
- `.reading-actions`: post-reading Save/Share/Print/Start controls

### Reflection Journal

The reflection journal is designed as a premium post-reading capture moment, not a generic textarea.

Core elements:

- `.journal-badge`: "Premium Journal" badge
- `.journal-prompt`: "Reflection"
- `.reflection-question`: short prompt copy
- `.reflection-chips`: guided prompt chips
- `.journal-textarea`: reflection input
- `.journal-save-btn`: disabled until textarea has content
- `.journal-save-status`: saved confirmation text

Behavior lives in `ui.js`:

- `renderJournalSection(container)` injects the same journal component for quick/upload readings.
- `wireJournalSection(section)` enables/disables the save button based on text entry.
- `useReflectionPrompt(btn)` inserts a prompt chip into the textarea.
- `saveJournal()` writes to `localStorage` key `arcana-journal` and shows "Saved to your journal".

`renderReading()` in `reading-engine.js` clears the static journal textarea and calls `wireJournalSection(jSec)` when a guided reading is rendered.

### Post-Reading Actions

The improved action hierarchy is:

1. `Save Reading` as the primary full-width action
2. Secondary actions: `Share`, `Print`, `Start Again`

The mobile layout is intentionally not a four-equal-button row because long labels clip on narrow screens.

### Share Canvas

Sharing is handled in `ui.js`:

- `getSharePayload()` builds a payload from `state.cards`, `state.narrative`, and `getReadingSpread()`.
- `showShareModal(data)` opens the share preview modal.
- `renderShareCanvas(data)` draws a canvas preview.
- `getShareSlots(data)` maps spread layouts to card positions.

Supported share slot layouts include:

- `row`
- `celtic-simple`
- `celtic`
- `yearly`
- `romany`
- `two-pathways`
- `relationship`
- generic grid fallback

Advanced spreads must use explicit share slot maps where possible; otherwise the canvas becomes visually misleading or cramped.

---

## Monetization And Premium Activation

Arcana Premium is a one-time $29 lifetime unlock. Gumroad issues a unique license key for each purchase, and the browser verifies that key through the Cloudflare Worker before saving local premium state.

The Worker exposes:

- `POST /api/activate`: verifies a Gumroad license key with Gumroad's license API, stores activation metadata in Cloudflare KV when `ARCANA_LICENSES` is bound, and returns `isPremium: true` for valid purchases.
- `POST /api/gumroad/webhook`: stores Gumroad sale/refund metadata for bookkeeping and future revocation support.

Worker deployment expects:

- `GUMROAD_PRODUCT_ID`: Gumroad product id for the $29 Premium product.
- `ARCANA_LICENSES`: Cloudflare KV namespace binding for license/event metadata.
- Optional `GUMROAD_WEBHOOK_SECRET`: shared webhook secret if configured.
- Optional `GOOGLE_API_KEY`: only needed if retaining the old Arcana AI proxy fallback.

The static app stores premium state in `arcana_subscription` after activation. There is no account system or server-side user profile.

---

## AI Layer

`ai.js` contains the Gemini API client.

`callGemini(prompt, apiKey, imageData, statusEl)`:

- Sends text-only or multimodal text+image requests.
- Adds `inline_data` when `imageData` is provided.
- Prefers an explicit or saved user Gemini API key and sends it with the `x-goog-api-key` header.
- Falls back to the optional Arcana AI proxy only when no user key is available and a proxy URL is configured.
- Handles model fallback and retry behavior.
- Handles API key validation and rate-limit messaging.

`testApiKey()` validates the key with a minimal prompt and saves settings on success.

---

## Persistence

All persistence is `localStorage`.

| Key | Contents | Notes |
|---|---|---|
| `arcana_autosave` | `{ state, timestamp }` | Expires after 1 hour |
| `arcana_settings` | `{ geminiKey, readingStyle, readingTone, narratorVoice }` | Gemini key and reading preferences saved locally in this browser |
| `arcana_subscription` | `{ tier, key, source, activatedAt }` | Premium state after Gumroad license verification |
| `arcana_readings` | Reading history records | Capped at 50 |
| `arcana-journal` | Journal entries | Capped at 50 |

Reading records include:

```js
{
  id: string,
  title: string,
  date: string,
  mode: 'guided' | 'quick',
  concerns: string[],
  cardSystem: string,
  spread: string,
  spreadName: string,
  cards: object,
  droppedCard: object | null,
  hasDroppedCard: boolean,
  narrative: string,
  notes: string
}
```

Journal records in `arcana-journal` are intentionally lightweight:

```js
{
  date: string,
  spread: string,
  text: string
}
```

Saved reading history (`arcana_readings`) and reflection journal entries (`arcana-journal`) are separate stores.

---

## AEO / Search Metadata

The landing page copy is written with Answer Engine Optimization in mind:

- Question-based headings and direct answer copy
- Clear "what is Arcana / how it works / is it free" sections
- Hard-coded HTML copy in templates and embedded fallbacks
- `meta description` and `meta keywords` in `index.html`
- JSON-LD `SoftwareApplication` and `FAQPage` schema in `index.html`
- `llms.txt` at the project root for AI/LLM-readable summary and important routes/content

Do not hide essential product explanations behind client-only interactions. Important answer-oriented copy should remain readable in the static HTML.

---

## CSS Architecture

`main.css` contains the original core styling and font declarations. `premium.css` is the current premium theme override layer and should be edited via `src/premium-theme.css`, then rebuilt.

The theme uses:

- Deep charcoal/near-black backgrounds
- Soft celestial gradients
- Star and moon-like CSS atmosphere
- Gold, violet, and teal accents
- Cormorant Garamond display typography
- Clean sans-serif body typography
- Larger negative space and slow transitions
- 8px border radius for premium, restrained UI surfaces
- Dedicated premium treatment for the post-reading reflection journal and reading action bar

`onboarding.css`, `reading.css`, and `settings.css` remain stubs unless the styling is later split by domain.

---

## Tests

Current regression checks:

- `tests/journal-ui.ps1`
- `tests/reading-actions.ps1`

Run:

```powershell
npm test
```

The test command also compiles TypeScript first.

`reading-actions.ps1` also checks several architecture-sensitive contracts:

- Shared `getReadingSpread()` behavior for guided and quick flows
- Quick/upload share action availability
- Active spread allow-list usage
- Card picker/orientation persistence hooks
- Advanced share layout support
- Reflection prompt chips and journal save-state wiring
- Public-domain tarot art helper availability

---

## Key Constraints & Decisions

1. **Static runtime**: The app must remain plain HTML/CSS/global JS at runtime.

2. **No React/Vue/Angular/Vite rewrite**: The user requested a redesign of the existing app, not a rebuilt product or generated-card game.

3. **Physical cards first**: Users draw and lay out real cards. AI analyzes the uploaded photo and/or manually entered cards.

4. **Short default onboarding**: Default guided mode starts at choosing a spread, then preparation, card placement/upload/manual entry, overview, reading, and journal.

5. **Dual-source templates/data**: Templates and spreads exist as external files and embedded fallbacks, supporting both HTTP and `file://`.

6. **Generated assets must be committed/deployed**: Because the app can run without a build server, `css/premium.css` and `js/ai-identification.js` must exist alongside their `src/` sources.

7. **Mutable singleton state**: No framework reactivity. UI updates are imperative.

8. **API key in localStorage**: Gemini key is stored in plaintext in `arcana_settings`; users should use a dedicated key and can revoke it in Google AI Studio.

9. **Manual review matters**: AI identification can be wrong, especially on larger spreads. The UI must preserve review/correction.

10. **Theme is layered**: Premium visual changes should prefer the theme layer and existing class names before changing product markup or flow.

11. **Template sync matters**: For user-facing template changes, update both `templates/*.html` and embedded `<template>` fallbacks in `index.html`.

12. **Plain JS must parse**: Run `node --check` on edited global JS files. Build/type checks do not cover most runtime JavaScript.

13. **Post-reading actions must not clip**: Mobile reading actions should prioritize `Save Reading` and keep secondary actions short enough for narrow screens.
