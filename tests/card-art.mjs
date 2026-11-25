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
assert.match(url, /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//);
assert.match(url, /English_pattern_5_of_clubs\.svg\?width=96$/);

// A canvas needs a direct image response that permits cross-origin drawing.
assert.equal(
  run("getCardArtUrl({system:'tarot',arcana:'major',number:3},250,{forCanvas:true})"),
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/RWS_Tarot_03_Empress.jpg/250px-RWS_Tarot_03_Empress.jpg"
);
assert.equal(
  run("getCardArtUrl({system:'playing',name:'Ace of Hearts'},250,{forCanvas:true})"),
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/English_pattern_ace_of_hearts.svg/250px-English_pattern_ace_of_hearts.svg.png"
);

const rendered = run(
  "renderCardArt({system:'playing',name:'Queen of Hearts',suit:'hearts'},'picker-card-art',96)"
);
assert.match(rendered, /<img /);
assert.match(rendered, /alt="Queen of Hearts"/);
assert.match(rendered, /English_pattern_queen_of_hearts\.svg\?width=96/);

const joker = run(
  "renderCardArt({system:'playing',name:'The Joker',suit:null},'picker-card-art',96)"
);
assert.doesNotMatch(joker, /<img /);
assert.match(joker, /card-art-fallback/);

vm.runInContext(
  fs.readFileSync(new URL("../js/tarot.js", import.meta.url), "utf8"),
  context
);
const tarotThumbnails = run(`TAROT_CARDS.map(card =>
  renderCardArt(card).match(/src="([^"]+)"/)[1]
)`);
assert.equal(new Set(tarotThumbnails).size, 78);
for (const thumbnail of tarotThumbnails) {
  assert.match(thumbnail, /^assets\/.+\.webp$/);
  assert.ok(fs.existsSync(new URL("../" + thumbnail, import.meta.url)), thumbnail);
}

console.log("card art regression passed");
