// ===== INIT =====
const homepageSections = new Set(['why-arcana', 'how-it-works', 'reading-examples', 'premium', 'journal']);

function openHomepageSection(route){
  if(!homepageSections.has(route))return false;
  const homepage=document.getElementById('screen-welcome');
  const section=document.getElementById(route);
  if(!homepage||!section)return false;
  if(!homepage.classList.contains('active')){
    goScreen('screen-welcome',true);
    history.replaceState(null,'','#'+route);
  }
  section.scrollIntoView();
  return true;
}

async function initApp(){
  const startFromSample=location.search&&!location.hash&&new URLSearchParams(location.search).get('start')==='guided';
  await Promise.all([renderScreen(),loadSpreads()]);
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
  let route=location.hash.slice(1);
  // Auto-restore
  const saved=restoreState();
  const savedState=saved&&saved.state?saved.state:null;
  if(savedState){
    state=Object.assign(state,savedState);
    state.preparationSkipped=savedState.preparationSkipped===true;
    migrateRestoredCardSystemState(savedState);
    // Rehydrate the controls as well as the state before resuming a route.
    const concerns=Array.isArray(state.concerns)?state.concerns:[];
    const question=document.querySelector('.concern-input');
    if(question)question.value=concerns.join('; ');
    document.querySelectorAll('.tag-chip').forEach(chip=>{
      const selected=concerns.includes(chip.textContent.trim());
      chip.classList.toggle('active',selected);chip.setAttribute('aria-pressed',String(selected));
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
    const jumperOptions=document.getElementById('jumper-options');
    if(jumperOptions)jumperOptions.open=!!state.hasDroppedCard;
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
      document.getElementById('quick-concern').value=concerns.join(', ');
      document.getElementById('quick-question').open=concerns.length>0||!!state.readerLifeStage;
      if(!state.spreadId)state.spreadId=state.quickSpreadId;
    }
    if(!homepageSections.has(route)&&screenForRoute(route)!=='screen-history'){
      route=saved.route || (state.spreadId?'screen-spread':'screen-concerns');
    }
  }
  if(!openHomepageSection(route))goScreen(screenForRoute(route||'welcome'),true);
  document.querySelectorAll('.modal-overlay').forEach(m=>{
    m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)});
  });
  renderEntitlementsUI();
  // The public homepage is visible before templates and spreads finish loading.
  document.querySelectorAll('#screen-welcome button[data-app-startup]').forEach(button=>{
    button.disabled=false;
    button.removeAttribute('data-app-startup');
  });
  if(startFromSample){
    if(location.protocol!=='file:'){
      const url=new URL(location.href);
      url.searchParams.delete('start');
      history.replaceState(null,'',url);
    }
    const hasDraft=savedState&&!savedState.readingUsageRecorded&&(
      savedState.spreadId||savedState.quickSpreadId||savedState.concerns?.length
    );
    if(hasDraft){
      openConfirmDialog('Start a new reading?', 'You have a reading in progress. Starting a new reading replaces that draft.', startGuided, 'Start new reading', false, false);
    }else startGuided();
  }
  window.addEventListener('hashchange',()=>{
    const route=location.hash.slice(1);
    if(!openHomepageSection(route))goScreen(screenForRoute(route),true);
  });
  globalThis.arcanaAndroid?.start();
}

initApp();
