# Arcana Playing-Card Thumbnails Design

## Goal

Give standard playing cards authentic illustrated thumbnails throughout Arcana,
matching the visual usefulness of the existing Rider-Waite-Smith tarot art.

## Source

Use the individual card files from Wikimedia Commons' **English pattern playing
cards** set by Dmitry Fomin:

- Deck source:
  `https://commons.wikimedia.org/wiki/File:English_pattern_playing_cards_deck.svg`
- License: CC0 1.0 Universal / public-domain dedication
- Format: individual SVG files for all 52 standard playing cards

The source is appropriate for commercial and non-commercial use without an
attribution requirement. Arcana's architecture documentation should still
record the source and license for maintainability.

## Rendering Strategy

Extend the existing public-domain card-art helper in `js/card-art.js`.

The current helper already:

- Maps tarot cards to Wikimedia filenames
- Builds direct Wikimedia upload URLs
- Renders lazy-loaded accessible images
- Preserves a local fallback when remote art is unavailable
- Is reused by picker, dropdown, overview, and sharing-related surfaces

Playing-card art should use the same pipeline rather than adding a second image
system.

## Filename Mapping

For `card.system === "playing"`:

- Convert Arcana ranks to Wikimedia's lowercase English-pattern filenames:
  - `Ace` -> `ace`
  - `Two` through `Ten` -> `2` through `10`
  - `Jack` -> `jack`
  - `Queen` -> `queen`
  - `King` -> `king`
- Convert suits to lowercase:
  - Hearts -> `hearts`
  - Diamonds -> `diamonds`
  - Clubs -> `clubs`
  - Spades -> `spades`
- Produce:
  `English pattern <rank> of <suit>.svg`

Examples:

- `Ace of Hearts` -> `English pattern ace of hearts.svg`
- `Five of Clubs` -> `English pattern 5 of clubs.svg`
- `Queen of Spades` -> `English pattern queen of spades.svg`

The existing Wikimedia URL builder and MD5 path calculation should support SVG
filenames without introducing hardcoded URLs for all 52 cards.

## Joker Behavior

The approved English-pattern set contains the standard 52-card deck and does
not provide a matching Joker.

Arcana's optional Joker must:

- Continue to work in the `playing-joker` deck
- Use the existing styled suit/star fallback
- Never show a broken image placeholder
- Remain selectable and readable

No unrelated Joker artwork should be introduced in this change.

## Visual Behavior

Playing-card thumbnails appear anywhere `renderCardArt()` is already used,
including:

- Manual card picker
- Search/dropdown card results
- Spread overview
- Dropped/jumper card overview

The images should use the existing card frame, lazy loading, alt text, and
missing-art fallback behavior.

Playing cards retain familiar white card faces, red/black suits, and court-card
illustrations. Existing Arcana framing should visually connect them to the dark
Ritual Shell without recoloring the card artwork.

## Failure and Offline Behavior

If Wikimedia is unavailable, blocked, or an individual asset fails:

- The image's frame receives the existing `art-missing` class.
- Arcana displays the current suit-symbol fallback.
- Card selection and reading behavior remain fully functional.

This change does not make the app's image art available offline. It preserves
the current remote-art model used for tarot.

## Accessibility

- Image alt text remains the canonical Arcana card name.
- Decorative fallback symbols remain hidden from assistive technology.
- The visible card label remains present beside/below the thumbnail.
- Loading behavior must not change keyboard selection or focus.

## Testing

Automated regressions should verify:

- Tarot filenames and URLs remain unchanged.
- Representative playing cards map to exact English-pattern SVG filenames:
  Ace, numeric card, Ten, Jack, Queen, and King across multiple suits.
- Joker returns no remote artwork filename/URL and uses fallback rendering.
- Playing-card rendering includes an `<img>` with the canonical alt text.
- Unknown or malformed playing-card names fail safely to the fallback.
- Existing card picker and reading regressions continue to pass.

Browser verification should check:

- Tarot thumbnails still load.
- Playing-card number and court cards display in the picker.
- Red and black suits are visually correct.
- Overview cards display playing-card art.
- Joker displays the fallback.
- Failed image loading leaves a usable fallback.
- Desktop and mobile picker layouts do not overflow or become visually cramped.

## Scope

Expected implementation files:

- `js/card-art.js`
- Existing card-art regression coverage, likely `tests/reading-actions.ps1`
  plus a focused Node test if useful
- `ARCHITECTURE.md`

No changes are required to card meanings, deck detection, AI prompts, state,
premium behavior, or reading logic.

## Acceptance Criteria

- Every standard playing card can render the matching CC0 English-pattern SVG.
- Tarot artwork remains unchanged.
- Playing-card artwork appears through the existing shared render path.
- The Joker and failed remote images use Arcana's existing fallback.
- Selection, accessibility, responsive layout, and reading behavior do not
  regress.
- Source and public-domain license are documented.
