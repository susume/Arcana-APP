// ===== AUTO-SAVE =====
const AUTOSAVE_TTL_MS=60*60*1000;
const AUTOSAVE_VERSION=2;
const ARCANA_STORAGE_KEYS=['arcana_autosave','arcana_readings','arcana-journal','arcana_settings','arcana_usage','arcana_subscription','arcana_temp_cache','arcana_android_tester_pass','arcana_android_review_pass'];
const FREE_READING_ARCHIVE_LIMIT=3;
const PREMIUM_READING_ARCHIVE_LIMIT=50;
const JOURNAL_ARCHIVE_LIMIT=50;
let firstSavedReadingId='';
function getReadingArchiveLimit(){return isPremium()?PREMIUM_READING_ARCHIVE_LIMIT:FREE_READING_ARCHIVE_LIMIT;}
function archiveReplacementCount(key,limit){return Math.max(0,readStoredJson(key,[]).length+1-limit);}

function readStoredJson(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    const value=raw?JSON.parse(raw):fallback;
    if(Array.isArray(fallback)&&!Array.isArray(value))return fallback;
    return value;
  }catch(e){return fallback;}
}

function readArchiveSnapshotForWrite(key){
  try{
    const raw=localStorage.getItem(key);
    const entries=raw===null?[]:JSON.parse(raw);
    if(!Array.isArray(entries))throw new Error('Invalid archive');
    return {raw,entries};
  }catch(e){
    showToast('Saved entries could not be read. Keep a copy of your current text; the archive was not changed.');
    return null;
  }
}
function readArchiveForWrite(key){return readArchiveSnapshotForWrite(key)?.entries||null;}

function writeStoredJson(key,value,message){
  try{
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(e){
    console.warn('Arcana storage write failed',key,e);
    if(message)showToast(message);
    return false;
  }
}

function serializableState(){
  return {
    mode:state.mode,
    concerns:Array.isArray(state.concerns)?state.concerns.slice(0,20):[],
    cardSystem:state.cardSystem,
    cardSystemEstablished:!!state.cardSystemEstablished,
    cardEntryTab:['tab-guided','tab-upload','tab-manual'].includes(state.cardEntryTab)?state.cardEntryTab:null,
    spreadId:state.spreadId,
    cards:state.cards&&typeof state.cards==='object'?{...state.cards}:{},
    droppedCard:state.droppedCard?{...state.droppedCard}:null,
    hasDroppedCard:!!state.hasDroppedCard,
    narrative:'',
    readingMode:state.readingMode,
    reviewModeChoice:state.reviewModeChoice,
    readerLifeStage:state.readerLifeStage||'',
    guidedStep:Number.isFinite(state.guidedStep)?state.guidedStep:0,
    preparationSkipped:!!state.preparationSkipped,
    photoIdentificationSent:!!state.photoIdentificationSent,
    reversals:!!state.reversals,
    quickSpreadId:state.quickSpreadId,
    readingUsageRecorded:!!state.readingUsageRecorded,
    currentReadingId:state.currentReadingId||''
  };
}

function autoSaveState(){
  let route=typeof location!=='undefined'?String(location.hash||'#welcome').replace(/^#/,''):'welcome';
  if(route==='reading')route=state.spreadId&&Object.keys(state.cards||{}).length?'overview':'card-entry';
  writeStoredJson('arcana_autosave',{version:AUTOSAVE_VERSION,state:serializableState(),route,timestamp:Date.now()},'Arcana could not save this reading locally. Your current work will remain in memory.');
}
function restoreState(){
  const saved=readStoredJson('arcana_autosave',null);
  if(saved&&saved.timestamp&&Date.now()-saved.timestamp<AUTOSAVE_TTL_MS){
    return {state:saved.state||saved.snapshot||saved,route:saved.route||'spread'};
  }
  if(saved)clearAutoSave();
  return null;
}
function clearAutoSave(){
  try{localStorage.removeItem('arcana_autosave');}catch(e){}
}
function clearArcanaData(){
  ARCANA_STORAGE_KEYS.forEach(key=>{
    try{localStorage.removeItem(key);}catch(e){console.warn('Arcana storage clear failed',key,e)}
  });
  showToast('Arcana data cleared from this browser.');
}

// ===== PERSISTENCE =====
function loadSettings(){
  try{
    const saved=JSON.parse(localStorage.getItem('arcana_settings'))||{};
    return {
      geminiKey:saved.geminiKey||'',
      readingStyle:saved.readingStyle||'Traditional',
      readingTone:saved.readingTone||'Gentle',
      narratorVoice:saved.narratorVoice||'',
      transitionSounds:saved.transitionSounds===true
    };
  }catch(e){return{geminiKey:'',readingStyle:'Traditional',readingTone:'Gentle',narratorVoice:'',transitionSounds:false}}
}
function saveSettings(){
  const previous=loadSettings();
  const s={
    geminiKey:previous.geminiKey||'',
    readingStyle:document.getElementById('reading-style').value,
    readingTone:document.getElementById('reading-tone').value,
    narratorVoice:document.getElementById('narrator-voice')?.value||'',
    transitionSounds:document.getElementById('transition-sounds')?.checked===true
  };
  if(!writeStoredJson('arcana_settings',s,'Settings could not be saved. Browser storage is unavailable.'))return;
  renderEntitlementsUI();
  closeModal('modal-settings');
  showToast('Settings saved.');
}
function loadSettingsUI(){
  const s=loadSettings();
  document.getElementById('reading-style').value=s.readingStyle;
  document.getElementById('reading-tone').value=s.readingTone;
  populateNarratorVoiceOptions(s.narratorVoice);
  const sounds=document.getElementById('transition-sounds');
  if(sounds)sounds.checked=s.transitionSounds;
  const keyInput=document.getElementById('premium-key-input');
  if(keyInput)keyInput.value='';
  const geminiInput=document.getElementById('gemini-key-input');
  if(geminiInput)geminiInput.value='';
  const geminiStatus=document.getElementById('gemini-key-status');
  if(geminiStatus)geminiStatus.textContent=s.geminiKey?'Gemini key saved on this browser.':'No Gemini key saved yet.';
  renderEntitlementsUI();
}

async function testAndSaveGeminiKey(){
  const input=document.getElementById('gemini-key-input');
  const status=document.getElementById('gemini-key-status');
  const key=(input&&input.value.trim())||loadSettings().geminiKey;
  if(!key){
    if(status)status.textContent='Paste your Gemini API key first.';
    return;
  }
  if(status)status.textContent='Testing Gemini key...';
  try{
    await testApiKey(key);
    const s=loadSettings();
    if(!writeStoredJson('arcana_settings',{...s,geminiKey:key}))throw new Error('Key validated, but browser storage could not save it.');
    if(input)input.value='';
    if(status)status.textContent='Gemini key saved on this browser.';
  }catch(e){
    if(status)status.textContent=e.message||'This key could not be validated.';
  }
}

function removeGeminiKey(){
  const s=loadSettings();
  delete s.geminiKey;
  if(!writeStoredJson('arcana_settings',s,'The key could not be removed. Browser storage is unavailable.'))return;
  loadSettingsUI();
  showToast('Gemini key removed from this browser.');
}

function openGeminiKeyGuide(){
  closeModal('modal-settings');
  openModal('modal-help');
  setTimeout(()=>document.getElementById('gemini-key-guide')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
}

function populateNarratorVoiceOptions(selected){
  const voiceSelect=document.getElementById('narrator-voice');
  if(!voiceSelect)return;
  const voices=('speechSynthesis' in window && window.speechSynthesis.getVoices)?window.speechSynthesis.getVoices():[];
  voiceSelect.innerHTML='<option value="">Browser default</option>'+voices.map(v=>`<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)} (${escapeHtml(v.lang)})</option>`).join('');
  voiceSelect.value=selected||'';
}
if('speechSynthesis' in window){
  window.speechSynthesis.onvoiceschanged=()=>populateNarratorVoiceOptions(loadSettings().narratorVoice);
}

function getSavedCurrentReading(){
  if(!state.currentReadingId||!state.narrative)return null;
  return readStoredJson('arcana_readings',[]).find(reading=>reading?.id===state.currentReadingId&&reading.narrative===state.narrative)||null;
}

function persistReading(title,allowReplacement=false,{reflection='',allowReflectionReplacement=false}={}){
  const cleanTitle=String(title||'').trim().slice(0,120);
  if(!cleanTitle)return false;
  const readingArchive=readArchiveSnapshotForWrite('arcana_readings');
  if(!readingArchive)return false;
  const readings=readingArchive.entries;
  const maxReadings=getReadingArchiveLimit();
  if(readings.length>=maxReadings&&allowReplacement!==true){
    showToast('Your reading archive is full. Download a backup and confirm before replacing older readings.');
    return false;
  }
  const reflectionText=String(reflection||'').trim().slice(0,10000);
  let journal;
  if(reflectionText){
    if(!isPremium())return false;
    journal=readArchiveForWrite('arcana-journal');
    if(!journal)return false;
    if(journal.length>=JOURNAL_ARCHIVE_LIMIT&&allowReflectionReplacement!==true){
      showToast('Your reflection archive is full. Download a backup and confirm before replacing older reflections.');
      return false;
    }
  }
  const spread=getReadingSpread();
  const readingId=createArchiveRecordId();
  const date=new Date().toISOString();
  const reading={
    id:readingId,
    title:cleanTitle,
    date,
    mode:state.mode,
    concerns:[...state.concerns],
    readerLifeStage:state.readerLifeStage||'',
    cardSystem:state.cardSystem||'tarot',
    spread:spread?spread.id:(state.spreadId||state.quickSpreadId||'quick'),
    spreadName:spread?spread.name:'Quick Reading',
    cards:{...state.cards},
    droppedCard:state.droppedCard,
    hasDroppedCard:state.hasDroppedCard,
    narrative:state.narrative,
    readingMode:state.readingMode,
    readingPackage:state.readingPackage||null,
    notes:''
  };
  const nextReadings=[reading,...readings].slice(0,maxReadings);
  if(!writeStoredJson('arcana_readings',nextReadings,'Arcana could not save this reading. Browser storage may be full or unavailable.'))return false;
  if(journal){
    const entry={id:createArchiveRecordId(),createdAt:date,updatedAt:date,date,spreadId:reading.spread,spreadName:reading.spreadName,readingId,text:reflectionText};
    if(!writeStoredJson('arcana-journal',[entry,...journal].slice(0,JOURNAL_ARCHIVE_LIMIT))){
      try{
        if(readingArchive.raw===null)localStorage.removeItem('arcana_readings');
        else localStorage.setItem('arcana_readings',readingArchive.raw);
      }catch(e){
        showToast('Arcana could not restore the previous archive. Keep a copy of your reflection and check your journal.');
      }
      return false;
    }
  }
  if(!readings.length)firstSavedReadingId=readingId;
  state.currentReadingId=readingId;
  if(typeof updateArchiveStatus==='function')updateArchiveStatus();
  return true;
}
function createArchiveRecordId(){
  return typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'
    ? crypto.randomUUID()
    : Date.now().toString(36)+Math.random().toString(36).slice(2,10);
}

function closeSaveReadingDialog(restoreFocus=true){
  const overlay=document.getElementById('save-reading-overlay');
  if(!overlay)return;
  const trigger=overlay._returnFocus;
  overlay.remove();
  if(restoreFocus&&trigger&&typeof trigger.focus==='function')trigger.focus();
}

function openSaveReadingDialog(){
  if(document.getElementById('save-reading-overlay'))return;
  const narrative=state.narrative;
  const requestVersion=readingRequestVersion;
  const reflectionInput=document.getElementById('journal-entry');
  const reflection=isPremium()&&reflectionInput?reflectionInput.value.trim():'';
  const returnFocus=document.activeElement;
  const overlay=document.createElement('div');
  overlay.id='save-reading-overlay';
  overlay.className='modal-overlay open save-reading-overlay';
  overlay._returnFocus=returnFocus;
  overlay.innerHTML=`
    <div class="modal ritual-modal save-reading-dialog" role="dialog" aria-modal="true" aria-labelledby="save-reading-title" aria-describedby="save-reading-description">
      <h2 id="save-reading-title">Save this reading</h2>
      <p id="save-reading-description">${reflection?'Your reflection will be saved with this reading.':'Readings stay in this browser.'}</p>
      <form id="save-reading-form" novalidate>
        <label for="save-reading-name">Reading title</label>
        <input id="save-reading-name" type="text" maxlength="80" autocomplete="off" required>
        <div class="storage-warning" id="save-reading-capacity" hidden>
          <p id="save-reading-capacity-message"></p>
          <button type="button" class="btn btn-sm" onclick="downloadJournalBackup()">Download backup first</button>
          <label class="replacement-confirm"><input type="checkbox" id="save-reading-replace"> I understand the oldest entries will be replaced.</label>
        </div>
        <p class="save-reading-error" id="save-reading-error" aria-live="polite"></p>
        <div class="save-reading-actions">
          <button type="button" class="btn" id="save-reading-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save reading</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  const input=overlay.querySelector('#save-reading-name');
  const form=overlay.querySelector('#save-reading-form');
  const error=overlay.querySelector('#save-reading-error');
  input.value=String(state.readingPackage?.title||'Reading '+new Date().toLocaleDateString()).slice(0,input.maxLength);
  const replacement=overlay.querySelector('#save-reading-replace');
  let acknowledgedReplacement='';
  const syncCapacity=()=>{
    const readings=archiveReplacementCount('arcana_readings',getReadingArchiveLimit());
    const reflections=reflection?archiveReplacementCount('arcana-journal',JOURNAL_ARCHIVE_LIMIT):0;
    const replacing=[readings?`${readings} oldest reading${readings===1?'':'s'}`:'',reflections?`${reflections} oldest reflection${reflections===1?'':'s'}`:''].filter(Boolean).join(' and ');
    overlay.querySelector('#save-reading-capacity').hidden=!replacing;
    overlay.querySelector('#save-reading-capacity-message').textContent=`Saving will replace ${replacing}. Download a backup first to keep them.`;
    return {readings,reflections,replacing};
  };
  replacement.addEventListener('change',()=>{acknowledgedReplacement=replacement.checked?syncCapacity().replacing:'';});
  syncCapacity();

  overlay.querySelector('#save-reading-cancel').addEventListener('click',()=>closeSaveReadingDialog());
  overlay.addEventListener('click',event=>{
    if(event.target===overlay)closeSaveReadingDialog();
  });
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      event.preventDefault();
      closeSaveReadingDialog();
      return;
    }
    if(event.key!=='Tab')return;
    const focusable=Array.from(overlay.querySelectorAll('input,button')).filter(el=>!el.disabled&&!el.hidden&&el.offsetParent!==null);
    if(!focusable.length)return;
    const first=focusable[0];
    const last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();
      last.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();
      first.focus();
    }
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(state.narrative!==narrative||readingRequestVersion!==requestVersion){
      error.textContent='The reading changed. Close this dialog and save again from the current reading.';
      return;
    }
    const title=input.value.trim();
    if(!title){
      error.textContent='Enter a title before saving.';
      input.focus();
      return;
    }
    const {readings,reflections,replacing}=syncCapacity();
    if(replacing&&(!replacement.checked||acknowledgedReplacement!==replacing)){
      replacement.checked=false;
      error.textContent='Review the archive warning and confirm replacement before saving.';
      replacement.focus();
      return;
    }
    if(reflection&&!isPremium()){
      error.textContent='Premium is needed to save this reflection. Close this dialog to keep editing your reading.';
      return;
    }
    if(!persistReading(title,!!readings,{reflection,allowReflectionReplacement:!!reflections})){
      error.textContent='Your reading could not be saved. Check browser storage and try again. Your draft is still here.';
      return;
    }
    if(reflectionInput)reflectionInput.value='';
    closeSaveReadingDialog(false);
    renderReadingSaveStatus();
    playReadingCue('save');
    const savedFocus=returnFocus?.id==='reading-quick-save'?'reading-quick-saved':'view-saved-journal';
    document.getElementById(savedFocus)?.focus();
  });

  requestAnimationFrame(()=>{
    input.focus();
    input.select();
  });
}

function saveReading(){
  if(state.narrative&&!getSavedCurrentReading())openSaveReadingDialog();
}
