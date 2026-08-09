import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
const templateNames = ['welcome', 'concerns', 'card-system', 'choose-reading', 'reflection', 'placement', 'overview', 'results', 'history', 'quick', 'settings', 'help'];

let index = await readFile(indexPath, 'utf8');
const newline = index.includes('\r\n') ? '\r\n' : '\n';
const firstTemplate = index.indexOf('  <template id="template-welcome">');
const spreadScript = index.indexOf('  <script type="application/json" id="spreads-data">', firstTemplate);
if (firstTemplate < 0 || spreadScript < 0) throw new Error('Could not locate the embedded template/data region in index.html');
const embeddedTemplates = [];
for (const name of templateNames) {
  const template = (await readFile(path.join(root, 'templates', `${name}.html`), 'utf8'))
    .replace(/\r\n/g, '\n')
    .trim()
    .replace(/\n/g, newline);
  embeddedTemplates.push(`  <template id="template-${name}">${newline}${template}${newline}</template>`);
}
index = index.slice(0, firstTemplate) + embeddedTemplates.join(newline) + newline + index.slice(spreadScript);

const spreads = JSON.parse(await readFile(path.join(root, 'data', 'spreads.json'), 'utf8'));
const spreadPattern = /(<script type="application\/json" id="spreads-data">)[\s\S]*?(<\/script>)/;
if (!spreadPattern.test(index)) throw new Error('Embedded spreads-data block is missing from index.html');
index = index.replace(spreadPattern, (_match, open, close) => `${open}${newline}${JSON.stringify(spreads, null, 2).replace(/\n/g, newline)}${newline}${close}`);

await writeFile(indexPath, index, 'utf8');
console.log(`Synced ${templateNames.length} embedded templates and spreads-data into index.html.`);
