# Playing-Card Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render CC0 English-pattern SVG thumbnails for all 52 standard playing cards through Arcana's existing card-art pipeline.

**Architecture:** Extend `getCardArtFile()` with deterministic rank/suit mapping for playing cards while leaving tarot mappings untouched. A focused Node test will execute the real helper, verify filenames, URLs, rendering, and fallback behavior; browser verification will confirm the shared picker and overview UI.

**Tech Stack:** Vanilla JavaScript globals, Wikimedia Commons upload URLs, Node assertions, PowerShell regression tests, in-app browser.

---

## File Structure

- Create `tests/card-art.mjs`: direct behavior tests for filenames, URLs, render output, and fallback.
- Modify `js/card-art.js`: English-pattern playing-card filename mapping.
- Modify `package.json`: run the focused test in `npm test`.
- Modify `tests/reading-actions.ps1`: preserve source/license and shared-render contracts.
- Modify `ARCHITECTURE.md`: document the CC0 playing-card source.
- Modify this plan to mark verified steps complete.

### Task 1: Add playing-card artwork mapping

**Files:**
- Create: `tests/card-art.mjs`
- Modify: `js/card-art.js`
- Modify: `package.json`
- Modify: `tests/reading-actions.ps1`

- [ ] **Step 1: Write the failing focused test**

Load `js/card-art.js` in a Node `vm` context with `getSuitSym()` and `GLYPH`
stubs. Assert:

```js
getCardArtFile({system:'playing',name:'Ace of Hearts'}) ===
  'English pattern ace of hearts.svg'
getCardArtFile({system:'playing',name:'Five of Clubs'}) ===
  'English pattern 5 of clubs.svg'
getCardArtFile({system:'playing',name:'Ten of Diamonds'}) ===
  'English pattern 10 of diamonds.svg'
getCardArtFile({system:'playing',name:'Jack of Spades'}) ===
  'English pattern jack of spades.svg'
getCardArtFile({system:'playing',name:'Queen of Hearts'}) ===
  'English pattern queen of hearts.svg'
getCardArtFile({system:'playing',name:'King of Clubs'}) ===
  'English pattern king of clubs.svg'
getCardArtFile({system:'playing',name:'The Joker'}) === ''
getCardArtFile({system:'playing',name:'Eleven of Moons'}) === ''
```

Also verify:

- A representative playing-card URL ends in the encoded SVG filename and uses
  Wikimedia's upload host.
- `renderCardArt()` includes an `<img>` and canonical alt text for a standard
  playing card.
- Joker rendering contains only the fallback and no `<img>`.
- Existing tarot mapping for The Fool and Ace of Wands is unchanged.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```powershell
node tests\card-art.mjs
```

Expected: FAIL because playing cards currently return an empty filename.

- [ ] **Step 3: Implement the minimum mapping**

In `js/card-art.js`:

- Record the English-pattern CC0 source in the module comment.
- Add rank aliases from Arcana names to Wikimedia filename tokens.
- Parse canonical `<Rank> of <Suit>` playing-card names.
- Accept only Hearts, Diamonds, Clubs, and Spades.
- Return `English pattern <rank> of <suit>.svg`.
- Continue returning an empty filename for The Joker and malformed names.
- Do not change tarot filename logic or URL generation.

- [ ] **Step 4: Add regression contracts**

In `tests/reading-actions.ps1`, require:

- The English-pattern source/license comment.
- The SVG filename prefix.
- The existing shared `renderCardArt()` use in picker and overview.
- Joker's no-art fallback behavior.

- [ ] **Step 5: Add the test to `npm test` and verify GREEN**

Insert `node tests\card-art.mjs` after TypeScript compilation and before the
other Node regressions.

Run:

```powershell
node tests\card-art.mjs
npm test
node --check js\card-art.js
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit implementation**

```powershell
git add js/card-art.js tests/card-art.mjs tests/reading-actions.ps1 package.json
git commit -m "feat: add playing card thumbnails"
```

### Task 2: Document and visually verify

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `docs/superpowers/plans/2026-06-19-playing-card-thumbnails.md`

- [ ] **Step 1: Document the artwork source**

Update the card-art and asset sections to record:

- Rider-Waite-Smith tarot art and English-pattern playing-card art both use
  Wikimedia Commons.
- The playing-card set is CC0/public domain.
- Standard 52-card art is remote SVG.
- Joker and failed images retain the local fallback.

- [ ] **Step 2: Run full build and tests**

```powershell
npm run build
npm test
node --check js\card-art.js
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Browser verification**

Using the in-app browser on the local preview:

- Open Manual Entry and the card picker.
- Verify tarot thumbnails still load.
- Switch to Playing Cards.
- Verify number cards and court cards show red/black English-pattern faces.
- Select a playing card and verify its overview art.
- If `playing-joker` is available, verify Joker uses the fallback.
- Check desktop and a 390px viewport for clipping or overflow.
- Check console errors.

- [ ] **Step 4: Commit documentation**

```powershell
git add ARCHITECTURE.md docs/superpowers/plans/2026-06-19-playing-card-thumbnails.md
git commit -m "docs: describe playing card artwork"
```
