import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = vm.createContext({
  console,
  GLYPH: { star4: "✦" },
  getSuitSym(card) {
    return {
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
      spades: "♠"
    }[card?.suit] || "✦";
  }
});

vm.runInContext(
  fs.readFileSync(new URL("../js/card-art.js", import.meta.url), "utf8"),
  context
);

const run = (source) => vm.runInContext(source, context);

assert.equal(
  run("getCardArtFile({system:'playing',name:'Ace of Hearts'})"),
  "English pattern ace of hearts.svg"
);
assert.equal(
  run("getCardArtFile({system:'playing',name:'Five of Clubs'})"),
  "English pattern 5 of clubs.svg"
);
assert.equal(
  run("getCardArtFile({system:'playing',name:'Ten of Diamonds'})"),
  "English pattern 10 of diamonds.svg"
);
assert.equal(
  run("getCardArtFile({system:'playing',name:'Jack of Spades'})"),
  "English pattern jack of spades.svg"
);
assert.equal(
  run("getCardArtFile({system:'playing',name:'Queen of Hearts'})"),
  "English pattern queen of hearts.svg"
);
assert.equal(
  run("getCardArtFile({system:'playing',name:'King of Clubs'})"),
  "English pattern king of clubs.svg"
);
assert.equal(run("getCardArtFile({system:'playing',name:'The Joker'})"), "");
assert.equal(
  run("getCardArtFile({system:'playing',name:'Eleven of Moons'})"),
  ""
);

assert.equal(
  run("getCardArtFile({system:'tarot',arcana:'major',number:0,name:'The Fool'})"),
  "RWS Tarot 00 Fool.jpg"
);
assert.equal(
  run("getCardArtFile({system:'tarot',arcana:'minor',suit:'wands',number:1,name:'Ace of Wands'})"),
  "Wands01.jpg"
);

const url = run("getCardArtUrl({system:'playing',name:'Five of Clubs'},96)");
assert.match(url, /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//);
assert.match(url, /English_pattern_5_of_clubs\.svg$/);

const rendered = run(
  "renderCardArt({system:'playing',name:'Queen of Hearts',suit:'hearts'},'picker-card-art',96)"
);
assert.match(rendered, /<img /);
assert.match(rendered, /alt="Queen of Hearts"/);
assert.match(rendered, /English_pattern_queen_of_hearts\.svg/);

const joker = run(
  "renderCardArt({system:'playing',name:'The Joker',suit:null},'picker-card-art',96)"
);
assert.doesNotMatch(joker, /<img /);
assert.match(joker, /card-art-fallback/);

console.log("card art regression passed");
