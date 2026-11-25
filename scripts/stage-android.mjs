import { copyFile, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const dist = path.join(root, 'dist');
const output = path.join(dist, 'android');
const testerBuild = process.argv.includes('--tester-access');
const replacements = {
  'home-offer': '<p class="homepage-monetization-copy">Unlock Premium with one payment through Google Play.</p>',
  'home-button': 'Explore Premium',
  'faq-price': 'Arcana includes one free reading per day with a manually entered one-card or three-card spread and built-in Classic meanings. Premium is a one-time purchase through Google Play. New purchases include 30 hosted AI requests each month.',
  'settings-purchase': `<p class="settings-note">All spreads, unlimited Classic readings, personalized posters, and 30 hosted AI requests each month for new purchases.</p>
      <div data-play-purchase></div>`,
  'pricing-offer': '<h2 id="premium-plan">Premium lifetime unlock</h2><p>Buy Premium once through Google Play. Open Premium Access to see the price in your currency.</p>',
  'pricing-buy': '<p><a class="btn btn-primary public-cta" href="index.html?play=ready">Open Premium Access</a></p>',
  'pricing-restore': '<h2 id="activation">Restore your purchase</h2><p>Use the same Google Play account and choose Restore purchases under Premium Access.</p>',
  'pricing-terms': '',
  'privacy-web-payments': ''
};
const usedReplacements = new Set();
const media = new Set();

await mkdir(dist, { recursive: true });
if (path.relative(root, await realpath(dist)) !== 'dist') {
  throw new Error('The Android build output must be inside the Arcana dist directory.');
}
await rm(output, { recursive: true, force: true });
await mkdir(output);

function findMedia(text) {
  for (const match of text.matchAll(/\bassets\/[\w./-]+\.(?:webp|png|svg|woff2)\b/gi)) {
    media.add(match[0]);
  }
}

function androidHtml(source) {
  const html = source
    .replaceAll("Premium includes hosted AI. Browser users with Premium can also use their own Gemini key in Settings.", "Premium includes hosted AI without a Gemini key.")
    .replace(/<!-- play:direct-gemini -->([\s\S]*?)<!-- \/play:direct-gemini -->/g, (_section, content) => testerBuild ? content : '')
    .replace(/<!-- play:([\w-]+) -->[\s\S]*?<!-- \/play:\1 -->/g, (_section, name) => {
      if (!(name in replacements)) throw new Error(`Unknown Android content block ${name}.`);
      usedReplacements.add(name);
      return replacements[name];
    })
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    .replace(/<meta [^>]+content="[^"]*\$(?:10|20)[^"]*"[^>]*>\s*/g, '')
    .replaceAll('in this browser', 'on this device')
    .replaceAll('browser-based AI tarot reading app', 'AI tarot reading app')
    .replaceAll('>Browser default<', '>Device default<');
  const subscriptions = '  <script src="js/subscription.js"></script>';
  if (html.includes(subscriptions)) {
    return html.replace(subscriptions, '  <script src="js/android.js"></script>\n' + subscriptions);
  }
  return html.replace('</head>', '  <script defer src="js/android.js"></script>\n</head>');
}

async function stageFile(relative) {
  const source = path.join(root, relative);
  const target = path.join(output, relative);
  await mkdir(path.dirname(target), { recursive: true });
  let content = await readFile(source, 'utf8');
  if (relative.endsWith('.html')) {
    content = androidHtml(content);
    if (relative === 'index.html') {
      const mode = testerBuild ? 'data-tester-access' : 'data-google-play-release';
      content = content.replace('<html ', `<html ${mode} `);
    }
    if (!testerBuild) {
      content = content.replace(/<option>(?:Child|Teen)<\/option>/g, '');
    }
    if (/gumroad|\$10\b|\$20\b|<!-- \/?play:/i.test(content)) {
      throw new Error(`Web checkout copy remains in the Android version of ${relative}.`);
    }
  }
  if (relative === 'js/config.js') {
    content = content.replace(/^(const ARCANA_GUMROAD_PRODUCT_URL = ).+$/m, "$1'';");
    if (/gumroad\.com/i.test(content)) throw new Error('Web checkout URL remains in the Android config.');
  }
  findMedia(content);
  await writeFile(target, content);
}

// Screen templates are fragments. Only full documents load Android's runtime.
for (const name of ['index.html', 'guide.html', 'faq.html', 'pricing.html', 'privacy.html', 'sample-reading.html']) {
  await stageFile(name);
}
for (const [directory, extension] of [['templates', '.html'], ['js', '.js'], ['data', '.json'], ['css', '.css']]) {
  for (const name of await readdir(path.join(root, directory))) {
    if (name.endsWith(extension) && name !== 'config.local.js') await stageFile(`${directory}/${name}`);
  }
}
for (const name of Object.keys(replacements)) {
  if (!usedReplacements.has(name)) throw new Error(`Missing Android content block ${name}.`);
}
// The picker derives these filenames from the selected tarot card.
for (const name of await readdir(path.join(root, 'assets/atlas/cards'))) {
  if (name.endsWith('.webp')) media.add('assets/atlas/cards/' + name);
}
for (const relative of media) {
  const target = path.join(output, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, relative), target);
}
await copyFile(path.join(root, 'android', 'web', 'android.js'), path.join(output, 'js', 'android.js'));
console.log(testerBuild
  ? 'Staged Arcana’s Android assets with Google Play and tester access.'
  : 'Staged Arcana’s Android assets with Google Play purchase controls.');
