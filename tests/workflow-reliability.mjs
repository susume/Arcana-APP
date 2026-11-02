import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const nodes=new Map();
const makeNode=()=>({value:'',innerHTML:'',textContent:'',style:{},dataset:{},children:[],
  setAttribute(name,value){this[name]=value;},getAttribute(name){return this[name]||null;},
  classList:{items:new Set(),toggle(name){if(this.items.has(name)){this.items.delete(name);return false;}this.items.add(name);return true;},add(name){this.items.add(name);},remove(name){this.items.delete(name);},contains(name){return this.items.has(name);}},
  appendChild(node){this.children.push(node);},prepend(){},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},focus(){}});
const getNode=id=>{if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id);};
let inputs=[{id:'concern-input-1',value:''}];
const messages=[];
let storageFails=false;
const data=new Map();
const context=vm.createContext({console:{warn(){}},setTimeout,clearTimeout,
  location:{hash:'#card-entry'},window:{addEventListener(){}},
  document:{getElementById:getNode,querySelectorAll(selector){return selector==='.concern-input'?inputs:[];},querySelector(){return null;},addEventListener(){},createElement:makeNode},
  localStorage:{getItem(key){return data.get(key)||null;},setItem(key,value){if(storageFails)throw new Error('QuotaExceededError');data.set(key,value);}},
  getReadingSpread:()=>({id:'one-card',name:'One Card'}),getSpread:()=>({id:'one-card'}),SPREADS:[],
});
for(const file of ['state','subscription','storage','ui','reading-engine'])vm.runInContext(fs.readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'),context);
context.showToast=message=>messages.push(message);
context.renderEntitlementsUI=()=>{};
context.getReadingSpread=()=>({id:'one-card',name:'One Card'});
const run=source=>vm.runInContext(source,context);

const chip=makeNode();chip.textContent='Career';context.chip=chip;
run('tagConcern(chip)');assert.equal(inputs[0].value,'Career');assert.equal(chip['aria-pressed'],'true');
run('tagConcern(chip)');assert.equal(inputs[0].value,'');assert.equal(chip['aria-pressed'],'false');
assert.equal(inputs.length,1,'Deselecting must not create a duplicate question');
inputs=[{id:'concern-input-1',value:''},{id:'concern-input-3',value:''}];
getNode('concern-list').querySelectorAll=()=>inputs;
run('addConcern()');assert.match(getNode('concern-list').children[0].innerHTML,/concern-input-4/,'Removing a middle row must not produce duplicate IDs');

run("state.narrative='A reflection';state.concerns=[];state.currentReadingId='existing'");
storageFails=true;
assert.equal(run("persistReading('Test')"),false);
assert.equal(run('state.currentReadingId'),'existing');
assert.equal(messages.some(message=>message.startsWith('Reading saved')),false,'Failed saves must never report success');
assert.equal(run('deactivatePremium()'),false);
assert.equal(messages.includes('Premium deactivated on this browser.'),false,'Failed deactivation must never report success');
assert.doesNotThrow(()=>run('getUsage()'),'Unavailable storage must not prevent startup');
run('recordCompletedReading()');assert.equal(run('remainingFreeReadings()'),0,'Usage should remain consistent within a session when storage is unavailable');
storageFails=false;
data.set('arcana-journal','{}');assert.equal(run("readStoredJson('arcana-journal',[]).length"),0,'Malformed archive data must normalize to an empty archive');

const renders=[];let resolveAI,rejectAI;let completions=0;
context.canGenerateReading=()=>true;context.recordCompletedReading=()=>{completions++;};
context.requireAIConfiguration=()=>{};context.thoughtfulLoadingHtml=()=>'';
context.setReadingReadyState=ready=>{context.ready=ready;};
context.generateClassicReading=()=>{run("state.readingPackage={source:'classic'}");return 'Classic reflection';};
context.generateAIReading=()=>new Promise((resolve,reject)=>{resolveAI=resolve;rejectAI=reject;});
context.renderReading=text=>{renders.push(text);context.ready=true;};
run("state.narrative='Previous';state.readingMode='classic';state.readingUsageRecorded=false");
const first=run("switchReadingMode('ai')");
await run("switchReadingMode('classic')");
resolveAI('Late AI reflection');await first;
assert.equal(run('state.narrative'),'Classic reflection');assert.equal(run('state.readingMode'),'classic');
assert.deepEqual(renders,['Classic reflection'],'A late AI response must not replace the chosen Classic reading');
assert.equal(completions,1,'Switching to Classic during generation must count exactly one completed reading');
const failed=run("switchReadingMode('ai')");rejectAI(new Error('Network failed'));await failed;
assert.equal(run('state.narrative'),'Classic reflection');assert.equal(context.ready,true,'A failed mode switch must restore the existing reading and its actions');
run("state.narrative=''");
const emptyFailed=run("switchReadingMode('ai')");rejectAI(new Error('Network failed'));await emptyFailed;
assert.equal(context.ready,false,'A failed request without an existing reading must keep save and share actions disabled');
console.log('workflow reliability regressions passed');

const wrappedText=[];
context.drawRoundedRect=()=>{};
const textCanvas={fill(){},stroke(){},measureText(text){return {width:text.length*5};},fillText(text){wrappedText.push(text);}};
context.drawShareCardFallback(textCanvas,{name:'The Star',pos:'1'},0,0,100,150);
context.drawShareFooter(textCanvas,{appUrl:'https://example.com'},'A thoughtful next step.');
assert.ok(wrappedText.includes('The Star'),'Card names must render with the reading engine loaded after UI');
assert.ok(wrappedText.includes('A thoughtful next step.'),'Share comments must render with the reading engine loaded after UI');

// Canvas transforms must stay synchronous even when image requests finish out of order.
const imageResolvers=[];const events=[];
context.loadShareImage=()=>new Promise(resolve=>imageResolvers.push(resolve));
context.getShareSlots=()=>[{pos:0,x:0,y:0,w:100,h:150},{pos:1,x:100,y:0,w:100,h:150}];
context.drawRoundedRect=()=>{};context.drawCoverImage=()=>{};
const canvasContext={save(){events.push('save');},restore(){events.push('restore');},fill(){},stroke(){},clip(){},fillText(){},translate(){},rotate(){}};
const spreadDrawing=context.drawShareSpread(canvasContext,{cards:[{name:'The Star',pos:'1',orientation:'reversed',artUrl:'a'},{name:'The Sun',pos:'2',orientation:'upright',artUrl:'b'}]});
assert.equal(events.length,0,'Canvas transforms must not be held open while awaiting images');
imageResolvers[1]({});await Promise.resolve();assert.equal(events.length,0);
imageResolvers[0]({});await spreadDrawing;
assert.equal(events.filter(e=>e==='save').length,events.filter(e=>e==='restore').length);

const previewResolvers=[];const painted=[];let commentNumber=0;
context.getShareComment=()=>String(++commentNumber);
context.drawShareSpread=()=>new Promise(resolve=>previewResolvers.push(resolve));
context.drawShareFooter=(ctx,_data,comment)=>{ctx.tag=comment;};
context.document.createElement=()=>{const ctx={fillRect(){},fillText(){},createLinearGradient(){return {addColorStop(){}};}};return {ctx,getContext(){return ctx;}};};
getNode('share-canvas').getContext=()=>({drawImage(canvas){painted.push(canvas.ctx.tag);}});
const oldPreview=context.renderShareCanvas({});const latestPreview=context.renderShareCanvas({});
previewResolvers[1]();await latestPreview;previewResolvers[0]();await oldPreview;
assert.deepEqual(painted,['2'],'Slow image loading must not overwrite the latest share comment');
console.log('share canvas concurrency regressions passed');

let resolvePhoto;
context.callGemini=()=>new Promise(resolve=>{resolvePhoto=resolve;});
context.saveReaderContext=()=>{};context.shouldDetectCardSystem=()=>false;context.getCardSystemPromptGuide=()=>'';
context.SPREADS.push({id:'one-card',layout:'row',cardCount:1,name:'One Card',positions:[{id:1,name:'Focus',description:'Focus'}]});
run("state.quickSpreadId='one-card';state.uploadedImage='synthetic-photo';state.mode='quick'");
const photoRequest=run('quickRead()');
run("readingRequestVersion++;state.cards={1:{name:'The Sun',orientation:'upright'}};state.narrative='New reading'");
resolvePhoto('Late photo identification');await photoRequest;
assert.equal(run('state.cards[1].name'),'The Sun','Cancelled photo identification must not replace a newer spread');
assert.equal(run('state.narrative'),'New reading');
console.log('quick photo cancellation regression passed');

// Search must compose with suit filters and work for both card systems.
const searchCards=[
  {name:'The Star',arcana:'major',number:17},
  {name:'Two of Cups',suit:'cups',number:2},
  {name:'Two of Hearts',suit:'hearts',number:2}
];
assert.deepEqual(Array.from(context.matchingPickerCards(searchCards,null,' STAR '),card=>card.name),['The Star']);
assert.deepEqual(Array.from(context.matchingPickerCards(searchCards,'cups','2'),card=>card.name),['Two of Cups']);
assert.deepEqual(Array.from(context.matchingPickerCards(searchCards,'hearts','two'),card=>card.name),['Two of Hearts']);
assert.equal(context.matchingPickerCards(searchCards,'major','cups').length,0);
assert.equal(context.matchingPickerCards(searchCards,null,'<script>').length,0);
const navigations=[];
context.goScreen=id=>navigations.push(id);
context.autoSaveState=()=>{};
context.buildCardEntry=()=>{};
run("state.spreadId='one-card';state.cardSystem='playing';state.preparationSkipped=false");
run('skipPreparation()');
assert.equal(run('state.preparationSkipped'),true);
assert.equal(run('state.cardSystem'),'playing','Skipping preparation must retain the chosen physical deck');
assert.equal(run("guidedScreens().includes('screen-reflection')"),false);
assert.equal(run('serializableState().preparationSkipped'),true,'The optional preparation route must survive an autosave');
run('backFromCardEntry()');assert.equal(navigations.at(-1),'screen-spread');
run('confirmReflection()');assert.equal(run('state.preparationSkipped'),false);
run('backFromCardEntry()');assert.equal(navigations.at(-1),'screen-reflection');
console.log('onboarding skip and card search regressions passed');

// Reflection edits must retain the draft when storage fails or another tab changes the journal.
let saveReflectionDraft;
context.openTextPrompt=(_title,_description,_value,onSave)=>{saveReflectionDraft=onSave;};
context.renderHistory=()=>{};
const reflectionRecord={id:'reflection-test',date:'2026-11-02',text:'Original reflection'};
data.set('arcana-journal',JSON.stringify([reflectionRecord]));
run('editJournalEntry(0)');
storageFails=true;
assert.equal(saveReflectionDraft('Keep my draft'),false,'A failed edit must keep the editor open');
assert.equal(JSON.parse(data.get('arcana-journal'))[0].text,'Original reflection');
storageFails=false;
data.set('arcana-journal',JSON.stringify([{...reflectionRecord,text:'Changed in another tab'}]));
assert.equal(saveReflectionDraft('Stale edit'),false);
assert.equal(JSON.parse(data.get('arcana-journal'))[0].text,'Changed in another tab','A stale editor must not overwrite newer content');
run('editJournalEntry(0)');
assert.equal(saveReflectionDraft('Updated reflection'),true);
assert.equal(JSON.parse(data.get('arcana-journal'))[0].text,'Updated reflection');
console.log('reflection edit persistence regressions passed');
