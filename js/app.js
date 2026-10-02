// ===== INIT =====
async function initApp(){
  await renderScreen();
  await loadSpreads();
  // Stars
  const s=document.getElementById('stars');
  for(let i=0;i<60;i++){
    const d=document.createElement('div');
    d.className='star';
    d.style.left=Math.random()*100+'%';
    d.style.top=Math.random()*100+'%';
    d.style.animationDelay=Math.random()*3+'s';
    d.style.animationDuration=(2+Math.random()*3)+'s';
    s.appendChild(d);
  }
  currentCards=getCards();
  // Auto-restore
  const saved=restoreState();
  const savedState=saved&&saved.state?saved.state:null;
  if(savedState){
    state=Object.assign(state,savedState);
    migrateRestoredCardSystemState(savedState);
    // Rehydrate the controls as well as the state before resuming a route.
    const concerns=Array.isArray(state.concerns)?state.concerns:[];
    concerns.forEach((value,index)=>{
      if(index>0)addConcern();
      const input=document.querySelectorAll('.concern-input')[index];
      if(input)input.value=value;
    });
    document.querySelectorAll('.tag-chip').forEach(chip=>{
      const selected=concerns.includes(chip.textContent.trim());
      chip.classList.toggle('active',selected);chip.setAttribute('aria-pressed',String(selected));
    });
    document.querySelectorAll('#screen-card-system .card-opt').forEach(option=>{
      const selected=state.cardSystemEstablished&&option.getAttribute('onclick').includes("'"+state.cardSystem+"'");
      option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',String(selected));
    });
    document.querySelectorAll('.reading-choice-card').forEach(option=>{
      const selected=!!state.spreadId&&option.getAttribute('onclick').includes("'"+state.spreadId+"'");
      option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',String(selected));
    });
    for(const id of ['reader-life-stage','quick-reader-life-stage']){
      const select=document.getElementById(id);if(select)select.value=state.readerLifeStage||'';
    }
    const dropToggle=document.getElementById('drop-toggle');
    dropToggle.classList.toggle('on',!!state.hasDroppedCard);
    dropToggle.setAttribute('aria-pressed',String(!!state.hasDroppedCard));
    document.getElementById('drop-card-entry').style.display=state.hasDroppedCard?'block':'none';
    if(state.droppedCard){
      const picker=document.querySelector('.card-pick-btn[data-pos="drop"]');
      if(picker){picker.textContent=state.droppedCard.name;picker.classList.add('selected');}
      const orientation=document.querySelector('.orient-btn[data-pos="drop"]');
      if(orientation){
        const reversed=state.droppedCard.orientation==='reversed';
        orientation.dataset.orient=state.droppedCard.orientation;
        orientation.textContent=reversed?'R':'U';
        orientation.classList.toggle('reversed',reversed);
        orientation.setAttribute('aria-pressed',String(reversed));
        orientation.setAttribute('aria-label','Card orientation: '+state.droppedCard.orientation);
      }
    }
    syncUploadDeckSelectors();
    if(state.mode==='quick'){
      renderQuickSpreads();
      document.getElementById('quick-concern').value=concerns.join(', ');
    }
    const savedRoute=saved.route || (state.spreadId?'screen-spread':'screen-concerns');
    goScreen(screenForRoute(savedRoute),true);
  }else{
    goScreen(screenForRoute(location.hash.slice(1)||'welcome'),true);
  }
  document.querySelectorAll('.modal-overlay').forEach(m=>{
    m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)});
  });
  renderEntitlementsUI();
}

window.addEventListener('hashchange',()=>goScreen(screenForRoute(location.hash.slice(1)),true));
initApp();
