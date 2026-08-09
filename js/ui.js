// ===== TEMPLATE LOADING =====
async function renderScreen(){
  const app=document.getElementById('app');
  if(!app || app.dataset.templatesLoaded)return;
  const templates=['welcome','concerns','card-system','choose-reading','reflection','placement','overview','results','history','quick','settings','help'];
  const html=await Promise.all(templates.map(async name=>{
    const embedded=document.getElementById('template-'+name);
    if(location.protocol==='file:' && embedded)return embedded.innerHTML;
    try{
      const res=await fetch('templates/'+name+'.html');
      if(res.ok)return res.text();
    }catch(e){}
    return embedded ? embedded.innerHTML : '';
  }));
  app.innerHTML=html.join('\n');
  ensureRitualUtilities();
  app.dataset.templatesLoaded='true';
}

function ensureRitualUtilities(){
  document.querySelectorAll('.ritual-screen:not(#screen-history)').forEach(screen=>{
    if(screen.querySelector('.ritual-journal-shortcut'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='ritual-journal-shortcut';
    button.dataset.premiumFeature='history';
    button.setAttribute('aria-label','Open Tarot Journal');
    button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 6.4C10.4 5 7.6 4.5 4.6 5v13.4c3-.5 5.8 0 7.4 1.4M12 6.4c1.6-1.4 4.4-1.9 7.4-1.4v13.4c-3-.5-5.8 0-7.4 1.4M12 6.4V20"></path></svg><span>Journal</span>';
    button.onclick=()=>goScreen('screen-history');
    screen.appendChild(button);
  });
}

// ===== NAVIGATION =====
function routeForScreen(id){return String(id||'').replace(/^screen-/,'');}
const SCREEN_ROUTE_MAP={
  welcome:'screen-welcome',
  concerns:'screen-concerns',
  'card-system':'screen-card-system',
  spread:'screen-spread',
  reflection:'screen-reflection',
  'card-entry':'screen-card-entry',
  overview:'screen-overview',
  reading:'screen-reading',
  history:'screen-history',
  quick:'screen-quick',
  settings:'screen-settings',
  help:'screen-help'
};
const VALID_SCREEN_IDS=new Set(Object.values(SCREEN_ROUTE_MAP));
function screenForRoute(route){
  const normalized=String(route||'').replace(/^#/,'');
  if(VALID_SCREEN_IDS.has(normalized))return normalized;
  return SCREEN_ROUTE_MAP[normalized]||'screen-welcome';
}
function navigate(route){goScreen(screenForRoute(route),true);}
function resolveScreenPrerequisite(id){
  if(!VALID_SCREEN_IDS.has(id))return 'screen-welcome';
  if(id==='screen-welcome')return id;
  if(id==='screen-history')return id;
  if(id==='screen-quick')return state.mode==='quick'?id:'screen-welcome';
  if(id==='screen-concerns')return state.mode==='guided'?id:'screen-welcome';
  if(id==='screen-card-system')return state.mode==='guided'?id:'screen-welcome';
  if(state.mode!=='guided')return 'screen-welcome';
  if(!state.cardSystemEstablished && id!=='screen-card-system')return 'screen-card-system';
  if(['screen-reflection','screen-card-entry','screen-overview','screen-reading'].includes(id)&&!state.spreadId)return 'screen-spread';
  if(['screen-overview','screen-reading'].includes(id)&&!Object.keys(state.cards||{}).length)return 'screen-card-entry';
  return id;
}
function goScreen(id, fromRouter){
  if(id==='screen-history' && !requestPremiumFeature('history')){
    id='screen-welcome';
  }
  id=resolveScreenPrerequisite(screenForRoute(id));
  if(!document.getElementById(id))id='screen-welcome';
  const nextHash='#'+routeForScreen(id);
  if(!fromRouter && location.hash !== nextHash) location.hash = nextHash;
  else if(fromRouter && location.hash !== nextHash) history.replaceState(null,'',nextHash);
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const screen=document.getElementById(id);
  screen.classList.add('active');
  const heading=screen.querySelector('h1,h2,[data-screen-heading]');
  if(heading){
    heading.tabIndex=-1;
    requestAnimationFrame(()=>heading.focus({preventScroll:true}));
  }
  window.scrollTo(0,0);
  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
  if(id==='screen-history')renderHistory();
  updateDots(id);
  updateProgressEstimate(id);
  renderEntitlementsUI();
  autoSaveState();
}
const GUIDED_SCREENS=['screen-concerns','screen-card-system','screen-spread','screen-reflection','screen-card-entry','screen-overview','screen-reading'];
function updateDots(screenId){
  const idx=GUIDED_SCREENS.indexOf(screenId);
  if(idx<0)return;
  document.querySelectorAll('.step-dots').forEach(container=>{
    container.innerHTML='';
    container.setAttribute('role','progressbar');
    container.setAttribute('aria-label','Guided reading progress');
    container.setAttribute('aria-valuemin','1');
    container.setAttribute('aria-valuemax',String(GUIDED_SCREENS.length));
    container.setAttribute('aria-valuenow',String(idx+1));
    GUIDED_SCREENS.forEach((_,i)=>{
      const d=document.createElement('div');
      d.className='dot'+(i===idx?' active':'')+(i<idx?' done':'');
      d.setAttribute('aria-hidden','true');
      container.appendChild(d);
    });
  });
}

// ===== WELCOME =====
function startGuided(){
  state.mode='guided';
  state.narrative='';
  state.cards={};
  state.droppedCard=null;
  state.hasDroppedCard=false;
  state.uploadedImage=null;
  state.spreadId=null;
  state.quickSpreadId=null;
  state.readerLifeStage='';
  state.guidedStep=0;
  state.readingUsageRecorded=false;
  state.currentReadingId='';
  state.concerns=[];
  // Reset drop toggle UI
  const tog=document.getElementById('drop-toggle');
  if(tog){tog.classList.remove('on')}
  document.getElementById('drop-card-entry').style.display='none';
  // Reset concern inputs
  const cl=document.getElementById('concern-list');
  cl.innerHTML='<div class="concern-row"><label class="sr-only" for="concern-input-1">Question or focus</label><input id="concern-input-1" type="text" placeholder="What question or situation is on your mind?" class="concern-input"><button type="button" class="btn btn-sm btn-danger" onclick="removeConcern(this)" title="Remove focus">&times;</button></div>';
  document.querySelectorAll('.tag-chip').forEach(t=>t.classList.remove('active'));
  const lifeStage=document.getElementById('reader-life-stage');
  if(lifeStage)lifeStage.value='';
  state.cardSystem='tarot';
  state.cardSystemEstablished=false;
  currentCards=getCards();
  syncUploadDeckSelectors();
  document.querySelectorAll('#screen-card-system .card-opt').forEach(c=>c.classList.remove('selected'));
  goScreen('screen-concerns');
}
function startQuick(){
  state.mode='quick';
  state.uploadedImage=null;
  state.quickSpreadId=null;
  state.spreadId=null;
  state.narrative='';
  state.readingUsageRecorded=false;
  state.currentReadingId='';
  state.cards={};
  state.droppedCard=null;
  state.hasDroppedCard=false;
  state.cardSystem='tarot';
  state.concerns=[];
  state.cardSystemEstablished=false;
  currentCards=getCards();
  state.readerLifeStage='';
  document.getElementById('quick-results').innerHTML='';
  document.getElementById('quick-concern').value='';
  const lifeStage=document.getElementById('quick-reader-life-stage');
  if(lifeStage)lifeStage.value='';
  const zone=document.getElementById('quick-upload-zone');
  zone.classList.remove('has-image');
  zone.innerHTML='<span class="upload-zone-copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6.6" width="18" height="13" rx="2.6"/><circle cx="12" cy="13.1" r="3.4"/><path d="M8.4 6.6 9.6 4.4h4.8L15.6 6.6"/></svg>Click or drag a photo of your spread<span style="font-size:11px">JPG, PNG, WEBP</span></span>';
  document.getElementById('quick-go').style.display='none';
  syncUploadDeckSelectors();
  renderQuickSpreads();
  goScreen('screen-quick');
}

// ===== CONCERNS =====
function addConcern(){
  const list=document.getElementById('concern-list');
  const row=document.createElement('div');
  row.className='concern-row';
  const inputId='concern-input-'+(document.querySelectorAll('.concern-input').length+1);
  row.innerHTML='<label class="sr-only" for="'+inputId+'">Question or focus</label><input id="'+inputId+'" type="text" placeholder="Another question or focus" class="concern-input"><button type="button" class="btn btn-sm btn-danger" onclick="removeConcern(this)" title="Remove focus">&times;</button>';
  list.appendChild(row);
}
function removeConcern(btn){
  const rows=document.querySelectorAll('.concern-row');
  if(rows.length>1)btn.parentElement.remove();
}
function tagConcern(el){
  el.classList.toggle('active');
  const inputs=document.querySelectorAll('.concern-input');
  for(const inp of inputs){
    if(!inp.value){inp.value=el.textContent;return;}
  }
  addConcern();
  const last=document.querySelectorAll('.concern-input');
  last[last.length-1].value=el.textContent;
}
function saveConcerns(){
  state.concerns=[];
  document.querySelectorAll('.concern-input').forEach(inp=>{
    if(inp.value.trim())state.concerns.push(inp.value.trim());
  });
  goScreen('screen-card-system');
}

// ===== CARD SYSTEM =====
function selectSystem(sys,el){
  state.cardSystem=sys;
  state.cardSystemEstablished=true;
  document.querySelectorAll('#screen-card-system .card-opt').forEach(c=>c.classList.remove('selected'));
  if(el)el.classList.add('selected');
  document.querySelectorAll('#screen-card-system .card-opt').forEach(c=>c.setAttribute('aria-pressed',String(c===el)));
  currentCards=getCards();
  syncUploadDeckSelectors();
}
function confirmSystem(){
  if(!state.cardSystem){showToast('Choose a deck before continuing.');return;}
  state.cardSystemEstablished=true;
  currentCards=getCards();
  syncUploadDeckSelectors();
  goScreen('screen-spread');
}

// ===== SPREADS =====
const ACTIVE_SPREAD_IDS=['one-card','three-card','six-card','celtic-cross','romany','yearly','two-pathways','relationship'];

function renderSpreads(){
  const grid=document.getElementById('spread-grid');
  grid.innerHTML='';
  const catOrder=['Daily','Classic','Relationships','Life & Decisions','Custom'];
  catOrder.forEach(cat=>{
    const catSpreads=SPREADS.filter(sp=>sp.category===cat);
    if(!catSpreads.length)return;
    const lbl=document.createElement('div');
    lbl.className='spread-cat-label';
    lbl.textContent=cat;
    grid.appendChild(lbl);
    catSpreads.forEach(sp=>{
      const card=document.createElement('button');
      card.type='button';
      card.className='spread-card'+(state.spreadId===sp.id?' selected':'');
      card.setAttribute('aria-pressed',String(state.spreadId===sp.id));
      card.onclick=()=>{selectSpread(sp.id,card)};
      card.innerHTML=`<h4>${escapeHtml(sp.name)}</h4><div class="count">${sp.id==='custom'?'Custom positions':(sp.cardCount===1?'1 card':sp.cardCount+' cards')}</div>`;
      grid.appendChild(card);
    });
  });
}
function selectSpread(id,el){
  state.spreadId=id;
  document.querySelectorAll('.spread-card').forEach(c=>{c.classList.remove('selected');c.setAttribute('aria-pressed','false');});
  el.classList.add('selected');
  el.setAttribute('aria-pressed','true');
  document.getElementById('custom-spread-form').style.display=id==='custom'?'block':'none';
}
function buildCustomPositions(){
  const n=parseInt(document.getElementById('custom-count').value)||3;
  const spread=SPREADS.find(s=>s.id==='custom');
  spread.cardCount=n;
  spread.positions=[];
  const container=document.getElementById('custom-positions');
  container.innerHTML='';
  for(let i=1;i<=n;i++){
    spread.positions.push({id:i,name:`Position ${i}`,description:''});
    const row=document.createElement('div');
    row.style.cssText='margin-bottom:6px';
    row.innerHTML=`<input type="text" placeholder="Position ${i} name" style="width:100%" onchange="SPREADS.find(s=>s.id==='custom').positions[${i-1}].name=this.value;SPREADS.find(s=>s.id==='custom').positions[${i-1}].description=this.value">`;
    container.appendChild(row);
  }
}
function confirmSpread(){
  if(!state.spreadId){showToast('Choose a spread before continuing.');return;}
  saveReaderContext('reader-life-stage');
  goScreen('screen-reflection');
}

function saveReaderContext(lifeStageId){
  const stageEl=document.getElementById(lifeStageId);
  state.readerLifeStage=stageEl?stageEl.value.trim():'';
}

// ===== READING TYPE SELECTION =====
function selectReadingType(id, el){
  if(PREMIUM_SPREAD_IDS.includes(id) && !requestPremiumFeature('advanced-spreads')) return;
  document.querySelectorAll('.reading-choice-card').forEach(c=>c.classList.remove('selected'));
  document.querySelectorAll('.reading-choice-card').forEach(c=>c.setAttribute('aria-pressed','false'));
  el.classList.add('selected');
  el.setAttribute('aria-pressed','true');
  const spread=SPREADS.find(s=>s.id===id);
  if(spread){state.spreadId=id;}
}

function toggleAdvancedReadings(){
  const panel=document.getElementById('advanced-readings-panel');
  const arrow=document.getElementById('adv-arrow');
  if(panel.style.display==='none'){
    panel.style.display='block';
    arrow.textContent='▲';
  }else{
    panel.style.display='none';
    arrow.textContent='▼';
  }
  document.querySelector('.advanced-readings-toggle')?.setAttribute('aria-expanded',String(panel.style.display!=='none'));
}

function confirmReflection(){
  if(!state.cards||typeof state.cards!=='object')state.cards={};
  state.guidedStep=0;
  buildCardEntry();
  goScreen('screen-card-entry');
}

// ===== PROGRESS ESTIMATE =====
function updateProgressEstimate(screenId){
  const steps=GUIDED_SCREENS;
  const idx=steps.indexOf(screenId);
  if(idx<0)return;
  const total=steps.length;
  const remaining=total-idx-1;
  const minsPerStep=1;
  const minsLeft=remaining*minsPerStep;
  const text='Step '+(idx+1)+' of '+total+(minsLeft>0?'  - About '+minsLeft+' minute'+(minsLeft>1?'s':'')+' remaining':'');
  const el=document.getElementById('progress-'+screenId.replace('screen-',''));
  if(el)el.textContent=text;
}

// ===== SOCIAL SHARING =====
function getReadingSpread(){
  return SPREADS.find(s=>s.id===(state.mode==='quick'?(state.quickSpreadId||state.spreadId):state.spreadId));
}

function replaceIdentifiedSpreadCards(spread,identified){
  const allowedPositions=new Set(spread.positions.map(pos=>String(pos.id)));
  Object.keys(state.cards||{}).forEach(position=>{
    if(!allowedPositions.has(String(position)))delete state.cards[position];
  });
  spread.positions.forEach(pos=>{
    delete state.cards[pos.id];
  });
  Object.entries(identified||{}).forEach(([position,entry])=>{
    if(allowedPositions.has(String(position)))state.cards[position]=entry;
  });
}

function getCardSystemPromptGuide(cardSystem,allowDetection){
  if(allowDetection){
    return `The photograph contains one physical deck. Before naming any card, classify the entire deck as traditional tarot or standard playing cards and use that one system consistently.
Ignore spread-position numbers, printed diagram markers, labels, and decorative numerals. They are not card identities. Never choose a tarot card merely to represent a visible number.
If tarot, use standard Rider-Waite-Smith names.
If playing cards, preserve the printed rank and suit: Ace through Ten, Jack, Queen, or King of Hearts, Diamonds, Clubs, or Spades. Never rename playing cards as Cups, Pentacles, Wands, Swords, Pages, Knights, or Major Arcana cards. If a playing card is unclear, return null instead of guessing a tarot equivalent.`;
  }
  if(cardSystem==='tarot'){
    return 'This is a traditional tarot deck. Use standard Rider-Waite-Smith card names only. Ignore spread-position numbers and diagram labels; they are not card identities.';
  }
  return 'This is a standard playing-card deck used for cartomancy. Identify only Ace through Ten, Jack, Queen, or King of Hearts, Diamonds, Clubs, or Spades. Preserve the printed rank and suit. Ignore spread-position numbers and diagram labels; they are not cards. Never substitute Cups, Pentacles, Wands, Swords, Pages, Knights, or Major Arcana cards. If a card is unclear, return null instead of guessing a tarot equivalent.';
}

function syncUploadDeckSelectors(){
  const activeSystem=state.cardSystemEstablished
    ? (state.cardSystem==='tarot'?'tarot':'playing')
    : 'auto';
  document.querySelectorAll('.upload-deck-selector .upload-deck-option').forEach(button=>{
    const active=button.dataset.cardSystem===activeSystem;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });

  const noun=activeSystem==='playing'?'Playing Cards':(activeSystem==='tarot'?'Tarot Cards':'Cards');
  const identifyButton=document.getElementById('identify-btn');
  const guidedButton=document.getElementById('guided-identify-btn');
  const quickButton=document.getElementById('quick-go');
  if(identifyButton)identifyButton.innerHTML=GLYPH.star4+` Identify ${noun} with AI`;
  if(guidedButton)guidedButton.innerHTML=GLYPH.star4+` Identify ${noun} with AI`;
  if(quickButton)quickButton.innerHTML=GLYPH.star4+` Generate My ${activeSystem==='playing'?'Cartomancy ':''}Reading`;
}

function selectUploadCardSystem(choice){
  const selected=choice==='tarot'||choice==='playing'?choice:'auto';
  const nextSystem=selected==='auto'?'tarot':selected;
  const changesDeck=selected==='auto'||nextSystem!==state.cardSystem||!state.cardSystemEstablished;
  if(changesDeck&&hasSelectedReadingCards()){
    const ok=confirm('Changing the uploaded-photo deck will clear cards already identified for this reading. Continue?');
    if(!ok)return false;
    state.cards={};
    state.droppedCard=null;
    state.hasDroppedCard=false;
    const dropToggle=document.getElementById('drop-toggle');
    if(dropToggle){dropToggle.classList.remove('on');dropToggle.setAttribute('aria-pressed','false');}
    const dropEntry=document.getElementById('drop-card-entry');
    if(dropEntry)dropEntry.style.display='none';
  }
  state.cardSystem=nextSystem;
  state.cardSystemEstablished=selected!=='auto';
  currentCards=getCards();
  syncUploadDeckSelectors();
  const spread=getReadingSpread();
  if(spread&&document.getElementById('manual-entries'))buildManualEntries(spread);
  autoSaveState();
  return true;
}

function shouldDetectCardSystem(){
  return !state.cardSystemEstablished;
}

function getIdentificationCardReferences(allowDetection){
  if(allowDetection){
    return [...TAROT_CARDS,...buildPlayingCards(false)];
  }
  return currentCards;
}

function establishDetectedCardSystem(identified){
  const tarotNames=new Set(TAROT_CARDS.map(card=>card.name.toLowerCase()));
  const playingNames=new Set(buildPlayingCards(false).map(card=>card.name.toLowerCase()));
  const detectedSystems=new Set();
  Object.values(identified||{}).forEach(entry=>{
    const name=String(entry&&entry.name||'').toLowerCase();
    if(tarotNames.has(name))detectedSystems.add('tarot');
    if(playingNames.has(name))detectedSystems.add('playing');
  });
  if(detectedSystems.size>1){
    throw new Error('Validated results contain multiple card systems. Please review the cards manually');
  }
  if(!detectedSystems.size)return false;
  state.cardSystem=[...detectedSystems][0];
  state.cardSystemEstablished=true;
  currentCards=getCards();
  syncUploadDeckSelectors();
  return true;
}

function validateIdentificationResult(identified){
  if(!Object.keys(identified||{}).length){
    throw new Error('No valid cards were identified. Please review the spread manually');
  }
  return identified;
}

function migrateRestoredCardSystemState(savedState){
  if(savedState && typeof savedState.cardSystemEstablished==='boolean'){
    state.cardSystemEstablished=savedState.cardSystemEstablished;
    currentCards=getCards();
    return state.cardSystemEstablished;
  }
  const knownNames=new Set(getCards().map(card=>card.name.toLowerCase()));
  const selected=Object.values(state.cards||{});
  if(state.droppedCard)selected.push(state.droppedCard);
  state.cardSystemEstablished=selected.length>0 && selected.every(entry=>
    knownNames.has(String(entry&&entry.name||'').toLowerCase())
  );
  currentCards=getCards();
  return state.cardSystemEstablished;
}

function getQuickPatternAnalysisGuide(cardSystem,allowDetection){
  if(allowDetection){
    return 'Keep pattern analysis consistent with the detected system: tarot may discuss Major Arcana, Minor Arcana suits, reversals, courts, and interactions; playing cards should discuss suits, repeated ranks, court patterns, reversals, and interactions, and must not discuss Major Arcana.';
  }
  if(cardSystem==='tarot'){
    return 'Dominant suits, Major Arcana presence, Minor Arcana patterns, reversals, courts, and key interactions';
  }
  return 'Playing-card suits, repeated ranks, court patterns, reversals, and key interactions. Do not discuss Major Arcana';
}

function getAppShareUrl(){
  return 'https://www.arcanaguide.com';
}

function getSharePayload(){
  const spread=getReadingSpread();
  const positions=(spread&&spread.positions)||[];
  let cardEntries=Object.entries(state.cards||{}).sort((a,b)=>Number(a[0])-Number(b[0]));
  if(!cardEntries.length && state.narrative){
    const found=currentCards
      .map(card=>({card,idx:String(state.narrative).toLowerCase().indexOf(card.name.toLowerCase())}))
      .filter(item=>item.idx>=0)
      .sort((a,b)=>a.idx-b.idx)
      .slice(0,(spread&&spread.cardCount)||12);
    cardEntries=found.map((item,i)=>[String(i+1),{name:item.card.name,orientation:'upright'}]);
  }
  return {
    title:spread?`Arcana - ${spread.name}`:'Arcana Reading',
    text:state.narrative||'',
    spreadName:spread?spread.name:'Reading',
    layout:spread?spread.layout:'grid',
    cardCount:spread?spread.cardCount:0,
    appUrl:getAppShareUrl(),
    cards:cardEntries.map(([pos,entry])=>{
      const card=currentCards.find(c=>c.name.toLowerCase()===String(entry.name||'').toLowerCase());
      const position=positions.find(p=>String(p.id)===String(pos));
      return {
        pos,
        positionName:position?position.name:'',
        name:entry.name,
        orientation:entry.orientation||'upright',
        artUrl:card&&typeof getCardArtUrl==='function'?getCardArtUrl(card,320):'',
        system:card&&card.system?card.system:'',
        suit:card&&card.suit?card.suit:'',
        arcana:card&&card.arcana?card.arcana:'',
        number:card&&card.number?card.number:0
      };
    })
  };
}

function shareReading(){
  showShareModal(getSharePayload());
}

function printReading(){
  const source=[document.getElementById('reading-content'),document.getElementById('quick-reading-content')]
    .find(el=>el&&el.innerText.trim());
  if(!source || !source.innerText.trim()){
    showToast('No reading text is ready to print.');
    return;
  }
  const spread=getReadingSpread();
  const title=spread?spread.name:'Arcana Reading';
  document.querySelectorAll('.print-frame').forEach(el=>el.remove());
  const frame=document.createElement('iframe');
  frame.className='print-frame';
  frame.setAttribute('aria-hidden','true');
  frame.srcdoc=`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    @page{margin:14mm}
    *{box-sizing:border-box}
    body{margin:0;color:#111;background:#fff;font-family:Georgia,'Times New Roman',serif}
    .print-reading-frame{border:1.5px solid #222;padding:16px;overflow:visible}
    h1{font-family:Georgia,'Times New Roman',serif;font-size:20pt;line-height:1.2;margin:0 0 14px;padding-bottom:8px;border-bottom:1px solid #999}
    .reading-summary-card,.journal-section,.no-print{display:none!important}
    .reading-section{display:block;break-inside:auto;page-break-inside:auto;margin:0 0 14px;padding:0;overflow:visible}
    .reading-section h3{display:block;color:#111;border-bottom:1px solid #ccc;font-size:16pt;line-height:1.25;margin:0 0 8px;padding:0 0 5px}
    .reading-section h3::before{display:none!important}
    .reading-section p,.reading-section li{color:#222;font-size:11.5pt;line-height:1.48;margin:0 0 7px;overflow:visible}
    .reading-section ul{padding-left:18px;list-style:disc}
    .reading-section li{padding-left:0}
    .reading-section li::before{display:none!important}
    strong{font-weight:700} em{font-style:italic}
  </style></head><body><main class="print-reading-frame"><h1>${escapeHtml(title)}</h1>${source.innerHTML}</main></body></html>`;
  const cleanup=()=>{
    frame.remove();
    window.removeEventListener('afterprint',cleanup);
  };
  window.addEventListener('afterprint',cleanup);
  frame.onload=()=>{
    const win=frame.contentWindow;
    if(!win)return;
    win.addEventListener('afterprint',cleanup);
    win.focus();
    win.print();
  };
  document.body.appendChild(frame);
}
function showShareModal(data){
  let modal=document.getElementById('share-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='share-modal';
    modal.className='share-modal-overlay';
    modal.setAttribute('aria-hidden','true');
    modal.addEventListener('click',e=>{if(e.target===modal)closeShareModal();});
    document.body.appendChild(modal);
  }
  modal.innerHTML=`<div class="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
    <button class="close-btn" onclick="closeShareModal()" aria-label="Close share options">&times;</button>
    <h3 id="share-title">Share Your Spread</h3>
    <label class="share-label" for="share-comment">Comment</label>
    <textarea id="share-comment" maxlength="180" placeholder="The cards found me at the right moment." oninput="updateSharePreview()"></textarea>
    <canvas id="share-canvas" width="600" height="800"></canvas>
    <div class="share-platforms">
      <button class="btn btn-sm" onclick="openSocialShare('facebook')">Facebook</button>
      <button class="btn btn-sm" onclick="openSocialShare('line')">LINE</button>
      <button class="btn btn-sm" onclick="openSocialShare('x')">X</button>
      <button class="btn btn-sm" onclick="openSocialShare('whatsapp')">WhatsApp</button>
      <button class="btn btn-sm" onclick="openSocialShare('threads')">Threads</button>
    </div>
  </div>`;
  modal.querySelector('#share-comment').value=defaultShareComment();
  activateDialog(modal,document.activeElement);
  modal.dataset.sharePayload=JSON.stringify(data);
  updateSharePreview();
}
function closeShareModal(){
  const modal=document.getElementById('share-modal');
  if(modal)deactivateDialog(modal);
}
function currentShareData(){
  const modal=document.getElementById('share-modal');
  if(!modal || !modal.dataset.sharePayload)return getSharePayload();
  try{return JSON.parse(modal.dataset.sharePayload);}catch(e){return getSharePayload();}
}

function defaultShareComment(){
  return 'The cards found me at the right moment.';
}

function getShareComment(){
  return (document.getElementById('share-comment')?.value||defaultShareComment()).trim()||defaultShareComment();
}

function getShareCaption(){
  const data=currentShareData();
  const comment=getShareComment();
  return [comment, `Try Arcana: ${data.appUrl}`].filter(Boolean).join('\n\n');
}

function openSocialShare(platform){
  const data=currentShareData();
  const caption=getShareCaption();
  const encodedUrl=encodeURIComponent(data.appUrl);
  const encodedText=encodeURIComponent(caption);
  const urls={
    facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    line:`https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedText}`,
    x:`https://twitter.com/intent/tweet?text=${encodedText}`,
    whatsapp:`https://api.whatsapp.com/send?text=${encodedText}`,
    threads:`https://www.threads.net/intent/post?text=${encodedText}`
  };
  const url=urls[platform];
  if(url)window.open(url,'_blank','noopener,noreferrer');
}

function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines){
  const words=String(text||'').split(/\s+/).filter(Boolean);
  let line='',lines=0;
  for(const word of words){
    const test=line?line+' '+word:word;
    if(ctx.measureText(test).width>maxWidth&&line){
      ctx.fillText(line,x,y);y+=lineHeight;lines++;line=word;
      if(maxLines&&lines>=maxLines)return y;
    }else line=test;
  }
  if(line&&(!maxLines||lines<maxLines)){ctx.fillText(line,x,y);y+=lineHeight;}
  return y;
}

function loadShareImage(url){
  return new Promise(resolve=>{
    if(!url){resolve(null);return;}
    const img=new Image();
    img.crossOrigin='anonymous';
    img.onload=()=>resolve(img);
    img.onerror=()=>resolve(null);
    img.src=url;
  });
}

function drawRoundedRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function drawCoverImage(ctx,img,x,y,w,h){
  const scale=Math.max(w/img.width,h/img.height);
  const sw=w/scale,sh=h/scale;
  const sx=(img.width-sw)/2,sy=(img.height-sh)/2;
  ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}

function getShareSlots(data){
  const n=(data.cards||[]).length;
  const frame={x:42,y:112,w:516,h:414};
  if(!n)return [];
  const make=(pos,x,y,w,h)=>({pos,x:frame.x+x*frame.w,y:frame.y+y*frame.h,w:w*frame.w,h:h*frame.h});
  if(data.layout==='row'||n<=3){
    const gap=.035;
    const w=Math.min(.24,(1-gap*(n-1))/Math.max(n,1));
    const total=w*n+gap*(n-1);
    const start=(1-total)/2;
    return data.cards.map((_,i)=>make(i,start+i*(w+gap),.18,w,.64));
  }
  if(data.layout==='celtic-simple'&&n>=6){
    return [
      make(0,.42,.30,.16,.36),make(1,.39,.47,.22,.22),make(2,.42,.66,.16,.30),
      make(3,.42,.02,.16,.30),make(4,.18,.30,.16,.36),make(5,.66,.30,.16,.36)
    ];
  }
  if(data.layout==='celtic'&&n>=10){
    return [
      make(0,.28,.36,.13,.28),make(1,.27,.46,.16,.14),make(2,.28,.68,.13,.28),make(3,.11,.36,.13,.28),make(4,.28,.04,.13,.28),make(5,.45,.36,.13,.28),
      make(6,.74,.68,.13,.28),make(7,.74,.46,.13,.28),make(8,.74,.24,.13,.28),make(9,.74,.02,.13,.28)
    ];
  }
  if(data.layout==='yearly'&&n>=12){
    const cx=.5,cy=.5,r=.38,w=.105,h=.23;
    return data.cards.map((_,i)=>{
      const angle=Math.PI+i*(Math.PI*2/n);
      return make(i,cx+Math.cos(angle)*r-w/2,cy+Math.sin(angle)*r-h/2,w,h);
    });
  }
  if(data.layout==='romany'&&n>=21){
    const slots=[];
    const w=.105,h=.25,gx=.03,gy=.035,startX=(1-(w*7+gx*6))/2,startY=.09;
    for(let col=0;col<7;col++){
      for(let row=0;row<3;row++){
        const idx=col*3+row;
        slots.push(make(idx,startX+col*(w+gx),startY+row*(h+gy),w,h));
      }
    }
    return slots;
  }
  if(data.layout==='two-pathways'&&n>=14){
    return [
      make(0,.43,.02,.14,.27),make(1,.43,.33,.14,.27),
      make(2,.18,.18,.13,.25),make(3,.69,.18,.13,.25),
      make(4,.08,.46,.13,.25),make(5,.25,.46,.13,.25),
      make(6,.62,.46,.13,.25),make(7,.79,.46,.13,.25),
      make(8,.08,.72,.13,.25),make(9,.25,.72,.13,.25),
      make(10,.62,.72,.13,.25),make(11,.79,.72,.13,.25),
      make(12,.18,.02,.13,.25),make(13,.69,.02,.13,.25)
    ];
  }
  if(data.layout==='relationship'&&n>=15){
    return [
      make(0,.10,.22,.11,.24),make(1,.24,.22,.11,.24),make(2,.38,.22,.11,.24),
      make(3,.51,.22,.11,.24),make(4,.65,.22,.11,.24),make(5,.79,.22,.11,.24),
      make(6,.18,.02,.11,.24),make(7,.71,.02,.11,.24),
      make(8,.18,.48,.11,.24),make(9,.71,.48,.11,.24),
      make(10,.18,.74,.11,.24),make(11,.71,.74,.11,.24),
      make(12,.32,.74,.13,.24),make(13,.55,.74,.13,.24),
      make(14,.445,.48,.11,.24)
    ];
  }
  const cols=Math.min(5,Math.max(2,Math.ceil(Math.sqrt(n))));
  const rows=Math.ceil(n/cols);
  const gap=.025;
  const w=(.88-gap*(cols-1))/cols;
  const h=Math.min(.25,(.82-gap*(rows-1))/rows);
  const startX=(1-(w*cols+gap*(cols-1)))/2;
  const startY=(1-(h*rows+gap*(rows-1)))/2;
  return data.cards.map((_,i)=>make(i,startX+(i%cols)*(w+gap),startY+Math.floor(i/cols)*(h+gap),w,h));
}

function drawShareCardFallback(ctx,card,x,y,w,h){
  drawRoundedRect(ctx,x,y,w,h,10);
  ctx.fillStyle='#f4ead8';ctx.fill();
  ctx.strokeStyle='#c8aa70';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#1f2b33';ctx.font='700 14px Arial, sans-serif';ctx.textAlign='center';
  ctx.fillText(card.pos,x+w/2,y+22);
  ctx.font='12px Arial, sans-serif';
  wrapCanvasText(ctx,card.name,x+8,y+h*.45,w-16,15,3);
}

function getPlayingRankLabel(card){
  if(!card)return '';
  if(/joker/i.test(card.name||''))return 'JOKER';
  const labels={1:'A',11:'J',12:'Q',13:'K'};
  return labels[card.number]||String(card.number||'');
}

function getPlayingSuitLabel(card){
  const suit=String(card&&card.suit||'').toLowerCase();
  return {hearts:'♥',diamonds:'♦',clubs:'♣',spades:'♠'}[suit]||'';
}

function drawSharePlayingCard(ctx,card,x,y,w,h){
  const rank=getPlayingRankLabel(card);
  const suit=getPlayingSuitLabel(card);
  const isRed=card.suit==='hearts'||card.suit==='diamonds';
  const ink=isRed?'#b62934':'#17212a';
  drawRoundedRect(ctx,x,y,w,h,10);
  ctx.fillStyle='#fffaf0';ctx.fill();
  ctx.strokeStyle='#d5b56f';ctx.lineWidth=2;ctx.stroke();
  drawRoundedRect(ctx,x+5,y+5,w-10,h-10,7);
  ctx.strokeStyle='rgba(31,43,51,.18)';ctx.lineWidth=1;ctx.stroke();

  ctx.fillStyle=ink;
  ctx.textAlign='center';
  ctx.font=`700 ${Math.max(11,Math.round(w*.25))}px Georgia, serif`;
  ctx.fillText(rank,x+w*.18,y+h*.19);
  ctx.font=`700 ${Math.max(14,Math.round(w*.31))}px Georgia, serif`;
  ctx.fillText(suit,x+w*.18,y+h*.34);

  ctx.save();
  ctx.translate(x+w*.82,y+h*.81);
  ctx.rotate(Math.PI);
  ctx.font=`700 ${Math.max(11,Math.round(w*.25))}px Georgia, serif`;
  ctx.fillText(rank,0,0);
  ctx.font=`700 ${Math.max(14,Math.round(w*.31))}px Georgia, serif`;
  ctx.fillText(suit,0,h*.15);
  ctx.restore();

  if(rank==='JOKER'){
    ctx.font=`700 ${Math.max(13,Math.round(w*.22))}px Georgia, serif`;
    wrapCanvasText(ctx,'JOKER',x+w*.12,y+h*.46,w*.76,Math.max(14,h*.13),2);
    return;
  }

  ctx.font=`700 ${Math.max(26,Math.round(w*.58))}px Georgia, serif`;
  ctx.fillText(suit,x+w/2,y+h*.54);
  ctx.font=`700 ${Math.max(13,Math.round(w*.22))}px Arial, sans-serif`;
  ctx.fillText(rank,x+w/2,y+h*.74);
}

async function drawShareSpread(ctx,data){
  drawRoundedRect(ctx,42,112,516,414,16);
  ctx.fillStyle='rgba(255,255,255,.055)';ctx.fill();
  ctx.strokeStyle='rgba(198,170,115,.38)';ctx.lineWidth=1.5;ctx.stroke();
  const slots=getShareSlots(data);
  await Promise.all(slots.map(async slot=>{
    const card=data.cards[slot.pos];
    if(!card)return;
    ctx.save();
    if(card.orientation==='reversed'){
      ctx.translate(slot.x+slot.w/2,slot.y+slot.h/2);
      ctx.rotate(Math.PI);
      ctx.translate(-(slot.x+slot.w/2),-(slot.y+slot.h/2));
    }
    const img=await loadShareImage(card.artUrl);
    if(img){
      drawRoundedRect(ctx,slot.x,slot.y,slot.w,slot.h,9);
      ctx.fillStyle='#f7f0e4';ctx.fill();
      ctx.save();
      drawRoundedRect(ctx,slot.x+3,slot.y+3,slot.w-6,slot.h-6,7);
      ctx.clip();
      drawCoverImage(ctx,img,slot.x+3,slot.y+3,slot.w-6,slot.h-6);
      ctx.restore();
      ctx.strokeStyle='#d5b56f';ctx.lineWidth=2;drawRoundedRect(ctx,slot.x,slot.y,slot.w,slot.h,9);ctx.stroke();
    }else if(card.system==='playing'){
      drawSharePlayingCard(ctx,card,slot.x,slot.y,slot.w,slot.h);
    }else{
      drawShareCardFallback(ctx,card,slot.x,slot.y,slot.w,slot.h);
    }
    ctx.restore();
    ctx.fillStyle='#f3eadb';ctx.font='700 12px Arial, sans-serif';ctx.textAlign='center';
    ctx.fillText(card.pos,slot.x+slot.w/2,slot.y-5);
  }));
}

async function renderShareCanvas(data){
  const canvas=document.getElementById('share-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const comment=getShareComment();
  ctx.fillStyle='#111a20';ctx.fillRect(0,0,600,800);
  const grd=ctx.createLinearGradient(0,0,600,800);
  grd.addColorStop(0,'#152b34');grd.addColorStop(.55,'#111826');grd.addColorStop(1,'#24172c');
  ctx.fillStyle=grd;ctx.fillRect(0,0,600,800);
  ctx.fillStyle='#f3eadb';ctx.font='700 34px Georgia, serif';ctx.textAlign='left';
  ctx.fillText('Arcana',42,58);
  ctx.font='15px Arial, sans-serif';ctx.fillStyle='#9dc7c9';
  ctx.fillText(data.spreadName||data.spread||'Card Spread',42,84);
  await drawShareSpread(ctx,data);
  drawShareFooter(ctx,data,comment);
}

function drawShareFooter(ctx,data,comment){
  ctx.textAlign='left';
  ctx.fillStyle='#f3eadb';ctx.font='700 24px Georgia, serif';
  ctx.fillText('A message from the cards',42,590);
  ctx.fillStyle='#d8cdbd';ctx.font='18px Georgia, serif';
  wrapCanvasText(ctx,comment,42,624,516,26,4);
  ctx.fillStyle='#9dc7c9';ctx.font='15px Arial, sans-serif';
  ctx.fillText('Try your own reading:',42,724);
  ctx.fillStyle='#f3eadb';ctx.font='700 18px Arial, sans-serif';
  ctx.fillText(data.appUrl||getAppShareUrl(),42,752);
}

function updateSharePreview(){
  renderShareCanvas(currentShareData());
}


// ===== ENHANCED READING =====
function enhanceReadingOutput(){
  const content=document.getElementById('reading-content');
  if(!content||content.querySelector('.reading-summary-card'))return;
  const spread=SPREADS.find(s=>s.id===state.spreadId);
  const entries=Object.values(state.cards);
  const cardNames=entries.map(c=>c.name||'').filter(Boolean);
  const cardObjects=entries.map(entry=>currentCards.find(c=>c.name.toLowerCase()===(entry.name||'').toLowerCase())).filter(Boolean);
  const hasMajor=cardObjects.some(c=>c.arcana==='major')||cardNames.some(n=>/^(The |Wheel|Justice|Judgement|Strength|Death|Temperance)/.test(n));
  const reversedCount=entries.filter(c=>c.orientation==='reversed').length;
  const suitCounts={};
  cardObjects.forEach(c=>{if(c.suit)suitCounts[c.suit]=(suitCounts[c.suit]||0)+1;});
  const dominantSuit=Object.entries(suitCounts).sort((a,b)=>b[1]-a[1])[0];
  const themes=['Decision Making','Self Trust','New Opportunities'];
  if(state.concerns.length)themes.unshift(state.concerns[0]);
  if(hasMajor)themes.push('Major Arcana Influence');
  if(dominantSuit)themes.push(dominantSuit[0].charAt(0).toUpperCase()+dominantSuit[0].slice(1)+' Focus');
  let h='<div class="reading-summary-card">';
  h+='<h3 class="summary-title">Summary</h3>';
  h+='<p class="summary-copy">'+escapeHtml(spread?spread.name:'Your reading')+' with '+cardNames.length+' card'+(cardNames.length===1?'':'s')+' drawn. Review the key themes first, then continue into the full reading.</p>';
  h+='<div class="summary-meta">';
  h+='<span class="summary-cards">'+escapeHtml(spread?spread.name:'Reading')+'</span>';
  if(state.readerLifeStage)h+='<span class="major-badge">'+escapeHtml(state.readerLifeStage)+'</span>';
  if(hasMajor)h+='<span class="major-badge">Major Arcana Present</span>';
  if(reversedCount)h+='<span class="major-badge">'+reversedCount+' Reversed</span>';
  h+='</div>';
  h+='<h4 class="summary-subtitle">Key Themes</h4>';
  h+='<div class="summary-themes">'+themes.slice(0,5).map(t=>'<span class="theme-tag">'+escapeHtml(t)+'</span>').join('')+'</div>';
  h+='<p class="ai-disclaimer">AI-assisted readings are for reflection and personal insight only. They are not professional medical, legal, financial, mental-health, or crisis advice.</p>';
  h+='<h4 class="summary-subtitle">Full Reading</h4>';
  h+='</div>';
  content.insertAdjacentHTML('afterbegin',h);
}

// ===== CARD ENTRY =====
function switchTab(tabId,btn){
  ['tab-guided','tab-upload','tab-manual'].forEach(t=>{
    const panel=document.getElementById(t);
    if(panel){panel.style.display='none';panel.hidden=true;}
  });
  const panel=document.getElementById(tabId);
  if(panel){panel.style.display='block';panel.hidden=false;}
  document.querySelectorAll('.tab-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false');});
  btn.classList.add('active');
  btn.setAttribute('aria-selected','true');
}
document.addEventListener('keydown',e=>{
  if(!e.target.matches('.tab-btn')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  const tabs=[...document.querySelectorAll('.tab-btn')];
  const current=tabs.indexOf(e.target);
  if(current<0)return;
  e.preventDefault();
  const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(current+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  const tab=tabs[next];
  tab.focus();
  switchTab(tab.getAttribute('aria-controls'),tab);
});

function buildCardEntry(){
  const spread=getSpread();
  if(!spread)return;
  buildGuidedDraw(spread);
  buildManualEntries(spread);
}

// Guided card-by-card placement
const GUIDED_PROMPTS=[
  'Take a breath and clear your mind…',
  'Focus on your question…',
  'Let your intuition guide your hand…',
  'Draw from wherever feels right…',
  'Trust the card that presents itself…',
  'The cards speak to those who listen…',
  'Let the energy of the deck flow through you…',
  'Close your eyes for a moment, then draw…',
  'The next card is ready to reveal itself…',
  'Almost there  - this card holds deep meaning…'
];

function buildGuidedDraw(spread){
  state.guidedStep=0;
  renderGuidedRitual(spread);
}

function renderSpreadDiagram(spread,activeIdx){
  const n=spread.positions.length;
  // Build rows based on spread layout
  let rows=[];
  if(spread.layout==='row'||n<=3){
    rows=[spread.positions.map((_,i)=>i)];
  }else if(spread.layout==='celtic'){
    const ms=(idx)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot ${cls}"><div class="slot-num">${pos.id}</div><div class="slot-label">${escapeHtml(pos.name)}</div></div>`;};
    return`<div class="spread-diagram celtic-layout"><div class="celtic-cross"><div class="spread-row">${ms(4)}</div><div class="spread-row">${ms(3)}${ms(0)}${ms(1)}${ms(5)}</div><div class="spread-row">${ms(2)}</div></div><div class="celtic-staff">${ms(9)}${ms(8)}${ms(7)}${ms(6)}</div></div>`;
  }else if(spread.layout==='celtic-simple'){
    const ms=(idx,wide)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot ${cls}${wide?' slot-wide':''}"><div class="slot-num">${pos.id}</div><div class="slot-label">${escapeHtml(pos.name)}</div></div>`;};
    return`<div class="spread-diagram celtic-simple-layout"><div class="spread-row">${ms(3)}</div><div class="spread-row">${ms(4)}${ms(0)}${ms(5)}</div><div class="spread-row">${ms(1,true)}</div><div class="spread-row">${ms(2)}</div></div>`;
  }else if(spread.layout==='yearly'){
    const ms=(idx)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot clock-slot clock-${pos.id} ${cls}"><div class="slot-num">${pos.id}</div><div class="slot-label">${escapeHtml(pos.name)}</div></div>`;};
    return`<div class="spread-diagram yearly-clock-layout">${spread.positions.map((_,i)=>ms(i)).join('')}</div>`;
  }else if(spread.layout==='romany'){
    const ms=(idx)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot ${cls}"><div class="slot-num">${pos.id}</div><div class="slot-label">${escapeHtml(pos.name)}</div></div>`;};
    const mkCol=(label,...idxs)=>`<div class="romany-col"><div class="romany-col-label">${label}</div>${idxs.map(ms).join('')}</div>`;
    return`<div class="spread-diagram romany-layout">${mkCol('Emotion',0,1,2)}${mkCol('Relationships',3,4,5)}${mkCol('Hopes & Career',6,7,8)}${mkCol('Finances',9,10,11)}${mkCol('Spiritual',12,13,14)}${mkCol('Obstacles',15,16,17)}${mkCol('Health & Future',18,19,20)}</div>`;
  }else if(spread.layout==='two-pathways'){
    const ms=(idx)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot two-path-${pos.id} ${cls}"><div class="slot-num">${pos.id}</div><div class="slot-label">${escapeHtml(pos.name)}</div></div>`;};
    return`<div class="spread-diagram two-pathways-layout">${spread.positions.map((_,i)=>ms(i)).join('')}</div>`;
  }else if(spread.layout==='relationship'){
    const ms=(idx,wide)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot ${cls}${wide?' slot-wide':''}"><div class="slot-num">${pos.id}</div><div class="slot-label">${escapeHtml(pos.name)}</div></div>`;};
    return`<div class="spread-diagram relationship-layout">
      <div class="relationship-side">${ms(6)}<div class="spread-row">${ms(0)}${ms(1)}${ms(2)}</div>${ms(8)}${ms(10)}${ms(12,true)}</div>
      <div class="relationship-center">${ms(14)}</div>
      <div class="relationship-side">${ms(7)}<div class="spread-row">${ms(3)}${ms(4)}${ms(5)}</div>${ms(9)}${ms(11)}${ms(13,true)}</div>
    </div>`;
  }else if(spread.layout==='pyramid'&&n===6){
    rows=[[0],[1,2],[3,4,5]];
  }else if(n===7){
    rows=[[0,6],[1,5],[2,4],[3]];
  }else if(n===13){
    rows=[[0],[1],[2,8],[3,4,9,10],[5,6,11,12],[7]];
  }else{
    // Generic: rows of 3-4
    for(let i=0;i<n;i+=Math.min(4,Math.ceil(n/Math.ceil(n/4)))){
      rows.push(spread.positions.slice(i,i+Math.min(4,n-i)).map((_,j)=>i+j));
    }
  }
  let html='<div class="spread-diagram">';
  rows.forEach(row=>{
    html+='<div class="spread-row">';
    row.forEach(idx=>{
      const pos=spread.positions[idx];
      if(!pos)return;
      const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';
      const check=idx<activeIdx?'?':'';
      html+=`<div class="slot ${cls}">
        <div class="slot-num">${check||pos.id}</div>
        <div class="slot-label">${escapeHtml(pos.name)}</div>
      </div>`;
    });
    html+='</div>';
  });
  html+='</div>';
  return html;
}

function renderGuidedRitual(spread){
  const prompt=document.getElementById('guided-ritual-prompt');
  const diagram=document.getElementById('guided-spread-diagram');
  const actions=document.getElementById('guided-actions');
  const photo=document.getElementById('guided-photo-section');
  const pos=spread.positions[state.guidedStep];

  // Render diagram
  diagram.innerHTML=renderSpreadDiagram(spread,state.guidedStep);

  if(!pos){
    // All cards placed  - show photo upload
    prompt.innerHTML=`<div class="guided-ritual">
      <div class="ritual-text">✦ All ${spread.cardCount} cards have been placed ✦</div>
      <div class="ritual-desc">Your spread is complete. Now take a clear photo of all your cards face-up, and AI will read them for you.</div>
    </div>`;
    actions.innerHTML='';
    photo.style.display='block';
    return;
  }

  photo.style.display='none';
  const promptText=GUIDED_PROMPTS[state.guidedStep%GUIDED_PROMPTS.length];
  const stepNum=state.guidedStep+1;
  const total=spread.positions.length;
  const shuffleHtml=state.guidedStep===0?`<div class="shuffle-prompt"><div class="shuffle-cards"><div class="sc sc1"></div><div class="sc sc2"></div><div class="sc sc3"></div></div><p class="shuffle-text">Take a moment. Breathe. Shuffle your deck while holding your question in mind.</p></div>`:'';

  prompt.innerHTML=`<div class="guided-ritual">
    ${shuffleHtml}
    <div class="ritual-counter">Card ${stepNum} of ${total}</div>
    <div class="ritual-text">${promptText}</div>
    <div class="ritual-pos">${escapeHtml(pos.name)}</div>
    <div class="ritual-desc">${escapeHtml(pos.description)}</div>
    <p style="font-size:11px;color:var(--muted)">Draw a card from your deck and place it face-up in position <strong style="color:var(--gold)">${pos.id}</strong> (highlighted above).</p>
  </div>`;

  actions.innerHTML=`<button class="btn btn-primary" onclick="nextGuidedPosition()">${GLYPH.star4} Card Placed  - Next</button>
    ${state.guidedStep>0?'<button class="btn btn-sm" onclick="prevGuidedPosition()" style="margin-left:8px">? Back</button>':''}`;
}

function nextGuidedPosition(){
  const spread=getSpread();
  state.guidedStep++;
  renderGuidedRitual(spread);
  document.getElementById('guided-ritual-prompt').scrollIntoView({behavior:'smooth',block:'start'});
}
function prevGuidedPosition(){
  const spread=getSpread();
  if(state.guidedStep>0)state.guidedStep--;
  renderGuidedRitual(spread);
  document.getElementById('guided-ritual-prompt').scrollIntoView({behavior:'smooth',block:'start'});
}

// Guided photo upload handlers
function handleGuidedDrop(e){e.preventDefault();const f=e.dataTransfer.files[0];if(f)processUpload(f,'guided-upload-zone','guided-identify-btn')}
function handleGuidedUpload(inp){if(inp.files[0])processUpload(inp.files[0],'guided-upload-zone','guided-identify-btn')}
function setInlineMessage(id,message,type='error'){
  const target=document.getElementById(id);
  if(!target)return;
  target.replaceChildren();
  const p=document.createElement('p');
  p.style.color=type==='success'?'var(--success)':'var(--danger)';
  p.style.fontSize='12px';
  p.style.marginTop='8px';
  p.setAttribute('role',type==='error'?'alert':'status');
  p.textContent=message;
  target.appendChild(p);
}

async function identifyGuidedCards(){
  try{requireAIConfiguration();}catch(e){showToast(e.message);return;}
  const spread=getSpread();
  const btn=document.getElementById('guided-identify-btn');
  btn.disabled=true;btn.textContent='Identifying…';
  try{
    const detectCardSystem=shouldDetectCardSystem();
    const posDetails=spread.positions.map(p=>`  ${p.id}. ${p.name}  - ${p.description}`).join('\n');
    const prompt=`You are identifying physical cards in a photograph of a completed spread.

SPREAD: ${spread.name} (${spread.cardCount} cards)  - ${spread.description}
${getSpreadLayoutHint(spread)}

POSITIONS:
${posDetails}

Examine the physical card at each spread position. Position numbers describe the layout only and must never be converted into card names.
${getCardSystemPromptGuide(state.cardSystem,detectCardSystem)}
Return ONLY a valid JSON array with no other text:
[{"position":1,"card":"Card Name","orientation":"upright"},...]\nIf a card is unclear or not visible, set "card" to null.`;
    const result=await callGemini(prompt,null,state.uploadedImage);
    if(!window.ArcanaAI||typeof window.ArcanaAI.parseIdentifiedCards!=='function'){
      throw new Error('Validated card identification is unavailable. Please review the cards manually');
    }
    const cardReferences=getIdentificationCardReferences(detectCardSystem);
    const parsedByArcana=window.ArcanaAI.parseIdentifiedCards(result,cardReferences,spread.positions.map(p=>p.id));
    validateIdentificationResult(parsedByArcana);
    if(detectCardSystem)establishDetectedCardSystem(parsedByArcana);
    replaceIdentifiedSpreadCards(spread,parsedByArcana);
    buildManualEntries(spread);
    setInlineMessage('guided-identify-results','Cards identified. Review each card before continuing.','success');
  }catch(err){
    setInlineMessage('guided-identify-results',`Identification failed. ${err.message||'Try Manual Entry instead.'} Review the cards manually.`);
  }
  btn.disabled=false;btn.innerHTML=GLYPH.star4+' Identify Cards with AI';
}

// Manual entries
function buildManualEntries(spread){
  const container=document.getElementById('manual-entries');
  container.innerHTML='';
  spread.positions.forEach(pos=>{
    const row=document.createElement('div');
    row.className='card-entry-row';
    const existing=state.cards[pos.id];
    const orientation=existing&&['upright','reversed','unknown'].includes(existing.orientation)?existing.orientation:'upright';
    const orientationLabel=orientation==='reversed'?'R':orientation==='unknown'?'?':'U';
    row.innerHTML=`
      <span class="pos-name">${escapeHtml(pos.name)}</span><span class="pos-desc-hint">${escapeHtml(pos.description)}</span>
      <button type="button" class="card-pick-btn${existing?' selected':''}" onclick="openCardPicker('${pos.id}')" data-pos="${pos.id}">${existing?escapeHtml(existing.name):'Choose card...'}</button>
      <button type="button" class="orient-btn ${orientation==='reversed'?'reversed':orientation==='unknown'?'unknown':''}" onclick="toggleOrient(this)" data-orient="${orientation}" data-pos="${pos.id}" aria-pressed="${orientation==='reversed'}" aria-label="Card orientation: ${orientation}. Activate to mark ${orientation==='reversed'?'upright':'reversed'}." title="Card orientation: ${orientation}">${orientationLabel}</button>`;
    container.appendChild(row);
  });
}
function buildSuitFilter(){
  const container=document.getElementById('suit-filter');
  container.innerHTML='<button type="button" class="suit-btn active" aria-pressed="true" onclick="filterSuit(null,this)">All</button>';
  if(state.cardSystem==='tarot'){
    container.innerHTML+=`<button type="button" class="suit-btn" aria-pressed="false" onclick="filterSuit('major',this)">Major</button>`;
    TAROT_SUITS.forEach(s=>{
      container.innerHTML+=`<button type="button" class="suit-btn" aria-pressed="false" onclick="filterSuit('${s}',this)">${escapeHtml(TAROT_SUIT_NAMES[s])}</button>`;
    });
  }else{
    PLAYING_SUITS.forEach(s=>{
      container.innerHTML+=`<button type="button" class="suit-btn" aria-pressed="false" onclick="filterSuit('${s}',this)">${s.charAt(0).toUpperCase()+s.slice(1)}</button>`;
    });
  }
}
let activeSuitFilter=null;
function filterSuit(suit,el){
  activeSuitFilter=suit;
  document.querySelectorAll('.suit-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});
  el.classList.add('active');
  el.setAttribute('aria-pressed','true');
}

function toggleOrient(el){
  if(el.dataset.orient==='upright'){
    el.dataset.orient='reversed';
    el.textContent='R';
    el.classList.add('reversed');
  }else{
    el.dataset.orient='upright';
    el.textContent='U';
    el.classList.remove('reversed');
  }
  el.classList.remove('unknown');
  const orientation=el.dataset.orient;
  if(typeof el.setAttribute==='function'){
    el.setAttribute('aria-pressed',String(orientation==='reversed'));
    el.setAttribute('aria-label',`Card orientation: ${orientation}. Activate to mark ${orientation==='reversed'?'upright':'reversed'}.`);
  }
  el.title=`Card orientation: ${orientation}`;
  syncOrientationState(el);
}

function syncOrientationState(el){
  const row=el.closest('.card-entry-row');
  const picker=row&&row.querySelector('.card-pick-btn[data-pos]');
  const posId=el.dataset.pos||(picker&&picker.dataset.pos);
  if(!posId)return;
  const orientation=el.dataset.orient||'upright';
  if(posId==='drop'){
    if(state.droppedCard)state.droppedCard.orientation=orientation;
    return;
  }
  if(state.cards[posId])state.cards[posId].orientation=orientation;
}function toggleDrop(){
  const tog=document.getElementById('drop-toggle');
  tog.classList.toggle('on');
  state.hasDroppedCard=tog.classList.contains('on');
  if(typeof tog.setAttribute==='function')tog.setAttribute('aria-pressed',String(state.hasDroppedCard));
  document.getElementById('drop-card-entry').style.display=state.hasDroppedCard?'block':'none';
}

let activeDropdown=null;
function searchCard(input,posId){
  closeDropdowns();
  const query=input.value.toLowerCase().trim();
  if(!query){return;}
  let results=currentCards.filter(c=>c.name.toLowerCase().includes(query));
  if(activeSuitFilter){
    if(activeSuitFilter==='major')results=results.filter(c=>c.arcana==='major');
    else results=results.filter(c=>c.suit===activeSuitFilter);
  }
  results=results.slice(0,8);
  if(!results.length)return;
  const dd=document.createElement('div');
  dd.className='search-dropdown';
  dd.style.cssText='position:absolute;left:0;right:0;top:100%;z-index:100';
  results.forEach(card=>{
    const item=document.createElement('div');
    item.className='dd-item';
    item.innerHTML=`${renderCardArt(card,'tarot-card-thumb dropdown-card-art',72)}<span>${escapeHtml(card.name)}</span>`;
    item.onclick=()=>{
      input.value=card.name;
      if(posId.startsWith('guided-')){
        // guided mode handled separately
      }else if(posId==='drop'){
        state.droppedCard={name:card.name,orientation:input.closest('.card-entry-row').querySelector('.orient-btn').dataset.orient};
      }else{
        const orient=input.closest('.card-entry-row').querySelector('.orient-btn').dataset.orient;
        state.cards[posId]={name:card.name,orientation:orient};
      }
      closeDropdowns();
    };
    dd.appendChild(item);
  });
  input.parentElement.style.position='relative';
  input.parentElement.appendChild(dd);
  activeDropdown=dd;
}
function closeDropdowns(){
  document.querySelectorAll('.search-dropdown').forEach(d=>d.remove());
  activeDropdown=null;
}
document.addEventListener('click',e=>{
  if(!e.target.closest('.search-dropdown')&&!e.target.matches('input[data-pos]'))closeDropdowns();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeDropdowns();
  if(!activeDropdown)return;
  const items=[...activeDropdown.querySelectorAll('.dd-item')];
  if(!items.length)return;
  const cur=activeDropdown.querySelector('.dd-item.hl');
  let idx=cur?items.indexOf(cur):-1;
  if(e.key==='ArrowDown'){e.preventDefault();idx=Math.min(idx+1,items.length-1)}
  else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(idx-1,0)}
  else if(e.key==='Enter'&&cur){e.preventDefault();cur.click();return}
  else return;
  items.forEach(i=>i.classList.remove('hl'));
  if(items[idx]){items[idx].classList.add('hl');items[idx].scrollIntoView({block:'nearest'})}
});

// Upload photo
function handleDrop(e){e.preventDefault();const f=e.dataTransfer.files[0];if(f)processUpload(f,'upload-zone','identify-btn')}
function handleUpload(inp){if(inp.files[0])processUpload(inp.files[0],'upload-zone','identify-btn')}
function handleQuickDrop(e){e.preventDefault();const f=e.dataTransfer.files[0];if(f)processQuickUpload(f)}
function handleQuickUpload(inp){if(inp.files[0])processQuickUpload(inp.files[0])}

const ACCEPTED_IMAGE_TYPES=new Set(['image/jpeg','image/png','image/webp']);
const MAX_UPLOAD_BYTES=10*1024*1024;
const MAX_UPLOAD_EDGE=1920;
const MAX_PROCESSED_IMAGE_BYTES=4*1024*1024;

function readFileAsDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
}

function decodeImage(dataUrl){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('The image is corrupt or could not be decoded.'));
    img.src=dataUrl;
  });
}

async function preprocessImage(file){
  if(!file||!ACCEPTED_IMAGE_TYPES.has(String(file.type||'').toLowerCase())){
    throw new Error('Please choose a JPEG, PNG, or WebP image.');
  }
  if(file.size>MAX_UPLOAD_BYTES)throw new Error('That image is too large. Choose a photo under 10 MB.');
  const sourceDataUrl=await readFileAsDataUrl(file);
  const img=await decodeImage(sourceDataUrl);
  const sourceWidth=img.naturalWidth||img.width;
  const sourceHeight=img.naturalHeight||img.height;
  if(!sourceWidth||!sourceHeight)throw new Error('The image has no readable dimensions.');
  const scale=Math.min(1,MAX_UPLOAD_EDGE/Math.max(sourceWidth,sourceHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(sourceWidth*scale));
  canvas.height=Math.max(1,Math.round(sourceHeight*scale));
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Image processing is unavailable in this browser.');
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  let quality=.88;
  let output=canvas.toDataURL('image/jpeg',quality);
  while(output.length>MAX_PROCESSED_IMAGE_BYTES*1.37&&quality>.62){
    quality-=.06;
    output=canvas.toDataURL('image/jpeg',quality);
  }
  if(output.length>MAX_PROCESSED_IMAGE_BYTES*1.37)throw new Error('This image could not be compressed small enough. Try a smaller photo.');
  return output;
}

function resetUploadZone(zoneId,btnId,inputId){
  const zone=document.getElementById(zoneId);
  if(!zone)return;
  zone.classList.remove('has-image');
  zone.innerHTML='<p style="color:var(--muted)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6.6" width="18" height="13" rx="2.6"/><circle cx="12" cy="13.1" r="3.4"/><path d="M8.4 6.6 9.6 4.4h4.8L15.6 6.6"/></svg>Click or drag a photo of your spread<br><span style="font-size:11px">JPG, PNG, WEBP</span></p>';
  const btn=document.getElementById(btnId);
  if(btn)btn.style.display='none';
  const input=document.getElementById(inputId);
  if(input)input.value='';
}

function setUploadError(zoneId,message){
  const zone=document.getElementById(zoneId);
  if(!zone)return;
  let status=zone.parentElement&&zone.parentElement.querySelector('.upload-error');
  if(!status){
    status=document.createElement('p');
    status.className='upload-error';
    status.setAttribute('role','alert');
    zone.insertAdjacentElement('afterend',status);
  }
  status.textContent=message;
}

function renderUploadPreview(zoneId,dataUrl,btnId,inputId){
  const zone=document.getElementById(zoneId);
  if(!zone)return;
  zone.classList.add('has-image');
  zone.replaceChildren();
  const image=document.createElement('img');
  image.src=dataUrl;
  image.alt='Preview of uploaded spread';
  image.loading='eager';
  image.decoding='async';
  const actions=document.createElement('div');
  actions.className='upload-preview-actions';
  const replace=document.createElement('button');
  replace.type='button';replace.className='btn btn-sm';replace.textContent='Replace photo';
  replace.onclick=e=>{e.stopPropagation();document.getElementById(inputId)?.click();};
  const remove=document.createElement('button');
  remove.type='button';remove.className='btn btn-sm';remove.textContent='Remove';
  remove.onclick=e=>{e.stopPropagation();state.uploadedImage=null;resetUploadZone(zoneId,btnId,inputId);if(zoneId==='quick-upload-zone')updateQuickGoBtn();};
  actions.append(replace,remove);
  zone.append(image,actions);
  const btn=document.getElementById(btnId);
  if(btn)btn.style.display='block';
  const error=zone.parentElement&&zone.parentElement.querySelector('.upload-error');
  if(error)error.remove();
}

async function processQuickUpload(file){
  try{
    state.uploadedImage=await preprocessImage(file);
    renderUploadPreview('quick-upload-zone',state.uploadedImage,'quick-go','quick-file');
    updateQuickGoBtn();
  }catch(error){
    state.uploadedImage=null;
    setUploadError('quick-upload-zone',error.message||'This image could not be used.');
    updateQuickGoBtn();
  }
}
function updateQuickGoBtn(){
  const btn=document.getElementById('quick-go');
  if(btn)btn.style.display=(state.uploadedImage&&state.quickSpreadId)?'block':'none';
}
function selectQuickSpread(id){
  state.quickSpreadId=(state.quickSpreadId===id)?null:id;
  renderQuickSpreads();
  updateQuickGoBtn();
}
function renderQuickSpreads(){
  const grid=document.getElementById('quick-spread-grid');
  if(!grid)return;
  grid.innerHTML='';
  const catOrder=['Daily','Classic','Relationships','Life & Decisions'];
  catOrder.forEach(cat=>{
    const catSpreads=SPREADS.filter(s=>ACTIVE_SPREAD_IDS.includes(s.id)&&s.category===cat);
    if(!catSpreads.length)return;
    const lbl=document.createElement('div');
    lbl.className='spread-cat-label';
    lbl.textContent=cat;
    grid.appendChild(lbl);
    catSpreads.forEach(sp=>{
      const card=document.createElement('button');
      card.type='button';
      const locked=PREMIUM_SPREAD_IDS.includes(sp.id)&&!isPremium();
      card.className='spread-card qs-card'+(state.quickSpreadId===sp.id?' selected':'')+(locked?' premium-locked':'');
      card.setAttribute('aria-pressed',String(state.quickSpreadId===sp.id));
      card.dataset.premiumFeature=PREMIUM_SPREAD_IDS.includes(sp.id)?'advanced-spreads':'';
      card.onclick=()=>locked?showUpgradeModal('advanced-spreads'):selectQuickSpread(sp.id);
      card.innerHTML=`<h4>${escapeHtml(sp.name)}</h4><div class="count">${sp.cardCount} cards${locked?' - Premium':''}</div>`;
      grid.appendChild(card);
    });
  });
  renderEntitlementsUI();
}
async function processUpload(file,zoneId,btnId){
  const inputId=zoneId==='guided-upload-zone'?'guided-file-input':'file-input';
  try{
    state.uploadedImage=await preprocessImage(file);
    renderUploadPreview(zoneId,state.uploadedImage,btnId,inputId);
  }catch(error){
    state.uploadedImage=null;
    setUploadError(zoneId,error.message||'This image could not be used.');
    const btn=document.getElementById(btnId);
    if(btn)btn.style.display='none';
  }
}

async function identifyCards(){
  try{requireAIConfiguration();}catch(e){showToast(e.message);return;}
  const spread=getSpread();
  const btn=document.getElementById('identify-btn');
  btn.disabled=true;btn.textContent='Identifying…';
  try{
    const detectCardSystem=shouldDetectCardSystem();
    const posDetails=spread.positions.map(p=>`  ${p.id}. ${p.name}  - ${p.description}`).join('\n');
    const prompt=`You are identifying physical cards in a photograph of a completed spread.

SPREAD: ${spread.name} (${spread.cardCount} cards)  - ${spread.description}
${getSpreadLayoutHint(spread)}

POSITIONS:
${posDetails}

Examine the physical card at each spread position. Position numbers describe the layout only and must never be converted into card names.
${getCardSystemPromptGuide(state.cardSystem,detectCardSystem)}
Return ONLY a valid JSON array with no other text:
[{"position":1,"card":"Card Name","orientation":"upright"},...]\nIf a card is unclear or not visible, set "card" to null.`;
    const result=await callGemini(prompt,null,state.uploadedImage);
    if(!window.ArcanaAI||typeof window.ArcanaAI.parseIdentifiedCards!=='function'){
      throw new Error('Validated card identification is unavailable. Please review the cards manually');
    }
    const cardReferences=getIdentificationCardReferences(detectCardSystem);
    const parsedByArcana=window.ArcanaAI.parseIdentifiedCards(result,cardReferences,spread.positions.map(p=>p.id));
    validateIdentificationResult(parsedByArcana);
    if(detectCardSystem)establishDetectedCardSystem(parsedByArcana);
    replaceIdentifiedSpreadCards(spread,parsedByArcana);
    buildManualEntries(spread);
    setInlineMessage('upload-results','Cards identified. Switch to Manual Entry to review and correct.','success');
  }catch(err){
    setInlineMessage('upload-results',`Identification failed. ${err.message||'Try Manual Entry instead.'} Review the cards manually.`);
  }
  btn.disabled=false;btn.innerHTML=GLYPH.star4+' Identify Cards with AI';
}

function confirmCards(){
  const spread=getSpread();
  // Collect from manual picker entries so orientation changes are persisted.
  document.querySelectorAll('#manual-entries .card-entry-row').forEach(row=>{
    const inp=row.querySelector('input[data-pos]');
    const picker=row.querySelector('.card-pick-btn[data-pos]');
    const posId=picker?picker.dataset.pos:(inp&&inp.dataset.pos);
    if(!posId)return;
    const picked=picker&&picker.classList.contains('selected')?picker.textContent.trim():'';
    const val=inp?inp.value.trim():picked;
    const orient=row.querySelector('.orient-btn').dataset.orient;
    if(val)state.cards[posId]={name:val,orientation:orient};
  });
  // Check drop card
  if(state.hasDroppedCard){
    const dropInput=document.querySelector('#drop-card-entry input[data-pos="drop"]');
    const dropPicker=document.querySelector('#drop-card-entry .card-pick-btn[data-pos="drop"]');
    const dropOrient=document.querySelector('#drop-card-entry .orient-btn');
    const dropName=dropInput&&dropInput.value.trim()
      ? dropInput.value.trim()
      : (dropPicker&&dropPicker.classList.contains('selected')?dropPicker.textContent.trim():'');
    if(dropName){
      state.droppedCard={name:dropName,orientation:dropOrient.dataset.orient};
    }
  }
  // Validate - check both numeric and string keys since positions use numeric ids
  let filled=0;
  spread.positions.forEach(p=>{if(state.cards[p.id]||state.cards[String(p.id)])filled++});
  const continueToOverview=()=>{
    if(Object.values(state.cards||{}).some(entry=>entry&&entry.orientation==='unknown')||
      (state.hasDroppedCard&&state.droppedCard&&state.droppedCard.orientation==='unknown')){
      showToast('Confirm each card orientation before generating the reading.');
      return;
    }
    renderOverview();
    goScreen('screen-overview');
  };
  if(filled<spread.cardCount){
    const message=`You have ${filled} of ${spread.cardCount} cards entered. You can return to Card Entry to finish, or continue to review what is present.`;
    if(typeof openConfirmDialog==='function'&&openConfirmDialog('Continue with an incomplete spread?',message,continueToOverview,'Review anyway'))return;
    if(!confirm(message))return;
  }
  continueToOverview();
}
// ===== OVERVIEW =====
function renderOverview(){
  const spread=getSpread();
  const grid=document.getElementById('overview-grid');
  grid.innerHTML='';
  spread.positions.forEach(pos=>{
    const entry=state.cards[pos.id];
    const card=entry?currentCards.find(c=>c.name.toLowerCase()===entry.name.toLowerCase()):null;
    const tile=document.createElement('div');
    tile.className='overview-tile';
    if(!entry){
      tile.innerHTML=`<div class="c-pos">${escapeHtml(pos.name)}</div><button type="button" class="overview-missing-card" onclick="goScreen('screen-card-entry')">Unknown - tap to set</button>`;
    }else{
      const art=card?renderCardArt(card,'tarot-card-thumb overview-card-art',180):'<span class="card-art-fallback">?</span>';
      const kws=card?card.keywords.slice(0,3):[];
      tile.innerHTML=`
        <div class="suit-sym">${art}</div>
        <div class="c-name">${escapeHtml(entry.name)}</div>
        <div class="c-pos">${escapeHtml(pos.name)}</div>
        <span class="orient ${entry.orientation==='reversed'?'reversed':entry.orientation==='upright'?'upright':'unknown'}">${entry.orientation==='upright'?'↑ Upright':entry.orientation==='reversed'?'↓ Reversed':'? Orientation unknown'}</span>
        <div class="kw">${kws.map(k=>`<span>${escapeHtml(k)}</span>`).join('')}</div>`;
    }
    grid.appendChild(tile);
  });
  // Dropped card
  const dropDiv=document.getElementById('dropped-overview');
  if(state.hasDroppedCard&&state.droppedCard){
    const dc=currentCards.find(c=>c.name.toLowerCase()===state.droppedCard.name.toLowerCase());
    const kws=dc?dc.keywords.slice(0,3):[];
    dropDiv.style.display='block';
    dropDiv.innerHTML=`<div class="overview-tile" style="border-color:var(--au-violet)">
      <div style="font-size:10px;color:var(--gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">✦ Dropped Card (Jumper)</div>
      <div class="suit-sym">${dc?renderCardArt(dc,'tarot-card-thumb overview-card-art',180):'<span class="card-art-fallback">?</span>'}</div>
      <div class="c-name">${escapeHtml(state.droppedCard.name)}</div>
      <span class="orient ${state.droppedCard.orientation==='reversed'?'reversed':state.droppedCard.orientation==='upright'?'upright':'unknown'}">${state.droppedCard.orientation==='upright'?'↑ Upright':state.droppedCard.orientation==='reversed'?'↓ Reversed':'? Orientation unknown'}</span>
      <div class="kw">${kws.map(k=>`<span>${escapeHtml(k)}</span>`).join('')}</div>
      <p style="font-size:10px;color:var(--muted);margin-top:6px;font-style:italic">This card jumped out during shuffling  - it may reveal an underlying theme influencing your reading.</p>
    </div>`;
  }else{
    dropDiv.style.display='none';
  }
}

// ===== QUICK READING =====
function buildQuickSpreadRef(){
  return SPREADS.filter(s=>ACTIVE_SPREAD_IDS.includes(s.id)).map(s=>
    s.name+' ('+s.cardCount+' cards): '+s.positions.map(p=>p.id+'. '+p.name+' ['+p.description+']').join(' | ')
  ).join('\n');
}

function applyQuickReadingCardSystem(narrative,detectionRequired){
  const text=String(narrative||'');
  const marker=text.match(/^CARD_SYSTEM: (tarot|playing)(?:\r?\n|$)/);
  if(!marker){
    if(detectionRequired){
      throw new Error('Quick reading did not return a valid CARD_SYSTEM marker. Please try again or choose the deck manually');
    }
    return text;
  }
  if(!detectionRequired){
    if(marker[1]!==state.cardSystem){
      throw new Error(`Quick reading CARD_SYSTEM marker conflicts with the established ${state.cardSystem} deck`);
    }
    return text.slice(marker[0].length);
  }
  state.cardSystem=marker[1];
  state.cardSystemEstablished=true;
  currentCards=getCards();
  return text.slice(marker[0].length);
}

async function quickRead(){
  if(!canGenerateReading()){
    showUpgradeModal('daily-limit');
    return;
  }
  const settings=loadSettings();
  try{requireAIConfiguration();}catch(e){showToast(e.message);return;}
  if(!state.uploadedImage){showToast('Upload a spread photo first.');return;}
  const concern=document.getElementById('quick-concern').value.trim();
  state.concerns=concern?[concern]:[];
  saveReaderContext('quick-reader-life-stage');
  const results=document.getElementById('quick-results');
  results.innerHTML=thoughtfulLoadingHtml('quick-ai-status');
  try{
    const detectionRequired=shouldDetectCardSystem();
    const cardSystemMarkerInstruction=detectionRequired
      ? 'Your exact first line must be CARD_SYSTEM: tarot or CARD_SYSTEM: playing. Begin markdown on the next line.'
      : '';
    const qs=state.quickSpreadId?SPREADS.find(s=>s.id===state.quickSpreadId):null;
    const quickPromptSpread=qs||{id:'unknown-photo-spread',name:'Unknown Photo Spread',description:'A photographed spread whose structure should be inferred from the image',cardCount:0,layout:'photo',positions:[]};
    const quickSystemInstructions=getReadingSystemInstructions();
    const quickOutputGuide=getReadingOutputInstructions(quickPromptSpread,quickSystemInstructions);
    const quickSafety=getReadingSafetyDisclaimer();
    let prompt;
    if(qs){
      const layoutHint=getCleanSpreadLayoutHint(qs);
      const posLines=qs.positions.map(p=>p.id+'. '+p.name+': '+p.description).join('\n');
      prompt=`You are a skilled card reader analyzing a photograph of a ${qs.name} spread (${qs.cardCount} cards).

${layoutHint}

POSITION MEANINGS:
${posLines}

${getCardSystemPromptGuide(state.cardSystem,detectionRequired)}
${cardSystemMarkerInstruction}

For each visible card, identify its name, orientation (upright/reversed), and position. Then write a concise, mobile-friendly reading through the position meanings.

Length: ${getReadingLengthInstruction(qs)}
${quickOutputGuide}
Pattern focus: ${getQuickPatternAnalysisGuide(state.cardSystem,detectionRequired)}

${concern?'Querent concern: '+concern:'No specific concern - provide general guidance.'}
Reader context: ${readerContextLine()}
Life-stage guidance: ${readerSafetyInstruction()}
Safety: ${quickSafety}
For health, finances, relationships, and career, use reflective language. Do not claim certainty, diagnose, promise outcomes, or give professional advice as fact.
Reading style: ${settings.readingStyle}. Tone: ${settings.readingTone}.

Do not write a long paragraph for every card in large spreads. Group highlights by the spread structure when the spread has many cards.`;
    }else{
      const spreadRef=buildQuickSpreadRef();
      prompt=`You are a skilled card reader analyzing a photograph of a card spread.

KNOWN SPREADS (match the layout in the photo to one of these):
${spreadRef}

STEP 1 - IDENTIFY:
${getCardSystemPromptGuide(state.cardSystem,detectionRequired)}
${cardSystemMarkerInstruction}
- Match the layout to a known spread above, or describe it if unknown
- For each visible card, identify: position number, card name, orientation (upright/reversed)

STEP 2 - READ:
Keep the ${detectionRequired?'detected':'established'} card system's terminology consistent throughout the reading.
Write a concise, premium, mobile-friendly reading using this guide:
Length: ${getReadingLengthInstruction(quickPromptSpread)}
${quickOutputGuide}
Pattern focus: ${getQuickPatternAnalysisGuide(state.cardSystem,detectionRequired)}

${concern?'Querent concern: '+concern:'No specific concern - provide general guidance.'}
Reader context: ${readerContextLine()}
Life-stage guidance: ${readerSafetyInstruction()}
Safety: ${quickSafety}
For health, finances, relationships, and career, use reflective language. Do not claim certainty, diagnose, promise outcomes, or give professional advice as fact.
Reading style: ${settings.readingStyle}. Tone: ${settings.readingTone}.

Address both card meaning and positional context, but avoid exhaustive card-by-card essays.`;
    }
    const rawNarrative=await callGemini(prompt,null,state.uploadedImage,document.getElementById('quick-ai-status'));
    const narrative=applyQuickReadingCardSystem(rawNarrative,detectionRequired);
    state.narrative=narrative;
    if(!state.readingUsageRecorded){
      recordCompletedReading();
      state.readingUsageRecorded=true;
    }
    results.innerHTML='';
    const content=document.createElement('div');
    content.id='quick-reading-content';
    results.appendChild(content);
    renderReadingInto(content,narrative);
    results.insertAdjacentHTML('beforeend',`
      <div class="reading-actions no-print">
        <button class="btn btn-primary save-reading-action" onclick="saveReading()" data-premium-feature="history"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.3L6 20V5.5a1 1 0 0 1 1-1Z"/></svg> Save Reading</button>
        <div class="reading-actions-secondary">
          <button class="btn" onclick="shareReading()">Share</button>
          <button class="btn" onclick="printReading()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9.5V4.2h10v5.3"/><rect x="4.4" y="9.5" width="15.2" height="7.4" rx="1.6"/><rect x="7.4" y="14" width="9.2" height="5.4"/><circle cx="16.6" cy="12.2" r=".7" fill="currentColor" stroke="none"/></svg> Print</button>
          <button class="btn" onclick="goScreen('screen-welcome')">Start Again</button>
        </div>
      </div>`);
    renderJournalSection(results);
    wireJournalSection(results.querySelector('.journal-section'));
    renderEntitlementsUI();
  }catch(e){
    results.replaceChildren();
    const error=document.createElement('p');
    error.style.color='var(--danger)';
    error.setAttribute('role','alert');
    error.textContent=`Reading failed. ${e.message||'Try again or use Classic Reading.'}`;
    results.appendChild(error);
  }
}

function renderReadingInto(container,text){
  container.innerHTML=renderSafeMarkdown(text);
}

// ===== TOAST NOTIFICATION =====
function showToast(msg){
  let t=document.getElementById('app-toast');
  if(!t){t=document.createElement('div');t.id='app-toast';t.className='toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');t.setAttribute('aria-atomic','true');document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2400);
}

// ===== HISTORY =====
function renderHistory(){
  const list=document.getElementById('history-list');
  if(!list)return;
  const readings=readStoredJson('arcana_readings',[]);
  const journal=readStoredJson('arcana-journal',[]);
  list.replaceChildren();
  if(!Array.isArray(readings))return;
  const visibleReadings=isPremium()?readings:readings.slice(0,3);
  if(!readings.length){
    const empty=document.createElement('p');
    empty.className='history-empty';
    empty.textContent='No saved readings yet. Complete a reading and save it to see it here.';
    list.appendChild(empty);
  }else{
    if(!isPremium()&&readings.length>3){
      const note=document.createElement('p');
      note.className='history-limit-note';
      note.textContent='Showing your latest 3 readings. Premium unlocks the full saved history.';
      list.appendChild(note);
    }
    const tools=document.createElement('div');
    tools.className='history-tools';
    tools.innerHTML='<button type="button" class="btn btn-sm" onclick="compareSelectedReadings()" data-premium-feature="comparison">Compare Selected</button>';
    list.appendChild(tools);
    const comparison=document.createElement('div');
    comparison.id='comparison-output';
    list.appendChild(comparison);
  }
  visibleReadings.forEach((r,i)=>{
    const d=new Date(r.date);
    const readerContext=[r.readerLifeStage||''].filter(Boolean).join(' / ');
    const item=document.createElement('div');
    item.className='history-item';
    const header=document.createElement('div');
    header.className='history-header';
    header.setAttribute('role','button');
    header.tabIndex=0;
    header.setAttribute('aria-expanded','false');
    const check=document.createElement('input');
    check.className='compare-reading-check';
    check.type='checkbox';
    check.value=String(i);
    check.title='Select for comparison';
    check.setAttribute('aria-label','Select reading for comparison');
    check.addEventListener('click',e=>e.stopPropagation());
    const summary=document.createElement('div');
    const title=document.createElement('h4');
    title.style.fontSize='13px';
    title.textContent=r.title||'Untitled Reading';
    const detail=document.createElement('span');
    detail.style.cssText='font-size:11px;color:var(--muted)';
    detail.textContent=(r.spreadName||r.spread||'Reading')+' / '+(r.cardSystem||'cards');
    summary.append(title,detail);
    const date=document.createElement('span');
    date.className='h-date';
    date.textContent=Number.isNaN(d.getTime())?'Saved reading':d.toLocaleDateString();
    header.append(check,summary,date);
    const body=document.createElement('div');
    body.className='history-body';
    body.hidden=true;
    const toggle=()=>{
      const isOpen=body.classList.toggle('open');
      body.hidden=!isOpen;
      header.setAttribute('aria-expanded',String(isOpen));
    };
    header.addEventListener('click',toggle);
    header.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
    if(r.concerns&&r.concerns.length){
      const p=document.createElement('p');
      p.style.cssText='font-size:12px;color:var(--muted);margin-bottom:8px';
      const strong=document.createElement('strong');strong.textContent='Concerns: ';
      p.append(strong,document.createTextNode(r.concerns.join(', ')));body.appendChild(p);
    }
    if(readerContext){
      const p=document.createElement('p');
      p.style.cssText='font-size:12px;color:var(--muted);margin-bottom:8px';
      const strong=document.createElement('strong');strong.textContent='Reader context: ';
      p.append(strong,document.createTextNode(readerContext));body.appendChild(p);
    }
    const readingDiv=document.createElement('div');
    readingDiv.id='history-reading-'+i;
    readingDiv.style.marginBottom='12px';
    body.appendChild(readingDiv);
    const label=document.createElement('label');
    label.style.cssText='font-size:11px;color:var(--gold)';
    label.textContent='Journal Notes';
    const notes=document.createElement('textarea');
    notes.style.marginTop='4px';
    notes.placeholder='Add your reflections...';
    notes.value=String(r.notes||'');
    notes.addEventListener('input',()=>updateNote(i,notes.value));
    body.append(label,notes);
    const actions=document.createElement('div');
    actions.style.cssText='margin-top:8px;text-align:right';
    const del=document.createElement('button');
    del.type='button';del.className='btn btn-sm btn-danger';del.textContent='Delete';
    del.addEventListener('click',()=>deleteReading(i));
    actions.appendChild(del);body.appendChild(actions);
    item.append(header,body);
    list.appendChild(item);
    renderReadingInto(readingDiv,r.narrative||'No reading content saved.');
  });
  renderJournalArchive(list,Array.isArray(journal)?journal:[]);
  renderEntitlementsUI();
}
function updateNote(idx,val){
  const readings=readStoredJson('arcana_readings',[]);
  if(readings[idx]){readings[idx].notes=String(val||'').slice(0,10000);writeStoredJson('arcana_readings',readings)}
}
function deleteReading(idx){
  const remove=()=>{
    const readings=readStoredJson('arcana_readings',[]);
    readings.splice(idx,1);
    writeStoredJson('arcana_readings',readings);
    renderHistory();
  };
  if(typeof openConfirmDialog==='function'&&openConfirmDialog('Delete this saved reading?','This removes the saved reading from this browser.',remove))return;
  if(!confirm('Delete this reading?'))return;
  remove();
}

function renderJournalArchive(list,entries){
  const section=document.createElement('section');
  section.className='history-journal';
  const heading=document.createElement('h3');heading.textContent='Journal';section.appendChild(heading);
  const intro=document.createElement('p');intro.className='history-journal-intro';intro.textContent='Saved reflections live here so you can return to the words that mattered.';section.appendChild(intro);
  if(!entries.length){
    const empty=document.createElement('p');empty.className='history-empty';empty.textContent='No saved reflections yet. Add one after a reading.';section.appendChild(empty);
  }else{
    entries.slice(0,50).forEach((entry,index)=>{
      const card=document.createElement('article');card.className='journal-history-item';
      const meta=document.createElement('p');meta.className='journal-history-meta';
      const when=new Date(entry.updatedAt||entry.createdAt||entry.date);
      meta.textContent=(entry.spreadName||entry.spread||'Reading')+' · '+(Number.isNaN(when.getTime())?'Saved':when.toLocaleDateString());
      const text=document.createElement('p');text.className='journal-history-text';text.textContent=entry.text||'';
      const actions=document.createElement('div');actions.className='journal-history-actions';
      const edit=document.createElement('button');edit.type='button';edit.className='btn btn-sm';edit.textContent='Edit';edit.onclick=()=>editJournalEntry(index);
      const remove=document.createElement('button');remove.type='button';remove.className='btn btn-sm btn-danger';remove.textContent='Delete';remove.onclick=()=>deleteJournalEntry(index);
      actions.append(edit,remove);
      if(entry.readingId){
        const open=document.createElement('button');open.type='button';open.className='btn btn-sm';open.textContent='Open reading';open.onclick=()=>openSavedReading(entry.readingId);actions.appendChild(open);
      }
      card.append(meta,text,actions);section.appendChild(card);
    });
  }
  list.appendChild(section);
}
function editJournalEntry(index){
  const entries=readStoredJson('arcana-journal',[]);const entry=entries[index];
  if(!entry)return;
  openTextPrompt('Edit reflection','Update this journal entry.',entry.text||'',value=>{
    const clean=String(value||'').trim().slice(0,10000);if(!clean)return;
    entries[index]={...entry,text:clean,updatedAt:new Date().toISOString()};
    writeStoredJson('arcana-journal',entries);renderHistory();
  });
}
function deleteJournalEntry(index){
  const remove=()=>{const entries=readStoredJson('arcana-journal',[]);entries.splice(index,1);writeStoredJson('arcana-journal',entries);renderHistory();};
  if(typeof openConfirmDialog==='function'&&openConfirmDialog('Delete this reflection?','This removes the journal entry from this browser.',remove))return;
  if(confirm('Delete this reflection?'))remove();
}
function openSavedReading(readingId){
  const reading=readStoredJson('arcana_readings',[]).find(item=>item.id===readingId);
  if(!reading||!reading.narrative){showToast('The saved reading is no longer available.');return;}
  if(!Object.keys(reading.cards||{}).length){showToast('This journal entry is not linked to a card layout.');return;}
  state.mode='guided';state.spreadId=reading.spread;state.cards={...reading.cards};state.droppedCard=reading.droppedCard||null;state.hasDroppedCard=!!reading.hasDroppedCard;state.cardSystem=reading.cardSystem||'tarot';state.cardSystemEstablished=true;state.concerns=[...(reading.concerns||[])];state.readerLifeStage=reading.readerLifeStage||'';state.currentReadingId=reading.id||'';state.narrative=reading.narrative;currentCards=getCards();
  goScreen('screen-reading');renderReading(reading.narrative);
}

// ===== MODALS =====
let activeDialog=null;
let lastDialogTrigger=null;
function dialogFocusable(root){
  return Array.from(root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(el=>!el.disabled&&el.offsetParent!==null);
}
function dialogPanel(root){
  return root.querySelector('.modal,[role="dialog"],.card-picker-panel,.share-modal')||root;
}
function activateDialog(root,trigger){
  if(!root)return;
  if(activeDialog&&activeDialog!==root)deactivateDialog(activeDialog);
  activeDialog=root;
  lastDialogTrigger=trigger&&typeof trigger.focus==='function'?trigger:document.activeElement;
  root.classList.add('open');
  root.setAttribute('aria-hidden','false');
  const panel=dialogPanel(root);
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  const heading=panel.querySelector('h1,h2,h3');
  if(heading){
    if(!heading.id)heading.id=root.id+'-title';
    panel.setAttribute('aria-labelledby',heading.id);
  }
  document.body.classList.add('dialog-open');
  document.body.style.overflow='hidden';
  const first=dialogFocusable(panel)[0];
  setTimeout(()=>{if(first&&typeof first.focus==='function')first.focus();},0);
}
function deactivateDialog(root){
  if(!root)return;
  root.classList.remove('open');
  root.setAttribute('aria-hidden','true');
  if(activeDialog===root){
    activeDialog=null;
    document.body.classList.remove('dialog-open');
    document.body.style.overflow='';
    if(lastDialogTrigger&&typeof lastDialogTrigger.focus==='function')setTimeout(()=>lastDialogTrigger.focus(),0);
    lastDialogTrigger=null;
  }
}
document.addEventListener('keydown',e=>{
  if(!activeDialog)return;
  if(e.key==='Escape'){
    if(activeDialog.id==='card-picker-modal')pickerPosId=null;
    deactivateDialog(activeDialog);
    return;
  }
  if(e.key!=='Tab')return;
  const focusables=dialogFocusable(dialogPanel(activeDialog));
  if(!focusables.length){e.preventDefault();return;}
  const first=focusables[0];
  const last=focusables[focusables.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
function openTextPrompt(title,description,value,onSave){
  let modal=document.getElementById('modal-text-prompt');
  if(!modal){
    modal=document.createElement('div');modal.id='modal-text-prompt';modal.className='modal-overlay';
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal(modal.id)});document.body.appendChild(modal);
  }
  modal.innerHTML=`<div class="modal ritual-modal text-prompt-modal">
    <button type="button" class="close-btn" onclick="closeModal('modal-text-prompt')" aria-label="Close dialog">&times;</button>
    <h2>${escapeHtml(title)}</h2><p class="settings-note">${escapeHtml(description)}</p>
    <form class="text-prompt-form"><label for="text-prompt-input">Title or reflection</label><textarea id="text-prompt-input" maxlength="10000"></textarea>
      <div class="settings-actions"><button type="button" class="btn" onclick="closeModal('modal-text-prompt')">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>
    </form></div>`;
  const form=modal.querySelector('form');
  const textInput=modal.querySelector('#text-prompt-input');
  if(textInput)textInput.value=String(value||'');
  form.onsubmit=e=>{e.preventDefault();const input=modal.querySelector('#text-prompt-input');const callback=modal._onSave;closeModal('modal-text-prompt');if(callback)callback(input.value);};
  modal._onSave=typeof onSave==='function'?onSave:null;
  activateDialog(modal,document.activeElement);
}
function openConfirmDialog(title,description,onConfirm,actionLabel='Delete'){
  let modal=document.getElementById('modal-confirm');
  if(!modal){
    modal=document.createElement('div');modal.id='modal-confirm';modal.className='modal-overlay';
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal(modal.id)});document.body.appendChild(modal);
  }
  modal.innerHTML=`<div class="modal ritual-modal text-prompt-modal">
    <button type="button" class="close-btn" onclick="closeModal('modal-confirm')" aria-label="Close dialog">&times;</button>
    <h2>${escapeHtml(title)}</h2><p class="settings-note">${escapeHtml(description)}</p>
    <div class="settings-actions"><button type="button" class="btn" onclick="closeModal('modal-confirm')">Cancel</button><button type="button" class="btn btn-danger" id="confirm-dialog-action"></button></div>
  </div>`;
  const action=modal.querySelector('#confirm-dialog-action');
  if(!action)return false;
  action.textContent=String(actionLabel||'Confirm');
  action.onclick=()=>{const callback=modal._onConfirm;closeModal('modal-confirm');if(callback)callback();};
  modal._onConfirm=typeof onConfirm==='function'?onConfirm:null;
  activateDialog(modal,document.activeElement);
  return true;
}
function clearSavedData(){
  const clear=()=>{
    clearArcanaData();
    closeModal('modal-settings');
    setTimeout(()=>location.reload(),300);
  };
  if(typeof openConfirmDialog==='function'&&openConfirmDialog('Clear Arcana data?','This removes saved readings, reflections, settings, usage, and this browser\'s premium activation.',clear,'Clear data'))return;
  if(confirm('Delete saved readings and settings?'))clear();
}
function openModal(id){
  const modal=document.getElementById(id);
  if(!modal)return;
  if(id==='modal-settings')loadSettingsUI();
  activateDialog(modal,document.activeElement);
}
function closeModal(id){deactivateDialog(document.getElementById(id))}
document.querySelectorAll('.modal-overlay').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)})});

// ===== CARD PICKER =====
let pickerPosId=null;
function hasSelectedReadingCards(){
  return Object.keys(state.cards||{}).length>0 || !!state.droppedCard;
}
function clearSelectedReadingCards(){
  state.cards={};
  state.droppedCard=null;
  state.hasDroppedCard=false;
  const dropToggle=document.getElementById('drop-toggle');
  if(dropToggle)dropToggle.classList.remove('on');
  const dropEntry=document.getElementById('drop-card-entry');
  if(dropEntry)dropEntry.style.display='none';
}
function switchPickerCardSystem(nextSystem){
  if(nextSystem===state.cardSystem)return true;
  if(hasSelectedReadingCards()){
    const clearAndSwitch=()=>{const position=pickerPosId;clearSelectedReadingCards();switchPickerCardSystem(nextSystem);if(position)openCardPicker(position);};
    if(typeof openConfirmDialog==='function'&&openConfirmDialog('Switch card system?','This clears the cards already selected for this reading.',clearAndSwitch,'Switch deck'))return false;
    if(!confirm('Switching deck types will clear the cards already selected for this reading. Continue?'))return false;
    clearSelectedReadingCards();
  }
  state.cardSystem=nextSystem;
  state.cardSystemEstablished=false;
  currentCards=getCards();
  syncUploadDeckSelectors();
  activeSuitFilter=null;
  buildSuitFilter();
  renderPickerFilters();
  renderPickerCards(null);
  const spread=getSpread();
  if(spread&&document.getElementById('manual-entries'))buildManualEntries(spread);
  return true;
}
function renderPickerFilters(){
  const filterEl=document.getElementById('picker-filter');
  if(!filterEl)return;
  const tarotActive=state.cardSystem==='tarot';
  filterEl.innerHTML=`<div class="picker-system-tabs" style="display:flex;gap:6px;width:100%">
    <button type="button" class="picker-suit-btn${tarotActive?' active':''}" aria-pressed="${tarotActive?'true':'false'}" onclick="switchPickerCardSystem('tarot')">Tarot</button>
    <button type="button" class="picker-suit-btn${tarotActive?'':' active'}" aria-pressed="${tarotActive?'false':'true'}" onclick="switchPickerCardSystem('playing')">Playing Cards</button>
  </div>
  <button type="button" class="picker-suit-btn active" aria-pressed="true" onclick="filterPickerSuit(null,this)">All</button>`;
  if(tarotActive){
    filterEl.innerHTML+=`<button type="button" class="picker-suit-btn" aria-pressed="false" onclick="filterPickerSuit('major',this)">Major Arcana</button>`;
    TAROT_SUITS.forEach(s=>{
      filterEl.innerHTML+=`<button type="button" class="picker-suit-btn" aria-pressed="false" onclick="filterPickerSuit('${s}',this)">${TAROT_SUIT_NAMES[s]}</button>`;
    });
  }else{
    PLAYING_SUITS.forEach(s=>{
      filterEl.innerHTML+=`<button type="button" class="picker-suit-btn" aria-pressed="false" onclick="filterPickerSuit('${s}',this)">${s.charAt(0).toUpperCase()+s.slice(1)}</button>`;
    });
  }
}
function openCardPicker(posId){
  pickerPosId=posId;
  currentCards=getCards();
  renderPickerFilters();
  activateDialog(document.getElementById('card-picker-modal'),document.activeElement);
  renderPickerCards(null);
}
function closeCardPicker(){
  deactivateDialog(document.getElementById('card-picker-modal'));
  pickerPosId=null;
}
function filterPickerSuit(suit,el){
  document.querySelectorAll('#picker-filter > .picker-suit-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});
  el.classList.add('active');
  el.setAttribute('aria-pressed','true');
  renderPickerCards(suit);
}
function renderPickerCards(filter){
  let cards=currentCards;
  if(filter==='major')cards=cards.filter(c=>c.arcana==='major');
  else if(filter)cards=cards.filter(c=>c.suit===filter);
  const list=document.getElementById('card-picker-list');
  list.innerHTML=cards.map(card=>{
    const esc=escapeHtml(card.name);
    return`<button type="button" class="card-picker-item" onclick="selectPickerCard(this.dataset.n)" data-n="${esc}">${renderCardArt(card,'tarot-card-thumb picker-card-art',96)}<span>${escapeHtml(card.name)}</span></button>`;
  }).join('');
}
function selectPickerCard(name){
  if(!pickerPosId)return;
  const card=currentCards.find(item=>item.name===name);
  if(!card)return;
  state.cardSystem=card.system==='tarot'?'tarot':(state.cardSystem==='playing-joker'?'playing-joker':'playing');
  state.cardSystemEstablished=true;
  syncUploadDeckSelectors();
  const btn=document.querySelector(`.card-pick-btn[data-pos="${pickerPosId}"]`);
  if(btn){btn.textContent=card.name;btn.classList.add('selected');}
  const orientBtn=document.querySelector(`.orient-btn[data-pos="${pickerPosId}"]`);
  const orient=orientBtn?orientBtn.dataset.orient:'upright';
  if(pickerPosId==='drop'){
    state.droppedCard={name:card.name,orientation:orient};
    state.hasDroppedCard=true;
    const dropToggle=document.getElementById('drop-toggle');
    if(dropToggle){
      dropToggle.classList.add('on');
      if(typeof dropToggle.setAttribute==='function')dropToggle.setAttribute('aria-pressed','true');
    }
    const dropEntry=document.getElementById('drop-card-entry');
    if(dropEntry)dropEntry.style.display='block';
  }
  else{state.cards[pickerPosId]={name:card.name,orientation:orient};}
  closeCardPicker();
}

// ===== JOURNAL =====
function renderJournalSection(container){
  if(!container || container.querySelector('.journal-section'))return;
  const section=document.createElement('div');
  section.className='journal-section no-print';
  section.dataset.premiumFeature='journal';
  section.innerHTML=`
    <div class="journal-orbit" aria-hidden="true"></div>
    <div class="journal-topline">
      <span class="journal-badge">Premium Journal</span>
      <span class="journal-moon" aria-hidden="true"></span>
    </div>
    <div class="journal-prompt">Reflection</div>
    <p class="reflection-question">Before the moment passes, write down the message you want to remember.</p>
    <div class="reflection-chips" aria-label="Reflection prompts">
      <button type="button" onclick="useReflectionPrompt(this)">What surprised me?</button>
      <button type="button" onclick="useReflectionPrompt(this)">Which card keeps echoing?</button>
      <button type="button" onclick="useReflectionPrompt(this)">What action will I take?</button>
    </div>
    <textarea class="journal-textarea" placeholder="I want to remember..."></textarea>
    <div class="journal-actions">
    <button type="button" class="btn btn-primary journal-save-btn" onclick="saveJournal(this)" disabled>Save Reflection</button>
      <span class="journal-save-status" aria-live="polite"></span>
    </div>`;
  container.appendChild(section);
  wireJournalSection(section);
}

function setReadingReadyState(ready){
  const screen=document.getElementById('screen-reading');
  if(!screen)return;
  screen.classList.toggle('reading-ready',!!ready);
  screen.classList.toggle('reading-loading',!ready);
  screen.setAttribute('aria-busy',ready?'false':'true');
}

function wireJournalSection(section){
  if(!section)return;
  const textarea=section.querySelector('.journal-textarea');
  const button=section.querySelector('.journal-save-btn');
  const status=section.querySelector('.journal-save-status');
  if(!textarea||!button)return;
  const sync=()=>{
    const hasText=textarea.value.trim().length>0;
    button.disabled=!hasText;
    if(status&&!hasText)status.textContent='';
  };
  textarea.removeEventListener('input',textarea._arcanaJournalSync||(()=>{}));
  textarea._arcanaJournalSync=sync;
  textarea.addEventListener('input',sync);
  sync();
}

function useReflectionPrompt(btn){
  const section=btn.closest('.journal-section');
  const textarea=section&&section.querySelector('.journal-textarea');
  if(!textarea)return;
  const prompt=btn.textContent.trim();
  const prefix=textarea.value.trim()?'\n\n':'';
  textarea.value+=prefix+prompt+'\n';
  textarea.focus();
  textarea.dispatchEvent(new Event('input',{bubbles:true}));
}

function saveJournal(trigger){
  if(!requestPremiumFeature('journal')) return;
  const journalRoot=trigger&&trigger.closest ? trigger.closest('.journal-section') : (typeof event!=='undefined'&&event&&event.currentTarget&&event.currentTarget.closest ? event.currentTarget.closest('.journal-section') : document.getElementById('journal-section'));
  const textarea=journalRoot&&journalRoot.querySelector ? journalRoot.querySelector('.journal-textarea') : document.getElementById('journal-entry');
  const txt=textarea?textarea.value.trim():'';
  if(!txt)return;
  const spread=getReadingSpread();
  const now=new Date().toISOString();
  const entry={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),createdAt:now,updatedAt:now,date:now,spreadId:spread?spread.id:(state.spreadId||state.quickSpreadId||''),spreadName:spread?spread.name:'Custom',readingId:state.currentReadingId||'',text:txt.slice(0,10000)};
  const history=readStoredJson('arcana-journal',[]);
  history.unshift(entry);
  writeStoredJson('arcana-journal',history.slice(0,50));
  const btn=trigger||(typeof event!=='undefined'&&event?event.currentTarget:null);
  const status=journalRoot&&journalRoot.querySelector ? journalRoot.querySelector('.journal-save-status') : null;
  if(status)status.textContent='Saved to your journal';
  if(btn){const orig=btn.textContent;btn.textContent='Saved';setTimeout(()=>{btn.textContent=orig;if(status)status.textContent=''},2200);}
}
