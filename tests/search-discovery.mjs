import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFile(path.join(root, file), 'utf8');
const origin = 'https://www.arcanaguide.com';
const files = ['index.html', 'guide.html', 'faq.html', 'pricing.html', 'privacy.html'];
const withoutInertContent = html => html.replace(/<(template|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
const text = html => withoutInertContent(html).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const normalize = html => html.replace(/\r\n/g, '\n').trim();
const index = await read('index.html');
const main = index.match(/<main id="app">([\s\S]*?)<\/main>/)?.[1];
assert.ok(main, 'The initial response must include a real homepage');
assert.equal(normalize(main), normalize(await read('templates/welcome.html')), 'The rendered homepage must stay synchronized with its source');
assert.match(text(main), /physical tarot or playing cards/);
assert.match(text(main), /one free reading per day/);
assert.match(text(main), /hosted AI/);
assert.match(text(main), /\$10 USD minimum/);

const canonicals = [];
for (const file of files) {
  const html = await read(file);
  const visibleHtml = withoutInertContent(html);
  const visibleText = text(html);
  const expectedUrl = origin + (file === 'index.html' ? '/' : '/' + file);
  const canonical = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
  assert.equal(canonical.length, 1, file + ' must have one canonical URL');
  assert.equal(canonical[0][1], expectedUrl);
  canonicals.push(expectedUrl);
  assert.equal([...visibleHtml.matchAll(/<h1\b/g)].length, 1, file + ' must have one active h1');
  assert.ok(visibleText.length > 1500, file + ' must explain the product without JavaScript');
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.ok(html.includes('<meta property="og:url" content="' + expectedUrl + '">'));
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);

  // Check the static link/asset graph, including fragment targets, rather than
  // relying on the preview server's fallback-to-index behavior to hide 404s.
  for (const match of visibleHtml.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = new URL(match[1], expectedUrl);
    if (url.origin !== origin) continue;
    const target = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    await access(path.join(root, target));
    if (url.hash && target.endsWith('.html')) {
      assert.ok((await read(target)).includes('id="' + decodeURIComponent(url.hash.slice(1)) + '"'), file + ' has a missing anchor: ' + match[1]);
    }
  }
  for (const page of files.slice(1)) {
    assert.ok(visibleHtml.includes('href="' + page + '"'), file + ' must link to ' + page);
  }
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  assert.ok(schemas.length, file + ' needs structured data');
  for (const schema of schemas.flatMap(value => value['@graph'] || [value])) {
    if (schema['@type'] === 'FAQPage') {
      for (const entry of schema.mainEntity) {
        assert.ok(visibleText.includes(entry.name), file + ' schema question must be visible');
        assert.ok(visibleText.includes(entry.acceptedAnswer.text), file + ' schema answer must match the visible answer');
      }
    }
  }
}

const sitemap = await read('sitemap.xml');
assert.match(sitemap, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]).sort(), canonicals.sort());
assert.match(await read('robots.txt'), /Sitemap: https:\/\/www.arcanaguide.com\/sitemap.xml/);
const llms = await read('llms.txt');
assert.match(llms, /Hosted AI is available without a user-supplied API key/);
assert.doesNotMatch(llms, /AI features require a user-supplied|\/templates\//);
for (const url of canonicals) assert.ok(llms.includes(url), 'llms.txt must point to the complete public pages');

// Exercise startup with a pre-rendered homepage, an older empty shell, and the
// portable file:// path. Existing homepage nodes must survive initialization.
const ui = await read('js/ui.js');
for (const [hasHomepage, protocol] of [[true, 'https:'], [false, 'https:'], [true, 'file:']]) {
  let added = '';
  const requests = [];
  const app = {
    dataset: {},
    querySelector: () => hasHomepage ? { id: 'screen-welcome' } : null,
    insertAdjacentHTML(position, html) { assert.equal(position, 'beforeend'); added += html; }
  };
  Object.defineProperty(app, 'innerHTML', { set() { throw new Error('Startup must preserve the existing homepage and keyboard focus'); } });
  const context = {
    console, location: { protocol }, window: { addEventListener() {} },
    document: {
      getElementById(id) { return id === 'app' ? app : { innerHTML: '<div id="screen-' + id.slice(9) + '"></div>' }; },
      addEventListener() {}, querySelectorAll() { return []; }
    },
    async fetch(url) {
      requests.push(url);
      if (url.endsWith('help.html')) throw new Error('Exercise embedded fallback');
      return { ok: true, text: async () => '<div id="screen-' + path.basename(url, '.html') + '"></div>' };
    }
  };
  runInNewContext(ui, context);
  context.ensureRitualUtilities = () => {};
  await context.renderScreen();
  const firstRender = added;
  await context.renderScreen();
  assert.equal(added, firstRender, 'A second startup must not duplicate screens');
  assert.equal((added.match(/id="screen-welcome"/g) || []).length, hasHomepage ? 0 : 1);
  assert.equal((added.match(/id="screen-/g) || []).length, hasHomepage ? 11 : 12);
  assert.ok(added.includes('id="screen-help"'), 'Embedded fallback must still load when a request fails');
  assert.equal(requests.length, protocol === 'file:' ? 0 : hasHomepage ? 11 : 12);
}

// Pre-rendering exposes buttons before startup finishes on slow connections.
// Keep those actions disabled until spreads and the rest of the UI are ready.
const homepageButtons = [...main.matchAll(/<button\b[^>]*>/g)];
assert.ok(homepageButtons.length);
for (const [tag] of homepageButtons) assert.match(tag, /disabled data-app-startup/);
const buttons = homepageButtons.map(() => ({ disabled: true, removeAttribute() {} }));
let finishSpreads;
let markSpreadsStarted;
const spreadsStarted = new Promise(resolve => { markSpreadsStarted = resolve; });
const startup = {
  console, Math, requestAnimationFrame: callback => callback(),
  window: { addEventListener() {} }, location: { hash: '#welcome' },
  renderScreen: async () => {},
  loadSpreads: () => new Promise(resolve => { finishSpreads = resolve; markSpreadsStarted(); }),
  getCards: () => [], restoreState: () => null,
  screenForRoute: route => route, goScreen() {}, renderEntitlementsUI() {},
  document: {
    getElementById: () => ({ appendChild() {} }),
    createElement: () => ({ style: {} }),
    querySelectorAll: selector => selector.includes('data-app-startup') ? buttons : []
  }
};
runInNewContext((await read('js/app.js')).replace(/initApp\(\);\s*$/, 'startupPromise=initApp();'), startup);
await spreadsStarted;
assert.ok(buttons.every(button => button.disabled), 'Actions must wait while spreads load');
finishSpreads();
await startup.startupPromise;
assert.ok(buttons.every(button => !button.disabled), 'Actions must become usable after startup');

console.log('search discovery and static startup regressions passed');
