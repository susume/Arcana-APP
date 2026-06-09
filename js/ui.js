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
  app.dataset.templatesLoaded='true';
}

// ===== NAVIGATION =====
function routeForScreen(id){return String(id||'').replace(/^screen-/,'');}
function screenForRoute(route){return route&&route.startsWith('screen-')?route:'screen-'+(route||'welcome');}
function navigate(route){goScreen(screenForRoute(route),true);}
function goScreen(id, fromRouter){
  if(id==='screen-history' && !requestPremiumFeature('history')){
    id='screen-welcome';
  }
  if(!fromRouter && location.hash !== '#'+routeForScreen(id)) location.hash = '#'+routeForScreen(id);
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
  if(id==='screen-history')renderHistory();
  updateDots(id);
  updateProgressEstimate(id);
  renderEntitlementsUI();
  autoSaveState();
}
const GUIDED_SCREENS=['screen-spread','screen-reflection','screen-card-entry','screen-overview','screen-reading'];
function updateDots(screenId){
  const idx=GUIDED_SCREENS.indexOf(screenId);
  if(idx<0)return;
  document.querySelectorAll('.step-dots').forEach(container=>{
    container.innerHTML='';
    GUIDED_SCREENS.forEach((_,i)=>{
      const d=document.createElement('div');
      d.className='dot'+(i===idx?' active':'')+(i<idx?' done':'');
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
  state.readerLifeStage='';
  state.guidedStep=0;
  state.readingUsageRecorded=false;
  state.concerns=[];
  // Reset drop toggle UI
  const tog=document.getElementById('drop-toggle');
  if(tog){tog.classList.remove('on')}
  document.getElementById('drop-card-entry').style.display='none';
  // Reset concern inputs
  const cl=document.getElementById('concern-list');
  cl.innerHTML='<div class="concern-row"><input type="text" placeholder="What\'s on your mind?" class="concern-input"><button class="btn btn-sm btn-danger" onclick="removeConcern(this)" title="Remove">✕</button></div>';
  document.querySelectorAll('.tag-chip').forEach(t=>t.classList.remove('active'));
  const lifeStage=document.getElementById('reader-life-stage');
  if(lifeStage)lifeStage.value='';
  state.cardSystem='tarot';
  currentCards=getCards();
  goScreen('screen-spread');
}
function startQuick(){
  state.mode='quick';
  state.uploadedImage=null;
  state.quickSpreadId=null;
  state.narrative='';
  state.readingUsageRecorded=false;
  state.cards={};
  state.readerLifeStage='';
  document.getElementById('quick-results').innerHTML='';
  document.getElementById('quick-concern').value='';
  const lifeStage=document.getElementById('quick-reader-life-stage');
  if(lifeStage)lifeStage.value='';
  const zone=document.getElementById('quick-upload-zone');
  zone.classList.remove('has-image');
  zone.innerHTML='<p style="color:var(--muted)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6.6" width="18" height="13" rx="2.6"/><circle cx="12" cy="13.1" r="3.4"/><path d="M8.4 6.6 9.6 4.4h4.8L15.6 6.6"/></svg>Click or drag a photo of your spread<br><span style="font-size:11px">JPG, PNG, WEBP</span></p>';
  document.getElementById('quick-go').style.display='none';
  renderQuickSpreads();
  goScreen('screen-quick');
}

// ===== CONCERNS =====
function addConcern(){
  const list=document.getElementById('concern-list');
  const row=document.createElement('div');
  row.className='concern-row';
  row.innerHTML='<input type="text" placeholder="Another concern…" class="concern-input"><button class="btn btn-sm btn-danger" onclick="removeConcern(this)" title="Remove">✕</button>';
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
  document.querySelectorAll('#screen-card-system .card-opt').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  currentCards=getCards();
}
function confirmSystem(){
  if(!state.cardSystem){alert('Please select a card system.');return;}
  currentCards=getCards();
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
      const card=document.createElement('div');
      card.className='spread-card'+(state.spreadId===sp.id?' selected':'');
      card.onclick=()=>{selectSpread(sp.id,card)};
      card.innerHTML=`<h4>${sp.name}</h4><div class="count">${sp.id==='custom'?'Custom positions':(sp.cardCount===1?'1 card':sp.cardCount+' cards')}</div>`;
      grid.appendChild(card);
    });
  });
}
function selectSpread(id,el){
  state.spreadId=id;
  document.querySelectorAll('.spread-card').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
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
  if(!state.spreadId){alert('Please select a reading type.');return;}
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
  el.classList.add('selected');
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
}

function confirmReflection(){
  state.cards={};
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
  const text='Step '+(idx+1)+' of '+total+(minsLeft>0?' — About '+minsLeft+' minute'+(minsLeft>1?'s':'')+' remaining':'');
  const el=document.getElementById('progress-'+screenId.replace('screen-',''));
  if(el)el.textContent=text;
}

// ===== SOCIAL SHARING =====
function getReadingSpread(){
  return SPREADS.find(s=>s.id===(state.mode==='quick'?(state.quickSpreadId||state.spreadId):state.spreadId));
}

async function shareReading(){
  const content=[document.getElementById('reading-content'),document.getElementById('quick-reading-content')]
    .find(el=>el&&el.innerText.trim());
  const text=state.narrative||(content?content.innerText.trim():'');
  if(!text)return;
  const spread=getReadingSpread();
  const title=spread?`Arcana - ${spread.name}`:'Arcana Reading';
  if(navigator.share){
    try{
      await navigator.share({title,text});
      return;
    }catch(e){
      if(e&&e.name==='AbortError')return;
    }
  }
  showShareModal({text,spread:spread?spread.name:'Reading',title});
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
    modal.addEventListener('click',e=>{if(e.target===modal)closeShareModal();});
    document.body.appendChild(modal);
  }
  modal.innerHTML=`<div class="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
    <button class="close-btn" onclick="closeShareModal()" aria-label="Close share options">&times;</button>
    <h3 id="share-title">Share Reading</h3>
    <p class="share-help">Use your browser share sheet, copy the text, or download a simple image.</p>
    <textarea id="share-text" readonly>${escapeHtml(data.text)}</textarea>
    <canvas id="share-canvas" width="600" height="800"></canvas>
    <div class="share-actions">
      <button class="btn btn-primary" onclick="copyShareText()">Copy Text</button>
      <button class="btn" onclick="downloadShareImage()">Download Image</button>
      <button class="btn" onclick="closeShareModal()">Close</button>
    </div>
  </div>`;
  modal.classList.add('open');
  renderShareCanvas(data);
}
function closeShareModal(){
  const modal=document.getElementById('share-modal');
  if(modal)modal.classList.remove('open');
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeShareModal();
});
async function copyShareText(){
  const text=document.getElementById('share-text')?.value||'';
  if(!text)return;
  try{
    await navigator.clipboard.writeText(text);
    showToast('Reading copied.');
  }catch(e){
    const input=document.getElementById('share-text');
    input.focus();
    input.select();
    document.execCommand('copy');
    showToast('Reading copied.');
  }
}
function downloadShareImage(){
  const canvas=document.getElementById('share-canvas');
  const link=document.createElement('a');
  link.download='arcana-reading.png';
  link.href=canvas.toDataURL();
  link.click();
}
function shareNative(){
  const canvas=document.getElementById('share-canvas');
  canvas.toBlob(function(blob){
    if(navigator.share){
      navigator.share({files:[new File([blob],'arcana-reading.png',{type:'image/png'})],title:'My Arcana Reading'}).catch(function(){});
    }else{
      downloadShareImage();
    }
  });
}
function escapeHtml(value){
  return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function renderShareCanvas(data){
  const canvas=document.getElementById('share-canvas');
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#1a1025';ctx.fillRect(0,0,600,800);
  ctx.fillStyle='#e8dff0';ctx.font='bold 28px serif';ctx.textAlign='center';
  ctx.fillText('Arcana Reading',300,50);
  ctx.font='16px sans-serif';ctx.fillStyle='#a88bc4';
  ctx.fillText(data.spread,300,80);
  ctx.textAlign='left';ctx.fillStyle='#d4c5e0';ctx.font='14px sans-serif';
  const lines=data.text.split('\n').slice(0,30);
  let y=120;
  lines.forEach(function(line){
    if(y<780){ctx.fillText(line.substring(0,70),30,y);y+=20;}
  });
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
  h+='<p class="summary-copy">'+(spread?spread.name:'Your reading')+' with '+cardNames.length+' card'+(cardNames.length===1?'':'s')+' drawn. Review the key themes first, then continue into the full reading.</p>';
  h+='<div class="summary-meta">';
  h+='<span class="summary-cards">'+(spread?spread.name:'Reading')+'</span>';
  if(state.readerLifeStage)h+='<span class="major-badge">'+state.readerLifeStage+'</span>';
  if(hasMajor)h+='<span class="major-badge">Major Arcana Present</span>';
  if(reversedCount)h+='<span class="major-badge">'+reversedCount+' Reversed</span>';
  h+='</div>';
  h+='<h4 class="summary-subtitle">Key Themes</h4>';
  h+='<div class="summary-themes">'+themes.slice(0,5).map(t=>'<span class="theme-tag">'+t+'</span>').join('')+'</div>';
  h+='<p class="ai-disclaimer">AI-assisted readings are for reflection and personal insight only. They are not professional medical, legal, financial, mental-health, or crisis advice.</p>';
  h+='<h4 class="summary-subtitle">Full Reading</h4>';
  h+='</div>';
  content.insertAdjacentHTML('afterbegin',h);
}

// ===== CARD ENTRY =====
function switchTab(tabId,btn){
  ['tab-guided','tab-upload','tab-manual'].forEach(t=>document.getElementById(t).style.display='none');
  document.getElementById(tabId).style.display='block';
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

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
  'Almost there — this card holds deep meaning…'
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
    const ms=(idx)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot ${cls}"><div class="slot-num">${pos.id}</div><div class="slot-label">${pos.name}</div></div>`;};
    return`<div class="spread-diagram celtic-layout"><div class="celtic-cross"><div class="spread-row">${ms(4)}</div><div class="spread-row">${ms(3)}${ms(0)}${ms(1)}${ms(5)}</div><div class="spread-row">${ms(2)}</div></div><div class="celtic-staff">${ms(9)}${ms(8)}${ms(7)}${ms(6)}</div></div>`;
  }else if(spread.layout==='celtic-simple'){
    const ms=(idx,wide)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot ${cls}${wide?' slot-wide':''}"><div class="slot-num">${pos.id}</div><div class="slot-label">${pos.name}</div></div>`;};
    return`<div class="spread-diagram celtic-simple-layout"><div class="spread-row">${ms(3)}</div><div class="spread-row">${ms(4)}${ms(0)}${ms(5)}</div><div class="spread-row">${ms(1,true)}</div><div class="spread-row">${ms(2)}</div></div>`;
  }else if(spread.layout==='yearly'){
    const ms=(idx)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot clock-slot clock-${pos.id} ${cls}"><div class="slot-num">${pos.id}</div><div class="slot-label">${pos.name}</div></div>`;};
    return`<div class="spread-diagram yearly-clock-layout">${spread.positions.map((_,i)=>ms(i)).join('')}</div>`;
  }else if(spread.layout==='romany'){
    const ms=(idx)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot ${cls}"><div class="slot-num">${pos.id}</div><div class="slot-label">${pos.name}</div></div>`;};
    const mkCol=(label,...idxs)=>`<div class="romany-col"><div class="romany-col-label">${label}</div>${idxs.map(ms).join('')}</div>`;
    return`<div class="spread-diagram romany-layout">${mkCol('Emotion',0,1,2)}${mkCol('Relationships',3,4,5)}${mkCol('Hopes & Career',6,7,8)}${mkCol('Finances',9,10,11)}${mkCol('Spiritual',12,13,14)}${mkCol('Obstacles',15,16,17)}${mkCol('Health & Future',18,19,20)}</div>`;
  }else if(spread.layout==='two-pathways'){
    const ms=(idx)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot two-path-${pos.id} ${cls}"><div class="slot-num">${pos.id}</div><div class="slot-label">${pos.name}</div></div>`;};
    return`<div class="spread-diagram two-pathways-layout">${spread.positions.map((_,i)=>ms(i)).join('')}</div>`;
  }else if(spread.layout==='relationship'){
    const ms=(idx,wide)=>{const pos=spread.positions[idx];if(!pos)return'';const cls=idx<activeIdx?'done':idx===activeIdx?'active':'';return`<div class="slot ${cls}${wide?' slot-wide':''}"><div class="slot-num">${pos.id}</div><div class="slot-label">${pos.name}</div></div>`;};
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
      const check=idx<activeIdx?'✓':'';
      html+=`<div class="slot ${cls}">
        <div class="slot-num">${check||pos.id}</div>
        <div class="slot-label">${pos.name}</div>
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
    // All cards placed — show photo upload
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
    <div class="ritual-pos">${pos.name}</div>
    <div class="ritual-desc">${pos.description}</div>
    <p style="font-size:11px;color:var(--muted)">Draw a card from your deck and place it face-up in position <strong style="color:var(--gold)">${pos.id}</strong> (highlighted above).</p>
  </div>`;

  actions.innerHTML=`<button class="btn btn-primary" onclick="nextGuidedPosition()">${GLYPH.star4} Card Placed — Next</button>
    ${state.guidedStep>0?'<button class="btn btn-sm" onclick="prevGuidedPosition()" style="margin-left:8px">← Back</button>':''}`;
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

async function identifyGuidedCards(){
  try{requireAIConfiguration();}catch(e){alert(e.message);return;}
  const spread=getSpread();
  const btn=document.getElementById('guided-identify-btn');
  btn.disabled=true;btn.textContent='Identifying…';
  try{
    const posDetails=spread.positions.map(p=>`  ${p.id}. ${p.name} — ${p.description}`).join('\n');
    const prompt=`You are identifying tarot cards in a photograph of a spread.

SPREAD: ${spread.name} (${spread.cardCount} cards) — ${spread.description}
${getSpreadLayoutHint(spread)}

POSITIONS:
${posDetails}

Examine the photo carefully. For each numbered position, identify the card name and whether it is upright or reversed.
Card names must use standard Rider-Waite-Smith names (e.g. "The Fool", "Ace of Cups", "Queen of Swords", "Ten of Pentacles").
Return ONLY a valid JSON array with no other text:
[{"position":1,"card":"Card Name","orientation":"upright"},...]\nIf a card is unclear or not visible, set "card" to null.`;
    const result=await callGemini(prompt,null,state.uploadedImage);
    const match=result.match(/\[[\s\S]*?\]/);
    if(match){
      const identified=JSON.parse(match[0]);
      identified.forEach(item=>{
        if(item.card){
          state.cards[item.position]={name:item.card,orientation:item.orientation||'upright'};
        }
      });
      buildManualEntries(spread);
      document.getElementById('guided-identify-results').innerHTML='<p style="color:var(--success);font-size:12px;margin-top:8px">✓ Cards identified! Click "Review Cards" below to verify and continue.</p>';
    }
  }catch(err){
    document.getElementById('guided-identify-results').innerHTML=`<p style="color:var(--danger);font-size:12px;margin-top:8px">Error: ${err.message}. Try switching to Manual Entry tab.</p>`;
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
    row.innerHTML=`
      <span class="pos-name">${pos.name}</span><span class="pos-desc-hint">${pos.description}</span>
      <button class="card-pick-btn${existing?' selected':''}" onclick="openCardPicker('${pos.id}')" data-pos="${pos.id}">${existing?existing.name:'Choose card...'}</button>
      <div class="orient-btn ${existing&&existing.orientation==='reversed'?'reversed':''}" onclick="toggleOrient(this)" data-orient="${existing?existing.orientation:'upright'}" title="Toggle orientation">${existing&&existing.orientation==='reversed'?'↓':'↑'}</div>`;
    container.appendChild(row);
  });
}

function buildSuitFilter(){
  const container=document.getElementById('suit-filter');
  container.innerHTML='<span class="suit-btn active" onclick="filterSuit(null,this)">All</span>';
  if(state.cardSystem==='tarot'){
    container.innerHTML+=`<span class="suit-btn" onclick="filterSuit('major',this)">Major</span>`;
    TAROT_SUITS.forEach(s=>{
      container.innerHTML+=`<span class="suit-btn" onclick="filterSuit('${s}',this)">${TAROT_SUIT_NAMES[s]}</span>`;
    });
  }else{
    PLAYING_SUITS.forEach(s=>{
      container.innerHTML+=`<span class="suit-btn" onclick="filterSuit('${s}',this)">${s.charAt(0).toUpperCase()+s.slice(1)}</span>`;
    });
  }
}
let activeSuitFilter=null;
function filterSuit(suit,el){
  activeSuitFilter=suit;
  document.querySelectorAll('.suit-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
}

function toggleOrient(el){
  if(el.dataset.orient==='upright'){
    el.dataset.orient='reversed';
    el.textContent='↓';
    el.classList.add('reversed');
  }else{
    el.dataset.orient='upright';
    el.textContent='↑';
    el.classList.remove('reversed');
  }
}
function toggleDrop(){
  const tog=document.getElementById('drop-toggle');
  tog.classList.toggle('on');
  state.hasDroppedCard=tog.classList.contains('on');
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
    item.innerHTML=`${renderCardArt(card,'tarot-card-thumb dropdown-card-art',72)}<span>${card.name}</span>`;
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

function processQuickUpload(file){
  const reader=new FileReader();
  reader.onload=e=>{
    state.uploadedImage=e.target.result;
    const zone=document.getElementById('quick-upload-zone');
    zone.classList.add('has-image');
    zone.innerHTML=`<img src="${e.target.result}" alt="Uploaded spread">`;
    updateQuickGoBtn();
  };
  reader.readAsDataURL(file);
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
      const card=document.createElement('div');
      const locked=PREMIUM_SPREAD_IDS.includes(sp.id)&&!isPremium();
      card.className='spread-card qs-card'+(state.quickSpreadId===sp.id?' selected':'')+(locked?' premium-locked':'');
      card.dataset.premiumFeature=PREMIUM_SPREAD_IDS.includes(sp.id)?'advanced-spreads':'';
      card.onclick=()=>locked?showUpgradeModal('advanced-spreads'):selectQuickSpread(sp.id);
      card.innerHTML=`<h4>${sp.name}</h4><div class="count">${sp.cardCount} cards${locked?' - Premium':''}</div>`;
      grid.appendChild(card);
    });
  });
  renderEntitlementsUI();
}
function processUpload(file,zoneId,btnId){
  const reader=new FileReader();
  reader.onload=e=>{
    state.uploadedImage=e.target.result;
    const zone=document.getElementById(zoneId);
    zone.classList.add('has-image');
    zone.innerHTML=`<img src="${e.target.result}" alt="Uploaded spread">`;
    document.getElementById(btnId).style.display='block';
  };
  reader.readAsDataURL(file);
}

async function identifyCards(){
  try{requireAIConfiguration();}catch(e){alert(e.message);return;}
  const spread=getSpread();
  const btn=document.getElementById('identify-btn');
  btn.disabled=true;btn.textContent='Identifying…';
  try{
    const posDetails=spread.positions.map(p=>`  ${p.id}. ${p.name} — ${p.description}`).join('\n');
    const prompt=`You are identifying tarot cards in a photograph of a spread.

SPREAD: ${spread.name} (${spread.cardCount} cards) — ${spread.description}
${getSpreadLayoutHint(spread)}

POSITIONS:
${posDetails}

Examine the photo carefully. For each numbered position in the layout above, identify the card name and whether it is upright or reversed.
Card names must use standard Rider-Waite-Smith names (e.g. "The Fool", "Ace of Cups", "Queen of Swords", "Ten of Pentacles").
Return ONLY a valid JSON array with no other text:
[{"position":1,"card":"Card Name","orientation":"upright"},...]\nIf a card is unclear or not visible, set "card" to null.`;
    const result=await callGemini(prompt,null,state.uploadedImage);
    const match=result.match(/\[[\s\S]*?\]/);
    if(match){
      const identified=JSON.parse(match[0]);
      identified.forEach(item=>{
        if(item.card){
          state.cards[item.position]={name:item.card,orientation:item.orientation||'upright'};
        }
      });
      buildManualEntries(spread);
      document.getElementById('upload-results').innerHTML='<p style="color:var(--success);font-size:12px;margin-top:8px">Cards identified. Switch to Manual Entry tab to review and correct.</p>';
    }
  }catch(err){
    document.getElementById('upload-results').innerHTML=`<p style="color:var(--danger);font-size:12px;margin-top:8px">Error: ${err.message}. Try manual entry instead.</p>`;
  }
  btn.disabled=false;btn.innerHTML=GLYPH.star4+' Identify Cards with AI';
}

function confirmCards(){
  const spread=getSpread();
  // Collect from manual entries if not yet stored
  document.querySelectorAll('#manual-entries .card-entry-row').forEach(row=>{
    const inp=row.querySelector('input[data-pos]');
    if(!inp)return;
    const posId=inp.dataset.pos;
    const val=inp.value.trim();
    const orient=row.querySelector('.orient-btn').dataset.orient;
    if(val)state.cards[posId]={name:val,orientation:orient};
  });
  // Check drop card
  if(state.hasDroppedCard){
    const dropInput=document.querySelector('#drop-card-entry input[data-pos="drop"]');
    const dropOrient=document.querySelector('#drop-card-entry .orient-btn');
    if(dropInput&&dropInput.value.trim()){
      state.droppedCard={name:dropInput.value.trim(),orientation:dropOrient.dataset.orient};
    }
  }
  // Validate — check both numeric and string keys since positions use numeric ids
  let filled=0;
  spread.positions.forEach(p=>{if(state.cards[p.id]||state.cards[String(p.id)])filled++});
  if(filled<spread.cardCount){
    if(!confirm(`You have ${filled} of ${spread.cardCount} cards entered. Continue anyway?`))return;
  }
  renderOverview();
  goScreen('screen-overview');
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
      tile.innerHTML=`<div class="c-pos">${pos.name}</div><div style="color:var(--muted);font-size:12px;margin-top:12px;cursor:pointer" onclick="goScreen('screen-card-entry')">Unknown — tap to set</div>`;
    }else{
      const art=card?renderCardArt(card,'tarot-card-thumb overview-card-art',180):'<span class="card-art-fallback">?</span>';
      const kws=card?card.keywords.slice(0,3):[];
      tile.innerHTML=`
        <div class="suit-sym">${art}</div>
        <div class="c-name">${entry.name}</div>
        <div class="c-pos">${pos.name}</div>
        <span class="orient ${entry.orientation}">${entry.orientation==='upright'?'↑ Upright':'↓ Reversed'}</span>
        <div class="kw">${kws.map(k=>`<span>${k}</span>`).join('')}</div>`;
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
      <div class="c-name">${state.droppedCard.name}</div>
      <span class="orient ${state.droppedCard.orientation}">${state.droppedCard.orientation==='upright'?'↑ Upright':'↓ Reversed'}</span>
      <div class="kw">${kws.map(k=>`<span>${k}</span>`).join('')}</div>
      <p style="font-size:10px;color:var(--muted);margin-top:6px;font-style:italic">This card jumped out during shuffling — it may reveal an underlying theme influencing your reading.</p>
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

async function quickRead(){
  if(!canGenerateReading()){
    showUpgradeModal('daily-limit');
    return;
  }
  const settings=loadSettings();
  try{requireAIConfiguration();}catch(e){alert(e.message);return;}
  if(!state.uploadedImage){alert('Please upload a photo first.');return;}
  const concern=document.getElementById('quick-concern').value.trim();
  state.concerns=concern?[concern]:[];
  saveReaderContext('quick-reader-life-stage');
  state.cardSystem=state.cardSystem||'tarot';
  const results=document.getElementById('quick-results');
  results.innerHTML=thoughtfulLoadingHtml('quick-ai-status');
  try{
    const qs=state.quickSpreadId?SPREADS.find(s=>s.id===state.quickSpreadId):null;
    let prompt;
    if(qs){
      const layoutHint=getCleanSpreadLayoutHint(qs);
      const posLines=qs.positions.map(p=>p.id+'. '+p.name+': '+p.description).join('\n');
      prompt=`You are a skilled tarot reader analyzing a photograph of a ${qs.name} spread (${qs.cardCount} cards).

${layoutHint}

POSITION MEANINGS:
${posLines}

For each visible card, identify its name, orientation (upright/reversed), and position, then interpret through that position's meaning.

## Introduction  - Overall theme and mood of this ${qs.name} reading
## Position-by-Position  - Card name + orientation + position meaning + interpretation
## Pattern Analysis  - Dominant suits, Major Arcana presence, reversals, key interactions
## Guidance  - Practical, actionable advice

${concern?'Querent concern: '+concern:'No specific concern - provide general guidance.'}
Reader context: ${readerContextLine()}
Life-stage guidance: ${readerSafetyInstruction()}
Disclaimer: This is an AI-assisted reflective reading, not medical, legal, financial, mental-health, or crisis advice. Avoid definitive predictions and encourage professional or trusted human support when the topic is serious.
Reading style: ${settings.readingStyle}. Tone: ${settings.readingTone}.

Write as a flowing narrative grounded in both card meaning and positional context. Be specific.`;
    }else{
      const spreadRef=buildQuickSpreadRef();
      prompt=`You are a skilled tarot reader analyzing a photograph of a card spread.

KNOWN SPREADS (match the layout in the photo to one of these):
${spreadRef}

STEP 1 - IDENTIFY:
- Determine the card system (tarot Rider-Waite-Smith, or playing cards)
- Match the layout to a known spread above, or describe it if unknown
- For each visible card, identify: position number, card name, orientation (upright/reversed)
- Use standard RWS card names (e.g. "The Fool", "Ace of Cups", "Queen of Swords")

STEP 2 - READ:
Generate a complete reading using ## markdown headers:
## Introduction - Overall theme and mood of the spread
## Position-by-Position - For each card, name the position and its meaning in this spread, then interpret the card through that positional lens
## Pattern Analysis - Dominant suits, Major Arcana presence, reversals, card interactions
## Guidance - Practical, actionable advice

${concern?'Querent concern: '+concern:'No specific concern - provide general guidance.'}
Reader context: ${readerContextLine()}
Life-stage guidance: ${readerSafetyInstruction()}
Disclaimer: This is an AI-assisted reflective reading, not medical, legal, financial, mental-health, or crisis advice. Avoid definitive predictions and encourage professional or trusted human support when the topic is serious.
Reading style: ${settings.readingStyle}. Tone: ${settings.readingTone}.

Write as a flowing narrative. Address BOTH the card meaning AND its positional context. Be specific.`;
    }
    const narrative=await callGemini(prompt,null,state.uploadedImage,document.getElementById('quick-ai-status'));
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
      <div class="nav-row" style="margin-top:16px">
        <button class="btn" onclick="printReading()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9.5V4.2h10v5.3"/><rect x="4.4" y="9.5" width="15.2" height="7.4" rx="1.6"/><rect x="7.4" y="14" width="9.2" height="5.4"/><circle cx="16.6" cy="12.2" r=".7" fill="currentColor" stroke="none"/></svg> Print</button>
        <button class="btn btn-primary" onclick="saveReading()" data-premium-feature="history"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.3L6 20V5.5a1 1 0 0 1 1-1Z"/></svg> Save Reading</button>
      </div>`);
    renderJournalSection(results);
    renderEntitlementsUI();
  }catch(e){
    results.innerHTML=`<p style="color:var(--danger)">Error: ${e.message}</p>`;
  }
}

function renderReadingInto(container,text){
  // Reuse same markdown logic as renderReading
  const lines=text.split('\n');
  let html='';let inList=false;
  lines.forEach(line=>{
    const trimmed=line.trim();
    if(trimmed.startsWith('## ')){
      if(inList){html+='</ul>';inList=false}
      html+=`<div class="reading-section"><h3>${trimmed.slice(3)}</h3>`;
    }else if(trimmed.startsWith('- ')){
      if(!inList){html+='<ul>';inList=true}
      html+=`<li>${trimmed.slice(2)}</li>`;
    }else if(trimmed===''){
      if(inList){html+='</ul>';inList=false}
      html+='</p><p>';
    }else{
      if(inList){html+='</ul>';inList=false}
      html+=trimmed+'<br>';
    }
  });
  if(inList)html+='</ul>';
  html='<p>'+html+'</p>';
  html=html.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>');
  html=html.replace(/<p><\/p>/g,'').replace(/<p><br>/g,'<p>').replace(/<br><\/p>/g,'</p>');
  const sections=html.split('<div class="reading-section">');
  if(sections.length>1){
    html=sections[0]+sections.slice(1).map(s=>'<div class="reading-section">'+s+'</div>').join('');
  }
  container.innerHTML=html;
}

// ===== TOAST NOTIFICATION =====
function showToast(msg){
  let t=document.getElementById('app-toast');
  if(!t){t=document.createElement('div');t.id='app-toast';t.className='toast';document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2400);
}

// ===== HISTORY =====
function renderHistory(){
  const list=document.getElementById('history-list');
  const readings=JSON.parse(localStorage.getItem('arcana_readings')||'[]');
  if(!readings.length){list.innerHTML='<p style="text-align:center;color:var(--muted);padding:40px">No saved readings yet. Complete a reading and save it to see it here.</p>';return;}
  const visibleReadings=isPremium()?readings:readings.slice(0,3);
  const freeNote=!isPremium()&&readings.length>3?'<p class="history-limit-note">Showing your latest 3 readings. Premium unlocks the full saved history.</p>':'';
  list.innerHTML=freeNote+'<div class="history-tools"><button class="btn btn-sm" onclick="compareSelectedReadings()" data-premium-feature="comparison">Compare Selected</button></div><div id="comparison-output"></div>';
  visibleReadings.forEach((r,i)=>{
    const d=new Date(r.date);
    const readerContext=[r.readerLifeStage||''].filter(Boolean).join(' / ');
    const item=document.createElement('div');
    item.className='history-item';
    item.innerHTML=`
      <div class="history-header" onclick="this.nextElementSibling.classList.toggle('open')">
        <input class="compare-reading-check" type="checkbox" value="${i}" onclick="event.stopPropagation()" title="Select for comparison">
        <div><h4 style="font-size:13px">${r.title||'Untitled Reading'}</h4><span style="font-size:11px;color:var(--muted)">${r.spreadName||r.spread} / ${r.cardSystem}</span></div>
        <span class="h-date">${d.toLocaleDateString()}</span>
      </div>
      <div class="history-body">
        ${r.concerns&&r.concerns.length?`<p style="font-size:12px;color:var(--muted);margin-bottom:8px"><strong>Concerns:</strong> ${r.concerns.join(', ')}</p>`:''}
        ${readerContext?`<p style="font-size:12px;color:var(--muted);margin-bottom:8px"><strong>Reader context:</strong> ${readerContext}</p>`:''}
        <div id="history-reading-${i}" style="margin-bottom:12px"></div>
        <label style="font-size:11px;color:var(--gold)">Journal Notes</label>
        <textarea style="margin-top:4px" placeholder="Add your reflections..." oninput="updateNote(${i},this.value)">${r.notes||''}</textarea>
        <div style="margin-top:8px;text-align:right">
          <button class="btn btn-sm btn-danger" onclick="deleteReading(${i})">Delete</button>
        </div>
      </div>`;
    list.appendChild(item);
    // Render reading content
    const readingDiv=document.getElementById(`history-reading-${i}`);
    renderReadingInto(readingDiv,r.narrative||'No reading content saved.');
  });
  renderEntitlementsUI();
}
function updateNote(idx,val){
  const readings=JSON.parse(localStorage.getItem('arcana_readings')||'[]');
  if(readings[idx]){readings[idx].notes=val;localStorage.setItem('arcana_readings',JSON.stringify(readings))}
}
function deleteReading(idx){
  if(!confirm('Delete this reading?'))return;
  const readings=JSON.parse(localStorage.getItem('arcana_readings')||'[]');
  readings.splice(idx,1);
  localStorage.setItem('arcana_readings',JSON.stringify(readings));
  renderHistory();
}

// ===== MODALS =====
function openModal(id){document.getElementById(id).classList.add('open');if(id==='modal-settings')loadSettingsUI()}
function closeModal(id){document.getElementById(id).classList.remove('open')}
document.querySelectorAll('.modal-overlay').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)})});

// ===== CARD PICKER =====
let pickerPosId=null;
function openCardPicker(posId){
  pickerPosId=posId;
  const filterEl=document.getElementById('picker-filter');
  filterEl.innerHTML='<button class="picker-suit-btn active" onclick="filterPickerSuit(null,this)">All</button>';
  if(state.cardSystem==='tarot'){
    filterEl.innerHTML+=`<button class="picker-suit-btn" onclick="filterPickerSuit('major',this)">Major Arcana</button>`;
    TAROT_SUITS.forEach(s=>{
      filterEl.innerHTML+=`<button class="picker-suit-btn" onclick="filterPickerSuit('${s}',this)">${TAROT_SUIT_NAMES[s]}</button>`;
    });
  }else{
    PLAYING_SUITS.forEach(s=>{
      filterEl.innerHTML+=`<button class="picker-suit-btn" onclick="filterPickerSuit('${s}',this)">${s.charAt(0).toUpperCase()+s.slice(1)}</button>`;
    });
  }
  document.getElementById('card-picker-modal').classList.add('open');
  document.body.style.overflow='hidden';
  renderPickerCards(null);
}
function closeCardPicker(){
  document.getElementById('card-picker-modal').classList.remove('open');
  document.body.style.overflow='';
  pickerPosId=null;
}
function filterPickerSuit(suit,el){
  document.querySelectorAll('.picker-suit-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  renderPickerCards(suit);
}
function renderPickerCards(filter){
  let cards=currentCards;
  if(filter==='major')cards=cards.filter(c=>c.arcana==='major');
  else if(filter)cards=cards.filter(c=>c.suit===filter);
  const list=document.getElementById('card-picker-list');
  list.innerHTML=cards.map(card=>{
    const esc=card.name.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    return`<div class="card-picker-item" onclick="selectPickerCard(this.dataset.n)" data-n="${esc}">${renderCardArt(card,'tarot-card-thumb picker-card-art',96)}<span>${card.name}</span></div>`;
  }).join('');
}
function selectPickerCard(name){
  if(!pickerPosId)return;
  const btn=document.querySelector(`.card-pick-btn[data-pos="${pickerPosId}"]`);
  if(btn){btn.textContent=name;btn.classList.add('selected');}
  const orientBtn=document.querySelector(`.orient-btn[data-pos="${pickerPosId}"]`);
  const orient=orientBtn?orientBtn.dataset.orient:'upright';
  if(pickerPosId==='drop'){state.droppedCard={name,orientation:orient};}
  else{state.cards[pickerPosId]={name,orientation:orient};}
  closeCardPicker();
}

// ===== JOURNAL =====
function renderJournalSection(container){
  if(!container || container.querySelector('.journal-section'))return;
  const section=document.createElement('div');
  section.className='journal-section no-print';
  section.dataset.premiumFeature='journal';
  section.innerHTML=`
    <div class="journal-prompt">Reflection</div>
    <p class="reflection-question">What stood out most to you?</p>
    <textarea class="journal-textarea" placeholder="Write your reflection here..."></textarea>
    <button class="btn btn-sm" onclick="saveJournal()" style="margin-top:8px">Save Reflection</button>`;
  container.appendChild(section);
}

function saveJournal(){
  if(!requestPremiumFeature('journal')) return;
  const journalRoot=event&&event.currentTarget&&event.currentTarget.closest ? event.currentTarget.closest('.journal-section') : document.getElementById('journal-section');
  const textarea=journalRoot&&journalRoot.querySelector ? journalRoot.querySelector('.journal-textarea') : document.getElementById('journal-entry');
  const txt=textarea?textarea.value.trim():'';
  if(!txt)return;
  const date=new Date().toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
  const spread=getReadingSpread();
  const entry={date,spread:spread?spread.name:'Custom',text:txt};
  const history=JSON.parse(localStorage.getItem('arcana-journal')||'[]');
  history.unshift(entry);
  localStorage.setItem('arcana-journal',JSON.stringify(history.slice(0,50)));
  const btn=event&&event.currentTarget;
  if(btn){const orig=btn.textContent;btn.textContent='Saved!';setTimeout(()=>{btn.textContent=orig},2000);}
}
