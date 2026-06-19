# Arcana Deck-Aware Card Selection Design

## Goal

Let users work naturally with either tarot or standard playing cards without a
required deck-selection step, while preventing mixed-deck readings and ensuring
AI output uses the correct naming and interpretation system.

## Scope

This design covers:

- Tarot and Playing Cards tabs in manual card selection
- Automatic deck inference from manual selection
- Deck-aware photo identification
- Guarded switching when cards from another deck already exist
- Strict card-name normalization and rejection
- Deck-specific AI reading and pattern-analysis instructions
- Full playing-card cartomancy meanings in guided reading prompts

It does not change reading length, life-stage behavior, pricing, routes, spread
definitions, or visual direction outside the card-selection controls.

## Deck Model

Arcana continues to use the existing `state.cardSystem` values:

- `tarot`
- `playing`
- `playing-joker`

The new manual picker presents two primary tabs:

- Tarot
- Playing Cards

Standard Playing Cards selects the 52-card `playing` system. Existing
`playing-joker` support remains compatible with the runtime but is not added as
a third primary picker tab in this change.

## Manual Card Selection

The card picker gains a visible Tarot / Playing Cards tab control above its suit
filters and card grid.

Behavior:

1. Before any cards are selected, changing tabs immediately changes the active
   deck and available card list.
2. Selecting the first card establishes `state.cardSystem`.
3. After one or more cards or a dropped card exist, selecting a card from the
   other deck triggers a confirmation.
4. If confirmed, Arcana clears existing position cards and the dropped card,
   changes `state.cardSystem`, rebuilds `currentCards`, and accepts the new
   selection.
5. If cancelled, the existing deck and selections remain unchanged.

The app must never silently retain tarot and playing cards in the same reading.

## Photo Identification

Photo identification prompts become deck-aware.

If a deck is already established, the prompt must:

- Name that exact card system
- Request only valid names from that system
- Use tarot examples only for tarot
- Use playing-card examples only for playing cards

If no deck is established in a quick/photo-first flow, the prompt must ask the
model to identify the card system first and then use names from that system.

For standard playing cards:

- Preserve Hearts, Diamonds, Clubs, and Spades.
- Preserve Jack, Queen, and King ranks.
- Do not rename suits to Cups, Pentacles, Wands, or Swords.
- Do not rename Jack to Page or Knight.

## Card-Name Validation

`parseIdentifiedCards()` must only return names present in the supplied active
deck reference.

Normalization rules:

- Accept case and whitespace differences.
- Accept common numeric formatting such as `7 of Hearts` for
  `Seven of Hearts`.
- For playing-card mode only, normalize unambiguous tarot-style equivalents:
  Cups to Hearts, Pentacles to Diamonds, Wands to Clubs, and Swords to Spades.
- Normalize Page to Jack when converting an otherwise unambiguous
  playing-card equivalent.
- Do not normalize tarot Knight cards to playing cards because there is no
  unambiguous equivalent.
- Reject unknown, ambiguous, or out-of-deck names by omitting that position,
  leaving it available for manual review.

The parser must not accept an arbitrary model-provided card name merely because
it is well-formed text.

## Reading Prompt

The guided AI reading prompt becomes explicitly deck-specific.

### Tarot

- Identify the reader as knowledgeable in traditional tarot.
- Supply tarot card names, orientations, keywords, and full upright/reversed
  meanings.
- Pattern analysis may discuss Major Arcana, Minor Arcana suits, repeated
  numbers, reversals, courts, and card interactions.

### Playing Cards

- Identify the reader as knowledgeable in playing-card cartomancy.
- Supply original playing-card names, orientations, keywords, and full
  cartomancy meanings from Arcana's card database.
- Explicitly prohibit renaming cards as tarot equivalents.
- Pattern analysis may discuss Hearts, Diamonds, Clubs, Spades, repeated ranks,
  court-card patterns, reversals, and interactions.
- Do not request or discuss Major Arcana.

Quick-reading prompts follow the same deck-specific rules. Photo-first quick
readings instruct the model to detect the system and keep the detected system's
terminology throughout the response.

## User Feedback and Error Handling

- A confirmed deck switch clears incompatible selections and returns the user to
  a coherent picker state.
- A cancelled switch makes no state changes.
- Rejected AI card names do not stop identification of other valid positions.
- The existing review/manual-entry UI remains the correction path for unclear
  or rejected cards.
- Identification success messaging should continue to remind users to review
  the result.

## Implementation Boundaries

Expected implementation areas:

- `src/ai-identification.ts`
- Generated `js/ai-identification.js`
- `js/ui.js`
- `js/reading-engine.js`
- Manual picker markup generated by `js/ui.js`
- Existing regression tests, with a focused new Node test if needed
- `package.json` only if the new focused test is added to `npm test`

Do not introduce a framework, new runtime dependency, mixed-deck state, or a
new mandatory onboarding step.

## Testing

Automated coverage must verify:

- Valid tarot names remain valid.
- Valid playing-card names remain valid.
- Numeric playing-card ranks normalize to Arcana names.
- Clear tarot-style playing-card equivalents normalize correctly.
- Ambiguous Knight equivalents and unknown cards are rejected.
- Identification prompts use deck-specific examples and terminology.
- Playing-card reading prompts include full cartomancy meanings.
- Playing-card pattern analysis excludes Major Arcana.
- Manual switching requires confirmation when selections exist.
- Confirmed switching clears incompatible cards; cancellation preserves them.
- Existing homepage, app-shell, journal, monetization, and reading regressions
  continue to pass.

## Acceptance Criteria

- Users can switch between Tarot and Playing Cards inside manual card selection.
- The first selected card establishes the reading deck.
- Existing readings cannot silently contain mixed card systems.
- Photo identification uses names appropriate to the selected or detected deck.
- Playing-card readings retain playing-card terminology throughout.
- AI-returned names are normalized only when safe and otherwise rejected.
- Guided playing-card prompts include Arcana's full cartomancy meanings.
- Pattern analysis is appropriate to the active deck.
- All generated assets and automated tests pass.
