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
  try{return JSON.parse(localStorage.getItem('arcana_settings'))||{geminiKey:'',readingStyle:'Traditional',readingTone:'Gentle'}}catch(e){return{geminiKey:'',readingStyle:'Traditional',readingTone:'Gentle'}}
}
function saveSettings(){
  const s={
    geminiKey:document.getElementById('api-key-input').value.trim(),
    readingStyle:document.getElementById('reading-style').value,
    readingTone:document.getElementById('reading-tone').value
  };
  localStorage.setItem('arcana_settings',JSON.stringify(s));
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
  document.getElementById('api-key-input').value=s.geminiKey;
  document.getElementById('reading-style').value=s.readingStyle;
  document.getElementById('reading-tone').value=s.readingTone;
}

function saveReading(){
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
