import assert from "node:assert/strict";

globalThis.window = {};
await import("../js/ai-identification.js");

const parseIdentifiedCards = globalThis.window.ArcanaAI?.parseIdentifiedCards;
assert.equal(typeof parseIdentifiedCards, "function");

const playingReferences = [
  { name: "Ace of Hearts" },
  { name: "Seven of Hearts" },
  { name: "Jack of Clubs" },
  { name: "Ace of Diamonds" },
  { name: "Ace of Spades" }
];

const playingResponse = JSON.stringify([
  { position: 1, card: "7 of hearts", orientation: "upright" },
  { position: 2, card: "Seven of Cups", orientation: "reversed" },
  { position: 3, card: "Page of Wands", orientation: "upright" },
  { position: 4, card: "Knight of Wands", orientation: "upright" },
  { position: 5, card: "Seven of Moons", orientation: "upright" }
]);

assert.deepEqual(parseIdentifiedCards(playingResponse, playingReferences), {
  "1": { name: "Seven of Hearts", orientation: "upright" },
  "2": { name: "Seven of Hearts", orientation: "reversed" },
  "3": { name: "Jack of Clubs", orientation: "upright" }
});

const tarotReferences = [
  { name: "Seven of Cups" },
  { name: "Page of Wands" },
  { name: "Knight of Wands" }
];

assert.deepEqual(
  parseIdentifiedCards(
    JSON.stringify([
      { position: 1, card: "Seven of Cups", orientation: "upright" },
      { position: 2, card: "Page of Wands", orientation: "upright" },
      { position: 3, card: "Knight of Wands", orientation: "reversed" }
    ]),
    tarotReferences
  ),
  {
    "1": { name: "Seven of Cups", orientation: "upright" },
    "2": { name: "Page of Wands", orientation: "upright" },
    "3": { name: "Knight of Wands", orientation: "reversed" }
  }
);

let malformedResult;
assert.doesNotThrow(() => {
  malformedResult = parseIdentifiedCards(
    JSON.stringify([
      null,
      "Seven of Cups",
      42,
      { position: 1, card: 7, orientation: "upright" },
      { position: 2, card: { name: "Page of Wands" }, orientation: "upright" },
      { position: 3, card: "Seven of Cups", orientation: "upright" }
    ]),
    tarotReferences
  );
});
assert.deepEqual(malformedResult, {
  "3": { name: "Seven of Cups", orientation: "upright" }
});

assert.deepEqual(
  parseIdentifiedCards(
    JSON.stringify([
      { position: 1, card: "Seven of Cups", orientation: "upright" },
      { position: "2", card: "Page of Wands", orientation: "reversed" },
      { position: 99, card: "Knight of Wands", orientation: "upright" }
    ]),
    tarotReferences,
    [1, "2"]
  ),
  {
    "1": { name: "Seven of Cups", orientation: "upright" },
    "2": { name: "Page of Wands", orientation: "reversed" }
  }
);

assert.deepEqual(
  parseIdentifiedCards(
    JSON.stringify([
      { position: { id: 1 }, card: "Seven of Cups", orientation: "upright" },
      { position: 1, card: "Page of Wands", orientation: "upright" }
    ]),
    tarotReferences,
    [1]
  ),
  {
    "1": { name: "Page of Wands", orientation: "upright" }
  }
);

assert.deepEqual(
  parseIdentifiedCards(
    JSON.stringify([
      { position: 0, card: "Seven of Cups", orientation: "upright" },
      { position: -1, card: "Page of Wands", orientation: "upright" },
      { position: "future", card: "Knight of Wands", orientation: "upright" }
    ]),
    tarotReferences,
    [1, 2, 3]
  ),
  {}
);

console.log("AI identification regression tests passed.");
