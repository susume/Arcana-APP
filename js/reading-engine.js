// ===== READING GENERATION =====
async function generateReading(){
  if(!canGenerateReading()){
    showUpgradeModal('daily-limit');
    return;
  }
  goScreen('screen-reading');
  setReadingReadyState(false);
  clearAutoSave();
  const content=document.getElementById('reading-content');
  content.innerHTML=thoughtfulLoadingHtml('ai-status');
  const settings=loadSettings();
  const hasConfiguredAI=hasAIConfiguration();
  if(hasConfiguredAI&&state.readingMode!=='classic-forced'){
    state.readingMode='ai';
    try{
      const narrative=await generateAIReading(settings);
      state.narrative=narrative;
      renderReading(narrative);
      if(!state.readingUsageRecorded){
        recordCompletedReading();
        state.readingUsageRecorded=true;
      }
      highlightReadingBtn('ai');
    }catch(e){
      const fallback=generateClassicReading();
      state.narrative=fallback;
      renderReading(fallback);
      if(!state.readingUsageRecorded){
        recordCompletedReading();
        state.readingUsageRecorded=true;
      }
      highlightReadingBtn('classic');
      content.insertAdjacentHTML('afterbegin',`<p style="color:var(--danger);font-size:11px;margin-bottom:12px">AI reading failed (${e.message}). Showing classic reading instead.</p>`);
    }
  }else{
    state.readingMode='classic';
    const classic=generateClassicReading();
    state.narrative=classic;
    renderReading(classic);
    if(!state.readingUsageRecorded){
      recordCompletedReading();
      state.readingUsageRecorded=true;
    }
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
    try{requireAIConfiguration();}catch(e){alert(e.message);return;}
    setReadingReadyState(false);
    content.innerHTML=thoughtfulLoadingHtml('ai-status');
    try{
      const narrative=await generateAIReading(settings);
      state.narrative=narrative;
      renderReading(narrative);
      enhanceReadingOutput();
    }catch(e){
      content.innerHTML=`<p style="color:var(--danger)">Error: ${e.message}</p>`;
    }
  }else{
    setReadingReadyState(false);
    const classic=generateClassicReading();
    state.narrative=classic;
    renderReading(classic);
  }
  highlightReadingBtn(mode);
}

function getSpreadLayoutHint(spread){
  if(spread.layout==='celtic-simple')return 'LAYOUT: 6-card Celtic-style cross. Pos 1 (Present) at center, pos 2 (Challenge) crossing below it horizontally, pos 3 (Subconscious) below, pos 4 (Conscious) above, pos 5 (Past) left, pos 6 (Near Future) right.';
  if(spread.layout==='celtic')return 'LAYOUT: A cross with a vertical staff on the right. Cross: pos 5 (Crown, top), pos 3 (Foundation, bottom), pos 1 (Present, center), pos 2 (Challenge, crossing center), pos 4 (Recent Past, left), pos 6 (Near Future, right). Staff: right column bottom-to-top: pos 7, 8, 9, 10.';
  if(spread.layout==='romany')return 'LAYOUT: 7 columns of 3 cards each, left to right. Col 1 Emotion: pos 1-3. Col 2 Relationships: pos 4-6. Col 3 Hopes & Career: pos 7-9. Col 4 Finances: pos 10-12. Col 5 Spiritual: pos 13-15. Col 6 Obstacles: pos 16-18. Col 7 Health & Future: pos 19-21. Within each column, top card = Past, middle = Present, bottom = Future.';
  if(spread.layout==='yearly')return 'LAYOUT: 12 cards in a clock. Position 1 starts at 9 o clock and represents the current month. Continue counterclockwise through positions 2 to 12 for each successive month.';
  if(spread.layout==='two-pathways')return 'LAYOUT: Two decision paths. Pos 1 (You) and pos 2 (Problem) sit at top center. Left side: pos 3 Pathway 1, pos 5-6 near future, pos 9-10 distant future, pos 13 result. Right side: pos 4 Pathway 2, pos 7-8 near future, pos 11-12 distant future, pos 14 result.';
  if(spread.layout==='relationship')return 'LAYOUT: 15-card relationship spread with two mirrored sides and a center future card. Left side is you: pos 1-3, 7, 9, 11, 13. Right side is them: pos 4-6, 8, 10, 12, 14. Pos 15 sits in the center as the future of the relationship.';
  const n=spread.cardCount;
  if(spread.layout==='row'||n<=5)return `LAYOUT: ${n} cards in a single row, left to right, numbered 1 to ${n}.`;
  return `LAYOUT: ${n} cards, positions numbered 1 to ${n} as laid out in the photo.`;
}

function getCleanSpreadLayoutHint(spread){
  if(spread.layout==='celtic-simple')return 'LAYOUT: 6-card Celtic-style cross. Pos 1 Present at center, pos 2 Challenge crossing below it, pos 3 Subconscious below, pos 4 Conscious above, pos 5 Past left, pos 6 Near Future right.';
  if(spread.layout==='celtic')return 'LAYOUT: A cross with a vertical staff on the right. Cross: pos 5 (Crown, top), pos 3 (Foundation, bottom), pos 1 (Present, center), pos 2 (Challenge, crossing center), pos 4 (Recent Past, left), pos 6 (Near Future, right). Staff: right column bottom-to-top: pos 7, 8, 9, 10.';
  if(spread.layout==='romany')return 'LAYOUT: 7 columns of 3 cards each, left to right. Col 1 Emotion: pos 1-3. Col 2 Relationships: pos 4-6. Col 3 Hopes & Career: pos 7-9. Col 4 Finances: pos 10-12. Col 5 Spiritual: pos 13-15. Col 6 Obstacles: pos 16-18. Col 7 Health & Future: pos 19-21. Within each column, top card = Past, middle = Present, bottom = Future.';
  if(spread.layout==='yearly')return 'LAYOUT: 12 cards in a clock. Position 1 starts at 9 o clock and represents the current month. Continue counterclockwise through positions 2 to 12 for each successive month.';
  if(spread.layout==='two-pathways')return 'LAYOUT: Two decision paths. Pos 1 (You) and pos 2 (Problem) sit at top center. Left side: pos 3 Pathway 1, pos 5-6 near future, pos 9-10 distant future, pos 13 result. Right side: pos 4 Pathway 2, pos 7-8 near future, pos 11-12 distant future, pos 14 result.';
  if(spread.layout==='relationship')return 'LAYOUT: 15-card relationship spread with two mirrored sides and a center future card. Left side is you: pos 1-3, 7, 9, 11, 13. Right side is them: pos 4-6, 8, 10, 12, 14. Pos 15 sits in the center as the future of the relationship.';
  const n=spread.cardCount;
  if(spread.layout==='row'||n<=5)return `LAYOUT: ${n} cards in a single row, left to right, numbered 1 to ${n}.`;
  return `LAYOUT: ${n} cards, positions numbered 1 to ${n} as laid out in the photo.`;
}

function readerContextLine(){
  const parts=[];
  if(state.readerLifeStage)parts.push(`Life stage: ${state.readerLifeStage}`);
  return parts.length?parts.join('; '):'Not provided';
}

function readerSafetyInstruction(){
  const stage=String(state.readerLifeStage||'').toLowerCase();
  const isMinor=stage.includes('child')||stage.includes('teen');
  const minorLine=isMinor?'The reader may be a minor: keep the language especially gentle, age-appropriate, non-alarming, and encourage support from a trusted adult for serious worries. Do not frame romance, sexuality, money, career, or life decisions in an adult way for a child.':'';
  return `Adapt the interpretation to the reader's life stage. A card that suggests independence, work, romance, conflict, or responsibility should be interpreted differently for a child, teen, young adult, adult, or senior. Keep the reading reflective and empowering, not deterministic. ${minorLine}`.trim();
}

function getReadingSystemInstructions(){
  if(state.cardSystem==='tarot'){
    return {
      role:'You are a compassionate, insightful reader with deep knowledge of traditional tarot.',
      naming:'Use traditional Rider-Waite-Smith tarot card names and terminology.',
      pattern:'Major and Minor Arcana patterns, dominant suits, repeated numbers, reversals, court cards, and card interactions'
    };
  }
  return {
    role:'You are a compassionate, insightful reader with deep knowledge of playing-card cartomancy.',
    naming:'Keep Hearts, Diamonds, Clubs, and Spades names and the Jack, Queen, and King ranks. Do not rename playing cards as tarot equivalents.',
    pattern:'Playing-card suits, repeated ranks, court-card patterns, reversals, and card interactions. Do not discuss Major Arcana'
  };
}

function isLargeSpread(spread){
  return spread.cardCount>10||['romany','yearly','two-pathways','relationship'].includes(spread.id);
}

function getReadingLengthInstruction(spread){
  const n=spread.cardCount;
  if(n<=1)return '1-card spread: 150-250 words total. Use 1 short paragraph, 2 short bullets, and 1 reflection question.';
  if(n===3)return '3-card spread: 300-450 words total. Write one brief bullet per card in Card Highlights.';
  if(n===6)return '6-card spread: 500-700 words total. Write one brief bullet per position.';
  if(n===10)return '10-card spread: 700-850 words total. Brief position highlights are allowed; do not overexplain.';
  return '10+ card spreads: 900-1,300 words maximum. Do not write a long card-by-card essay; group the reading by spread structure and mention individual cards only when they strongly affect the interpretation.';
}

function getLargeSpreadGroupingInstruction(spread){
  if(spread.id==='romany')return `Romany: Group by the 7 columns:
- Emotional Well-being
- Relationships
- Hopes & Career
- Finances
- Spiritual Journey
- Obstacles
- Health & Future Well-being
For each Romany column, summarize the past/present/future movement in 1-2 concise sentences. Do not write separate long paragraphs for all 21 cards.`;
  if(spread.id==='yearly')return 'Yearly: Group by seasons or quarters unless a specific month is especially important. Do not write 12 long monthly paragraphs.';
  if(spread.id==='two-pathways')return `Two Pathways: Group by:
- Current situation
- Pathway 1
- Pathway 2
- Comparison
- Suggested reflection`;
  if(spread.id==='relationship')return `Relationship: Group by:
- You
- The other person
- Shared dynamic
- Future direction`;
  if(spread.id==='celtic-cross')return 'Celtic Cross: Briefly cover the central issue, challenge, root/crown, past/future, and staff cards. Do not overexplain every card.';
  return 'Large spread: group nearby or related positions into sections, then highlight only the cards that change the reading most.';
}

function getCardHighlightInstruction(spread){
  if(isLargeSpread(spread))return `For large spreads, group Card Highlights by section, column, pathway, month/quarter, or relationship side.
${getLargeSpreadGroupingInstruction(spread)}`;
  return 'For small spreads, briefly mention each card. Use one concise bullet per card or position when that is clearer on mobile.';
}

function getReadingOutputInstructions(spread,systemInstructions){
  return `Use this exact markdown structure:

## Your Reading in 30 Seconds
Write 3-4 short sentences summarizing the whole spread.

## Main Message
Write one clear paragraph, maximum 80 words.

## Key Themes
Write exactly 3 bullet points. Each bullet must be no more than 25 words.

## Card Highlights
${getCardHighlightInstruction(spread)}

## Patterns Worth Noticing
Write maximum 3 bullet points. Only mention the strongest patterns: ${systemInstructions.pattern}. Do not write a long pattern-analysis essay.

## Practical Guidance
Write exactly 3 numbered actions. Each action should be practical, reflective, safe, and no more than 35 words.

## Reflection Question
End with one thoughtful journal question.`;
}

function getReadingSafetyDisclaimer(){
  return 'This is an AI-assisted reflective tarot/cartomancy reading, not medical, legal, financial, mental-health, or crisis advice. Avoid definitive predictions. Do not tell users to make major life decisions based only on the reading. Encourage trusted human or professional support when the topic is serious.';
}

function buildAIReadingPrompt(settings){
  const spread=getSpread();
  const systemInstructions=getReadingSystemInstructions();
  let cardLines='';
  spread.positions.forEach(pos=>{
    const entry=state.cards[pos.id];
    if(entry){
      const card=currentCards.find(c=>c.name.toLowerCase()===entry.name.toLowerCase());
      const kws=card?card.keywords.join(', '):'';
      const meaning=card?(entry.orientation==='reversed'?card.reversed:card.upright):'';
      cardLines+=`  ${pos.id}. ${pos.name} [${pos.description}]: ${entry.name} (${entry.orientation}) - Keywords: ${kws}. Meaning: ${meaning}\n`;
    }else{
      cardLines+=`  ${pos.id}. ${pos.name} [${pos.description}]: (no card entered)\n`;
    }
  });
  let droppedLine='';
  if(state.hasDroppedCard&&state.droppedCard){
    const dc=currentCards.find(c=>c.name.toLowerCase()===state.droppedCard.name.toLowerCase());
    const droppedMeaning=dc?(state.droppedCard.orientation==='reversed'?dc.reversed:dc.upright):'';
    droppedLine=`\nDropped Card (fell out during shuffling): ${state.droppedCard.name} (${state.droppedCard.orientation}) - Keywords: ${dc?dc.keywords.join(', '):''}. Meaning: ${droppedMeaning}\nThis card may reveal an underlying theme influencing the entire reading.\n`;
  }
  const yearlyNote=state.cardSystem==='tarot'
    ? '\nNOTE: Any Ace signals new beginnings for that month. Major Arcana carry extra weight. A Knight indicates major life change in that period.'
    : '\nNOTE: Any Ace signals new beginnings for that month. Court cards may highlight important people, roles, or influences in that period.';
  const specialNote=spread.id==='romany'?'\nNOTE: If the Health & Future column (cards 19-21) mirrors the Relationships column (cards 4-6) in theme, interpret it as the health of a relationship, not physical health.':spread.id==='yearly'?yearlyNote:spread.id==='celtic-cross'?'\nNOTE: Card 2 (The Challenge) crosses Card 1 horizontally; this placement does not itself make the card reversed. Honor the recorded orientation and its supplied meaning.':'';
  return `${systemInstructions.role}
${systemInstructions.naming}
Keep the reading concise-first, premium, skimmable, and useful on a phone.
Use warm, mystical, calm, emotionally intelligent language. Avoid filler, fear-based language, fake certainty, long generic explanations, and repeated phrases like "this suggests" or "this card speaks of."
Use direct phrases when natural: "The heart of this reading is...", "The strongest pattern is...", "Your next step is...", "Watch for...", "This points to...", "The cards are emphasizing..."

Reading style: ${settings.readingStyle}. Tone: ${settings.readingTone}.
${state.concerns.length?'Concerns: '+state.concerns.join(', '):'No specific concerns - provide general guidance.'}
Reader context: ${readerContextLine()}
Life-stage guidance: ${readerSafetyInstruction()}
Safety: ${getReadingSafetyDisclaimer()}
For health, finances, relationships, and career, use reflective language. Do not claim certainty, diagnose, promise outcomes, or give professional advice as fact.

Length: ${getReadingLengthInstruction(spread)}
${getReadingOutputInstructions(spread,systemInstructions)}

Spread: ${spread.name} - ${spread.description}
${getCleanSpreadLayoutHint(spread)}

Positions and cards:
${cardLines}${droppedLine}${specialNote}

Interpret the cards through their position meanings and make connections between them. Do not require every card to receive a long paragraph. For large spreads, prioritize the main movement, strongest interactions, and grouped structure over exhaustive individual explanations.`;
}

async function generateAIReading(settings){
  return await callGemini(buildAIReadingPrompt(settings),null,state.uploadedImage||null,document.getElementById('ai-status'));
}

function getReadingEntries(spread){
  const entries=[];
  spread.positions.forEach(pos=>{
    const entry=state.cards[pos.id];
    if(!entry)return;
    const card=currentCards.find(c=>c.name.toLowerCase()===entry.name.toLowerCase());
    if(!card)return;
    const meaning=entry.orientation==='upright'?card.upright:card.reversed;
    entries.push({pos,entry,card,meaning});
  });
  return entries;
}

function analyzeReadingPatterns(entries){
  const suitCounts={};
  let majorCount=0;let reversedCount=0;
  entries.forEach(({entry,card})=>{
    if(card.suit)suitCounts[card.suit]=(suitCounts[card.suit]||0)+1;
    if(card.arcana==='major')majorCount++;
    if(entry.orientation==='reversed')reversedCount++;
  });
  const dominantSuit=Object.entries(suitCounts).sort((a,b)=>b[1]-a[1])[0];
  const numbers=entries.map(e=>e.card.number).filter(n=>n!==undefined&&n!==null);
  const numCounts={};numbers.forEach(n=>{numCounts[n]=(numCounts[n]||0)+1});
  const repeatedNums=Object.entries(numCounts).filter(([_,c])=>c>1);
  const courtCount=entries.filter(e=>e.card.number>=11&&e.card.number<=14).length;
  return {suitCounts,majorCount,reversedCount,dominantSuit,repeatedNums,courtCount};
}

function getSuitTheme(suit){
  const suitThemes={wands:'passion, action, and creative energy',cups:'emotion, intuition, and relationships',swords:'thought, truth, and hard conversations',pentacles:'work, money, body, home, and practical stability',hearts:'love and emotional connection',spades:'mental pressure, conflict, and difficult truths',diamonds:'resources, work, and practical value',clubs:'ambition, movement, and effort'};
  return suitThemes[suit]||suit;
}

function getEntryLabel(entry){
  return `**${entry.pos.name} - ${entry.entry.name}** (${entry.entry.orientation})`;
}

function getShortMeaning(meaning){
  return (meaning||'This card carries a reflective message.').split(/[.!?]/)[0].trim();
}

function getSpreadGroups(spread,entries){
  const byId=id=>entries.find(e=>String(e.pos.id)===String(id));
  const group=(label,ids)=>({label,items:ids.map(byId).filter(Boolean)});
  if(spread.id==='romany')return [
    group('Emotional Well-being',[1,2,3]),
    group('Relationships',[4,5,6]),
    group('Hopes & Career',[7,8,9]),
    group('Finances',[10,11,12]),
    group('Spiritual Journey',[13,14,15]),
    group('Obstacles',[16,17,18]),
    group('Health & Future Well-being',[19,20,21])
  ];
  if(spread.id==='yearly')return [
    group('First Quarter',[1,2,3]),
    group('Second Quarter',[4,5,6]),
    group('Third Quarter',[7,8,9]),
    group('Fourth Quarter',[10,11,12])
  ];
  if(spread.id==='two-pathways')return [
    group('Current Situation',[1,2]),
    group('Pathway 1',[3,5,6,9,10,13]),
    group('Pathway 2',[4,7,8,11,12,14]),
    group('Comparison',[3,4,13,14]),
    group('Suggested Reflection',[1,2,13,14])
  ];
  if(spread.id==='relationship')return [
    group('You',[1,2,3,7,9,11,13]),
    group('The Other Person',[4,5,6,8,10,12,14]),
    group('Shared Dynamic',[1,4,7,8,9,10,11,12]),
    group('Future Direction',[13,14,15])
  ];
  if(spread.id==='celtic-cross')return [
    group('Central Issue',[1,2]),
    group('Root and Crown',[3,5]),
    group('Past and Future',[4,6]),
    group('Staff Cards',[7,8,9,10])
  ];
  return [{label:spread.name,items:entries}];
}

function summarizeGroup(group){
  if(!group.items.length)return `- **${group.label}:** No cards entered for this section.`;
  const names=group.items.map(e=>`${e.entry.name} ${e.entry.orientation==='reversed'?'reversed':'upright'}`).join(', ');
  const keywords=group.items.flatMap(e=>e.card.keywords||[]).slice(0,4).join(', ');
  return `- **${group.label}:** ${names}. Watch the movement around ${keywords||'the section theme'}; keep the message practical and reflective.`;
}

function getPatternBullets(patterns){
  const bullets=[];
  if(state.cardSystem==='tarot'&&patterns.majorCount>0)bullets.push(`- **Major Arcana:** ${patterns.majorCount} card${patterns.majorCount>1?'s':''} point to larger life lessons and inner turning points.`);
  if(patterns.dominantSuit)bullets.push(`- **Dominant suit:** ${patterns.dominantSuit[0]} appears ${patterns.dominantSuit[1]} times, emphasizing ${getSuitTheme(patterns.dominantSuit[0])}.`);
  if(patterns.reversedCount>0)bullets.push(`- **Reversals:** ${patterns.reversedCount} reversed card${patterns.reversedCount>1?'s':''} highlight energy that may be internal, delayed, or ready for gentle repair.`);
  if(patterns.courtCount>1)bullets.push(`- **Court cards:** ${patterns.courtCount} people cards suggest roles, relationships, or parts of yourself are central.`);
  if(patterns.repeatedNums.length)bullets.push(`- **Repeated ranks:** ${patterns.repeatedNums.map(([n,c])=>`${n} appears ${c} times`).join('; ')}, giving the reading a repeating rhythm.`);
  return bullets.slice(0,3);
}

function generateClassicReading(){
  const spread=getSpread();
  const entries=getReadingEntries(spread);
  const patterns=analyzeReadingPatterns(entries);
  let reading='';

  if(state.hasDroppedCard&&state.droppedCard){
    const dc=currentCards.find(c=>c.name.toLowerCase()===state.droppedCard.name.toLowerCase());
    const droppedMeaning=dc?(state.droppedCard.orientation==='upright'?dc.upright:dc.reversed):'This card carries its own message.';
    reading+=`## The Dropped Card\n\n**${state.droppedCard.name}** (${state.droppedCard.orientation}) adds an underlying note: ${getShortMeaning(droppedMeaning)}. Keep it as a quiet thread through the reading, not a fixed prediction.\n\n`;
  }

  reading+=`## Your Reading in 30 Seconds\n\n`;
  reading+=`The heart of this reading is ${patterns.dominantSuit?getSuitTheme(patterns.dominantSuit[0]):'the pattern formed by the cards you placed'}. `;
  if(state.cardSystem==='tarot'&&patterns.majorCount)reading+=`${patterns.majorCount} Major Arcana card${patterns.majorCount>1?'s':''} add depth without making the outcome fixed. `;
  if(patterns.reversedCount)reading+=`${patterns.reversedCount} reversal${patterns.reversedCount>1?'s':''} ask for patience, honesty, and inner adjustment. `;
  reading+=state.concerns.length?`Around ${state.concerns.join(' and ')}, use the spread as a mirror for your next grounded choice.\n\n`:'Use the spread as a mirror for your next grounded choice.\n\n';

  reading+=`## Card Highlights\n\n`;
  if(isLargeSpread(spread)){
    getSpreadGroups(spread,entries).forEach(group=>{reading+=summarizeGroup(group)+'\n'});
  }else{
    entries.forEach(entry=>{
      reading+=`- ${getEntryLabel(entry)}: ${getShortMeaning(entry.meaning)}. Reflect on ${entry.pos.description.toLowerCase()}.\n`;
    });
  }
  reading+='\n';

  reading+=`## Patterns Worth Noticing\n\n`;
  const patternBullets=getPatternBullets(patterns);
  reading+=(patternBullets.length?patternBullets.join('\n'):'- **Overall pattern:** The strongest message comes from the specific cards you placed and the concern you brought.').trim()+'\n\n';

  reading+=`## Practical Guidance\n\n`;
  reading+=`1. Name the one theme that feels most true, then write down one small choice that would honor it today.\n`;
  reading+=`2. If the topic is serious, pair reflection with trusted human or professional support instead of relying on the cards alone.\n`;
  reading+=`3. Return to the spread after a quiet pause and notice which card still pulls your attention.\n\n`;

  reading+=`## Reflection Question\n\n`;
  reading+=`What is this spread asking you to see more honestly, and what gentle action would help you respond?\n\n`;

  return reading;
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,ch=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[ch]));
}

function applyInlineMarkdown(text){
  return text
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>');
}

function markdownText(line){
  return applyInlineMarkdown(escapeHtml(line));
}

function renderReadingMarkdown(text){
  const lines=String(text||'').split('\n');
  let html='';
  let listType=null;
  let paragraphOpen=false;
  let sectionOpen=false;

  const closeParagraph=()=>{
    if(paragraphOpen){html+='</p>';paragraphOpen=false}
  };
  const closeList=()=>{
    if(listType){html+=`</${listType}>`;listType=null}
  };
  const closeSection=()=>{
    closeParagraph();
    closeList();
    if(sectionOpen){html+='</div>';sectionOpen=false}
  };
  const openList=type=>{
    closeParagraph();
    if(listType&&listType!==type)closeList();
    if(!listType){html+=`<${type}>`;listType=type}
  };
  const addParagraphLine=line=>{
    closeList();
    if(!paragraphOpen){html+='<p>';paragraphOpen=true}
    else html+='<br>';
    html+=markdownText(line);
  };

  lines.forEach(line=>{
    const trimmed=line.trim();
    if(trimmed===''){
      closeParagraph();
      closeList();
      return;
    }
    if(trimmed.startsWith('### ')){
      closeParagraph();
      closeList();
      html+=`<h4>${markdownText(trimmed.slice(4))}</h4>`;
      return;
    }
    if(trimmed.startsWith('## ')){
      closeSection();
      html+=`<div class="reading-section"><h3>${markdownText(trimmed.slice(3))}</h3>`;
      sectionOpen=true;
      return;
    }
    if(trimmed.startsWith('# ')){
      closeSection();
      html+=`<h2>${markdownText(trimmed.slice(2))}</h2>`;
      return;
    }
    if(trimmed.startsWith('- ')){
      openList('ul');
      html+=`<li>${markdownText(trimmed.slice(2))}</li>`;
      return;
    }
    const numbered=trimmed.match(/^\d+\.\s+(.+)$/);
    if(numbered){
      openList('ol');
      html+=`<li>${markdownText(numbered[1])}</li>`;
      return;
    }
    addParagraphLine(trimmed);
  });
  closeSection();
  return html;
}

function renderReading(text){
  const content=document.getElementById('reading-content');
  content.innerHTML=renderReadingMarkdown(text);
  enhanceReadingOutput();
  const jSec=document.getElementById('journal-section');
  if(jSec){
    jSec.style.display='block';
    document.getElementById('journal-entry').value='';
    if(typeof wireJournalSection==='function')wireJournalSection(jSec);
  }
  setReadingReadyState(true);
  renderEntitlementsUI();
}
