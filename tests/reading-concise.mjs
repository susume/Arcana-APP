import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/reading-engine.js', import.meta.url), 'utf8');
const uiSource = fs.readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8');

function makeContext() {
  const content = { innerHTML: '' };
  const elements = {
    'reading-content': content,
    'journal-section': { style: {}, querySelector: () => null },
    'journal-entry': { value: 'old note' }
  };
  const context = {
    console,
    state: {
      concerns: ['relationship clarity'],
      cardSystem: 'tarot',
      spreadId: 'romany',
      cards: {},
      hasDroppedCard: false,
      droppedCard: null,
      readerLifeStage: 'adult',
      uploadedImage: 'data:image/png;base64,uploaded-spread'
    },
    currentCards: [],
    SPREADS: [],
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    loadSettings() {
      return { readingStyle: 'intuitive', readingTone: 'warm' };
    },
    getSpread() {
      return context.SPREADS.find(spread => spread.id === context.state.spreadId);
    },
    enhanceReadingOutput() {
      context.enhanced = true;
    },
    wireJournalSection() {
      context.journalWired = true;
    },
    setReadingReadyState(value) {
      context.ready = value;
    },
    renderEntitlementsUI() {
      context.entitlementsRendered = true;
    },
    async callGemini(...args) {
      context.callGeminiArgs = args;
      return JSON.stringify({
        title: 'AI narrative',
        quickSummary: 'AI summary',
        mainMessage: 'AI main message',
        keyThemes: [{ title: 'Theme', message: 'Theme message' }],
        patterns: ['Pattern'],
        guidance: ['Guidance'],
        reflectionQuestions: ['Reflection question'],
        closingMessage: 'Closing message'
      });
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'reading-engine.js' });
  return { context, content };
}

function seedRomany(context) {
  const positions = Array.from({ length: 21 }, (_, index) => ({
    id: String(index + 1),
    name: `Position ${index + 1}`,
    description: `Meaning ${index + 1}`
  }));
  context.SPREADS = [{
    id: 'romany',
    name: 'Romany',
    description: '21-card life spread',
    cardCount: 21,
    layout: 'romany',
    positions
  }];
  context.currentCards = [
    {
      name: 'The Fool',
      arcana: 'major',
      number: 0,
      keywords: ['beginnings'],
      upright: 'New beginnings and trust.',
      reversed: 'Hesitation and risky leaps.'
    },
    {
      name: 'Two of Cups',
      suit: 'cups',
      number: 2,
      keywords: ['connection'],
      upright: 'Mutual care and connection.',
      reversed: 'Imbalance in relationship.'
    },
    {
      name: 'Seven of Swords',
      suit: 'swords',
      number: 7,
      keywords: ['strategy'],
      upright: 'Careful strategy and discretion.',
      reversed: 'Coming clean and revising plans.'
    }
  ];
  positions.forEach((pos, index) => {
    const card = context.currentCards[index % context.currentCards.length];
    context.state.cards[pos.id] = {
      name: card.name,
      orientation: index % 2 ? 'reversed' : 'upright'
    };
  });
}

function seedSpread(context,{id,name,cardCount,layout}) {
  const positions = Array.from({ length: cardCount }, (_, index) => ({
    id: String(index + 1),
    name: `Position ${index + 1}`,
    description: `Meaning ${index + 1}`
  }));
  context.SPREADS = [{
    id,
    name,
    description: `${cardCount}-card test spread`,
    cardCount,
    layout,
    positions
  }];
  context.state.spreadId = id;
  context.currentCards = [
    {
      name: 'The Fool',
      arcana: 'major',
      number: 0,
      keywords: ['beginnings'],
      upright: 'New beginnings and trust.',
      reversed: 'Hesitation and risky leaps.'
    },
    {
      name: 'Two of Cups',
      suit: 'cups',
      number: 2,
      keywords: ['connection'],
      upright: 'Mutual care and connection.',
      reversed: 'Imbalance in relationship.'
    }
  ];
  context.state.cards = {};
  positions.forEach((pos, index) => {
    const card = context.currentCards[index % context.currentCards.length];
    context.state.cards[pos.id] = {
      name: card.name,
      orientation: index % 2 ? 'reversed' : 'upright'
    };
  });
}

{
  const { context } = makeContext();
  seedRomany(context);
  const prompt = context.buildAIReadingPrompt({ readingStyle: 'intuitive', readingTone: 'warm' });

  assert.match(prompt, /Return ONLY one valid JSON object/);
  assert.match(prompt, /"quickSummary"/);
  assert.match(prompt, /"mainMessage"/);
  assert.match(prompt, /"guidance"/);
  assert.match(prompt, /LAYOUT: 7 columns of 3 cards each/);
  assert.match(prompt, /Include one positions item for every entered spread card/);
  assert.match(prompt, /Do not invent, rename, omit, or change the orientation of any card/);
  assert.match(prompt, /This is reflective guidance, not medical, legal, financial, mental-health, or crisis advice/);
  assert.doesNotMatch(prompt, /Generate a complete reading/);
  assert.doesNotMatch(prompt, /Position-by-Position/);
}

{
  const spreadCases = [
    {
      spread: { id: 'yearly', name: 'Yearly', cardCount: 12, layout: 'yearly' },
      promptPattern: /LAYOUT: 12 cards in a clock/
    },
    {
      spread: { id: 'two-pathways', name: 'Two Pathways', cardCount: 14, layout: 'two-pathways' },
      promptPattern: /LAYOUT: Two decision paths/
    },
    {
      spread: { id: 'relationship', name: 'Relationship', cardCount: 15, layout: 'relationship' },
      promptPattern: /LAYOUT: 15-card relationship spread/
    },
    {
      spread: { id: 'celtic-cross', name: 'Celtic Cross', cardCount: 10, layout: 'celtic' },
      promptPattern: /LAYOUT: A cross with a vertical staff on the right/
    }
  ];

  spreadCases.forEach(({ spread, promptPattern }) => {
    const { context } = makeContext();
    seedSpread(context,spread);
    const prompt = context.buildAIReadingPrompt({ readingStyle: 'intuitive', readingTone: 'warm' });
    const fallback = context.generateClassicReading();

    assert.match(prompt, promptPattern);
    assert.match(prompt, /Include one positions item for every entered spread card/);
    assert.match(prompt, /Do not invent, rename, omit, or change the orientation of any card/);
    assert.match(fallback, /## Position-by-Position/);
    assert.match(fallback, /## Practical Guidance/);
  });
}

{
  const { context } = makeContext();
  seedRomany(context);
  const narrative = await context.generateAIReading({ readingStyle: 'intuitive', readingTone: 'warm' });

  assert.match(narrative, /AI summary/);
  assert.match(narrative, /AI main message/);
  assert.equal(context.callGeminiArgs[0], context.buildAIReadingPrompt({ readingStyle: 'intuitive', readingTone: 'warm' }));
  assert.equal(context.callGeminiArgs[1], null);
  assert.equal(context.callGeminiArgs[2], null);
  assert.equal(context.callGeminiArgs[3], null);
}

{
  const { context } = makeContext();
  seedRomany(context);
  const fallback = context.generateClassicReading();

  assert.match(fallback, /## Your Reading in 30 Seconds/);
  assert.match(fallback, /## Position-by-Position/);
  assert.match(fallback, /## Patterns and Turning Points/);
  assert.match(fallback, /## Practical Guidance/);
  assert.match(fallback, /## Reflection Questions/);
}

{
  const { context } = makeContext();
  context.state.cardSystem = 'playing';
  context.SPREADS = [{
    id: 'three-card',
    name: 'Three Card',
    description: 'Past present future',
    cardCount: 3,
    layout: 'row',
    positions: [
      { id: '1', name: 'Past', description: 'Past' },
      { id: '2', name: 'Present', description: 'Present' },
      { id: '3', name: 'Future', description: 'Future' }
    ]
  }];
  context.state.spreadId = 'three-card';
  const prompt = context.buildAIReadingPrompt({ readingStyle: 'direct', readingTone: 'calm' });

  assert.match(prompt, /Keep the original Hearts, Diamonds, Clubs, and Spades names/);
  assert.match(prompt, /Do not discuss Major Arcana/);
}

{
  assert.doesNotMatch(uiSource, /## Position-by-Position/);
  assert.doesNotMatch(uiSource, /Generate a complete reading using/);
  assert.match(uiSource, /getReadingOutputInstructions\(quickPromptSpread,quickSystemInstructions\)/);
}

{
  const { context, content } = makeContext();
  context.renderReading(`# Top
## Section
### Small
This has **bold**, *italic*, and <img src=x onerror=alert(1)>.
- Bullet
* Star bullet
1. First action`);

  assert.match(content.innerHTML, /<p># Top<\/p>/);
  assert.match(content.innerHTML, /<h3>Section<\/h3>/);
  assert.match(content.innerHTML, /### Small/);
  assert.match(content.innerHTML, /<strong>bold<\/strong>/);
  assert.match(content.innerHTML, /<em>italic<\/em>/);
  assert.match(content.innerHTML, /\* Star bullet/);
  assert.match(content.innerHTML, /1\. First action/);
  assert.match(content.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(content.innerHTML, /<img/);
  assert.equal(context.enhanced, true);
  assert.equal(context.journalWired, true);
  assert.equal(context.ready, true);
  assert.equal(context.entitlementsRendered, true);
}

console.log('concise reading regression passed');
