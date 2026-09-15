import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/reading-engine.js', import.meta.url), 'utf8');

const context = {
  state: { readerLifeStage: 'Teen' },
  console
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'reading-engine.js' });

const instruction = context.readerSafetyInstruction();
assert.match(instruction, /reader may be a minor/i);
assert.match(instruction, /especially gentle, age-appropriate, non-alarming/i);
assert.match(instruction, /trusted adult/i);
assert.match(instruction, /Do not frame romance, sexuality, money, career, or life decisions in an adult way for a child/i);
assert.match(instruction, /reflective and empowering, not deterministic/i);

console.log('reader life-stage safety regression passed');
