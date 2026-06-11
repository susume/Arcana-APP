// ===== AUTO-SAVE =====
function autoSaveState(){
  try{localStorage.setItem('arcana_autosave',JSON.stringify({state:state,timestamp:Date.now()}));}catch(e){}
}
function restoreState(){
  try{
    const saved=JSON.parse(localStorage.getItem('arcana_autosave'));
    if(saved&&Date.now()-saved.timestamp<3600000){
      return saved.state;
    }
  }catch(e){}
  return null;
}
function clearAutoSave(){
  localStorage.removeItem('arcana_autosave');
}

// ===== PERSISTENCE =====
function loadSettings(){
  try{
    const saved=JSON.parse(localStorage.getItem('arcana_settings'))||{};
    return {
      geminiKey:saved.geminiKey||'',
      readingStyle:saved.readingStyle||'Traditional',
      readingTone:saved.readingTone||'Gentle',
      narratorVoice:saved.narratorVoice||''
    };
  }catch(e){return{geminiKey:'',readingStyle:'Traditional',readingTone:'Gentle',narratorVoice:''}}
}
function saveSettings(){
  const previous=loadSettings();
  const s={
    geminiKey:previous.geminiKey||'',
    readingStyle:document.getElementById('reading-style').value,
    readingTone:document.getElementById('reading-tone').value,
    narratorVoice:document.getElementById('narrator-voice')?.value||''
  };
  localStorage.setItem('arcana_settings',JSON.stringify(s));
  renderEntitlementsUI();
  closeModal('modal-settings');
  showToast('Settings saved.');
}
function showToast(msg){
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}
function loadSettingsUI(){
  const s=loadSettings();
  document.getElementById('reading-style').value=s.readingStyle;
  document.getElementById('reading-tone').value=s.readingTone;
  populateNarratorVoiceOptions(s.narratorVoice);
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
    localStorage.setItem('arcana_settings',JSON.stringify({...s,geminiKey:key}));
    if(input)input.value='';
    if(status)status.textContent='Gemini key saved on this browser.';
  }catch(e){
    if(status)status.textContent=e.message||'This key could not be validated.';
  }
}

function removeGeminiKey(){
  const s=loadSettings();
  delete s.geminiKey;
  localStorage.setItem('arcana_settings',JSON.stringify(s));
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
  voiceSelect.innerHTML='<option value="">Browser default</option>'+voices.map(v=>`<option value="${v.name.replace(/"/g,'&quot;')}">${v.name} (${v.lang})</option>`).join('');
  voiceSelect.value=selected||'';
}
if('speechSynthesis' in window){
  window.speechSynthesis.onvoiceschanged=()=>populateNarratorVoiceOptions(loadSettings().narratorVoice);
}

function saveReading(){
  const freeLimit=3;
  const title=prompt('Give this reading a title:','Reading '+new Date().toLocaleDateString());
  if(!title)return;
  const readings=JSON.parse(localStorage.getItem('arcana_readings')||'[]');
  const spread=getReadingSpread();
  readings.unshift({
    id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    title,
    date:new Date().toISOString(),
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
    notes:''
  });
  const maxReadings=isPremium()?50:freeLimit;
  while(readings.length>maxReadings)readings.pop();
  localStorage.setItem('arcana_readings',JSON.stringify(readings));
  showToast(isPremium()?'Reading saved!':'Reading saved. Free history keeps your latest 3 readings.');
}
