import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

if (!process.env.LOCALAPPDATA) throw new Error('Run this script from the Windows account that manages Arcana.');
const review = process.argv.includes('--review');
const kind = review ? 'review' : 'tester';
const prefix = review ? 'ARCANA-REVIEW-' : 'ARCANA-TEST-';
const folder = path.join(process.env.LOCALAPPDATA, 'ArcanaGuide', review ? 'android-review' : 'android-testing');
const codeFile = path.join(folder, `${kind}-code.txt`);
const hashFile = path.join(folder, `${kind}-code.sha256`);

await mkdir(folder, { recursive: true });
const generated = prefix + randomBytes(16).toString('hex').toUpperCase().match(/.{8}/g).join('-');
try {
  await writeFile(codeFile, generated + '\n', { flag: 'wx', mode: 0o600 });
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
const code = (await readFile(codeFile, 'utf8')).trim();
if (!code.startsWith(prefix) || !/^(?:[A-F0-9]{8}-){3}[A-F0-9]{8}$/.test(code.slice(prefix.length))) {
  throw new Error(`The existing Android ${kind} code file has an unexpected format.`);
}
await writeFile(hashFile, createHash('sha256').update(code).digest('hex') + '\n', { mode: 0o600 });
console.log(`Android ${kind} code file: ${codeFile}`);
console.log('Cloudflare digest file: ' + hashFile);
