import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

if (!process.env.LOCALAPPDATA) throw new Error('Run this script from the Windows account that manages Arcana.');
const folder = path.join(process.env.LOCALAPPDATA, 'ArcanaGuide', 'android-testing');
const codeFile = path.join(folder, 'tester-code.txt');
const hashFile = path.join(folder, 'tester-code.sha256');

await mkdir(folder, { recursive: true });
const generated = 'ARCANA-TEST-' + randomBytes(16).toString('hex').toUpperCase().match(/.{8}/g).join('-');
try {
  await writeFile(codeFile, generated + '\n', { flag: 'wx', mode: 0o600 });
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
const code = (await readFile(codeFile, 'utf8')).trim();
if (!/^ARCANA-TEST-(?:[A-F0-9]{8}-){3}[A-F0-9]{8}$/.test(code)) {
  throw new Error('The existing Android tester code file has an unexpected format.');
}
await writeFile(hashFile, createHash('sha256').update(code).digest('hex') + '\n', { mode: 0o600 });
console.log('Tester code file: ' + codeFile);
console.log('Cloudflare digest file: ' + hashFile);
