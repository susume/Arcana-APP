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
      readerLifeStage: 'adult'
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

{
  const { context } = makeContext();
  seedRomany(context);
  const prompt = context.buildAIReadingPrompt({ readingStyle: 'intuitive', readingTone: 'warm' });

  assert.match(prompt, /## Your Reading in 30 Seconds/);
  assert.match(prompt, /## Main Message/);
  assert.match(prompt, /## Practical Guidance/);
  assert.match(prompt, /Romany: Group by the 7 columns/);
  assert.match(prompt, /900-1,300 words maximum/);
  assert.match(prompt, /This is an AI-assisted reflective tarot\/cartomancy reading, not medical, legal, financial, mental-health, or crisis advice\./);
  assert.doesNotMatch(prompt, /Generate a complete reading/);
  assert.doesNotMatch(prompt, /Position-by-Position/);
}

{
  const { context } = makeContext();
  seedRomany(context);
  const fallback = context.generateClassicReading();

  assert.match(fallback, /## Your Reading in 30 Seconds/);
  assert.match(fallback, /## Card Highlights/);
  assert.match(fallback, /Emotional Well-being/);
  assert.match(fallback, /## Practical Guidance/);
  assert.match(fallback, /## Reflection Question/);
  assert.doesNotMatch(fallback, /## Position-by-Position/);
  assert.doesNotMatch(fallback, /## Pattern Analysis/);
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

  assert.match(prompt, /Keep Hearts, Diamonds, Clubs, and Spades/);
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
1. First action`);

  assert.match(content.innerHTML, /<h2>Top<\/h2>/);
  assert.match(content.innerHTML, /<h3>Section<\/h3>/);
  assert.match(content.innerHTML, /<h4>Small<\/h4>/);
  assert.match(content.innerHTML, /<strong>bold<\/strong>/);
  assert.match(content.innerHTML, /<em>italic<\/em>/);
  assert.match(content.innerHTML, /<ol>/);
  assert.match(content.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(content.innerHTML, /<img/);
  assert.equal(context.enhanced, true);
  assert.equal(context.journalWired, true);
  assert.equal(context.ready, true);
  assert.equal(context.entitlementsRendered, true);
}

console.log('concise reading regression passed');
