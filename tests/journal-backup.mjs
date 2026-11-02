import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const data=new Map();
let premium=false,failKey='';
const messages=[];
const context=vm.createContext({
  console:{warn(){}},window:{},document:{querySelectorAll(){return [];}},
  isPremium:()=>premium,showToast:message=>messages.push(message),
  getReadingSpread:()=>({id:'one-card',name:'One Card'}),
  state:{mode:'guided',cards:{1:{name:'The Star',orientation:'upright'}},concerns:[],narrative:'Current reflection',currentReadingId:'previous'},
  localStorage:{getItem:key=>data.has(key)?data.get(key):null,setItem(key,value){if(key===failKey)throw new Error('QuotaExceededError');data.set(key,value);},removeItem:key=>data.delete(key)}
});
for(const name of ['storage','journal-backup'])vm.runInContext(fs.readFileSync(new URL('../js/'+name+'.js',import.meta.url),'utf8'),context);
const plain=value=>JSON.parse(JSON.stringify(value));
const run=source=>vm.runInContext(source,context);
const reading=(id,date='2026-11-02T00:00:00.000Z')=>({id,title:'Reading '+id,date,mode:'guided',concerns:['A creative question'],cardSystem:'tarot',spread:'one-card',spreadName:'One Card',cards:{1:{name:'The Star',orientation:'reversed'}},narrative:'## Your Reading in 30 Seconds\n\nA note with <literal text> and 日本語.',notes:'Keep this note.\nSecond line.'});
const reflection=(id,date='2026-11-02T00:00:00.000Z')=>({id,date,createdAt:date,updatedAt:date,text:'A private reflection '+id,readingId:'original',spreadId:'one-card',spreadName:'One Card'});
const setArchive=(readings,journal)=>{data.set('arcana_readings',JSON.stringify(readings));data.set('arcana-journal',JSON.stringify(journal));};

data.set('arcana_settings',JSON.stringify({geminiKey:'EXCLUDED_API_CREDENTIAL'}));
data.set('arcana_subscription',JSON.stringify({entitlementToken:'EXCLUDED_LICENSE_CREDENTIAL'}));
const original=reading('original');
original.geminiKey='EXCLUDED_RECORD_CREDENTIAL';
original.readingPackage={title:'A reading',quickSummary:'Short summary',mainMessage:'Main message',keyThemes:[{title:'Hope',message:'A useful theme'}],positions:[{position:'1',cardName:'The Star',orientation:'reversed',interpretation:'Card meaning'}],patterns:['Pattern'],guidance:['A next step'],reflectionQuestions:['A question'],closingMessage:'Closing'};
setArchive([original],[reflection('reflection-1')]);
const backup=context.createJournalBackup();
const encoded=JSON.stringify(backup);
assert.ok(!encoded.includes('EXCLUDED_'),'Backups must exclude API credentials, license credentials, and unknown record fields');
const parsed=context.parseJournalBackup(encoded);
assert.deepEqual(plain(parsed.readings),plain(backup.readings),'Reading text, notes, cards, orientation, Unicode, and structured output must round-trip');
assert.deepEqual(plain(parsed.journal),plain(backup.journal),'Reflection links and timestamps must round-trip');

const beforeInvalid=[...data];
for(const invalid of ['not JSON',JSON.stringify({format:'other',version:1}),JSON.stringify({...plain(backup),version:99}),JSON.stringify({...plain(backup),journal:{}}),JSON.stringify({...plain(backup),readings:[backup.readings[0],backup.readings[0]]})]){
  assert.throws(()=>context.parseJournalBackup(invalid));
}
const badCard=plain(backup);badCard.readings[0].cards=JSON.parse('{"__proto__":{"name":"The Star","orientation":"upright"}}');
assert.throws(()=>context.parseJournalBackup(JSON.stringify(badCard)));
assert.deepEqual([...data],beforeInvalid,'Invalid files must not change stored data');
setArchive([],[{date:'2026-10-01T00:00:00.000Z',spread:'one-card',text:'Legacy reflection'}]);
assert.equal(context.createJournalBackup().journal[0].id,context.createJournalBackup().journal[0].id,'Legacy entries need stable identities for duplicate detection');
data.set('arcana_readings','{"bad":true}');
assert.throws(()=>context.createJournalBackup(),'An unreadable local archive must not be exported as an empty successful backup');
for(const invalid of ['{"bad":true}','broken JSON']){
  data.set('arcana_readings',invalid);data.set('arcana-journal',invalid);
  assert.equal(run("persistReading('Keep corrupt archive')"),false);
  assert.equal(context.persistJournalEntry(reflection('blocked')),false);
  assert.equal(data.get('arcana_readings'),invalid,'Saving must not replace unreadable reading data with an empty archive');
  assert.equal(data.get('arcana-journal'),invalid,'Saving must not replace unreadable reflection data with an empty archive');
}

const local=reading('local');local.notes='Local note must win';
setArchive([local],[]);
const incoming={readings:[{...local,notes:'Older backup note'},reading('new-1'),reading('new-2'),reading('new-3')],journal:[reflection('new-reflection')]};
const plan=context.buildJournalRestorePlan(incoming);
assert.equal(plan.addedReadings,2);assert.equal(plan.skippedReadings,1);assert.equal(plan.addedJournal,1);
context.commitJournalRestore(plan);
const merged=JSON.parse(data.get('arcana_readings'));
assert.equal(merged.length,3);
assert.equal(merged.find(item=>item.id==='local').notes,'Local note must win','Restore must retain existing entries instead of overwriting them');
assert.equal(JSON.parse(data.get('arcana_settings')).geminiKey,'EXCLUDED_API_CREDENTIAL');
assert.equal(JSON.parse(data.get('arcana_subscription')).entitlementToken,'EXCLUDED_LICENSE_CREDENTIAL');

setArchive([reading('local')],[reflection('local-reflection')]);
const stale=context.buildJournalRestorePlan({readings:[reading('incoming')],journal:[]});
data.set('arcana_readings',JSON.stringify([reading('changed-in-another-tab')]));
const currentRaw=data.get('arcana_readings');
assert.throws(()=>context.commitJournalRestore(stale),/changed while reviewing/);
assert.equal(data.get('arcana_readings'),currentRaw,'A stale preview must never clobber a newer archive');

setArchive([reading('local')],[reflection('local-reflection')]);
const quotaPlan=context.buildJournalRestorePlan({readings:[reading('incoming')],journal:[reflection('incoming-reflection')]});
const beforeQuota=[data.get('arcana_readings'),data.get('arcana-journal')];
failKey='arcana-journal';
assert.throws(()=>context.commitJournalRestore(quotaPlan),/original archive was kept/);
failKey='';
assert.deepEqual([data.get('arcana_readings'),data.get('arcana-journal')],beforeQuota,'A second-key quota failure must roll back the first write');

premium=true;
setArchive(Array.from({length:49},(_,i)=>reading('local-'+i)),Array.from({length:49},(_,i)=>reflection('local-'+i)));
const premiumPlan=context.buildJournalRestorePlan({readings:[reading('new-1'),reading('new-2')],journal:[reflection('new-1'),reflection('new-2')]});
assert.equal(premiumPlan.addedReadings,1);assert.equal(premiumPlan.skippedReadings,1);
assert.equal(premiumPlan.addedJournal,1);assert.equal(premiumPlan.skippedJournal,1);
context.commitJournalRestore(premiumPlan);
assert.equal(JSON.parse(data.get('arcana_readings')).length,50);
assert.equal(JSON.parse(data.get('arcana-journal')).length,50);

premium=false;
setArchive([reading('one'),reading('two'),reading('three')],[]);
const fullRaw=data.get('arcana_readings');
assert.equal(run("persistReading('No approval')"),false);
assert.equal(data.get('arcana_readings'),fullRaw);
assert.equal(run('state.currentReadingId'),'previous');
assert.equal(run("persistReading('Approved replacement',true)"),true);
assert.equal(JSON.parse(data.get('arcana_readings')).length,3);
assert.equal(JSON.parse(data.get('arcana_readings'))[0].title,'Approved replacement');
setArchive([],Array.from({length:50},(_,i)=>reflection('entry-'+i)));
const fullJournal=data.get('arcana-journal');
assert.equal(context.persistJournalEntry(reflection('new')),false);
assert.equal(data.get('arcana-journal'),fullJournal,'Full reflection archives must require explicit replacement approval');
assert.equal(context.persistJournalEntry(reflection('new'),true),true);
assert.equal(JSON.parse(data.get('arcana-journal')).length,50);
console.log('journal backup, safe restore, and archive capacity regressions passed');
