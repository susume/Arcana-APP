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
    return {readingStyle:saved.readingStyle||'Traditional',readingTone:saved.readingTone||'Gentle'};
  }catch(e){return{readingStyle:'Traditional',readingTone:'Gentle'}}
}
function saveSettings(){
  const activationInput=document.getElementById('premium-key-input');
  const activationStatus=document.getElementById('premium-key-status');
  if(activationInput&&activationInput.value.trim()){
    if(activatePremiumKey(activationInput.value)){
      if(activationStatus){activationStatus.textContent='Premium activated on this device.';activationStatus.style.color='var(--success)';}
    }else if(activationStatus){
      activationStatus.textContent='Activation key not recognized.';
      activationStatus.style.color='var(--danger)';
      return;
    }
  }
  const s={
    readingStyle:document.getElementById('reading-style').value,
    readingTone:document.getElementById('reading-tone').value
  };
  localStorage.setItem('arcana_settings',JSON.stringify(s));
  renderEntitlementsUI();
  closeModal('modal-settings');
  showToast('Settings saved ✓');
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
  const keyInput=document.getElementById('premium-key-input');
  if(keyInput)keyInput.value='';
  renderEntitlementsUI();
}

function saveReading(){
  if(!requestPremiumFeature('history')) return;
  const title=prompt('Give this reading a title:','Reading '+new Date().toLocaleDateString());
  if(!title)return;
  const readings=JSON.parse(localStorage.getItem('arcana_readings')||'[]');
  const spread=getSpread();
  readings.unshift({
    id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    title,
    date:new Date().toISOString(),
    mode:state.mode,
    concerns:[...state.concerns],
    readerAge:state.readerAge||'',
    readerLifeStage:state.readerLifeStage||'',
    cardSystem:state.cardSystem||'tarot',
    spread:state.spreadId||'quick',
    spreadName:spread?spread.name:'Quick Reading',
    cards:{...state.cards},
    droppedCard:state.droppedCard,
    hasDroppedCard:state.hasDroppedCard,
    narrative:state.narrative,
    notes:''
  });
  if(readings.length>50)readings.pop();
  localStorage.setItem('arcana_readings',JSON.stringify(readings));
  showToast('Reading saved!');
}
