// ===== READING GENERATION =====
async function generateReading(){
  goScreen('screen-reading');
  clearAutoSave();
  const content=document.getElementById('reading-content');
  content.innerHTML='<div class="loading"><div class="spinner"></div><p>Generating your reading…</p><p id="ai-status" style="font-size:11px;color:var(--muted);margin-top:4px"></p></div>';
  const settings=loadSettings();
  if(settings.geminiKey&&state.readingMode!=='classic-forced'){
    state.readingMode='ai';
    try{
      const narrative=await generateAIReading(settings);
      state.narrative=narrative;
      renderReading(narrative);
      highlightReadingBtn('ai');
    }catch(e){
      const fallback=generateClassicReading();
      state.narrative=fallback;
      renderReading(fallback);
      highlightReadingBtn('classic');
      content.insertAdjacentHTML('afterbegin',`<p style="color:var(--danger);font-size:11px;margin-bottom:12px">AI reading failed (${e.message}). Showing classic reading instead.</p>`);
    }
  }else{
    state.readingMode='classic';
    const classic=generateClassicReading();
    state.narrative=classic;
    renderReading(classic);
    highlightReadingBtn('classic');
  }
}

function highlightReadingBtn(mode){
  document.getElementById('btn-ai-read').classList.toggle('btn-primary',mode==='ai');
  document.getElementById('btn-classic-read').classList.toggle('btn-primary',mode==='classic');
}

async function switchReadingMode(mode){
  const content=document.getElementById('reading-content');
  if(mode==='ai'){
    const settings=loadSettings();
    if(!settings.geminiKey){alert('Set your Gemini API key in Settings to use AI readings.');return;}
    content.innerHTML='<div class="loading"><div class="spinner"></div><p>Generating AI reading…</p><p id="ai-status" style="font-size:11px;color:var(--muted);margin-top:4px"></p></div>';
    try{
      const narrative=await generateAIReading(settings);
      state.narrative=narrative;
      renderReading(narrative);
      enhanceReadingOutput();
    }catch(e){
      content.innerHTML=`<p style="color:var(--danger)">Error: ${e.message}</p>`;
    }
  }else{
    const classic=generateClassicReading();
    state.narrative=classic;
    renderReading(classic);
  }
  highlightReadingBtn(mode);
}

function getSpreadLayoutHint(spread){
  if(spread.layout==='celtic')return 'LAYOUT: A cross with a vertical staff on the right.\nCross — pos 5 (Crown, top), pos 3 (Foundation, bottom), pos 1 (Present, centre), pos 2 (Challenge, crossing centre), pos 4 (Recent Past, left), pos 6 (Near Future, right).\nStaff — right column bottom-to-top: pos 7, 8, 9, 10.';
  if(spread.layout==='romany')return 'LAYOUT: 7 columns of 3 cards each, left to right.\nCol 1 Emotion: pos 1-3. Col 2 Relationships: pos 4-6. Col 3 Hopes & Career: pos 7-9. Col 4 Finances: pos 10-12. Col 5 Spiritual: pos 13-15. Col 6 Obstacles: pos 16-18. Col 7 Health & Future: pos 19-21.\nWithin each column, top card = Past (lower id), middle = Present, bottom = Future (higher id).';
  if(spread.layout==='yearly')return 'LAYOUT: 2 rows of 6 cards. Top row left-to-right = January (1) through June (6). Bottom row left-to-right = July (7) through December (12).';
  if(spread.layout==='celtic')return '';
  const n=spread.cardCount;
  if(spread.layout==='row'||n<=5)return `LAYOUT: ${n} cards in a single row, left to right, numbered 1 to ${n}.`;
  return `LAYOUT: ${n} cards, positions numbered 1 to ${n} as laid out in the photo.`;
}

async function generateAIReading(settings){
  const spread=getSpread();
  let cardLines='';
  spread.positions.forEach(pos=>{
    const entry=state.cards[pos.id];
    if(entry){
      const card=currentCards.find(c=>c.name.toLowerCase()===entry.name.toLowerCase());
      const kws=card?card.keywords.join(', '):'';
      cardLines+=`  ${pos.id}. ${pos.name} [${pos.description}]: ${entry.name} (${entry.orientation}) — Keywords: ${kws}\n`;
    }else{
      cardLines+=`  ${pos.id}. ${pos.name} [${pos.description}]: (no card entered)\n`;
    }
  });
  let droppedLine='';
  if(state.hasDroppedCard&&state.droppedCard){
    const dc=currentCards.find(c=>c.name.toLowerCase()===state.droppedCard.name.toLowerCase());
    droppedLine=`\nDropped Card (fell out during shuffling): ${state.droppedCard.name} (${state.droppedCard.orientation}) — Keywords: ${dc?dc.keywords.join(', '):''}\nThis card may reveal an underlying theme influencing the entire reading.\n`;
  }
  const specialNote=spread.id==='romany'?'\nNOTE: If the Health & Future column (cards 19-21) mirrors the Relationships column (cards 4-6) in theme, interpret it as the health of a relationship, not physical health.':spread.id==='yearly'?'\nNOTE: Any Ace signals new beginnings for that month. Major Arcana carry extra weight. A Knight indicates major life change in that period.':spread.id==='celtic-cross'?'\nNOTE: Card 2 (The Challenge) crosses Card 1 and retains its meaning regardless of orientation.':'';
  const prompt=`You are a compassionate, insightful tarot reader with deep knowledge of ${state.cardSystem==='tarot'?'traditional tarot':'playing card cartomancy'}.
Generate a complete reading with these sections, using markdown headers (##):
## Introduction — Overall theme and mood
## Position-by-Position — Each card interpreted in the specific meaning of its position
## Pattern Analysis — Dominant suits, major arcana influence, repeated numbers, reversals, card interactions
## Guidance — Practical, actionable advice
## Reflection Questions — 3-5 thoughtful journaling prompts as a bulleted list

Reading style: ${settings.readingStyle}. Tone: ${settings.readingTone}.
${state.concerns.length?'Concerns: '+state.concerns.join(', '):'No specific concerns — provide general guidance.'}

Spread: ${spread.name} — ${spread.description}
${getSpreadLayoutHint(spread)}

Positions and cards:
${cardLines}${droppedLine}${specialNote}

For each card in the Position-by-Position section, explicitly address what that specific position represents in this spread AND how the card's energy expresses through that positional lens. Write as a flowing narrative, not a list of definitions. Make connections between the cards.`;
  return await callGemini(prompt,settings.geminiKey,state.uploadedImage||null,document.getElementById('ai-status'));
}

function generateClassicReading(){
  const spread=getSpread();
  let reading='';
  // Analyze patterns
  let suitCounts={};let majorCount=0;let reversedCount=0;
  const entries=[];
  spread.positions.forEach(pos=>{
    const entry=state.cards[pos.id];
    if(!entry)return;
    const card=currentCards.find(c=>c.name.toLowerCase()===entry.name.toLowerCase());
    if(!card)return;
    entries.push({pos,entry,card});
    if(card.suit)suitCounts[card.suit]=(suitCounts[card.suit]||0)+1;
    if(card.arcana==='major')majorCount++;
    if(entry.orientation==='reversed')reversedCount++;
  });
  const dominantSuit=Object.entries(suitCounts).sort((a,b)=>b[1]-a[1])[0];

  // Dropped card
  if(state.hasDroppedCard&&state.droppedCard){
    const dc=currentCards.find(c=>c.name.toLowerCase()===state.droppedCard.name.toLowerCase());
    reading+=`## The Dropped Card\n\nBefore the reading begins, a card fell from the deck: **${state.droppedCard.name}** (${state.droppedCard.orientation}). ${dc?`This card speaks of ${state.droppedCard.orientation==='upright'?dc.upright:dc.reversed}`:'This card carries its own message.'} This jumper card often reveals an underlying energy influencing the entire spread — keep its message in mind as you read on.\n\n`;
  }

  // Introduction
  reading+=`## Introduction\n\n`;
  if(majorCount>=3)reading+=`This reading carries significant weight — ${majorCount} Major Arcana cards appear, suggesting powerful life forces and spiritual lessons at play. `;
  if(dominantSuit){
    const suitThemes={wands:'passion and creative energy',cups:'emotions and relationships',swords:'mental clarity and challenges',pentacles:'material matters and practical concerns',hearts:'love and emotional connections',spades:'mental challenges and difficult truths',diamonds:'material prosperity and practical matters',clubs:'ambition and dynamic energy'};
    reading+=`The dominant suit is ${dominantSuit[0]} (${dominantSuit[1]} cards), centering this reading on themes of ${suitThemes[dominantSuit[0]]||dominantSuit[0]}. `;
  }
  if(reversedCount>0)reading+=`${reversedCount} reversed card${reversedCount>1?'s':''} suggest${reversedCount===1?'s':''} blocked energy or internal challenges to work through. `;
  reading+=`\n\nLet us explore what the cards reveal.\n\n`;

  // Position by position
  reading+=`## Position-by-Position\n\n`;
  entries.forEach(({pos,entry,card})=>{
    const meaning=entry.orientation==='upright'?card.upright:card.reversed;
    reading+=`**${pos.name} — ${entry.name}** (${entry.orientation})\n\n`;
    reading+=`In the position of *${pos.description}*, ${card.name} speaks of ${meaning.toLowerCase().endsWith('.')?meaning:meaning+'.'}`;
    reading+=` Keywords to reflect on: ${card.keywords.join(', ')}.\n\n`;
  });

  // Pattern Analysis
  reading+=`## Pattern Analysis\n\n`;
  if(majorCount>0)reading+=`- **Major Arcana presence:** ${majorCount} card${majorCount>1?'s':''} — significant spiritual and life-path themes are active.\n`;
  if(dominantSuit)reading+=`- **Dominant suit:** ${dominantSuit[0]} appears ${dominantSuit[1]} times.\n`;
  if(reversedCount>0)reading+=`- **Reversals:** ${reversedCount} reversed card${reversedCount>1?'s':''} indicate areas of blocked or internalized energy.\n`;
  const numbers=entries.map(e=>e.card.number);
  const numCounts={};numbers.forEach(n=>{numCounts[n]=(numCounts[n]||0)+1});
  const repeatedNums=Object.entries(numCounts).filter(([_,c])=>c>1);
  if(repeatedNums.length)reading+=`- **Repeated numbers:** ${repeatedNums.map(([n,c])=>`${n} appears ${c} times`).join('; ')}.\n`;
  reading+='\n';

  // Guidance
  reading+=`## Guidance\n\n`;
  reading+=`Based on this reading, consider taking time to reflect on the themes that have emerged. `;
  if(state.concerns.length)reading+=`In relation to your concerns about ${state.concerns.join(' and ')}, the cards suggest paying attention to the areas highlighted above. `;
  reading+=`Trust your intuition as you move forward, and remember that the cards reflect possibilities, not certainties. Your choices shape your path.\n\n`;

  // Reflection Questions
  reading+=`## Reflection Questions\n\n`;
  reading+=`- What emotions arise as you look at this spread?\n`;
  reading+=`- Which card surprised you the most, and why?\n`;
  reading+=`- What is one small action you can take today based on this guidance?\n`;
  if(reversedCount>0)reading+=`- What blocked energy do the reversed cards point to, and how might you release it?\n`;
  if(state.concerns.length)reading+=`- How does this reading shift your perspective on ${state.concerns[0]}?\n`;

  return reading;
}

function renderReading(text){
  const content=document.getElementById('reading-content');
  // Markdown rendering — process lists properly
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
  // Bold and italic
  html=html.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>');
  // Clean up empty paragraphs
  html=html.replace(/<p><\/p>/g,'').replace(/<p><br>/g,'<p>').replace(/<br><\/p>/g,'</p>');
  // Close reading sections
  const sections=html.split('<div class="reading-section">');
  if(sections.length>1){
    html=sections[0]+sections.slice(1).map(s=>'<div class="reading-section">'+s+'</div>').join('');
  }
  content.innerHTML=html;
  const jSec=document.getElementById('journal-section');
  if(jSec){jSec.style.display='block';document.getElementById('journal-entry').value=''}
}
