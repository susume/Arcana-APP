// Public-domain Rider-Waite-Smith card art via Wikimedia Commons.
const CARD_ART_BASE_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/';

const CARD_ART_MAJOR_FILES = {
  0: 'RWS Tarot 00 Fool.jpg',
  1: 'RWS Tarot 01 Magician.jpg',
  2: 'RWS Tarot 02 High Priestess.jpg',
  3: 'RWS Tarot 03 Empress.jpg',
  4: 'RWS Tarot 04 Emperor.jpg',
  5: 'RWS Tarot 05 Hierophant.jpg',
  6: 'RWS Tarot 06 Lovers.jpg',
  7: 'RWS Tarot 07 Chariot.jpg',
  8: 'RWS Tarot 08 Strength.jpg',
  9: 'RWS Tarot 09 Hermit.jpg',
  10: 'RWS Tarot 10 Wheel of Fortune.jpg',
  11: 'RWS Tarot 11 Justice.jpg',
  12: 'RWS Tarot 12 Hanged Man.jpg',
  13: 'RWS Tarot 13 Death.jpg',
  14: 'RWS Tarot 14 Temperance.jpg',
  15: 'RWS Tarot 15 Devil.jpg',
  16: 'RWS Tarot 16 Tower.jpg',
  17: 'RWS Tarot 17 Star.jpg',
  18: 'RWS Tarot 18 Moon.jpg',
  19: 'RWS Tarot 19 Sun.jpg',
  20: 'RWS Tarot 20 Judgement.jpg',
  21: 'RWS Tarot 21 World.jpg'
};

const CARD_ART_MINOR_PREFIX = {
  wands: 'Wands',
  cups: 'Cups',
  swords: 'Swords',
  pentacles: 'Pents'
};

function cardArtEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCardArtFile(card) {
  if (!card || card.system === 'playing') return '';
  if (card.arcana === 'major') return CARD_ART_MAJOR_FILES[card.number] || '';
  const prefix = CARD_ART_MINOR_PREFIX[card.suit];
  if (!prefix || !card.number) return '';
  return `${prefix}${String(card.number).padStart(2, '0')}.jpg`;
}

function getCardArtUrl(card, width = 180) {
  const fileName = getCardArtFile(card);
  if (!fileName) return '';
  return `${CARD_ART_BASE_URL}${encodeURIComponent(fileName)}?width=${width}`;
}

function renderCardFallback(card) {
  const symbol = card && typeof getSuitSym === 'function' ? getSuitSym(card) : GLYPH.star4;
  return `<span class="card-art-fallback" aria-hidden="true">${symbol}</span>`;
}

function renderCardArt(card, className = 'tarot-card-thumb', width = 180) {
  const fallback = renderCardFallback(card);
  const url = getCardArtUrl(card, width);
  if (!url) return fallback;
  const alt = cardArtEscape(card.name);
  return `<span class="card-art-frame">${fallback}<img class="${className}" src="${url}" alt="${alt}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.card-art-frame').classList.add('art-missing')"></span>`;
}
