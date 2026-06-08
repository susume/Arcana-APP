# Arcana — Architecture

## Overview

Arcana is a **client-side-only Single-Page Application** for tarot and playing-card cartomancy readings. It has no backend, no build step, and no framework dependencies. It can be served as static files over HTTP or opened directly via `file://`. AI features require a Google Gemini API key supplied by the user; everything else runs entirely offline.

---

## Technology Stack

| Layer | Choice |
|---|---|
| Language | Vanilla JavaScript (ES2020 — async/await, optional chaining) |
| Markup | HTML5 with `<template>` elements for screen partials |
| Styling | CSS3 with custom properties (no preprocessor) |
| AI | Google Gemini REST API (multimodal, via `fetch`) |
| Persistence | `localStorage` only |
| Fonts | Cormorant Garamond WOFF2 (self-hosted) |
| Build | None |

---

## Directory Layout

```
Arcana APP/
├── index.html              # Shell + embedded fallback templates + script tags
├── assets/
│   └── fonts/              # 14 WOFF2 files — Cormorant Garamond (subsets × weights)
├── css/
│   ├── main.css            # All active styles + @font-face declarations
│   ├── onboarding.css      # Placeholder (stub, empty)
│   ├── reading.css         # Placeholder (stub, empty)
│   └── settings.css        # Placeholder (stub, empty)
├── data/
│   └── spreads.json        # Spread definitions (authoritative source for HTTP)
├── js/
│   ├── tarot.js            # Card database, glyphs, constants  [loads first]
│   ├── spreads.js          # Spread loader (JSON fetch + fallback)
│   ├── state.js            # Global state singleton + card helpers
│   ├── storage.js          # localStorage read/write
│   ├── ui.js               # All screen rendering + event handlers
│   ├── reading-engine.js   # Reading generation (AI + classic) + markdown renderer
│   ├── ai.js               # Gemini API client
│   └── app.js              # Entry point (init, routing, star animation)
└── templates/              # Partials fetched at runtime over HTTP
    ├── welcome.html
    ├── concerns.html
    ├── card-system.html
    ├── choose-reading.html
    ├── reflection.html
    ├── placement.html
    ├── overview.html
    ├── results.html
    ├── history.html
    ├── quick.html
    ├── settings.html
    └── help.html
```

---

## Script Load Order

Scripts are declared at the bottom of `index.html` and loaded in dependency order:

```
tarot.js          → card data, GLYPH/ICON/SUIT constants, buildPlayingCards()
spreads.js        → SPREADS array loader (depends on DOM for embedded fallback)
state.js          → global `state` object, getCards(), getSpread() (depends on tarot.js)
storage.js        → localStorage helpers (depends on state.js)
ui.js             → navigation, all screen rendering, event handlers (depends on all above)
reading-engine.js → reading generation + markdown rendering (depends on ui.js, ai.js)
ai.js             → callGemini(), testApiKey() (standalone, only needs fetch)
app.js            → initApp() entry point (depends on everything)
```

All scripts are plain globals — no module system. Functions are shared across files via the global scope.

---

## Template Loading Strategy

`renderScreen()` in `ui.js` runs once on init and populates `<main id="app">`:

- **`file://` protocol**: reads content from `<template id="template-*">` tags embedded in `index.html` — ensures the app works as a local file with no server.
- **`http(s)://` protocol**: fetches each partial from `templates/<name>.html`, with embedded template as fallback if the fetch fails.

The 12 template names are: `welcome`, `concerns`, `card-system`, `choose-reading`, `reflection`, `placement`, `overview`, `results`, `history`, `quick`, `settings`, `help`.

---

## Global State

Defined in `state.js`. One mutable singleton; no reactivity system.

```js
let state = {
  mode:           'guided' | 'quick',
  concerns:       string[],            // user-supplied focus topics
  cardSystem:     'tarot' | 'playing' | 'playing-joker',
  spreadId:       string | null,       // key into SPREADS array
  cards:          { [positionId]: { name: string, orientation: 'upright'|'reversed' } },
  droppedCard:    { name, orientation } | null,
  hasDroppedCard: boolean,
  uploadedImage:  string | null,       // base64 data URL
  narrative:      string,              // markdown text of generated reading
  readingMode:    'ai' | 'classic',
  guidedStep:     number,              // current position index in guided draw
  reversals:      boolean,
  quickSpreadId:  string | null
};
let currentCards = [];                 // active card array (tarot or playing)
```

State is mutated directly throughout `ui.js` and `reading-engine.js`. `autoSaveState()` serialises it to `localStorage` on every screen navigation.

---

## Navigation & Routing

Hash-based SPA routing, managed in `ui.js`:

- URL format: `index.html#<route>` (e.g. `#spread`, `#reading`, `#welcome`)
- `goScreen(screenId)` — hides all `.screen` elements, shows the target, updates `location.hash`, triggers screen-specific side effects (render history, update dots, autosave)
- `window.addEventListener('hashchange', ...)` in `app.js` handles back/forward navigation
- `GUIDED_SCREENS` array drives the step-dot progress indicator:

```
['screen-spread', 'screen-reflection', 'screen-card-entry', 'screen-overview', 'screen-reading']
```

Modals (`modal-settings`, `modal-help`) are overlays toggled via `openModal()` / `closeModal()` — they are not screens and do not affect routing.

---

## Screen Flow

### Guided Mode

```
screen-welcome
  → [optional] screen-concerns       (topic / focus input)
  → [optional] screen-card-system    (tarot vs playing cards)
  → screen-spread                    (choose reading type)
  → screen-reflection                (mindfulness pause)
  → screen-card-entry                (enter cards — 3 tabs)
  → screen-overview                  (review spread)
  → screen-reading                   (AI or classic reading output)
```

`startGuided()` resets state and navigates directly to `screen-spread`. Concerns and card-system screens are accessible via back-navigation but not part of the default guided path.

### Quick Mode

```
screen-welcome
  → screen-quick    (choose spread + upload photo → AI reads inline)
```

### Utility Screens

- `screen-history` — accessible from welcome footer link; loads saved readings from localStorage
- `modal-settings` — API key, reading style, reading tone
- `modal-help` — tarot guide / FAQ

---

## Card Systems

Defined entirely in `tarot.js` (no network fetch):

### Tarot (78 cards)
- `TAROT_MAJOR`: 22 Major Arcana cards (hardcoded objects with `keywords`, `upright`, `reversed`)
- `buildTarotMinor()`: generates 56 Minor Arcana from `MINOR_MEANINGS` (Ace–Ten) and `COURT_MEANINGS` (Page, Knight, Queen, King) for 4 suits
- `TAROT_CARDS = [...TAROT_MAJOR, ...buildTarotMinor()]`

### Playing Cards (52 / 53 cards)
- `buildPlayingCards(includeJoker)` — constructs from `PLAYING_MEANINGS` keyed by suit + rank index
- Upright = meaning string; Reversed = auto-generated blocked/shadow variant
- Optional Joker with its own meaning

### Card Object Shape

```js
{
  system:    'tarot' | 'playing',
  name:      string,               // e.g. "The Fool", "Ace of Cups", "King of Hearts"
  arcana:    'major' | 'minor',    // tarot only
  suit:      string | null,        // 'wands'|'cups'|'swords'|'pentacles' | 'hearts'|'spades'|'diamonds'|'clubs'
  number:    number,               // 0–14
  keywords:  string[],
  upright:   string,
  reversed:  string
}
```

`currentCards` (in `state.js`) holds the active array and is rebuilt whenever `cardSystem` changes.

---

## Spreads

Defined in `data/spreads.json` (loaded by `spreads.js`):

```js
// spreads.js
let SPREADS = [];
async function loadSpreads() { /* fetch JSON, fallback to embedded <script> tag */ }
```

The JSON is also embedded verbatim in `index.html` as `<script type="application/json" id="spreads-data">` for the `file://` protocol fallback — same dual-source pattern as the HTML templates.

### Spread Object Shape

```js
{
  id:          string,          // e.g. 'three-card', 'celtic-cross'
  name:        string,
  category:    'Daily' | 'Classic' | 'Relationships' | 'Life & Decisions' | 'Custom',
  description: string,
  cardCount:   number,
  positions:   [{ id: number, name: string, description: string }],
  layout:      'row' | 'celtic' | 'celtic-simple' | 'romany' | 'yearly' | 'pyramid' | 'grid' | 'custom'
}
```

### Available Spreads

| ID | Cards | Category |
|---|---|---|
| one-card / quickInsight | 1 | Daily |
| three-card / standardReading | 3 | Daily / Classic |
| three-card-sao | 3 | Daily |
| five-card | 5 | Classic |
| six-card / deepExploration | 6 | Classic |
| celtic-cross | 10 | Classic |
| romany | 21 | Classic |
| yearly | 12 | Classic |
| relationship | 5 | Relationships |
| future-love | 6 | Relationships |
| career | 5 | Life & Decisions |
| two-pathways | 14 | Life & Decisions |
| timeline | 5 | Classic |
| custom | variable | Custom |

---

## Card Entry Screen (screen-card-entry)

Three tabs implemented in `ui.js`:

### 1. Guided Draw (default tab)
- Steps through each spread position one at a time with ritual prompts
- Renders a visual spread diagram (`renderSpreadDiagram`) with active/done slot highlighting
- After all positions are placed, reveals a photo upload section
- AI identification populates `state.cards` then switches to Manual Entry for review

### 2. Upload Photo
- Drag-and-drop or click-to-upload (JPG/PNG/WEBP)
- File read as base64 → stored in `state.uploadedImage`
- "Identify Cards with AI" calls Gemini vision with a structured prompt listing spread positions
- Response parsed as JSON array `[{position, card, orientation}]` → populates `state.cards`

### 3. Manual Entry
- One row per spread position; searchable text input with live dropdown (max 8 results)
- Suit filter buttons narrow the picker
- Upright/reversed toggle button per card (`↑` / `↓`)
- Card Picker modal — full grid of cards filtered by suit, click to select

All three tabs write to the same `state.cards` object, so switching tabs preserves selections.

---

## Reading Generation (reading-engine.js)

`generateReading()` runs when the user reaches `screen-reading`:

```
Has geminiKey AND readingMode !== 'classic-forced'?
  YES → generateAIReading()  → callGemini() → renderReading()
         [on failure] → generateClassicReading() → renderReading()
  NO  → generateClassicReading() → renderReading()
```

### AI Reading (`generateAIReading`)
1. Builds a structured markdown-headed prompt with:
   - Spread name and layout hint (`getSpreadLayoutHint()`)
   - Each position + card name + orientation + keywords
   - Dropped card (if any)
   - User concerns, reading style, tone
   - Special notes for Romany / Yearly / Celtic Cross spreads
2. Calls `callGemini()` with optional `state.uploadedImage`
3. Stores result in `state.narrative`, renders via `renderReading()`

### Classic Reading (`generateClassicReading`)
Generates reading entirely offline:
- Pattern analysis: dominant suit, Major Arcana count, reversal count, repeated numbers
- Sections: Dropped Card → Introduction → Position-by-Position → Pattern Analysis → Guidance → Reflection Questions
- Uses `card.upright` / `card.reversed` strings from the card database

### Markdown Renderer (`renderReading` / `renderReadingInto`)
Converts the narrative markdown to HTML:
- `## Header` → `<div class="reading-section"><h3>`
- `- item` → `<ul><li>`
- `**text**` → `<strong>`, `*text*` → `<em>`
- Empty lines → paragraph breaks

> **Note**: This renderer is duplicated — `renderReading()` targets `#reading-content`, `renderReadingInto(container, text)` in `ui.js` is used for history items and quick reading output.

---

## AI Layer (ai.js)

`callGemini(prompt, apiKey, imageData, statusEl)`:

- **Model fallback chain**: `gemini-2.5-flash → gemini-2.5-flash-lite → gemini-3.5-flash → gemini-3.1-flash-lite`
- Each model gets 2 attempts before falling to the next
- Rate limit (HTTP 429): waits with a countdown display, retries once; if `limit: 0` skips immediately
- 403 → throws "API key invalid" with setup instructions
- Multimodal: if `imageData` is provided, appends `inline_data` part with base64 + MIME type

`testApiKey()` validates the key with a minimal prompt (`"Say 'hello' in one word."`) and auto-saves settings on success.

---

## Persistence (storage.js)

All persistence is `localStorage` with no expiry except the autosave:

| Key | Contents | Notes |
|---|---|---|
| `arcana_autosave` | `{ state, timestamp }` | Expires after 1 hour; restored on app load |
| `arcana_settings` | `{ geminiKey, readingStyle, readingTone }` | Persists indefinitely |
| `arcana_readings` | Array of reading records | Capped at 50 entries (oldest dropped) |
| `arcana-journal` | Array of journal entries | Capped at 50 entries |

### Reading Record Shape

```js
{
  id:           string,          // Date.now().toString(36) + random suffix
  title:        string,
  date:         ISO string,
  mode:         'guided' | 'quick',
  concerns:     string[],
  cardSystem:   string,
  spread:       string,          // spreadId
  spreadName:   string,
  cards:        object,          // snapshot of state.cards
  droppedCard:  object | null,
  hasDroppedCard: boolean,
  narrative:    string,          // full markdown text
  notes:        string           // user journal entry, editable in history
}
```

---

## CSS Architecture

`main.css` carries all active styles. The three other CSS files (`onboarding.css`, `reading.css`, `settings.css`) are empty stubs with a comment indicating planned extraction.

### Design Tokens (CSS custom properties)

```css
--au-violet     /* primary accent — deep purple */
--gold          /* secondary accent — gold/amber */
--gold-dim      /* muted gold background */
--fg            /* foreground text */
--muted         /* secondary text */
--border        /* border color */
--success       /* green */
--danger        /* red */
--font-display  /* Cormorant Garamond (serif, display) */
```

### Font Loading
- Cormorant Garamond, italic, weights 400 and 500
- 14 WOFF2 files cover 5 Unicode subsets: cyrillic-ext, cyrillic, vietnamese, latin-ext, latin

---

## Social Sharing

Implemented in `ui.js`:

- `shareReading()` — reads narrative text + spread name + card list
- `renderShareCanvas()` — draws a 600×800px canvas with dark background, spread title, and truncated narrative text (max 30 lines × 70 chars)
- `downloadShareImage()` — exports canvas as PNG via `<a download>`
- `shareNative()` — uses Web Share API with `File` attachment; falls back to download

---

## Key Constraints & Design Decisions

1. **No build tooling** — all files are plain JS/CSS/HTML. A developer can open `index.html` directly in a browser.

2. **Dual-source data** — Spreads JSON and HTML templates are both embedded in `index.html` AND available as separate files, supporting both `file://` and HTTP delivery without code branching at the call site.

3. **Global scope everywhere** — Functions are global variables. There is no module system, no namespacing, and no encapsulation. This keeps the code simple to trace but creates implicit inter-file dependencies on load order.

4. **State is a mutable singleton** — No reactive framework. UI is re-rendered imperatively on each navigation or user action.

5. **Markdown renderer is duplicated** — `renderReading()` and `renderReadingInto()` contain identical logic. This is a known refactor opportunity.

6. **API key stored in localStorage** — The Gemini API key is plaintext in `arcana_settings`. Users are advised to use free-tier keys created specifically for this app.

7. **CSS stub files** — `onboarding.css`, `reading.css`, `settings.css` are placeholders. All styles currently live in `main.css`.
