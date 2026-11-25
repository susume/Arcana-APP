// ===== TEMPLATE LOADING =====
async function renderScreen(){
  const app=document.getElementById('app');
  if(!app || app.dataset.templatesLoaded)return;
  const hasHomepage=!!app.querySelector('#screen-welcome');
  const templates=['welcome','concerns','card-system','choose-reading','reflection','placement','overview','results','history','quick','settings','help'];
  const html=await Promise.all(templates.map(async name=>{
    if(name==='welcome' && hasHomepage)return '';
    const embedded=document.getElementById('template-'+name);
    if(location.protocol==='file:' && embedded)return embedded.innerHTML;
    try{
      const res=await fetch('templates/'+name+'.html');
      if(res.ok)return res.text();
    }catch(e){}
    return embedded ? embedded.innerHTML : '';
  }));
  app.insertAdjacentHTML('beforeend',html.join('\n'));
  ensureRitualUtilities();
  app.dataset.templatesLoaded='true';
}

function ensureRitualUtilities(){
  document.querySelectorAll('.ritual-screen').forEach(screen=>{
    const header=document.createElement('header');
    header.className='atelier-header no-print';
    header.innerHTML=`<div class="atlas-rail-inner">
      <button type="button" class="atlas-brand" onclick="goScreen('screen-welcome')" aria-label="Arcana home"><span class="atlas-wordmark" aria-hidden="true"><i class="atlas-sigil"></i>Arcana<em>Guide</em></span></button>
      <div class="atlas-rail-heading" aria-hidden="true">${screen.id==='screen-history'?'Your journal':'Reading room'}</div>
      <nav class="atelier-tools" aria-label="Reading tools">
        <button type="button" onclick="openModal('modal-help')">${ICON.help}Guide</button>
        <button type="button" onclick="openModal('modal-settings')">${ICON.settings}Settings</button>
      </nav>
      <div class="atlas-rail-chart" aria-hidden="true"><i class="atlas-sigil"></i></div>
    </div>`;
    screen.prepend(header);
  });
  document.querySelectorAll('.ritual-screen:not(#screen-history)').forEach(screen=>{
    if(screen.querySelector('.ritual-journal-shortcut'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='ritual-journal-shortcut';
    button.dataset.premiumFeature='history';
    button.setAttribute('aria-label','Open Tarot Journal');
    button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 6.4C10.4 5 7.6 4.5 4.6 5v13.4c3-.5 5.8 0 7.4 1.4M12 6.4c1.6-1.4 4.4-1.9 7.4-1.4v13.4c-3-.5-5.8 0-7.4 1.4M12 6.4V20"></path></svg><span>Journal</span>';
    button.onclick=()=>goScreen('screen-history');
    screen.querySelector('.atelier-tools').appendChild(button);
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
  if(!isPremium()&&(id==='screen-quick'||state.mode==='quick')&&!(id==='screen-reading'&&state.narrative))return 'screen-welcome';
  if(id==='screen-quick')return state.mode==='quick'?id:'screen-welcome';
  if(state.mode==='quick'){
    if(!['screen-card-entry','screen-overview','screen-reading'].includes(id))return 'screen-welcome';
    if(!getSpread())return 'screen-quick';
    if(id==='screen-reading'&&!state.narrative&&!state.readingInProgress)return 'screen-overview';
    return id;
  }
  if(state.mode!=='guided')return 'screen-welcome';
  if(id==='screen-spread')return id;
  if(!state.spreadId||(!isPremium()&&!FREE_SPREAD_IDS.has(state.spreadId)&&id!=='screen-reading'))return 'screen-spread';
  if(!state.cardSystemEstablished&&id!=='screen-card-system')return 'screen-card-system';
  if(id==='screen-reading'&&!state.narrative&&!state.readingInProgress)return 'screen-overview';
  return id;
}
function goScreen(id, fromRouter){
  if(id==='screen-history' && !requestPremiumFeature('history')){
    id='screen-welcome';
  }
  id=resolveScreenPrerequisite(screenForRoute(id));
  if(!document.getElementById(id))id='screen-welcome';
  const previous=document.querySelector('.screen.active')?.id;
  if(previous!==id&&['screen-quick','screen-card-entry'].includes(previous)){
    photoUploadVersion++;
    cancelPhotoIdentification();
  }
  if(previous==='screen-reading'&&previous!==id){
    readingRequestVersion++;
    state.readingInProgress=false;
    cancelAIRequest();
  }
  const nextHash='#'+routeForScreen(id);
  if(!fromRouter && location.hash !== nextHash) location.hash = nextHash;
  else if(fromRouter && location.hash !== nextHash) history.replaceState(null,'',nextHash);
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const screen=document.getElementById(id);
  screen.classList.add('active');
  if(id==='screen-card-entry')buildCardEntry();
  if(id==='screen-reflection'){
    const spread=getSpread();
    if(spread)document.getElementById('preparation-spread-diagram').innerHTML=renderSpreadDiagram(spread,-1);
  }
  if(id==='screen-overview')renderOverview();
  if(id==='screen-reading'&&previous!==id&&state.narrative&&!state.readingInProgress){
    renderReading(state.narrative);
    highlightReadingBtn(state.readingMode);
  }
  if(id==='screen-card-system')renderDeckChoice();
  if(id==='screen-spread')renderGuidedSpreadChoice();
  if(id==='screen-quick'){
    renderQuickSpreads();
    updateQuickGoBtn();
  }
  const heading=screen.querySelector('h1,h2,[data-screen-heading]');
  if(heading){
    heading.tabIndex=-1;
    requestAnimationFrame(()=>{if(!activeDialog&&screen.classList.contains('active'))heading.focus({preventScroll:true});});
  }
  window.scrollTo(0,0);
  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
  if(id==='screen-history')renderHistory();
  updateDots(id);
  renderReadingSetup(screen);
  renderEntitlementsUI();
  autoSaveState();
}
const READING_PHASES=['Set up','Add cards','Read'];
const READING_SCREEN_PHASE={
  'screen-spread':0,'screen-card-system':0,'screen-concerns':1,'screen-reflection':1,
  'screen-card-entry':1,'screen-overview':1,'screen-reading':2
};
function updateDots(screenId){
  const index=READING_SCREEN_PHASE[screenId];
  const container=document.getElementById(screenId)?.querySelector('.step-dots');
  if(index===undefined||!container)return;
  container.setAttribute('role','progressbar');
  container.setAttribute('aria-label','Reading progress');
  container.setAttribute('aria-valuemin','1');
  container.setAttribute('aria-valuemax',String(READING_PHASES.length));
  container.setAttribute('aria-valuenow',String(index+1));
  container.setAttribute('aria-valuetext',READING_PHASES[index]);
  container.replaceChildren(...READING_PHASES.map((label,i)=>{
    const phase=document.createElement('span');
    phase.className='reading-phase'+(i===index?' active':i<index?' done':'');
    phase.textContent=label;
    phase.setAttribute('aria-hidden','true');
    return phase;
  }));
}

function renderReadingSetup(screen){
  const spread=getSpread();
  const deck={tarot:'Traditional Tarot',playing:'Playing Cards','playing-joker':'Playing Cards + Joker'};
  const deckName=screen.id!=='screen-card-system'&&state.cardSystemEstablished?deck[state.cardSystem]:null;
  const summary=[spread?.name,deckName].filter(Boolean).join(' · ');
  screen.querySelectorAll('[data-reading-setup]').forEach(line=>{
    line.textContent=summary;
    line.hidden=!summary;
  });
  if(screen.id!=='screen-card-entry')return;
  const setup=document.getElementById('guided-reading-setup');
  setup.hidden=state.mode!=='guided';
  const question=state.concerns.join(' / ');
  const note=document.getElementById('guided-question-summary');
  note.textContent=question?'Question: '+question:'';
  note.hidden=!question;
  document.getElementById('guided-question-action').textContent=question?'Edit question':'Add a question';
}

// ===== WELCOME =====
let readingAudio;
function prepareReadingAudio(){
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio||!loadSettings().transitionSounds)return null;
  try{
    readingAudio ||= new Audio();
    if(readingAudio.state==='suspended')readingAudio.resume().catch(()=>{});
    return readingAudio;
  }catch(e){return null;}
}

function playReadingCue(cue){
  const audio=prepareReadingAudio();
  if(!audio)return;
  const notes={
    step:[[360,0,.12,.025,'triangle']],
    reveal:[[392,0,.28,.045,'sine'],[523,.05,.29,.024,'sine']],
    save:[[440,0,.13,.032,'triangle'],[587,.03,.15,.018,'sine']]
  };
  for(const [frequency,delay,duration,volume,type] of notes[cue]){
    const start=audio.currentTime+delay;
    const tone=audio.createOscillator();
    const envelope=audio.createGain();
    tone.type=type;
    tone.frequency.value=frequency;
    envelope.gain.setValueAtTime(.0001,start);
    envelope.gain.exponentialRampToValueAtTime(volume,start+.016);
    envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
    tone.connect(envelope).connect(audio.destination);
    tone.start(start);
    tone.stop(start+duration);
  }
}

function startGuided(){
  readingRequestVersion++;
  state.readingInProgress=false;
  state.readingPackage=null;
  state.readingInfographic=null;
  const journalEntry=document.getElementById('journal-entry');if(journalEntry)journalEntry.value='';
  state.mode='guided';
  state.narrative='';
  state.cards={};
  state.droppedCard=null;
  state.hasDroppedCard=false;
  resetPhotoWorkflow();
  state.spreadId=null;
  state.quickSpreadId=null;
  state.readerLifeStage='';
  state.guidedStep=0;
  state.preparationSkipped=false;
  state.readingUsageRecorded=false;
  state.reviewModeChoice=null;
  state.cardEntryTab=null;
  state.currentReadingId='';
  state.concerns=[];
  // Reset drop toggle UI
  const tog=document.getElementById('drop-toggle');
  if(tog){tog.classList.remove('on')}
  document.getElementById('drop-card-entry').style.display='none';
  // Reset concern inputs
  const cl=document.getElementById('concern-list');
  cl.innerHTML='<div class="concern-row"><label for="concern-input-1">Your question (optional)</label><input id="concern-input-1" type="text" maxlength="1000" placeholder="What is on your mind?" class="concern-input" oninput="saveGuidedQuestion()"></div>';
  document.querySelectorAll('.flow-details').forEach(details=>{details.open=false;});
  document.querySelectorAll('.tag-chip').forEach(t=>{t.classList.remove('active');t.setAttribute('aria-pressed','false');});
  const lifeStage=document.getElementById('reader-life-stage');
  if(lifeStage)lifeStage.value='';
  state.cardSystem='tarot';
  state.cardSystemEstablished=false;
  currentCards=getCards();
  syncUploadDeckSelectors();
  playReadingCue('step');
  goScreen('screen-spread');
}
function startQuick(){
  if(!requestPremiumFeature('photo-ai'))return;
  readingRequestVersion++;
  state.readingInProgress=false;
  state.readingPackage=null;
  state.readingInfographic=null;
  const journalEntry=document.getElementById('journal-entry');if(journalEntry)journalEntry.value='';
  state.mode='quick';
  state.preparationSkipped=false;
  resetPhotoWorkflow();
  state.quickSpreadId=null;
  state.spreadId=null;
  state.narrative='';
  state.readingUsageRecorded=false;
  state.reviewModeChoice=null;
  state.cardEntryTab=null;
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
  const more=document.getElementById('quick-more-layouts');
  if(more)more.open=false;
  const question=document.getElementById('quick-question');
  if(question)question.open=false;
  syncUploadDeckSelectors();
  goScreen('screen-quick');
  playReadingCue('step');
}

// ===== CONCERNS =====
function addConcern(){
  const list=document.getElementById('concern-list');
  const row=document.createElement('div');
  row.className='concern-row';
  const inputId='concern-input-'+(Math.max(0,...Array.from(list.querySelectorAll('.concern-input'),input=>Number(input.id.replace('concern-input-',''))||0))+1);
  row.innerHTML='<label class="sr-only" for="'+inputId+'">Question or focus</label><input id="'+inputId+'" type="text" maxlength="1000" placeholder="Another question or focus" class="concern-input" oninput="saveGuidedQuestion()"><button type="button" class="btn btn-sm btn-danger" onclick="removeConcern(this)" title="Remove focus">&times;</button>';
  list.appendChild(row);
}
function removeConcern(btn){
  const rows=document.querySelectorAll('.concern-row');
  if(rows.length>1){btn.parentElement.remove();saveGuidedQuestion();}
}
function tagConcern(el){
  const selected=el.classList.toggle('active');
  el.setAttribute('aria-pressed',String(selected));
  const topic=el.textContent.trim();
  const inputs=document.querySelectorAll('.concern-input');
  if(!selected){
    inputs.forEach(inp=>{if(inp.value.trim()===topic)inp.value='';});
    saveGuidedQuestion();
    return;
  }
  if(inputs[0])inputs[0].value=topic;
  document.querySelectorAll('.tag-chip').forEach(chip=>{
    if(chip!==el){chip.classList.remove('active');chip.setAttribute('aria-pressed','false');}
  });
  saveGuidedQuestion();
}
function skipConcerns(){
  document.querySelectorAll('.concern-input').forEach(input=>{input.value='';});
  state.concerns=[];
  document.querySelectorAll('.tag-chip').forEach(chip=>{chip.classList.remove('active');chip.setAttribute('aria-pressed','false');});
  backFromConcerns();
}
function saveGuidedQuestion(){
  state.concerns=Array.from(document.querySelectorAll('.concern-input'),input=>input.value.trim()).filter(Boolean);
  autoSaveState();
}
function backFromConcerns(){
  saveGuidedQuestion();
  goScreen('screen-card-entry');
}
function saveConcerns(){
  playReadingCue('step');
  backFromConcerns();
}

// ===== CARD SYSTEM =====
function selectSystem(sys){
  if(sys!==state.cardSystem&&hasSelectedReadingCards()){
    if(!confirm('Changing your deck clears the cards you have entered. Continue?')){
      renderDeckChoice();
      document.querySelector('input[name="guided-deck"]:checked')?.focus();
      return;
    }
    clearSelectedReadingCards();
  }
  state.cardSystem=sys;
  state.cardSystemEstablished=true;
  renderDeckChoice();
  currentCards=getCards();
  syncUploadDeckSelectors();
  autoSaveState();
}
function renderDeckChoice(){
  document.querySelectorAll('input[name="guided-deck"]').forEach(input=>{
    input.checked=input.value===state.cardSystem;
    input.closest('.card-opt').classList.toggle('selected',input.checked);
  });
}
function confirmSystem(){
  if(!state.cardSystem){showToast('Choose a deck before continuing.');return;}
  state.cardSystemEstablished=true;
  currentCards=getCards();
  syncUploadDeckSelectors();
  if(!state.spreadId){goScreen('screen-spread');return;}
  state.cardEntryTab ||= 'tab-manual';
  playReadingCue('step');
  goScreen('screen-card-entry');
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
  if(!requestReadingAccess(id))return;
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
  if(!requestReadingAccess(state.spreadId))return;
  saveReaderContext('reader-life-stage');
  playReadingCue('step');
  goScreen('screen-card-system');
}
function skipPreparation(){
  if(!state.spreadId){showToast('Choose a spread before continuing.');return;}
  if(!requestReadingAccess(state.spreadId))return;
  state.preparationSkipped=true;
  state.guidedStep=0;
  state.cardEntryTab=isPremium()?'tab-upload':'tab-manual';
  goScreen('screen-card-entry');
}
function backFromCardEntry(){
  goScreen(state.mode==='quick'?'screen-quick':'screen-card-system');
}

function saveReaderContext(lifeStageId){
  const stageEl=document.getElementById(lifeStageId);
  state.readerLifeStage=stageEl?stageEl.value.trim():'';
}

// ===== READING TYPE SELECTION =====
function selectReadingType(id){
  if(!requestReadingAccess(id)){renderGuidedSpreadChoice();return;}
  if(state.spreadId&&state.spreadId!==id&&hasSelectedReadingCards()){
    if(!confirm('Changing the layout clears the cards you have entered for this spread. Continue?')){
      renderGuidedSpreadChoice();
      document.querySelector('#reading-choices input:checked, #reading-choices button.selected')?.focus();
      return;
    }
    clearSelectedReadingCards();
  }
  if(state.spreadId!==id)state.guidedStep=0;
  state.spreadId=id;
  renderGuidedSpreadChoice();
  autoSaveState();
}

function renderGuidedSpreadChoice(){
  document.querySelectorAll('input[name="guided-spread"]').forEach(input=>{
    input.checked=input.value===state.spreadId;
    input.closest('.reading-choice-card').classList.toggle('selected',input.checked);
  });
  document.querySelectorAll('#premium-spreads .reading-choice-card').forEach(button=>{
    const selected=button.dataset.spreadId===state.spreadId;
    button.classList.toggle('selected',selected);
    button.setAttribute('aria-pressed',String(selected));
    if(selected)document.getElementById('premium-spreads').open=true;
  });
}

function confirmReflection(){
  state.preparationSkipped=false;
  if(!state.cards||typeof state.cards!=='object')state.cards={};
  state.guidedStep=0;
  state.cardEntryTab ||= 'tab-manual';
  goScreen('screen-card-entry');
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
  const quickDeck=document.getElementById('quick-deck-selector');
  if(quickDeck)quickDeck.value=activeSystem;

  const noun=activeSystem==='playing'?'Playing Cards':(activeSystem==='tarot'?'Tarot Cards':'Cards');
  const identifyButton=document.getElementById('identify-btn');
  const guidedButton=document.getElementById('guided-identify-btn');
  if(identifyButton)identifyButton.innerHTML=GLYPH.star4+` Identify ${noun} with AI`;
  if(guidedButton)guidedButton.innerHTML=GLYPH.star4+` Identify ${noun} with AI`;
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
  if(changesDeck)cancelPhotoIdentification();
  state.cardSystem=nextSystem;
  state.cardSystemEstablished=selected!=='auto';
  currentCards=getCards();
  syncUploadDeckSelectors();
  if(changesDeck)clearPhotoResult('quick-upload-zone');
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
        artUrl:typeof getCardArtUrl==='function'?getCardArtUrl(card,250,{forCanvas:true}):'',
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

function buildPrintableReading(){
  const narrative=state.narrative?.trim();
  if(!narrative||state.readingInProgress)return null;
  const spread=getReadingSpread();
  const saved=getSavedCurrentReading();
  const title=saved?.title||(state.readingMode==='ai'&&state.readingPackage?.title)||spread?.name||'Your card reading';
  const date=new Date(saved?.date||Date.now());
  const meta=[
    title===spread?.name?'':spread?.name,
    state.cardSystem==='tarot'?'Tarot':'Playing cards',
    state.readingMode==='ai'?'AI reading':'Classic reading',
    Number.isNaN(date.getTime())?'':date.toLocaleDateString(getReadingLocale(),{dateStyle:'long'})
  ].filter(Boolean).map(escapeHtml).join(' &middot; ');
  const questions=(state.concerns||[]).filter(Boolean);
  const focus=questions.length
    ?`<section class="print-focus"><h2>Question or focus</h2>${questions.map(question=>`<p>${escapeHtml(question)}</p>`).join('')}</section>`
    :'';
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)} | Arcana Guide</title><style>
    @page{margin:14mm}
    *{box-sizing:border-box}
    body{margin:0;color:#202522;background:#fff;font:11pt/1.4 Georgia,'Times New Roman',serif;overflow-wrap:anywhere}
    .print-heading{border-top:2pt solid #29483b;border-bottom:.6pt solid #949b94;padding:3.5mm 0;margin-bottom:4mm;break-inside:avoid}
    .print-brand,.print-meta,.print-focus h2{font:600 9pt/1.4 Arial,sans-serif;color:#3f5449}
    .print-brand,.print-focus h2{text-transform:uppercase;letter-spacing:.1em}
    h1{font-size:23pt;line-height:1.12;margin:1.5mm 0}
    .print-heading p,.print-focus p{margin:0}
    .print-focus{border-left:1.5pt solid #607660;padding-left:3mm;margin-bottom:4mm}
    .print-focus h2{margin:0 0 1mm;break-after:avoid}
    .print-focus p + p{margin-top:1.5mm}
    .reading-section{margin:0 0 3.5mm}
    .reading-section h3{font-size:13.5pt;line-height:1.24;color:#29483b;margin:0 0 1.5mm;break-after:avoid}
    .reading-section p,.reading-section li{margin:0 0 1mm;orphans:3;widows:3}
    .reading-section p:has(>strong:only-of-type + br:only-of-type){break-after:avoid}
    .reading-section ul{margin:0;padding-left:5mm;list-style:disc;break-inside:avoid}
  </style></head><body><main>
    <header class="print-heading">
      <p class="print-brand">Arcana Guide</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="print-meta">${meta}</p>
    </header>
    ${focus}
    ${renderSafeMarkdown(narrative)}
  </main></body></html>`;
  return {html,title};
}

function printReading(){
  const printable=buildPrintableReading();
  if(!printable){
    showToast('No reading text is ready to print.');
    return;
  }
  const {html,title}=printable;
  if(globalThis.arcanaAndroid?.print){
    arcanaAndroid.print(html,title).catch(()=>showToast('Printing could not start.'));
    return;
  }
  if(document.querySelector('.print-frame'))return;
  const trigger=document.activeElement;
  const frame=document.createElement('iframe');
  frame.className='print-frame';
  frame.title='Printable card reading';
  frame.tabIndex=-1;
  frame.setAttribute('aria-hidden','true');
  frame.srcdoc=html;
  const cleanup=()=>{
    if(!frame.isConnected)return;
    frame.remove();
    window.removeEventListener('afterprint',cleanup);
    trigger?.focus({preventScroll:true});
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
    ${premiumFeature('poster')?'<canvas id="share-canvas" width="600" height="800" role="img" aria-label="Preview of your shared spread"></canvas>':''}
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

function drawShareWrappedText(ctx,text,x,y,maxWidth,lineHeight,maxLines){
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
  ctx.font='12px Arial, sans-serif';ctx.textAlign='left';
  drawShareWrappedText(ctx,card.name,x+8,y+h*.45,w-16,15,3);
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
    drawShareWrappedText(ctx,'JOKER',x+w*.12,y+h*.46,w*.76,Math.max(14,h*.13),2);
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
  const images=await Promise.all(slots.map(slot=>loadShareImage(data.cards[slot.pos]?.artUrl)));
  slots.forEach((slot,index)=>{
    const card=data.cards[slot.pos];
    if(!card)return;
    ctx.save();
    if(card.orientation==='reversed'){
      ctx.translate(slot.x+slot.w/2,slot.y+slot.h/2);
      ctx.rotate(Math.PI);
      ctx.translate(-(slot.x+slot.w/2),-(slot.y+slot.h/2));
    }
    const img=images[index];
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
  });
}

let sharePreviewVersion=0;
async function renderShareCanvas(data){
  const target=document.getElementById('share-canvas');
  if(!target)return;
  const requestVersion=++sharePreviewVersion;
  const canvas=document.createElement('canvas');canvas.width=600;canvas.height=800;
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
  if(requestVersion===sharePreviewVersion&&document.getElementById('share-canvas')===target){target.getContext('2d').drawImage(canvas,0,0);}
}

function drawShareFooter(ctx,data,comment){
  ctx.textAlign='left';
  ctx.fillStyle='#f3eadb';ctx.font='700 24px Georgia, serif';
  ctx.fillText('A message from the cards',42,590);
  ctx.fillStyle='#d8cdbd';ctx.font='18px Georgia, serif';
  drawShareWrappedText(ctx,comment,42,624,516,26,4);
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
  const summary=content.querySelector('.reading-section');
  if(summary && spread){
    const figures=spread.positions.flatMap((position,index)=>{
      const entry=state.cards[position.id];
      if(!entry?.name)return [];
      const card=cardObjects.find(item=>item.name.toLowerCase()===entry.name.toLowerCase());
      const art=card?renderCardArt(card,'tarot-card-thumb atlas-reading-art',180):'';
      const reversed=entry.orientation==='reversed';
      return [`<figure class="atlas-reading-card${reversed?' is-reversed':''}"><div class="atlas-card-mount">${art}</div><figcaption><small>${index+1} · ${escapeHtml(position.name)}</small><strong>${escapeHtml(entry.name)}</strong>${reversed?'<small>Reversed</small>':''}</figcaption></figure>`];
    });
    if(figures.length){
      const passage=document.createElement('div');
      passage.className='atlas-opening-passage';
      passage.append(...summary.childNodes);
      const heading=passage.querySelector('h3');
      if(heading?.textContent.trim()==='Your Reading in 30 Seconds')heading.textContent='At the heart of your reading';
      const label=document.createElement('p');
      label.className='atlas-spread-name no-print';
      label.textContent=spread.name;
      passage.prepend(label);
      summary.classList.add('atlas-reading-opener');
      summary.appendChild(passage);
      summary.insertAdjacentHTML('beforeend',`<div class="atlas-reading-strip no-print" tabindex="0" role="region" aria-label="Confirmed cards in spread order">${figures.join('')}</div>`);
    }
  }
  let h='<details class="reading-summary-card reading-spread-details">';
  h+='<summary>Spread details</summary>';
  h+='<p class="summary-copy">'+escapeHtml(spread?spread.name:'Your reading')+' &middot; '+cardNames.length+' confirmed card'+(cardNames.length===1?'':'s')+'</p>';
  h+='<div class="summary-meta">';
  h+='<span class="summary-cards">'+escapeHtml(spread?spread.name:'Reading')+'</span>';
  if(state.readerLifeStage)h+='<span class="major-badge">'+escapeHtml(state.readerLifeStage)+'</span>';
  if(hasMajor)h+='<span class="major-badge">Major Arcana Present</span>';
  if(reversedCount)h+='<span class="major-badge">'+reversedCount+' Reversed</span>';
  h+='</div>';
  if(dominantSuit)h+='<p>Most frequent suit: '+escapeHtml(dominantSuit[0])+'.</p>';
  h+='<p class="ai-disclaimer">AI-assisted readings are for reflection and personal insight only. They are not professional medical, legal, financial, mental-health, or crisis advice.</p>';
  h+='</details>';
  content.insertAdjacentHTML('beforeend',h);
}

// ===== CARD ENTRY =====
function switchTab(tabId,btn){
  state.cardEntryTab=tabId;
  ['tab-guided','tab-upload','tab-manual'].forEach(t=>{
    const panel=document.getElementById(t);
    if(panel){panel.style.display='none';panel.hidden=true;}
  });
  const panel=document.getElementById(tabId);
  if(panel){panel.style.display='block';panel.hidden=false;}
  document.querySelectorAll('.tab-btn').forEach(b=>{
    b.classList.remove('active');
    b.setAttribute('aria-selected','false');
    b.tabIndex=-1;
  });
  btn.classList.add('active');
  btn.setAttribute('aria-selected','true');
  btn.tabIndex=0;
}
function selectCardEntryTab(tabId,btn){
  if(tabId!=='tab-manual'&&!requestPremiumFeature('photo-ai'))return;
  switchTab(tabId,btn);
  autoSaveState();
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
  selectCardEntryTab(tab.getAttribute('aria-controls'),tab);
});

function buildCardEntry(){
  const spread=getSpread();
  if(!spread)return;
  const quick=state.mode==='quick';
  const manualOnly=quick||!isPremium();
  const tabs=document.querySelector('#screen-card-entry .tab-bar');
  const description=document.getElementById('card-entry-description');
  if(tabs)tabs.hidden=manualOnly;
  const jumper=document.getElementById('jumper-options');
  if(jumper)jumper.hidden=!isPremium();
  if(description)description.textContent=manualOnly
    ?'Use the cards you laid out.'
    :'Draw from your physical deck, upload your spread, or enter the cards by hand.';
  if(!manualOnly)buildGuidedDraw(spread);
  buildManualEntries(spread);
  const tabId=manualOnly?'tab-manual':state.cardEntryTab||(state.preparationSkipped?'tab-upload':'tab-guided');
  const tab=document.querySelector(`.tab-btn[aria-controls="${tabId}"]`);
  if(tab)switchTab(tabId,tab);
}

function enterCardsManually(){
  const tab=document.querySelector('.tab-btn[aria-controls="tab-manual"]');
  if(!tab)return;
  selectCardEntryTab('tab-manual',tab);
  document.querySelector('#manual-entries .card-pick-btn')?.focus();
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
  state.guidedStep=Math.min(state.guidedStep,spread.positions.length);
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
function handleGuidedDrop(e){e.preventDefault();const f=e.dataTransfer.files[0];if(f)processUpload(f,'guided-upload-zone','guided-identify-btn','guided-file-input')}
function handleGuidedUpload(inp){if(inp.files[0])processUpload(inp.files[0],'guided-upload-zone','guided-identify-btn','guided-file-input')}
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

function identifyGuidedCards(){
  return identifyPhotoForReview('guided-upload-zone','guided-identify-btn','guided-identify-results','guided-file-input');
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
    const orientationLabel=cardOrientationLabel(orientation);
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

function cardOrientationLabel(orientation){
  return orientation==='reversed'?'Reversed':orientation==='unknown'?'Check':'Upright';
}

function toggleOrient(el){
  if(el.dataset.orient==='upright'){
    el.dataset.orient='reversed';
    el.classList.add('reversed');
  }else{
    el.dataset.orient='upright';
    el.classList.remove('reversed');
  }
  el.classList.remove('unknown');
  const orientation=el.dataset.orient;
  el.textContent=cardOrientationLabel(orientation);
  if(typeof el.setAttribute==='function'){
    el.setAttribute('aria-pressed',String(orientation==='reversed'));
    el.setAttribute('aria-label',`Card orientation: ${orientation}. Activate to mark ${orientation==='reversed'?'upright':'reversed'}.`);
  }
  el.title=`Card orientation: ${orientation}`;
  syncOrientationState(el);
  autoSaveState();
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
  autoSaveState();
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
function handleDrop(e){e.preventDefault();const f=e.dataTransfer.files[0];if(f)processUpload(f,'upload-zone','identify-btn','file-input')}
function handleUpload(inp){if(inp.files[0])processUpload(inp.files[0],'upload-zone','identify-btn','file-input')}
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

const PHOTO_CONTROLS=[
  ['quick-upload-zone','quick-go','quick-results','quick-file'],
  ['guided-upload-zone','guided-identify-btn','guided-identify-results','guided-file-input'],
  ['upload-zone','identify-btn','upload-results','file-input']
];
let photoUploadVersion=0;
let photoIdentificationVersion=0;
let activePhotoIdentification=null;

function cancelPhotoIdentification(){
  photoIdentificationVersion++;
  const active=activePhotoIdentification;
  if(!active)return;
  activePhotoIdentification=null;
  active.target.replaceChildren();
  active.button.disabled=false;
  syncUploadDeckSelectors();
  updateQuickGoBtn();
}

function resetPhotoWorkflow(){
  photoUploadVersion++;
  cancelPhotoIdentification();
  state.uploadedImage=null;
  state.uploadedImageZone=null;
  state.photoIdentificationSent=false;
  PHOTO_CONTROLS.forEach(([zoneId,btnId,resultId,inputId])=>{
    resetUploadZone(zoneId,btnId,inputId);
    const results=document.getElementById(resultId);
    if(results)results.innerHTML='';
  });
}

function resetUploadZone(zoneId,btnId,inputId){
  const zone=document.getElementById(zoneId);
  if(!zone)return;
  zone.hidden=false;
  document.getElementById(zoneId+'-preview')?.remove();
  document.getElementById(zoneId+'-error')?.remove();
  const btn=document.getElementById(btnId);
  if(btn&&zoneId!=='quick-upload-zone')btn.style.display='none';
  const input=document.getElementById(inputId);
  if(input)input.value='';
}

function setUploadError(zoneId,message){
  const zone=document.getElementById(zoneId);
  if(!zone)return;
  let status=document.getElementById(zoneId+'-error');
  if(!status){
    status=document.createElement('p');
    status.id=zoneId+'-error';
    status.className='upload-error';
    status.setAttribute('role','alert');
    zone.insertAdjacentElement('afterend',status);
  }
  status.textContent=message;
}

function renderUploadPreview(zoneId,dataUrl,btnId,inputId){
  const zone=document.getElementById(zoneId);
  if(!zone)return;
  document.getElementById(zoneId+'-preview')?.remove();
  document.getElementById(zoneId+'-error')?.remove();
  const preview=document.createElement('div');
  preview.id=zoneId+'-preview';
  preview.className='quick-upload-preview upload-zone has-image';
  preview.addEventListener('dragover',e=>e.preventDefault());
  preview.addEventListener('drop',e=>{
    e.preventDefault();
    if(e.dataTransfer.files[0])processUpload(e.dataTransfer.files[0],zoneId,btnId,inputId);
  });
  const image=document.createElement('img');
  image.src=dataUrl;
  image.alt='Preview of your spread photo';
  image.decoding='async';
  const actions=document.createElement('div');
  actions.className='upload-preview-actions';
  const replace=document.createElement('button');
  replace.type='button';replace.className='btn btn-sm';replace.textContent='Replace photo';
  replace.onclick=()=>document.getElementById(inputId)?.click();
  const remove=document.createElement('button');
  remove.type='button';remove.className='btn btn-sm';remove.textContent='Remove';
  remove.onclick=()=>{
    photoUploadVersion++;
    cancelPhotoIdentification();
    state.uploadedImage=null;
    state.uploadedImageZone=null;
    resetUploadZone(zoneId,btnId,inputId);
    clearPhotoResult(zoneId);
    updateQuickGoBtn();
    zone.focus();
  };
  actions.append(replace,remove);
  preview.append(image,actions);
  const moveFocus=document.activeElement===zone||document.activeElement?.closest?.('.quick-upload-preview');
  zone.hidden=true;
  zone.insertAdjacentElement('afterend',preview);
  const btn=document.getElementById(btnId);
  if(btn&&zoneId!=='quick-upload-zone')btn.style.display='block';
  if(moveFocus)replace.focus();
}

function clearPhotoResult(zoneId){
  const controls=PHOTO_CONTROLS.find(([id])=>id===zoneId);
  const result=controls&&document.getElementById(controls[2]);
  if(result)result.replaceChildren();
}

function processQuickUpload(file){
  return processUpload(file,'quick-upload-zone','quick-go','quick-file');
}

function quickHasPhoto(){
  return !!state.uploadedImage&&(!state.uploadedImageZone||state.uploadedImageZone==='quick-upload-zone');
}

function updateQuickGoBtn(){
  const button=document.getElementById('quick-go');
  const status=document.getElementById('quick-prerequisite');
  if(!button||!status)return;
  const hasSpread=!!state.quickSpreadId;
  const hasPhoto=quickHasPhoto();
  const busy=activePhotoIdentification?.button===button;
  button.disabled=busy;
  button.setAttribute('aria-disabled',String(busy||!hasPhoto||!hasSpread));
  button.textContent=busy?'Identifying cards…':'Identify cards';
  status.textContent=busy?'Checking the photo for your cards.':!hasSpread
    ?'Choose a layout to get started.'
    :!hasPhoto?'Add a photo for automatic identification, or enter your cards by hand.'
    :'Identification sends your photo and layout to Gemini.';
}

function saveQuickDraft(){
  const question=document.getElementById('quick-concern')?.value.trim();
  state.concerns=question?[question]:[];
  saveReaderContext('quick-reader-life-stage');
  autoSaveState();
}

function selectQuickSpread(id){
  if(state.quickSpreadId===id)return;
  if(!requestReadingAccess(id)){syncQuickSpreadChoice();return;}
  if(hasSelectedReadingCards()){
    if(!confirm('Changing the layout clears the cards you have entered for this spread. Continue?')){
      syncQuickSpreadChoice();
      document.querySelector('input[name="quick-spread"]:checked')?.focus();
      return;
    }
    clearSelectedReadingCards();
  }
  cancelPhotoIdentification();
  state.quickSpreadId=id;
  state.spreadId=id;
  state.reviewModeChoice=null;
  syncQuickSpreadChoice();
  clearPhotoResult('quick-upload-zone');
  updateQuickGoBtn();
  saveQuickDraft();
}

function syncQuickSpreadChoice(){
  document.querySelectorAll('input[name="quick-spread"]').forEach(input=>{
    input.checked=input.value===state.quickSpreadId;
    input.closest('.qs-card').classList.toggle('selected',input.checked);
  });
}

function renderQuickSpreads(){
  const common=document.getElementById('quick-spread-grid');
  const more=document.getElementById('quick-more-spread-grid');
  if(!common||!more)return;
  common.replaceChildren();
  more.replaceChildren();
  for(const id of ACTIVE_SPREAD_IDS){
    const spread=SPREADS.find(item=>item.id===id);
    if(!spread)continue;
    const primary=id==='one-card'||id==='three-card';
    const advanced=!FREE_SPREAD_IDS.has(id);
    const selected=state.quickSpreadId===id;
    const card=document.createElement('label');
    const title=id==='one-card'?'One card':id==='three-card'?'Three cards':spread.name;
    card.className='spread-card qs-card'+(selected?' selected':'');
    card.dataset.spreadId=id;
    if(advanced)card.dataset.premiumFeature='advanced-spreads';
    const input=document.createElement('input');
    input.type='radio';
    input.name='quick-spread';
    input.value=id;
    input.checked=selected;
    input.onchange=()=>selectQuickSpread(id);
    card.innerHTML='<span class="quick-layout-name">'+escapeHtml(title)+'</span>'+
      (primary?'':'<span class="quick-layout-meta"><span class="count">'+spread.cardCount+
      (spread.cardCount===1?' card':' cards')+'</span>'+
      (advanced?'<span class="quick-layout-premium">Premium</span>':'')+'</span>');
    card.prepend(input);
    (primary?common:more).appendChild(card);
    if(!primary&&selected)document.getElementById('quick-more-layouts').open=true;
  }
  renderEntitlementsUI();
}

function enterQuickCardsManually(){
  if(!state.quickSpreadId){
    showToast('Choose the layout you used first.');
    document.querySelector('#quick-spread-grid input')?.focus();
    return;
  }
  if(!requestReadingAccess(state.quickSpreadId))return;
  saveQuickDraft();
  state.spreadId=state.quickSpreadId;
  state.cardEntryTab='tab-manual';
  goScreen('screen-card-entry');
}

async function processUpload(file,zoneId,btnId,inputId){
  if(!requestPremiumFeature('photo-ai'))return;
  const version=++photoUploadVersion;
  cancelPhotoIdentification();
  try{
    const image=await preprocessImage(file);
    if(version!==photoUploadVersion)return;
    if(state.uploadedImageZone&&state.uploadedImageZone!==zoneId){
      const previous=PHOTO_CONTROLS.find(([id])=>id===state.uploadedImageZone);
      if(previous)resetUploadZone(previous[0],previous[1],previous[3]);
    }
    state.uploadedImage=image;
    state.uploadedImageZone=zoneId;
    clearPhotoResult(zoneId);
    renderUploadPreview(zoneId,image,btnId,inputId);
  }catch(error){
    if(version!==photoUploadVersion)return;
    const message=error.message||'This image could not be used.';
    setUploadError(zoneId,message+(state.uploadedImageZone===zoneId?' Your previous photo is still selected.':''));
  }finally{
    if(version===photoUploadVersion){
      const input=document.getElementById(inputId);
      if(input)input.value='';
      updateQuickGoBtn();
    }
  }
}

function renderPhotoRecovery(zoneId,resultId,inputId,message){
  setInlineMessage(resultId,message);
  const target=document.getElementById(resultId);
  if(!target)return;
  target.classList.add('photo-recovery');
  const actions=document.createElement('div');
  actions.className='photo-recovery-actions';
  const retry=document.createElement('button');
  retry.type='button';retry.className='btn btn-sm';retry.textContent='Try another photo';
  retry.onclick=()=>document.getElementById(inputId)?.click();
  const manual=document.createElement('button');
  manual.type='button';manual.className='btn btn-sm';manual.textContent='Enter cards manually';
  manual.onclick=()=>{
    if(zoneId==='quick-upload-zone'){enterQuickCardsManually();return;}
    enterCardsManually();
  };
  actions.append(retry,manual);
  target.appendChild(actions);
  target.tabIndex=-1;
  target.focus();
}

function identifyCards(){
  return identifyPhotoForReview('upload-zone','identify-btn','upload-results','file-input');
}

function quickRead(){
  if(!requestPremiumFeature('photo-ai'))return;
  if(!quickHasPhoto()||!state.quickSpreadId)return;
  const spread=SPREADS.find(item=>item.id===state.quickSpreadId);
  if(!spread)return;
  if(!requestReadingAccess(spread.id))return;
  state.spreadId=spread.id;
  saveQuickDraft();
  return identifyPhotoForReview('quick-upload-zone','quick-go','quick-results','quick-file');
}

async function identifyPhotoForReview(zoneId,btnId,resultId,inputId){
  if(!requestPremiumFeature('photo-ai'))return;
  if(activePhotoIdentification)return;
  const spread=getSpread();
  const button=document.getElementById(btnId);
  const target=document.getElementById(resultId);
  if(!spread||!button||!target||!state.uploadedImage||(state.uploadedImageZone&&state.uploadedImageZone!==zoneId))return;
  try{
    requireAIConfiguration();
  }catch(error){
    renderPhotoRecovery(zoneId,resultId,inputId,'AI identification is unavailable. You can enter your cards manually.');
    return;
  }

  const version=++photoIdentificationVersion;
  const requestVersion=readingRequestVersion;
  activePhotoIdentification={button,target};
  target.classList.remove('photo-recovery');
  button.disabled=true;
  button.textContent='Identifying cards…';
  setInlineMessage(resultId,'Checking the photo for your cards…','success');
  updateQuickGoBtn();
  try{
    const detectionRequired=shouldDetectCardSystem();
    const positions=spread.positions.map(pos=>pos.id+'. '+pos.name+': '+pos.description).join('\n');
    const prompt=[
      'Identify the physical cards in a photograph of a completed '+spread.name+' spread.',
      getSpreadLayoutHint(spread),
      positions,
      getCardSystemPromptGuide(state.cardSystem,detectionRequired),
      'Return only JSON: [{"position":1,"card":"Card Name","orientation":"upright"}].',
      'Use the supplied position IDs. Position numbers are not card identities. If a card is unclear, return null for the card. If only the orientation is unclear, return "unknown" for the orientation.'
    ].join('\n');
    state.photoIdentificationSent=true;
    autoSaveState();
    const response=await callGemini(prompt,null,state.uploadedImage);
    if(version!==photoIdentificationVersion||requestVersion!==readingRequestVersion)return;
    if(!window.ArcanaAI||typeof window.ArcanaAI.parseIdentifiedCards!=='function'){
      throw new Error('Card identification is unavailable. Reload the page or enter your cards manually.');
    }
    const references=getIdentificationCardReferences(detectionRequired);
    const identified=window.ArcanaAI.parseIdentifiedCards(response,references,spread.positions.map(pos=>pos.id));
    validateIdentificationResult(identified);
    if(detectionRequired)establishDetectedCardSystem(identified);
    replaceIdentifiedSpreadCards(spread,identified);
    state.reviewModeChoice=null;
    state.cardEntryTab='tab-manual';
    target.replaceChildren();
    goScreen('screen-overview');
  }catch(error){
    if(version!==photoIdentificationVersion||requestVersion!==readingRequestVersion)return;
    const noCards=error.message?.startsWith('No valid cards');
    const message=['monthly_limit','service_limit','reactivation_required'].includes(error.code)?error.message
      :noCards?'No valid cards were identified. Try a clear photo taken directly above the spread.'
      :'Gemini couldn’t check this photo. Try another photo or enter your cards manually.';
    renderPhotoRecovery(zoneId,resultId,inputId,message);
  }finally{
    if(version===photoIdentificationVersion){
      activePhotoIdentification=null;
      button.disabled=false;
      syncUploadDeckSelectors();
      updateQuickGoBtn();
    }
  }
}

function confirmCards(){
  if(!getSpread())return;
  if(hasSelectedReadingCards())playReadingCue('step');
  goScreen('screen-overview');
}

// ===== OVERVIEW =====
function isCardOrientationConfirmed(entry){
  return entry.orientation==='upright'||entry.orientation==='reversed';
}

function getSpreadReview(){
  const spread=getSpread();
  const deck=new Map(currentCards.map(card=>[card.name.toLowerCase(),card]));
  const cards=state.cards||{};
  const positions=(spread?.positions||[]).map(position=>{
    const entry=cards[position.id];
    const card=deck.get(String(entry?.name||'').toLowerCase());
    return {position,entry:card?entry:null,card};
  });
  const filled=positions.filter(item=>item.entry).length;
  const dropEntry=state.hasDroppedCard?state.droppedCard:null;
  const dropCard=deck.get(String(dropEntry?.name||'').toLowerCase());
  const drop=dropCard?{position:{id:'drop',name:'Jumper card'},entry:dropEntry,card:dropCard}:null;
  const uncertain=positions.some(({entry})=>entry&&!isCardOrientationConfirmed(entry))||
    !!(drop&&!isCardOrientationConfirmed(drop.entry));
  return {positions,filled,missing:positions.length-filled,uncertain,drop};
}

function backFromOverview(){
  goScreen(state.mode==='quick'?'screen-quick':'screen-card-entry');
}

function setReviewedOrientation(positionId,orientation,focusType){
  const entry=positionId==='drop'?state.droppedCard:state.cards[positionId];
  if(!entry)return;
  entry.orientation=orientation;
  autoSaveState();
  renderOverview();
  document.getElementById('review-'+focusType+'-'+positionId)?.focus();
}

function renderReviewCard({position,entry,card},index){
  const row=document.createElement('div');
  const needsCheck=!entry||!isCardOrientationConfirmed(entry);
  row.className='review-card-row'+(needsCheck?' needs-check':'');
  const positionLabel=position.name;
  const copy=document.createElement('div');
  copy.className='review-card-copy';
  const positionText=document.createElement('p');
  positionText.className='review-card-position';
  positionText.textContent=(index===undefined?'':index+1+' · ')+positionLabel;
  const name=document.createElement('strong');
  name.className='review-card-name';
  name.textContent=entry?.name||'Card not identified';
  copy.append(positionText,name);

  const art=document.createElement('span');
  art.className='review-card-art';
  art.setAttribute('aria-hidden','true');
  if(card)art.innerHTML=renderCardArt(card,'tarot-card-thumb overview-card-art',96);
  else art.textContent='?';
  row.append(art,copy);

  const actions=document.createElement('div');
  actions.className='review-card-actions';
  if(needsCheck){
    const status=document.createElement('span');
    status.className='review-card-state';
    status.textContent='Needs your check';
    copy.appendChild(status);
  }
  const edit=document.createElement('button');
  edit.type='button';
  edit.className='btn btn-sm overview-edit-card';
  edit.id='review-edit-'+position.id;
  edit.textContent=entry?'Edit':'Add card';
  edit.setAttribute('aria-label',(entry?'Edit ':'Add ')+positionLabel+' card');
  edit.onclick=()=>openCardPicker(String(position.id));
  actions.appendChild(edit);
  if(entry){
    if(!needsCheck){
      const orientation=document.createElement('button');
      const reversed=entry.orientation==='reversed';
      const opposite=reversed?'upright':'reversed';
      orientation.type='button';
      orientation.id='review-orientation-'+position.id;
      orientation.className='btn btn-sm review-orientation';
      orientation.textContent=reversed?'Reversed':'Upright';
      orientation.setAttribute('aria-label',positionLabel+' card is '+entry.orientation+'. Mark '+opposite);
      orientation.onclick=()=>setReviewedOrientation(String(position.id),opposite,'orientation');
      copy.appendChild(orientation);
    }else{
      const choices=document.createElement('div');
      choices.className='review-orientation-options';
      for(const orientation of ['upright','reversed']){
        const option=document.createElement('button');
        option.type='button';
        option.className='btn btn-sm';
        option.textContent=orientation==='upright'?'Upright':'Reversed';
        option.setAttribute('aria-label','Mark '+positionLabel+' card '+orientation);
        option.onclick=()=>setReviewedOrientation(String(position.id),orientation,'orientation');
        choices.appendChild(option);
      }
      copy.appendChild(choices);
    }
  }
  row.appendChild(actions);
  return row;
}

function renderOverview(){
  const review=getSpreadReview();
  const grid=document.getElementById('overview-grid');
  if(!grid)return;
  const empty=document.getElementById('review-empty');
  const count=document.getElementById('review-card-count');
  const first=document.getElementById('review-first-card');
  const drop=document.getElementById('dropped-overview');
  const note=document.getElementById('review-photo-note');
  empty.hidden=review.filled>0;
  first.onclick=()=>{
    if(review.positions.length)openCardPicker(String(review.positions[0].position.id));
  };
  count.textContent=review.filled+' of '+review.positions.length+' cards added';
  grid.replaceChildren();
  review.positions.forEach((item,index)=>grid.appendChild(renderReviewCard(item,index)));
  drop.replaceChildren();
  drop.hidden=!review.drop;
  if(review.drop)drop.appendChild(renderReviewCard(review.drop));
  const modes=document.querySelector('#screen-overview .review-mode');
  if(modes)modes.hidden=!review.filled;
  note.hidden=!state.photoIdentificationSent;
  updateReviewMode(review);
}

function selectReviewMode(mode){
  if(mode!=='classic'&&mode!=='ai')return;
  if(!requestReadingAccess(state.spreadId,mode))return;
  state.reviewModeChoice=mode;
  updateReviewMode(getSpreadReview());
  autoSaveState();
}

const AI_READING_DISCLOSURE='AI reading sends your confirmed cards, spread positions, question, and any optional reading context to Gemini.';

function reviewPrerequisite(review){
  if(!review.filled)return 'Add at least one card to start a reading.';
  if(review.uncertain)return 'Confirm the orientation of every card you’ve added.';
  if(!state.reviewModeChoice)return 'Choose AI or Classic to continue.';
  if(state.reviewModeChoice==='ai'&&!hasAIConfiguration())return 'AI is unavailable. Choose Classic or check your AI settings.';
  return '';
}

function updateReviewMode(review){
  if(!isPremium()||!['classic','ai'].includes(state.reviewModeChoice))state.reviewModeChoice='classic';
  const mode=state.reviewModeChoice;
  const detail=document.getElementById('review-mode-detail');
  const action=document.getElementById('review-generate');
  const status=document.getElementById('review-prerequisite');
  if(!detail||!action||!status)return;
  document.querySelectorAll('.review-mode-option').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.readingMode===mode));
  });
  detail.textContent=mode==='ai'?AI_READING_DISCLOSURE+(state.photoIdentificationSent?' Your photo isn’t sent again.':'')
    :mode==='classic'?'Classic uses built-in meanings. It doesn’t send your cards or question to Gemini.':'';
  const prerequisite=reviewPrerequisite(review);
  status.textContent=prerequisite||(review.missing?'You can continue with the cards you’ve added.':'');
  action.setAttribute('aria-disabled',String(!!prerequisite));
  action.textContent=!review.filled?'Start reading':mode==='ai'?'Start AI reading':mode==='classic'?'Start Classic reading':'Choose a reading to continue';
}

function submitReviewedReading(){
  if(!requestReadingAccess(state.spreadId,state.reviewModeChoice))return;
  const review=getSpreadReview();
  if(reviewPrerequisite(review))return;
  const mode=state.reviewModeChoice;
  const start=()=>generateReading(mode);
  if(review.missing){
    const message='You’ve added '+review.filled+' of '+review.positions.length+
      ' cards. Your reading will include only the cards you’ve added.';
    openConfirmDialog('Continue with a partial spread?',message,start,'Continue',false,false);
    return;
  }
  start();
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
  const reflections=Array.isArray(journal)?journal:[];
  const linkedReflections=new Set();
  if(!readings.length&&!reflections.some(Boolean)){
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
    if(visibleReadings.length>=2){
      const tools=document.createElement('div');
      tools.className='history-tools';
      tools.innerHTML='<button type="button" class="btn btn-sm" onclick="compareSelectedReadings()" data-premium-feature="comparison">Compare selected</button>';
      list.appendChild(tools);
      const comparison=document.createElement('div');
      comparison.id='comparison-output';
      list.appendChild(comparison);
    }
  }
  const journalCards=new Map([...TAROT_CARDS,...buildPlayingCards(true)].map(card=>[card.name,card]));
  visibleReadings.forEach((r,i)=>{
    if(!r)return;
    const d=new Date(r.date);
    const readerContext=[r.readerLifeStage||''].filter(Boolean).join(' / ');
    const item=document.createElement('div');
    item.className='history-item history-entry';
    const header=document.createElement('div');
    header.className='history-header';
    const summary=document.createElement('div');
    const title=document.createElement('h4');
    title.textContent=r.title||'Untitled Reading';
    const detail=document.createElement('span');
    detail.className='history-entry-detail';
    const cardCount=Object.keys(r.cards||{}).length;
    detail.textContent=(r.spreadName||r.spread||'Reading')+(cardCount?` · ${cardCount} card${cardCount===1?'':'s'}`:'');
    summary.append(title,detail);
    const date=document.createElement('span');
    date.className='h-date';
    date.textContent=Number.isNaN(d.getTime())?'Saved reading':d.toLocaleDateString();
    const firstName=Object.values(r.cards||{}).find(entry=>entry?.name)?.name;
    const coverCard=journalCards.get(firstName);
    if(coverCard){
      const cover=document.createElement('span');
      cover.className='journal-cover';
      cover.setAttribute('aria-hidden','true');
      cover.innerHTML=coverCard.system==='tarot'?renderCardArt(coverCard,'tarot-card-thumb',96):renderCardFallback(coverCard);
      header.appendChild(cover);
    }
    const insight=r.readingPackage?.quickSummary;
    if(typeof insight==='string'&&insight.trim()){
      const excerpt=document.createElement('p');
      excerpt.className='journal-excerpt';
      excerpt.textContent=insight;
      summary.appendChild(excerpt);
    }
    summary.prepend(date);
    header.appendChild(summary);
    if(isPremium()&&visibleReadings.length>=2){
      const check=document.createElement('input');
      check.className='compare-reading-check';
      check.type='checkbox';
      check.value=String(i);
      check.title='Select for comparison';
      check.setAttribute('aria-label','Select '+title.textContent+' for comparison');
      header.appendChild(check);
    }
    item.appendChild(header);
    const linkedControls=[];
    if(r.id){
      const linked=document.createElement('div');
      linked.className='history-linked-reflections';
      reflections.forEach((entry,index)=>{
        if(entry?.readingId!==r.id)return;
        linkedReflections.add(index);
        const reflection=createHistoryReflection(entry,index,true);
        linkedControls.push(reflection.querySelector('.journal-history-actions'));
        linked.appendChild(reflection);
      });
      if(linked.childElementCount)item.appendChild(linked);
    }
    const body=document.createElement('div');
    body.className='history-body';
    body.id='history-reading-body-'+i;
    body.hidden=true;
    const entryActions=document.createElement('div');
    entryActions.className='history-entry-actions';
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='btn btn-sm';
    toggle.textContent='Open reading';
    toggle.setAttribute('aria-controls',body.id);
    toggle.setAttribute('aria-expanded','false');
    toggle.addEventListener('click',()=>{
      const isOpen=body.hidden;
      body.hidden=!isOpen;
      body.classList.toggle('open',isOpen);
      linkedControls.forEach(actions=>{actions.hidden=!isOpen;});
      toggle.textContent=isOpen?'Close reading':'Open reading';
      toggle.setAttribute('aria-expanded',String(isOpen));
    });
    entryActions.appendChild(toggle);
    item.appendChild(entryActions);
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
    notes.id='history-note-'+i;
    notes.maxLength=10000;
    label.htmlFor=notes.id;
    notes.style.marginTop='4px';
    notes.placeholder='Add your reflections...';
    notes.value=String(r.notes||'');
    const noteStatus=document.createElement('p');noteStatus.className='backup-status';noteStatus.setAttribute('aria-live','polite');
    notes.addEventListener('input',()=>{noteStatus.textContent=updateNote(i,notes.value)?'Saved in this browser.':'Could not save. Keep a copy of this note before leaving.';});
    body.append(label,notes,noteStatus);
    const actions=document.createElement('div');
    actions.style.cssText='margin-top:8px;text-align:right';
    const del=document.createElement('button');
    del.type='button';del.className='btn btn-sm btn-danger';del.textContent='Delete';
    del.addEventListener('click',()=>deleteReading(i));
    if(r.id&&r.narrative&&cardCount&&SPREADS.some(spread=>spread.id===r.spread)){
      const reopen=document.createElement('button');
      reopen.type='button';reopen.className='btn btn-sm';reopen.textContent='View full reading';
      reopen.onclick=()=>openSavedReading(r.id);
      actions.appendChild(reopen);
    }
    actions.appendChild(del);body.appendChild(actions);
    item.appendChild(body);
    list.appendChild(item);
    renderReadingInto(readingDiv,r.narrative||'No reading content saved.');
  });
  renderJournalArchive(list,reflections,linkedReflections);
  if(typeof updateArchiveStatus==='function')updateArchiveStatus();
  renderEntitlementsUI();
}
function updateNote(idx,val){
  const readings=readStoredJson('arcana_readings',[]);
  if(!readings[idx])return false;
  readings[idx].notes=String(val||'').slice(0,10000);
  return writeStoredJson('arcana_readings',readings,'This journal note could not be saved. Keep a copy before leaving.');
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

function renderJournalArchive(list,entries,linkedReflections){
  if(!entries.some((entry,index)=>entry&&!linkedReflections.has(index)))return;
  const section=document.createElement('section');
  section.className='history-journal';
  const heading=document.createElement('h3');heading.textContent='Other reflections';section.appendChild(heading);
  entries.forEach((entry,index)=>{
    if(entry&&!linkedReflections.has(index))section.appendChild(createHistoryReflection(entry,index,false));
  });
  list.appendChild(section);
}
function createHistoryReflection(entry,index,linked){
  const card=document.createElement('article');
  card.className=linked?'history-linked-reflection':'journal-history-item';
  const meta=document.createElement('p');
  meta.className='journal-history-meta';
  const when=new Date(entry.updatedAt||entry.createdAt||entry.date);
  meta.textContent=linked?'Your reflection':(entry.spreadName||entry.spread||'Reading')+' · '+(Number.isNaN(when.getTime())?'Saved':when.toLocaleDateString());
  const text=document.createElement('p');text.className='journal-history-text';text.textContent=entry.text||'';
  const actions=document.createElement('div');actions.className='journal-history-actions';
  actions.hidden=linked;
  const edit=document.createElement('button');edit.type='button';edit.className='btn btn-sm';edit.textContent='Edit reflection';edit.onclick=()=>editJournalEntry(index);
  const remove=document.createElement('button');remove.type='button';remove.className='btn btn-sm btn-danger';remove.textContent='Delete reflection';remove.onclick=()=>deleteJournalEntry(index);
  actions.append(edit,remove);
  card.append(meta,text,actions);
  return card;
}
function editJournalEntry(index){
  const entries=readArchiveForWrite('arcana-journal');const entry=entries&&entries[index];
  if(!entry)return;
  const original=JSON.stringify(entries);
  openTextPrompt('Edit reflection','Update this journal entry.',entry.text||'',value=>{
    const clean=String(value||'').trim().slice(0,10000);
    if(!clean){showToast('Add a reflection before saving.');return false;}
    const current=readArchiveForWrite('arcana-journal');
    if(!current)return false;
    if(JSON.stringify(current)!==original){
      showToast('The journal changed while you were editing. Copy your text, then reopen the entry.');
      return false;
    }
    current[index]={...entry,text:clean,updatedAt:new Date().toISOString()};
    if(!writeStoredJson('arcana-journal',current,'This reflection could not be saved. Keep a copy before leaving.'))return false;
    renderHistory();return true;
  });
}
function deleteJournalEntry(index){
  const remove=()=>{const entries=readStoredJson('arcana-journal',[]);entries.splice(index,1);writeStoredJson('arcana-journal',entries);renderHistory();};
  if(typeof openConfirmDialog==='function'&&openConfirmDialog('Delete this reflection?','This removes the journal entry from this browser.',remove))return;
  if(confirm('Delete this reflection?'))remove();
}
function openSavedReading(readingId){
  const reading=readStoredJson('arcana_readings',[]).find(item=>item?.id===readingId);
  if(!reading||!reading.narrative){showToast('The saved reading is no longer available.');return;}
  if(!Object.keys(reading.cards||{}).length){showToast('This journal entry is not linked to a card layout.');return;}
  if(!SPREADS.some(spread=>spread.id===reading.spread)){showToast('This saved reading has no editable card layout. You can read it in the archive.');return;}
  readingRequestVersion++;
  state.readingPackage=reading.readingPackage||null;
  state.readingInfographic=null;
  state.readingMode=reading.readingMode||'classic';
  state.readingUsageRecorded=true;
  state.readingInProgress=false;
  state.photoIdentificationSent=false;
  state.reviewModeChoice=null;
  state.uploadedImage=null;state.quickSpreadId=null;
  state.mode='guided';state.spreadId=reading.spread;state.cards={...reading.cards};state.droppedCard=reading.droppedCard||null;state.hasDroppedCard=!!reading.hasDroppedCard;state.cardSystem=reading.cardSystem||'tarot';state.cardSystemEstablished=true;state.concerns=[...(reading.concerns||[])];state.readerLifeStage=reading.readerLifeStage||'';state.currentReadingId=reading.id||'';state.narrative=reading.narrative;currentCards=getCards();
  const journalEntry=document.getElementById('journal-entry');if(journalEntry)journalEntry.value='';
  goScreen('screen-reading');
  highlightReadingBtn(state.readingMode==='ai'?'ai':'classic');
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
    const trigger=lastDialogTrigger;
    if(trigger&&typeof trigger.focus==='function')setTimeout(()=>trigger.focus(),0);
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
  form.onsubmit=e=>{e.preventDefault();const input=modal.querySelector('#text-prompt-input');const callback=modal._onSave;if(!callback||callback(input.value)!==false)closeModal('modal-text-prompt');};
  modal._onSave=typeof onSave==='function'?onSave:null;
  activateDialog(modal,document.activeElement);
}
function openConfirmDialog(title,description,onConfirm,actionLabel='Delete',offerBackup=false,destructive=true){
  let modal=document.getElementById('modal-confirm');
  if(!modal){
    modal=document.createElement('div');modal.id='modal-confirm';modal.className='modal-overlay';
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal(modal.id)});document.body.appendChild(modal);
  }
  modal.innerHTML=`<div class="modal ritual-modal text-prompt-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
    <button type="button" class="close-btn" onclick="closeModal('modal-confirm')" aria-label="Close dialog">&times;</button>
    <h2 id="confirm-dialog-title">${escapeHtml(title)}</h2><p class="settings-note" id="confirm-dialog-description">${escapeHtml(description)}</p>
    ${offerBackup?'<button type="button" class="btn btn-sm" onclick="downloadJournalBackup()">Download backup first</button>':''}
    <div class="settings-actions"><button type="button" class="btn" onclick="closeModal('modal-confirm')">Cancel</button><button type="button" class="btn ${destructive?'btn-danger':'btn-primary'}" id="confirm-dialog-action"></button></div>
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
  const description=globalThis.arcanaAndroid
    ? 'Download a backup first. This permanently removes saved readings, reflections, settings, and usage from this device. You can restore Premium with the same Google Play account.'
    : 'Download a backup first. This permanently removes saved readings, reflections, settings, usage, and this browser\'s Premium activation. Keep your purchase receipt to reactivate.';
  if(typeof openConfirmDialog==='function'&&openConfirmDialog('Clear Arcana data?',description,clear,'Clear data',true))return;
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
let pickerSuitFilter=null;
let pickerSearchQuery='';
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
  pickerSuitFilter=null;
  pickerSearchQuery='';
  const search=document.getElementById('picker-search');
  if(search)search.value='';
  const position=getSpread()?.positions?.find(item=>String(item.id)===String(posId));
  const title=document.getElementById('card-picker-title');
  if(title)title.textContent=position?'Choose card for '+position.name:posId==='drop'?'Choose a jumper card':'Choose a card';
  currentCards=getCards();
  renderPickerFilters();
  activateDialog(document.getElementById('card-picker-modal'),document.activeElement);
  renderPickerCards(null);
  setTimeout(()=>{if(search&&activeDialog===document.getElementById('card-picker-modal'))search.focus();},0);
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
  pickerSuitFilter=filter;
  const cards=matchingPickerCards(currentCards,filter,pickerSearchQuery);
  const list=document.getElementById('card-picker-list');
  list.innerHTML=cards.map(card=>{
    const esc=escapeHtml(card.name);
    return`<button type="button" class="card-picker-item" aria-label="${esc}" onclick="selectPickerCard(this.dataset.n)" data-n="${esc}">${renderCardArt(card,'tarot-card-thumb picker-card-art',96)}<span>${escapeHtml(card.name)}</span></button>`;
  }).join('')||'<p class="picker-empty">No matching cards. Try another name or suit.</p>';
  const status=document.getElementById('picker-search-status');
  if(status)status.textContent=cards.length+' card'+(cards.length===1?'':'s')+' found';
}
function matchingPickerCards(cards,filter,query){
  const terms=String(query||'').trim().toLowerCase().split(/\s+/).filter(Boolean);
  return cards.filter(card=>{
    if(filter==='major'&&card.arcana!=='major')return false;
    if(filter&&filter!=='major'&&card.suit!==filter)return false;
    const name=(card.name+' '+(card.number??'')).toLowerCase();
    return terms.every(term=>name.includes(term));
  });
}
function searchPickerCards(query){
  pickerSearchQuery=String(query||'').slice(0,100);
  renderPickerCards(pickerSuitFilter);
}
function selectPickerCard(name){
  if(!pickerPosId)return;
  const position=pickerPosId;
  const card=currentCards.find(item=>item.name===name);
  if(!card)return;
  state.cardSystem=card.system==='tarot'?'tarot':(state.cardSystem==='playing-joker'?'playing-joker':'playing');
  state.cardSystemEstablished=true;
  syncUploadDeckSelectors();
  const btn=document.querySelector(`.card-pick-btn[data-pos="${pickerPosId}"]`);
  if(btn){btn.textContent=card.name;btn.classList.add('selected');}
  const orientBtn=document.querySelector(`.orient-btn[data-pos="${pickerPosId}"]`);
  const reviewing=document.getElementById('screen-overview')?.classList.contains('active');
  const existing=position==='drop'?state.droppedCard:state.cards[position];
  const orient=reviewing
    ?(existing?.name===card.name?existing.orientation:'unknown')
    :(orientBtn?.dataset.orient||'upright');
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
  autoSaveState();
  if(reviewing){
    renderOverview();
    document.getElementById('review-edit-'+position)?.focus();
  }
}

// ===== JOURNAL =====
function setReadingReadyState(ready){
  const screen=document.getElementById('screen-reading');
  if(!screen)return;
  screen.classList.toggle('reading-ready',!!ready);
  screen.classList.toggle('reading-loading',!ready);
  screen.setAttribute('aria-busy',ready?'false':'true');
}

function renderReadingSaveStatus(){
  const section=document.getElementById('journal-section');
  if(!section)return;
  const premium=isPremium();
  const saved=getSavedCurrentReading();
  section.hidden=!premium||!!saved;
  document.getElementById('journal-premium-preview').hidden=premium||!!saved;
  document.getElementById('journal-composer').hidden=!premium;
  document.getElementById('journal-reflection-prompt').textContent=state.readingPackage?.reflectionQuestions?.[0]||'What do you want to remember about this reading?';
  document.getElementById('reading-monthly-offer').hidden=premium||(getUsage().monthlyCount||0)<3;
  document.getElementById('reading-save-primary').hidden=!!saved;
  const quickSave=document.getElementById('reading-quick-save');
  const quickSaved=document.getElementById('reading-quick-saved');
  if(quickSave)quickSave.hidden=!!saved;
  if(quickSaved)quickSaved.hidden=!saved;
  document.getElementById('reading-save-hint').textContent=premium?'Your reflection will be linked to this reading.':`Free keeps up to ${FREE_READING_ARCHIVE_LIMIT} readings in this browser.`;
  document.getElementById('reading-save-status').hidden=!saved;
  const message=document.getElementById('reading-save-message');
  const hasReflection=saved&&readStoredJson('arcana-journal',[]).some(entry=>entry?.readingId===saved.id);
  const text=saved?(hasReflection?'Your reading and reflection are together in your journal.':'Your reading is in your journal.'):'';
  if(message.textContent!==text)message.textContent=text;
  document.getElementById('reading-first-backup').hidden=!saved||saved.id!==firstSavedReadingId;
}
