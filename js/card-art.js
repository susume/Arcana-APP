// Public-domain Rider-Waite-Smith tarot art via Wikimedia Commons.
// CC0 English-pattern playing cards by Dmitry Fomin:
// https://commons.wikimedia.org/wiki/File:English_pattern_playing_cards_deck.svg
const CARD_ART_BASE_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const CARD_ART_UPLOAD_BASE_URL = 'https://upload.wikimedia.org/wikipedia/commons/';

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

const PLAYING_CARD_ART_RANKS = {
  Ace: 'ace',
  Two: '2',
  Three: '3',
  Four: '4',
  Five: '5',
  Six: '6',
  Seven: '7',
  Eight: '8',
  Nine: '9',
  Ten: '10',
  Jack: 'jack',
  Queen: 'queen',
  King: 'king'
};

const PLAYING_CARD_ART_SUITS = new Set(['hearts', 'diamonds', 'clubs', 'spades']);

function cardArtEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCardArtFile(card) {
  if (!card) return '';
  if (card.system === 'playing') {
    const match = String(card.name || '').match(/^(.+?) of (Hearts|Diamonds|Clubs|Spades)$/);
    if (!match) return '';
    const rank = PLAYING_CARD_ART_RANKS[match[1]];
    const suit = match[2].toLowerCase();
    if (!rank || !PLAYING_CARD_ART_SUITS.has(suit)) return '';
    return `English pattern ${rank} of ${suit}.svg`;
  }
  if (card.arcana === 'major') return CARD_ART_MAJOR_FILES[card.number] || '';
  const prefix = CARD_ART_MINOR_PREFIX[card.suit];
  if (!prefix || !card.number) return '';
  return `${prefix}${String(card.number).padStart(2, '0')}.jpg`;
}

function md5cycle(x, k) {
  let a = x[0], b = x[1], c = x[2], d = x[3];
  a = ff(a, b, c, d, k[0], 7, -680876936);
  d = ff(d, a, b, c, k[1], 12, -389564586);
  c = ff(c, d, a, b, k[2], 17, 606105819);
  b = ff(b, c, d, a, k[3], 22, -1044525330);
  a = ff(a, b, c, d, k[4], 7, -176418897);
  d = ff(d, a, b, c, k[5], 12, 1200080426);
  c = ff(c, d, a, b, k[6], 17, -1473231341);
  b = ff(b, c, d, a, k[7], 22, -45705983);
  a = ff(a, b, c, d, k[8], 7, 1770035416);
  d = ff(d, a, b, c, k[9], 12, -1958414417);
  c = ff(c, d, a, b, k[10], 17, -42063);
  b = ff(b, c, d, a, k[11], 22, -1990404162);
  a = ff(a, b, c, d, k[12], 7, 1804603682);
  d = ff(d, a, b, c, k[13], 12, -40341101);
  c = ff(c, d, a, b, k[14], 17, -1502002290);
  b = ff(b, c, d, a, k[15], 22, 1236535329);

  a = gg(a, b, c, d, k[1], 5, -165796510);
  d = gg(d, a, b, c, k[6], 9, -1069501632);
  c = gg(c, d, a, b, k[11], 14, 643717713);
  b = gg(b, c, d, a, k[0], 20, -373897302);
  a = gg(a, b, c, d, k[5], 5, -701558691);
  d = gg(d, a, b, c, k[10], 9, 38016083);
  c = gg(c, d, a, b, k[15], 14, -660478335);
  b = gg(b, c, d, a, k[4], 20, -405537848);
  a = gg(a, b, c, d, k[9], 5, 568446438);
  d = gg(d, a, b, c, k[14], 9, -1019803690);
  c = gg(c, d, a, b, k[3], 14, -187363961);
  b = gg(b, c, d, a, k[8], 20, 1163531501);
  a = gg(a, b, c, d, k[13], 5, -1444681467);
  d = gg(d, a, b, c, k[2], 9, -51403784);
  c = gg(c, d, a, b, k[7], 14, 1735328473);
  b = gg(b, c, d, a, k[12], 20, -1926607734);

  a = hh(a, b, c, d, k[5], 4, -378558);
  d = hh(d, a, b, c, k[8], 11, -2022574463);
  c = hh(c, d, a, b, k[11], 16, 1839030562);
  b = hh(b, c, d, a, k[14], 23, -35309556);
  a = hh(a, b, c, d, k[1], 4, -1530992060);
  d = hh(d, a, b, c, k[4], 11, 1272893353);
  c = hh(c, d, a, b, k[7], 16, -155497632);
  b = hh(b, c, d, a, k[10], 23, -1094730640);
  a = hh(a, b, c, d, k[13], 4, 681279174);
  d = hh(d, a, b, c, k[0], 11, -358537222);
  c = hh(c, d, a, b, k[3], 16, -722521979);
  b = hh(b, c, d, a, k[6], 23, 76029189);
  a = hh(a, b, c, d, k[9], 4, -640364487);
  d = hh(d, a, b, c, k[12], 11, -421815835);
  c = hh(c, d, a, b, k[15], 16, 530742520);
  b = hh(b, c, d, a, k[2], 23, -995338651);

  a = ii(a, b, c, d, k[0], 6, -198630844);
  d = ii(d, a, b, c, k[7], 10, 1126891415);
  c = ii(c, d, a, b, k[14], 15, -1416354905);
  b = ii(b, c, d, a, k[5], 21, -57434055);
  a = ii(a, b, c, d, k[12], 6, 1700485571);
  d = ii(d, a, b, c, k[3], 10, -1894986606);
  c = ii(c, d, a, b, k[10], 15, -1051523);
  b = ii(b, c, d, a, k[1], 21, -2054922799);
  a = ii(a, b, c, d, k[8], 6, 1873313359);
  d = ii(d, a, b, c, k[15], 10, -30611744);
  c = ii(c, d, a, b, k[6], 15, -1560198380);
  b = ii(b, c, d, a, k[13], 21, 1309151649);
  a = ii(a, b, c, d, k[4], 6, -145523070);
  d = ii(d, a, b, c, k[11], 10, -1120210379);
  c = ii(c, d, a, b, k[2], 15, 718787259);
  b = ii(b, c, d, a, k[9], 21, -343485551);

  x[0] = add32(a, x[0]);
  x[1] = add32(b, x[1]);
  x[2] = add32(c, x[2]);
  x[3] = add32(d, x[3]);
}

function cmn(q, a, b, x, s, t) {
  a = add32(add32(a, q), add32(x, t));
  return add32((a << s) | (a >>> (32 - s)), b);
}
function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
function add32(a, b) { return (a + b) & 0xFFFFFFFF; }

function md5blk(s) {
  const md5blks = [];
  for (let i = 0; i < 64; i += 4) {
    md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
  }
  return md5blks;
}

function md51(s) {
  const n = s.length;
  const state = [1732584193, -271733879, -1732584194, 271733878];
  let i;
  for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)));
  s = s.substring(i - 64);
  const tail = new Array(16).fill(0);
  for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
  tail[i >> 2] |= 0x80 << ((i % 4) << 3);
  if (i > 55) {
    md5cycle(state, tail);
    tail.fill(0);
  }
  tail[14] = n * 8;
  md5cycle(state, tail);
  return state;
}

const HEX_CHARS = '0123456789abcdef'.split('');
function rhex(n) {
  let s = '';
  for (let j = 0; j < 4; j++) s += HEX_CHARS[(n >> (j * 8 + 4)) & 0x0F] + HEX_CHARS[(n >> (j * 8)) & 0x0F];
  return s;
}
function md5(value) {
  return md51(String(value)).map(rhex).join('');
}

function getCardArtUrl(card, width = 180) {
  const fileName = getCardArtFile(card);
  if (!fileName) return '';
  const normalized = fileName.replace(/\s+/g, '_');
  const hash = md5(normalized);
  const encoded = encodeURIComponent(normalized);
  return `${CARD_ART_UPLOAD_BASE_URL}${hash[0]}/${hash.slice(0, 2)}/${encoded}`;
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
