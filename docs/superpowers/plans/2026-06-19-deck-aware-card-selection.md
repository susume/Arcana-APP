# Deck-Aware Card Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Arcana identify, select, validate, and interpret tarot and standard playing cards without mixing deck terminology or accepting invalid AI card names.

**Architecture:** Extend the existing identification parser with active-deck normalization, then centralize deck-specific prompt text and deck-switch state handling in the existing global JavaScript runtime. The manual picker remains imperative UI, while regression tests protect parser behavior, prompt contracts, and guarded switching.

**Tech Stack:** Vanilla JavaScript globals, TypeScript compiled to browser JavaScript, Node assertions, PowerShell contract tests, npm scripts.

---

## File Structure

- Modify `src/ai-identification.ts`: strict active-deck validation and safe playing-card aliases.
- Generate `js/ai-identification.js`: compiled browser output.
- Create `tests/ai-identification.mjs`: executable parser behavior tests.
- Modify `js/state.js`: persist the explicit card-system establishment marker.
- Modify `js/app.js`: migrate restored card-system establishment state.
- Modify `js/ui.js`: deck tabs, guarded switching, and deck-aware identification/quick prompts.
- Modify `js/reading-engine.js`: full meanings and deck-specific reading/pattern instructions.
- Create `tests/deck-selection.mjs`: executable deck-state, detection, picker, and position-validation regressions.
- Modify `tests/reading-actions.ps1`: prompt and manual-picker contracts.
- Modify `package.json`: include the focused Node test in `npm test`.
- Modify `ARCHITECTURE.md`: document deck inference and strict name handling.
- Modify `docs/superpowers/plans/2026-06-19-deck-aware-card-selection.md`: keep the completed implementation inventory current.

### Task 1: Strict card-name normalization

**Files:**
- Create: `tests/ai-identification.mjs`
- Modify: `src/ai-identification.ts`
- Generate: `js/ai-identification.js`
- Modify: `package.json`

- [x] **Step 1: Write the failing parser test**

Create `tests/ai-identification.mjs` that loads `js/ai-identification.js` in a
minimal `window` shim and asserts:

```js
import assert from 'node:assert/strict';

globalThis.window = {};
await import('../js/ai-identification.js?' + Date.now());

const parse = window.ArcanaAI.parseIdentifiedCards;
const playing = [
  { name: 'Seven of Hearts' },
  { name: 'Five of Spades' },
  { name: 'Jack of Clubs' }
];
const tarot = [
  { name: 'Seven of Cups' },
  { name: 'Five of Swords' },
  { name: 'Knight of Wands' }
];

assert.deepEqual(
  parse('[{"position":1,"card":"7 of hearts","orientation":"upright"}]', playing),
  { '1': { name: 'Seven of Hearts', orientation: 'upright' } }
);
assert.deepEqual(
  parse('[{"position":1,"card":"Seven of Cups","orientation":"reversed"}]', playing),
  { '1': { name: 'Seven of Hearts', orientation: 'reversed' } }
);
assert.deepEqual(
  parse('[{"position":1,"card":"Page of Wands","orientation":"upright"}]', playing),
  { '1': { name: 'Jack of Clubs', orientation: 'upright' } }
);
assert.deepEqual(
  parse('[{"position":1,"card":"Knight of Wands","orientation":"upright"}]', playing),
  {}
);
assert.deepEqual(
  parse('[{"position":1,"card":"Seven of Moons","orientation":"upright"}]', playing),
  {}
);
assert.deepEqual(
  parse('[{"position":1,"card":"Seven of Cups","orientation":"upright"}]', tarot),
  { '1': { name: 'Seven of Cups', orientation: 'upright' } }
);

console.log('ai identification regression passed');
```

- [x] **Step 2: Run the focused test to verify RED**

Run:

```powershell
node tests\ai-identification.mjs
```

Expected: FAIL because numeric ranks and tarot-style playing-card aliases are
not normalized and unknown names are currently accepted.

- [x] **Step 3: Implement strict normalization**

In `src/ai-identification.ts`:

- Add number-word aliases for Ace through Ten.
- Detect whether supplied references are playing cards by their suit names.
- Resolve exact active-deck names first.
- In playing-card mode only, map Cups/Hearts, Pentacles/Diamonds,
  Wands/Clubs, and Swords/Spades.
- Map Page to Jack only in playing-card mode.
- Return `null` for Knight aliases, unknown suits/ranks, and names absent from
  the supplied references.
- Omit positions whose card name cannot be resolved.

Keep the existing two-argument API compatible while allowing spread-position
validation through an optional third argument:

```ts
parseIdentifiedCards(
  responseText: string,
  cardReferences?: ArcanaCardReference[],
  allowedPositions?: Array<string | number>
): Record<string, ArcanaIdentifiedCard>
```

When `allowedPositions` is supplied, accept only positive scalar string/number
positions whose normalized value belongs to that set. UI identification calls
pass the current spread's position IDs, reject empty post-filter results before
replacement, and remove stale non-spread keys from spread-scoped card state.

- [x] **Step 4: Compile and verify GREEN**

Run:

```powershell
npm run build:ts
node tests\ai-identification.mjs
```

Expected: TypeScript exits 0 and `ai identification regression passed`.

- [x] **Step 5: Add the focused test to `npm test`**

Insert `node tests\ai-identification.mjs` immediately after `build:ts` in the
test script.

- [x] **Step 6: Commit parser behavior**

```powershell
git add src/ai-identification.ts js/ai-identification.js tests/ai-identification.mjs package.json
git commit -m "fix: validate identified cards against active deck"
```

### Task 2: Deck-aware prompt and picker contracts

**Files:**
- Modify: `tests/reading-actions.ps1`
- Modify: `js/ui.js`
- Modify: `js/reading-engine.js`

- [x] **Step 1: Add failing contract assertions**

Extend `tests/reading-actions.ps1` to require:

```powershell
Assert-Contains $ui 'function getCardSystemPromptGuide(' 'Expected shared deck-specific identification guidance.'
Assert-Contains $ui 'function switchPickerCardSystem(' 'Expected manual picker deck switching.'
Assert-Contains $ui 'function hasSelectedReadingCards(' 'Expected guarded mixed-deck detection.'
Assert-Contains $ui 'Tarot' 'Expected Tarot picker tab.'
Assert-Contains $ui 'Playing Cards' 'Expected Playing Cards picker tab.'
Assert-Contains $ui 'Keep playing-card names as Hearts, Diamonds, Clubs, and Spades' 'Expected playing-card naming guard.'
Assert-Contains $engine 'function getReadingSystemInstructions(' 'Expected deck-specific reading instructions.'
Assert-Contains $engine 'Meaning:' 'Expected full card meanings in AI prompt card lines.'
Assert-Contains $engine 'Do not rename playing cards as tarot equivalents' 'Expected playing-card terminology guard.'
Assert-Contains $engine 'Do not discuss Major Arcana' 'Expected playing-card pattern-analysis rule.'
```

- [x] **Step 2: Run the contract test to verify RED**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests\reading-actions.ps1
```

Expected: FAIL at the first missing deck-aware helper.

- [x] **Step 3: Add shared deck prompt guidance**

In `js/ui.js`, add:

```js
function getCardSystemPromptGuide(cardSystem, allowDetection){
  if(allowDetection){
    return `First determine whether the photograph contains traditional tarot or standard playing cards.
If tarot, use standard Rider-Waite-Smith names.
If playing cards, keep playing-card names as Hearts, Diamonds, Clubs, and Spades; use Jack, Queen, and King; never rename them as Cups, Pentacles, Wands, Swords, Pages, or Knights.`;
  }
  if(cardSystem==='tarot'){
    return 'This is a traditional tarot deck. Use standard Rider-Waite-Smith card names only.';
  }
  return 'This is a standard playing-card deck. Keep playing-card names as Hearts, Diamonds, Clubs, and Spades; use Jack, Queen, and King; never rename them as Cups, Pentacles, Wands, Swords, Pages, or Knights.';
}
```

Use it in:

- `identifyGuidedCards()`
- `identifyCards()`
- The known-spread branch of `quickRead()`
- The photo-first/unknown-spread branch of `quickRead()`

Make the quick prompt role deck-neutral (`card reader`), and make pattern
analysis conditional: tarot asks for Major Arcana; playing cards ask for suit
and rank patterns without Major Arcana.

- [x] **Step 4: Add guarded manual picker switching**

In `js/ui.js`, add:

```js
function hasSelectedReadingCards(){
  return Object.keys(state.cards||{}).length>0 || !!state.droppedCard;
}

function switchPickerCardSystem(nextSystem){
  if(nextSystem===state.cardSystem)return true;
  if(hasSelectedReadingCards()){
    const ok=confirm('Switching deck types will clear the cards already selected for this reading. Continue?');
    if(!ok)return false;
    state.cards={};
    state.droppedCard=null;
    state.hasDroppedCard=false;
  }
  state.cardSystem=nextSystem;
  state.cardSystemEstablished=false;
  currentCards=getCards();
  buildSuitFilter();
  renderPickerCards('');
  return true;
}
```

Render Tarot and Playing Cards buttons in `openCardPicker()` before the suit
filters. The active tab follows `state.cardSystem`.

Browsing tabs changes `state.cardSystem` and available cards without establishing
the deck. The first selected card establishes its system. Never permit a card
absent from `currentCards` to be saved.

If the current system is `playing-joker`, selecting a playing card (including
The Joker) preserves `playing-joker`; ordinary Playing Cards tab selections
remain `playing`.

- [x] **Step 5: Make guided readings deck-specific**

In `js/reading-engine.js`, add `getReadingSystemInstructions()` returning:

- Tarot role, naming, and pattern-analysis guidance.
- Playing-card cartomancy role, original naming prohibition, Hearts/Diamonds/
  Clubs/Spades and rank-pattern guidance, and `Do not discuss Major Arcana`.

Change each prompt card line to include the selected orientation's full meaning:

```js
const meaning=card
  ? (entry.orientation==='reversed'?card.reversed:card.upright)
  : '';
cardLines+=`... Keywords: ${kws}. Meaning: ${meaning}\n`;
```

Insert the deck-specific instructions before the requested sections and replace
the universal Major Arcana pattern request with the helper's pattern rule.

- [x] **Step 6: Run focused tests to verify GREEN**

Run:

```powershell
npm run build:ts
node tests\ai-identification.mjs
powershell -ExecutionPolicy Bypass -File tests\reading-actions.ps1
node --check js\ui.js
node --check js\reading-engine.js
```

Expected: all commands exit 0.

- [x] **Step 7: Commit prompt and picker behavior**

```powershell
git add js/ui.js js/reading-engine.js tests/reading-actions.ps1
git commit -m "feat: add deck-aware card selection and prompts"
```

### Task 3: Documentation and full verification

**Files:**
- Modify: `ARCHITECTURE.md`

- [x] **Step 1: Document current behavior**

Update the card-entry and identification sections to state:

- Manual picker tabs browse tarot or playing-card mode; first selection or
  explicit onboarding establishes the deck.
- Switching after selections requires confirmation and clears incompatible
  cards only when confirmed.
- Photo-first identification detects and establishes exactly one deck, rejects
  mixed or empty results, and otherwise validates names against the active deck.
- Safe playing-card aliases normalize; ambiguous/unknown names are omitted.
- Quick photo detection requires a `CARD_SYSTEM` marker and cannot override an
  established deck.
- Reading prompts use full active-orientation meanings and deck-specific pattern
  analysis.
- Legacy autosaves infer establishment from valid saved cards.

- [x] **Step 2: Run the complete verification suite**

Run:

```powershell
npm run build
npm test
node --check js\app.js
node --check js\ui.js
node --check js\reading-engine.js
git diff --check
```

Expected: all commands exit 0; every regression reports passed.

- [x] **Step 3: Review scope**

Run:

```powershell
git status --short
git diff --stat
git diff -- src/ai-identification.ts js/ai-identification.js js/ui.js js/reading-engine.js tests/ai-identification.mjs tests/reading-actions.ps1 package.json ARCHITECTURE.md
```

Expected: changes are limited to the approved deck-aware implementation,
generated output, tests, documentation, and this plan.

- [x] **Step 4: Commit documentation**

```powershell
git add ARCHITECTURE.md docs/superpowers/plans/2026-06-19-deck-aware-card-selection.md
git commit -m "docs: describe deck-aware card handling"
```
