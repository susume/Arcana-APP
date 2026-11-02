// Portable, local-only reading and reflection backups. Credentials are not part of this format.
const JOURNAL_BACKUP_FORMAT='arcana-journal-backup';
const JOURNAL_BACKUP_VERSION=1;
const JOURNAL_BACKUP_MAX_BYTES=10*1024*1024;

function archiveObject(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function archiveText(value,max=10000){
  if(value===undefined||value===null)return '';
  if(typeof value!=='string'||value.length>max)throw new Error('A backup field is invalid or too long.');
  return value;
}
function archiveDate(value){
  if((typeof value!=='string'&&typeof value!=='number')||!Number.isFinite(new Date(value).getTime()))throw new Error('A saved date is invalid.');
  return new Date(value).toISOString();
}
function archiveTexts(value,maxItems=50,maxLength=10000){
  if(value===undefined||value===null)return [];
  if(!Array.isArray(value)||value.length>maxItems)throw new Error('A backup list is invalid.');
  return value.map(item=>archiveText(item,maxLength));
}
function legacyArchiveId(prefix,value){
  const text=JSON.stringify(value);
  let hash=2166136261;
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;
  return 'legacy-'+prefix+'-'+hash.toString(36)+'-'+text.length;
}
function archiveCard(value){
  if(!archiveObject(value))throw new Error('A saved card is invalid.');
  const name=archiveText(value.name,120);
  const orientation=value.orientation||'upright';
  if(!name||!['upright','reversed','unknown'].includes(orientation))throw new Error('A saved card or orientation is invalid.');
  return {name,orientation};
}
function archiveReadingPackage(value){
  if(value===undefined||value===null)return null;
  if(!archiveObject(value))throw new Error('A saved reading package is invalid.');
  const result={};
  for(const key of ['title','quickSummary','mainMessage','closingMessage'])result[key]=archiveText(value[key],200000);
  for(const key of ['patterns','guidance','reflectionQuestions'])result[key]=archiveTexts(value[key]);
  for(const [key,fields] of [
    ['keyThemes',['title','message']],
    ['positions',['position','displayLabel','positionName','positionDescription','cardName','orientation','headline','interpretation','action']]
  ]){
    const items=value[key]||[];
    if(!Array.isArray(items)||items.length>50)throw new Error('A saved reading package is too large.');
    result[key]=items.map(item=>{
      if(!archiveObject(item))throw new Error('A saved reading section is invalid.');
      const section={};
      fields.forEach(field=>{section[field]=archiveText(item[field],10000);});
      return section;
    });
  }
  return result;
}
function archiveReading(value){
  if(!archiveObject(value))throw new Error('A saved reading is invalid.');
  const cards={};
  if(value.cards!==undefined&&!archiveObject(value.cards))throw new Error('Saved cards are invalid.');
  const positions=Object.entries(value.cards||{});
  if(positions.length>50)throw new Error('A saved reading has too many cards.');
  positions.forEach(([position,card])=>{
    if(!/^[\w-]{1,40}$/.test(position)||['__proto__','constructor','prototype'].includes(position))throw new Error('A saved card position is invalid.');
    cards[position]=archiveCard(card);
  });
  const cardSystem=value.cardSystem||'tarot';
  if(!['tarot','playing','playing-joker'].includes(cardSystem))throw new Error('A saved card system is invalid.');
  const result={
    title:archiveText(value.title,120)||'Untitled Reading',date:archiveDate(value.date),
    mode:value.mode==='quick'?'quick':'guided',concerns:archiveTexts(value.concerns,20),
    readerLifeStage:archiveText(value.readerLifeStage,80),cardSystem,
    spread:archiveText(value.spread,120),spreadName:archiveText(value.spreadName,200),cards,
    droppedCard:value.droppedCard?archiveCard(value.droppedCard):null,hasDroppedCard:!!value.hasDroppedCard,
    narrative:archiveText(value.narrative,200000),readingMode:archiveText(value.readingMode,40),
    readingPackage:archiveReadingPackage(value.readingPackage),notes:archiveText(value.notes)
  };
  result.id=archiveText(value.id,160)||legacyArchiveId('reading',result);
  return result;
}
function archiveReflection(value){
  if(!archiveObject(value))throw new Error('A saved reflection is invalid.');
  const createdAt=archiveDate(value.createdAt||value.date);
  const result={
    createdAt,updatedAt:archiveDate(value.updatedAt||createdAt),date:archiveDate(value.date||createdAt),
    spreadId:archiveText(value.spreadId||value.spread,120),spreadName:archiveText(value.spreadName,200),
    readingId:archiveText(value.readingId,160),text:archiveText(value.text)
  };
  result.id=archiveText(value.id,160)||legacyArchiveId('reflection',result);
  return result;
}
function normalizeArchiveCollections(readings,journal){
  function records(items,normalize){
    if(!Array.isArray(items)||items.length>1000)throw new Error('The backup must contain valid reading and reflection lists.');
    const normalized=items.map(normalize);
    if(new Set(normalized.map(item=>item.id)).size!==normalized.length)throw new Error('The backup contains duplicate entries.');
    return normalized;
  }
  return {readings:records(readings,archiveReading),journal:records(journal,archiveReflection)};
}
function readJournalArchiveSnapshot(){
  const rawReadings=localStorage.getItem('arcana_readings');
  const rawJournal=localStorage.getItem('arcana-journal');
  let readings,journal;
  try{readings=rawReadings===null?[]:JSON.parse(rawReadings);journal=rawJournal===null?[]:JSON.parse(rawJournal);}
  catch(e){throw new Error('The saved archive could not be read.');}
  if(!Array.isArray(readings)||!Array.isArray(journal))throw new Error('The saved archive could not be read.');
  return {rawReadings,rawJournal,readings,journal};
}
function createJournalBackup(){
  const snapshot=readJournalArchiveSnapshot();
  return {format:JOURNAL_BACKUP_FORMAT,version:JOURNAL_BACKUP_VERSION,exportedAt:new Date().toISOString(),...normalizeArchiveCollections(snapshot.readings,snapshot.journal)};
}
function parseJournalBackup(text){
  if(typeof text!=='string'||text.length>JOURNAL_BACKUP_MAX_BYTES)throw new Error('Choose a journal backup smaller than 10 MB.');
  let value;
  try{value=JSON.parse(text);}catch(e){throw new Error('This file is not valid JSON. Choose an Arcana journal backup.');}
  if(!archiveObject(value)||value.format!==JOURNAL_BACKUP_FORMAT)throw new Error('This is not an Arcana journal backup.');
  if(value.version!==JOURNAL_BACKUP_VERSION)throw new Error('This backup version is not supported.');
  return normalizeArchiveCollections(value.readings,value.journal);
}
function buildJournalRestorePlan(backup,snapshot=readJournalArchiveSnapshot(),readingLimit=getReadingArchiveLimit()){
  const current=normalizeArchiveCollections(snapshot.readings,snapshot.journal);
  function merge(existing,currentItems,incoming,limit){
    const ids=new Set(currentItems.map(item=>item.id));
    const fresh=incoming.filter(item=>!ids.has(item.id)).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const added=fresh.slice(0,Math.max(0,limit-existing.length));
    return {items:[...added,...existing].sort((a,b)=>new Date(b.date)-new Date(a.date)),added:added.length,skipped:fresh.length-added.length};
  }
  const readings=merge(snapshot.readings,current.readings,backup.readings,readingLimit);
  const journal=merge(snapshot.journal,current.journal,backup.journal,JOURNAL_ARCHIVE_LIMIT);
  return {snapshot,readingLimit,readings:readings.items,journal:journal.items,addedReadings:readings.added,addedJournal:journal.added,skippedReadings:readings.skipped,skippedJournal:journal.skipped};
}
function commitJournalRestore(plan){
  const current=readJournalArchiveSnapshot();
  if(current.rawReadings!==plan.snapshot.rawReadings||current.rawJournal!==plan.snapshot.rawJournal||getReadingArchiveLimit()!==plan.readingLimit)throw new Error('Your archive or plan changed while reviewing. Select the backup again.');
  const written=[];
  try{
    if(plan.addedReadings){localStorage.setItem('arcana_readings',JSON.stringify(plan.readings));written.push(['arcana_readings',current.rawReadings]);}
    if(plan.addedJournal){localStorage.setItem('arcana-journal',JSON.stringify(plan.journal));written.push(['arcana-journal',current.rawJournal]);}
  }catch(e){
    let rolledBack=true;
    for(const [key,raw] of written.reverse()){
      try{if(raw===null)localStorage.removeItem(key);else localStorage.setItem(key,raw);}catch(rollbackError){rolledBack=false;}
    }
    throw new Error(rolledBack?'Restore failed. Browser storage may be full or unavailable. Your original archive was kept.':'Restore could not finish. Keep your backup file and check the journal before trying again.');
  }
}
function updateArchiveStatus(){
  let message;
  try{
    const snapshot=readJournalArchiveSnapshot();
    const readings=snapshot.readings.length,journal=snapshot.journal.length,limit=getReadingArchiveLimit();
    message=readings+' / '+limit+' saved readings · '+journal+' / '+JOURNAL_ARCHIVE_LIMIT+' reflections.'+(readings>=limit||journal>=JOURNAL_ARCHIVE_LIMIT?' Archive full: back up before replacing older entries.':'');
  }catch(e){message='The saved archive could not be read. Browser storage may be unavailable. Keep a copy of important readings.';}
  document.querySelectorAll('[data-archive-status]').forEach(node=>{node.textContent=message;});
}
function journalBackupStatus(message){
  document.querySelectorAll('[data-backup-status]').forEach(node=>{node.textContent=message;});
  showToast(message);
}
function downloadJournalBackup(){
  try{
    const backup=createJournalBackup();
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    if(blob.size>JOURNAL_BACKUP_MAX_BYTES)throw new Error('This archive is too large for a portable backup. Export important readings individually.');
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='arcana-journal-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    journalBackupStatus('Backup download started. The file contains your private readings and reflections; keep it somewhere safe.');
    return true;
  }catch(e){journalBackupStatus('Backup could not be created. '+(e.message||'Browser storage is unavailable.'));return false;}
}
function chooseJournalBackup(){
  let input=document.getElementById('journal-backup-file');
  if(!input){
    input=document.createElement('input');input.id='journal-backup-file';input.type='file';input.accept='.json,application/json';input.hidden=true;
    input.setAttribute('aria-label','Choose Arcana journal backup');input.onchange=()=>restoreJournalBackup(input);document.body.appendChild(input);
  }
  input.value='';input.click();
}
let journalRestoreReturnSettings=false;
function closeJournalRestore(){
  closeModal('modal-journal-restore');
  if(journalRestoreReturnSettings){journalRestoreReturnSettings=false;openModal('modal-settings');}
}
async function restoreJournalBackup(input){
  const file=input.files&&input.files[0];
  if(!file)return;
  try{
    if(file.size>JOURNAL_BACKUP_MAX_BYTES)throw new Error('Choose a backup smaller than 10 MB.');
    const backup=parseJournalBackup(await file.text());
    const plan=buildJournalRestorePlan(backup);
    let modal=document.getElementById('modal-journal-restore');
    if(!modal){
      modal=document.createElement('div');modal.id='modal-journal-restore';modal.className='modal-overlay';document.body.appendChild(modal);
      modal.addEventListener('click',event=>{if(event.target===modal)closeJournalRestore();});
      modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();event.preventDefault();closeJournalRestore();}});
    }
    const count=plan.addedReadings+plan.addedJournal;
    const skipped=plan.skippedReadings+plan.skippedJournal;
    modal.innerHTML=`<div class="modal ritual-modal backup-preview">
      <button type="button" class="close-btn" onclick="closeJournalRestore()" aria-label="Close backup preview">&times;</button>
      <h2>Review your backup</h2>
      <p>Add ${plan.addedReadings} reading${plan.addedReadings===1?'':'s'} and ${plan.addedJournal} reflection${plan.addedJournal===1?'':'s'}.</p>
      <p>Existing entries stay as they are. Entries already in your journal are skipped.</p>
      ${skipped?`<p class="storage-warning">${skipped} additional item${skipped===1?' does':'s do'} not fit the current archive limits (${plan.readingLimit} readings and ${JOURNAL_ARCHIVE_LIMIT} reflections). They remain in your backup file. No existing entries will be removed.</p>`:''}
      ${!count?'<p>No new items can be added. Keep the backup file; your archive is unchanged.</p>':''}
      <p id="restore-backup-error" class="storage-warning" role="alert" hidden></p>
      <div class="settings-actions"><button type="button" class="btn" onclick="closeJournalRestore()">Cancel</button>${count?'<button type="button" class="btn btn-primary" id="restore-backup-confirm">Restore '+count+' item'+(count===1?'':'s')+'</button>':''}</div>
    </div>`;
    const confirmButton=modal.querySelector('#restore-backup-confirm');
    if(confirmButton)confirmButton.onclick=()=>{
      try{
        commitJournalRestore(plan);closeJournalRestore();renderHistory();updateArchiveStatus();
        journalBackupStatus('Restored '+plan.addedReadings+' reading'+(plan.addedReadings===1?'':'s')+' and '+plan.addedJournal+' reflection'+(plan.addedJournal===1?'':'s')+'. Existing entries were kept.');
      }catch(e){const error=modal.querySelector('#restore-backup-error');error.hidden=false;error.textContent=e.message;}
    };
    journalRestoreReturnSettings=typeof activeDialog!=='undefined'&&activeDialog&&activeDialog.id==='modal-settings';
    activateDialog(modal,document.activeElement);
  }catch(e){journalBackupStatus('Backup was not restored. '+(e.message||'The file could not be read.')+' No saved items were changed.');}
  finally{input.value='';}
}
