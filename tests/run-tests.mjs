import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeTests = ['card-art.mjs', 'ai-identification.mjs', 'deck-selection.mjs', 'worker-activation.mjs', 'portable-regressions.mjs'];
for (const test of nodeTests) {
  execFileSync(process.execPath, [path.join(root, 'tests', test)], { cwd: root, stdio: 'inherit' });
}

if (process.platform === 'win32') {
  const powershellTests = ['monetization-config.ps1', 'journal-ui.ps1', 'reading-actions.ps1', 'homepage-ui.ps1', 'app-shell-ui.ps1'];
  for (const test of powershellTests) {
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'tests', test)], { cwd: root, stdio: 'inherit' });
  }
}

console.log('all Arcana regressions passed');
