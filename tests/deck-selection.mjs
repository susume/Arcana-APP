import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function makeElement() {
  const classes = new Set();
  return {
    innerHTML: "",
    textContent: "",
    value: "",
    style: {},
    dataset: {},
    className: "",
    classList: {
      add(...names) { names.forEach((name) => classes.add(name)); },
      remove(...names) { names.forEach((name) => classes.delete(name)); },
      toggle(name) {
        if (classes.has(name)) classes.delete(name);
        else classes.add(name);
        return classes.has(name);
      },
      contains(name) { return classes.has(name); }
    },
    appendChild() {},
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    remove() {},
    scrollIntoView() {}
  };
}

const elements = new Map();
const selectors = new Map();
const document = {
  body: makeElement(),
  documentElement: makeElement(),
  addEventListener() {},
  querySelector(selector) { return selectors.get(selector) || null; },
  querySelectorAll() { return []; },
  createElement() { return makeElement(); },
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id);
  }
};

const context = vm.createContext({
  console,
  document,
  location: { protocol: "https:", hash: "" },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  confirm: () => true,
  alert() {},
  autoSaveState() {},
  renderEntitlementsUI() {},
  setTimeout,
  clearTimeout,
  renderCardArt: () => "",
  SPREADS: [],
});
context.window = context;
context.window.scrollTo = () => {};
context.window.addEventListener = () => {};
context.window.removeEventListener = () => {};

vm.runInContext(fs.readFileSync(new URL("../js/tarot.js", import.meta.url), "utf8"), context);
vm.runInContext(fs.readFileSync(new URL("../js/state.js", import.meta.url), "utf8"), context);
vm.runInContext(fs.readFileSync(new URL("../js/ui.js", import.meta.url), "utf8"), context);
vm.runInContext(fs.readFileSync(new URL("../js/ai-identification.js", import.meta.url), "utf8"), context);

const run = (source) => vm.runInContext(source, context);

assert.equal(run("state.cardSystem"), "tarot");
assert.equal(run("state.cardSystemEstablished"), false);
assert.equal(run("shouldDetectCardSystem()"), true);

run("state.cardSystemEstablished=true; startGuided()");
assert.equal(run("state.cardSystemEstablished"), false);
run("state.cardSystemEstablished=true; state.droppedCard={name:'The Fool',orientation:'upright'}; state.hasDroppedCard=true; startQuick()");
assert.equal(run("state.cardSystemEstablished"), false);
assert.equal(run("state.cardSystem"), "tarot");
assert.equal(run("state.droppedCard"), null);
assert.equal(run("state.hasDroppedCard"), false);
run("state.cardSystem='tarot'; state.cardSystemEstablished=false; confirmSystem()");
assert.equal(run("state.cardSystemEstablished"), true);

run("state.cards={}; state.droppedCard=null; state.hasDroppedCard=false");
assert.equal(run("switchPickerCardSystem('playing')"), true);
assert.equal(run("state.cardSystem"), "playing");
assert.equal(run("state.cardSystemEstablished"), false);
assert.equal(run("JSON.stringify(state.cards)"), "{}");
assert.equal(run("switchPickerCardSystem('playing')"), true);
assert.equal(run("state.cardSystemEstablished"), false);

run("state.cardSystem='tarot'; state.cardSystemEstablished=true; state.cards={'1':{name:'The Fool',orientation:'upright'}}; state.droppedCard=null; state.hasDroppedCard=false");
context.confirm = () => false;
assert.equal(run("switchPickerCardSystem('playing')"), false);
assert.equal(run("state.cardSystem"), "tarot");
assert.equal(run("state.cardSystemEstablished"), true);
assert.equal(run("state.cards['1'].name"), "The Fool");

run("state.droppedCard={name:'Seven of Cups',orientation:'reversed'}; state.hasDroppedCard=true");
context.confirm = () => true;
assert.equal(run("switchPickerCardSystem('playing')"), true);
assert.equal(run("state.cardSystem"), "playing");
assert.equal(run("state.cardSystemEstablished"), false);
assert.equal(run("JSON.stringify(state.cards)"), "{}");
assert.equal(run("state.droppedCard"), null);
assert.equal(run("state.hasDroppedCard"), false);

const positionButton = makeElement();
const positionOrientation = makeElement();
positionOrientation.dataset.orient = "upright";
selectors.set('.card-pick-btn[data-pos="1"]', positionButton);
selectors.set('.orient-btn[data-pos="1"]', positionOrientation);
run("pickerPosId='1'; selectPickerCard('Ace of Hearts')");
assert.equal(run("state.cardSystem"), "playing");
assert.equal(run("state.cardSystemEstablished"), true);
assert.equal(run("state.cards['1'].name"), "Ace of Hearts");

run("state.cardSystem='tarot'; state.cardSystemEstablished=true; state.cards={}; state.droppedCard={name:'The Fool',orientation:'reversed'}; state.hasDroppedCard=true");
context.confirm = () => true;
assert.equal(run("switchPickerCardSystem('playing')"), true);
assert.equal(run("state.cardSystemEstablished"), false);
const dropButton = makeElement();
const dropOrientation = makeElement();
dropOrientation.dataset.orient = "reversed";
selectors.set('.card-pick-btn[data-pos="drop"]', dropButton);
selectors.set('.orient-btn[data-pos="drop"]', dropOrientation);
run("pickerPosId='drop'; selectPickerCard('Seven of Spades')");
assert.equal(run("state.droppedCard.name"), "Seven of Spades");
assert.equal(run("state.droppedCard.orientation"), "reversed");
assert.equal(run("state.hasDroppedCard"), true);
assert.equal(run("state.cardSystemEstablished"), true);
assert.equal(document.getElementById("drop-toggle").classList.contains("on"), true);
assert.equal(document.getElementById("drop-card-entry").style.display, "block");

run("state.cardSystem='playing-joker'; state.cardSystemEstablished=true; state.cards={}; state.droppedCard=null; state.hasDroppedCard=false; currentCards=getCards()");
assert.equal(run("currentCards.some(card=>card.name==='The Joker')"), true);
run("pickerPosId='1'; selectPickerCard('The Joker')");
assert.equal(run("state.cardSystem"), "playing-joker");
assert.equal(run("state.cards['1'].name"), "The Joker");
assert.equal(run("currentCards.some(card=>card.name===state.cards['1'].name)"), true);
assert.equal(run("state.cardSystemEstablished"), true);

run("state.cardSystem='tarot'; state.cardSystemEstablished=false");
const detectionPrompt = run("getCardSystemPromptGuide(state.cardSystem, shouldDetectCardSystem())");
assert.match(detectionPrompt, /classify the entire deck as traditional tarot or standard playing cards/);
run("state.cardSystem='playing'; state.cardSystemEstablished=true");
const playingPrompt = run("getCardSystemPromptGuide(state.cardSystem, shouldDetectCardSystem())");
assert.match(playingPrompt, /standard playing-card deck/);
assert.doesNotMatch(playingPrompt, /classify the entire deck/);
assert.match(playingPrompt, /Never substitute Cups, Pentacles, Wands, Swords, Pages, Knights, or Major Arcana cards/);

run("state.cards={}; state.droppedCard=null; state.hasDroppedCard=false; state.cardSystem='tarot'; state.cardSystemEstablished=false; currentCards=getCards()");
assert.equal(run("selectUploadCardSystem('playing')"), true);
assert.equal(run("state.cardSystem"), "playing");
assert.equal(run("state.cardSystemEstablished"), true);
assert.equal(run("shouldDetectCardSystem()"), false);
assert.equal(run("getIdentificationCardReferences(false).every(card=>card.system==='playing')"), true);
assert.equal(run("getIdentificationCardReferences(false).some(card=>card.name==='The Fool')"), false);
assert.match(run("getCardSystemPromptGuide(state.cardSystem,shouldDetectCardSystem())"), /playing-card deck used for cartomancy/);

assert.equal(run("selectUploadCardSystem('auto')"), true);
assert.equal(run("state.cardSystem"), "tarot");
assert.equal(run("state.cardSystemEstablished"), false);
assert.equal(run("shouldDetectCardSystem()"), true);
assert.equal(run("getIdentificationCardReferences(true).some(card=>card.name==='The Fool')"), true);
assert.equal(run("getIdentificationCardReferences(true).some(card=>card.name==='Ace of Hearts')"), true);

run("state.cardSystem='tarot'; state.cardSystemEstablished=false; currentCards=getCards()");
assert.equal(
  run(`establishDetectedCardSystem(window.ArcanaAI.parseIdentifiedCards(
    '[{"position":1,"card":"Ace of Hearts","orientation":"upright"}]',
    getIdentificationCardReferences(true)
  ))`),
  true
);
assert.equal(run("state.cardSystem"), "playing");
assert.equal(run("state.cardSystemEstablished"), true);
assert.equal(run("currentCards[0].system"), "playing");

run("state.cardSystem='tarot'; state.cardSystemEstablished=false; currentCards=getCards()");
assert.throws(
  () => run(`establishDetectedCardSystem(window.ArcanaAI.parseIdentifiedCards(
    '[{"position":1,"card":"The Fool","orientation":"upright"},{"position":2,"card":"Ace of Hearts","orientation":"upright"}]',
    getIdentificationCardReferences(true)
  ))`),
  /multiple card systems/
);
assert.equal(run("state.cardSystem"), "tarot");
assert.equal(run("state.cardSystemEstablished"), false);

run("state.cardSystem='tarot'; state.cardSystemEstablished=false; currentCards=getCards()");
assert.equal(run("establishDetectedCardSystem({})"), false);
assert.equal(run("state.cardSystemEstablished"), false);
assert.throws(
  () => run("validateIdentificationResult({},true)"),
  /No valid cards/
);
assert.throws(
  () => run("validateIdentificationResult({},false)"),
  /No valid cards/
);

const detectionReferences = run("getIdentificationCardReferences(true).map(card=>card.name)");
assert.ok(detectionReferences.includes("The Fool"));
assert.ok(detectionReferences.includes("Ace of Hearts"));

run("state.cardSystem='tarot'; state.cardSystemEstablished=false; currentCards=getCards()");
assert.equal(
  run("applyQuickReadingCardSystem('CARD_SYSTEM: playing\\n## Introduction\\nPlaying reading',true)"),
  "## Introduction\nPlaying reading"
);
assert.equal(run("state.cardSystem"), "playing");
assert.equal(run("state.cardSystemEstablished"), true);
assert.equal(run("currentCards[0].system"), "playing");

run("state.cardSystem='playing'; state.cardSystemEstablished=false; currentCards=getCards()");
assert.equal(
  run("applyQuickReadingCardSystem('CARD_SYSTEM: tarot\\r\\n## Introduction\\r\\nTarot reading',true)"),
  "## Introduction\r\nTarot reading"
);
assert.equal(run("state.cardSystem"), "tarot");
assert.equal(run("state.cardSystemEstablished"), true);
assert.equal(run("currentCards[0].system"), "tarot");

run("state.cardSystem='tarot'; state.cardSystemEstablished=false; currentCards=getCards()");
assert.throws(
  () => run("applyQuickReadingCardSystem('## Introduction\\nNo marker',true)"),
  /CARD_SYSTEM/
);
assert.throws(
  () => run("applyQuickReadingCardSystem('CARD_SYSTEM: oracle\\n## Introduction\\nInvalid marker',true)"),
  /CARD_SYSTEM/
);
assert.equal(run("state.cardSystemEstablished"), false);

run("state.cardSystem='playing'; state.cardSystemEstablished=true; currentCards=getCards()");
assert.equal(
  run("applyQuickReadingCardSystem('## Introduction\\nEstablished reading',false)"),
  "## Introduction\nEstablished reading"
);
assert.equal(run("state.cardSystem"), "playing");
assert.equal(run("state.cardSystemEstablished"), true);

assert.equal(
  run("applyQuickReadingCardSystem('CARD_SYSTEM: playing\\n## Introduction\\nMatching marker',false)"),
  "## Introduction\nMatching marker"
);
assert.equal(run("state.cardSystem"), "playing");
assert.equal(run("state.cardSystemEstablished"), true);

assert.throws(
  () => run("applyQuickReadingCardSystem('CARD_SYSTEM: tarot\\n## Introduction\\nConflicting marker',false)"),
  /conflicts with the established/
);
assert.equal(run("state.cardSystem"), "playing");
assert.equal(run("state.cardSystemEstablished"), true);

run(`SPREADS.push({
  id:'allowed-position-test',
  name:'Allowed Position Test',
  cardCount:2,
  description:'Position validation',
  layout:'grid',
  positions:[
    {id:1,name:'First',description:'First position'},
    {id:'2',name:'Second',description:'Second position'}
  ]
})`);
run("state.spreadId='allowed-position-test'; state.cardSystem='tarot'; state.cardSystemEstablished=true; state.cards={'99':{name:'The Fool',orientation:'upright'}}; currentCards=getCards()");
run("state.droppedCard={name:'The Fool',orientation:'reversed'}; replaceIdentifiedSpreadCards(getSpread(),{'2':{name:'Page of Wands',orientation:'upright'}})");
assert.equal(run("JSON.stringify(state.cards)"), JSON.stringify({
  "2": { name: "Page of Wands", orientation: "upright" }
}));
assert.equal(run("state.droppedCard.name"), "The Fool");
run("state.cards={'99':{name:'The Fool',orientation:'upright'}}");
context.requireAIConfiguration = () => {};
context.getSpreadLayoutHint = () => "Layout hint";
context.callGemini = async () => '[{"position":99,"card":"The Fool","orientation":"upright"}]';
context.allowedPositionCalls = [];
context.replacementCalls = 0;
run(`originalParseIdentifiedCards=window.ArcanaAI.parseIdentifiedCards;
window.ArcanaAI.parseIdentifiedCards=(response,references,allowedPositions)=>{
  allowedPositionCalls.push(allowedPositions);
  return originalParseIdentifiedCards(response,references,allowedPositions);
};
replaceIdentifiedSpreadCards=()=>{replacementCalls++;};`);
await run("identifyCards()");
await run("identifyGuidedCards()");
assert.equal(JSON.stringify(context.allowedPositionCalls), JSON.stringify([[1, "2"], [1, "2"]]));
assert.equal(context.replacementCalls, 0);
assert.match(document.getElementById("upload-results").innerHTML, /No valid cards/);
assert.match(document.getElementById("guided-identify-results").innerHTML, /No valid cards/);

run("state={...state,cardSystem:'playing',cardSystemEstablished:false,cards:{'1':{name:'Ace of Hearts',orientation:'upright'}},droppedCard:null}; migrateRestoredCardSystemState({cardSystem:'playing',cards:{'1':{name:'Ace of Hearts',orientation:'upright'}},droppedCard:null})");
assert.equal(run("state.cardSystemEstablished"), true);
assert.equal(run("currentCards[0].system"), "playing");

run("state={...state,cardSystem:'tarot',cardSystemEstablished:false,cards:{},droppedCard:null}; migrateRestoredCardSystemState({cardSystem:'tarot',cards:{},droppedCard:null})");
assert.equal(run("state.cardSystemEstablished"), false);

run("state={...state,cardSystem:'tarot',cardSystemEstablished:false,cards:{'1':{name:'The Fool',orientation:'upright'}},droppedCard:null}; migrateRestoredCardSystemState({cardSystem:'tarot',cardSystemEstablished:false,cards:{'1':{name:'The Fool',orientation:'upright'}}})");
assert.equal(run("state.cardSystemEstablished"), false);

run("state={...state,cardSystem:'tarot',cardSystemEstablished:false,cards:{},droppedCard:{name:'The Fool',orientation:'upright'}}; migrateRestoredCardSystemState({cardSystem:'tarot',droppedCard:{name:'The Fool',orientation:'upright'}})");
assert.equal(run("state.cardSystemEstablished"), true);

console.log("deck selection regression passed");
