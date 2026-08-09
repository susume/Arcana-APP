import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const normalize = (value) => value.replace(/\r\n/g, '\n').trim();

const index = await read('index.html');
const templateNames = ['welcome', 'concerns', 'card-system', 'choose-reading', 'reflection', 'placement', 'overview', 'results', 'history', 'quick', 'settings', 'help'];
const conflictFiles = ['package.json', 'index.html', 'src/premium-theme.css', 'css/premium.css', 'js/storage.js', 'js/ui.js', 'js/reading-engine.js', ...templateNames.map(name => `templates/${name}.html`)];
for (const relative of conflictFiles) {
  assert.doesNotMatch(await read(relative), /^(<<<<<<<|=======|>>>>>>>)/m, `${relative} contains unresolved merge markers`);
}
for (const name of templateNames) {
  const external = normalize(await read(`templates/${name}.html`));
  const match = index.match(new RegExp(`<template id="template-${name}">[\\s\\S]*?</template>`));
  assert.ok(match, `Embedded template-${name} is missing`);
  const embedded = normalize(match[0].replace(new RegExp(`^<template id="template-${name}">`), '').replace(/<\/template>$/, ''));
  assert.equal(embedded, external, `Embedded template-${name} is out of sync`);
}

const canonicalSpreads = JSON.parse(await read('data/spreads.json'));
const spreadMatch = index.match(/<script type="application\/json" id="spreads-data">([\s\S]*?)<\/script>/);
assert.ok(spreadMatch, 'Embedded spreads-data is missing');
assert.deepEqual(JSON.parse(spreadMatch[1]), canonicalSpreads, 'Embedded spreads-data is out of sync');
assert.doesNotMatch(index, /(?:ï¿½|Â·|Ã)/, 'index.html contains mojibake in generated content');

const ui = await read('js/ui.js');
const domHelpers = await read('js/dom-helpers.js');
const readingEngine = await read('js/reading-engine.js');
const storage = await read('js/storage.js');
const subscription = await read('js/subscription.js');
const worker = await read('server/cloudflare-worker.js');
const config = await read('js/config.js');

assert.doesNotMatch(ui, /innerHTML\s*=\s*`[^`]*\$\{(?:r\.(?:title|concerns|notes|narrative)|state\.(?:concerns|narrative)|(?:e|err)\.message)/s, 'UI contains an unescaped dynamic HTML assignment');
assert.doesNotMatch(ui, /<textarea[^>]*>\$\{/, 'Textarea values must be assigned through .value, not interpolated into markup');
assert.match(ui, /textInput\.value=String\(value\|\|''\)/, 'Save dialogs must assign textarea values through the DOM property');
assert.doesNotMatch(readingEngine, /content\.innerHTML\s*=\s*html/, 'Reading renderer must use the safe markdown renderer');
assert.match(ui, /container\.innerHTML=renderSafeMarkdown\(text\)/, 'Reading output must use the shared safe renderer');
assert.match(storage, /uploadedImage.*excluded|serializableState/s, 'Autosave must use a deliberate serializable snapshot');
assert.doesNotMatch(storage, /key:clean|licenseKey\s*:/, 'Raw license keys must not be persisted by browser storage');
assert.doesNotMatch(subscription, /Priority AI processing/, 'Premium copy must not promise unimplemented priority processing');
assert.match(config, /gemini-3\.6-flash/, 'Current Gemini model fallback is not centralized');

assert.match(worker, /ARCANA_ENTITLEMENT_SECRET/);
assert.match(worker, /GUMROAD_WEBHOOK_SECRET/);
assert.match(worker, /constantTimeEqual/);
assert.match(worker, /ARCANA_RATE_LIMITER/);
assert.match(worker, /MAX_IMAGE_BYTES/);
assert.match(worker, /event:gumroad/);
assert.doesNotMatch(worker, /Access-Control-Allow-Origin['"]\s*:\s*origin\s*\|\|\s*['"]\*['"]/, 'Worker must not reflect arbitrary origins or use wildcard CORS');
assert.match(worker, /purchase\.product_id/);
assert.match(worker, /purchase\.seller_id/);

const safeContext = {};
runInNewContext(domHelpers, safeContext);
const xssPayload = '<img src=x onerror="window.__xss=1">';
const textareaPayload = '</textarea><img src=x onerror="window.__xss=1">';
const safeOutput = safeContext.renderSafeMarkdown(`${xssPayload}\n${textareaPayload}`);
assert.match(safeOutput, /&lt;img src=x onerror=&quot;window\.__xss=1&quot;&gt;/, 'Remote or saved XSS payloads must render as text');
assert.match(safeOutput, /&lt;\/textarea&gt;/, 'Textarea-closing payloads must remain escaped text');
assert.doesNotMatch(safeOutput, /<img\b/, 'Safe renderer must not emit executable image markup');

console.log('portable regressions passed');
