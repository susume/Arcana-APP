// ===== READING GENERATION =====
// Arcana reading engine with structured AI output and a shareable canvas infographic.
// This file remains framework-free and works with the existing global runtime.

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
      content.insertAdjacentHTML(
        'afterbegin',
        `<p style="color:var(--danger);font-size:11px;margin-bottom:12px">AI reading failed (${escapeReadingHtml(e.message)}). Showing the private, on-device classic reading instead.</p>`
      );
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
  const aiButton=document.getElementById('btn-ai-read');
  const classicButton=document.getElementById('btn-classic-read');
  if(aiButton)aiButton.classList.toggle('btn-primary',mode==='ai');
  if(classicButton)classicButton.classList.toggle('btn-primary',mode==='classic');
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
    }catch(e){
      content.innerHTML=`<p style="color:var(--danger)">Error: ${escapeReadingHtml(e.message)}</p>`;
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
  const minorLine=isMinor
    ? 'The reader may be a minor: keep the language especially gentle, age-appropriate, non-alarming, and encourage support from a trusted adult for serious worries. Do not frame romance, sexuality, money, career, or life decisions in an adult way for a child.'
    : '';
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
    naming:'Keep the original Hearts, Diamonds, Clubs, and Spades names and the Jack, Queen, and King ranks. Do not rename playing cards as tarot equivalents.',
    pattern:'Playing-card suits, repeated ranks, court-card patterns, reversals, and card interactions. Do not discuss Major Arcana'
  };
}

function getReadingLocale(){
  const htmlLang=document.documentElement&&document.documentElement.lang;
  const browserLanguage=typeof navigator!=='undefined'&&navigator.language?navigator.language:'';
  return htmlLang||browserLanguage||'en';
}

function getLocalDateContext(){
  const now=new Date();
  const year=now.getFullYear();
  const month=String(now.getMonth()+1).padStart(2,'0');
  const day=String(now.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

function getPositionDisplayLabel(spread,pos,index){
  if(spread.layout==='yearly'||spread.id==='yearly'){
    const monthDate=new Date();
    monthDate.setDate(1);
    monthDate.setMonth(monthDate.getMonth()+index);
    try{
      return new Intl.DateTimeFormat(getReadingLocale(),{
        month:'long',
        year:monthDate.getFullYear()!==new Date().getFullYear()?'numeric':undefined
      }).format(monthDate);
    }catch(_e){
      return pos.name;
    }
  }
  return pos.name;
}

function buildAIReadingPrompt(settings){
  const spread=getSpread();
  const systemInstructions=getReadingSystemInstructions();
  let cardLines='';

  spread.positions.forEach((pos,index)=>{
    const entry=state.cards[pos.id];
    const displayLabel=getPositionDisplayLabel(spread,pos,index);
    if(entry){
      const card=currentCards.find(c=>c.name.toLowerCase()===entry.name.toLowerCase());
      const kws=card?card.keywords.join(', '):'';
      const meaning=card?(entry.orientation==='reversed'?card.reversed:card.upright):'';
      cardLines+=`  ${pos.id}. Display label: ${displayLabel}. Position: ${pos.name} [${pos.description}]. Card: ${entry.name} (${entry.orientation}). Keywords: ${kws}. Reference meaning: ${meaning}\n`;
    }else{
      cardLines+=`  ${pos.id}. Display label: ${displayLabel}. Position: ${pos.name} [${pos.description}]. Card: (no card entered)\n`;
    }
  });

  let droppedLine='';
  if(state.hasDroppedCard&&state.droppedCard){
    const dc=currentCards.find(c=>c.name.toLowerCase()===state.droppedCard.name.toLowerCase());
    const droppedMeaning=dc?(state.droppedCard.orientation==='reversed'?dc.reversed:dc.upright):'';
    droppedLine=`\nDropped card: ${state.droppedCard.name} (${state.droppedCard.orientation}). Keywords: ${dc?dc.keywords.join(', '):''}. Reference meaning: ${droppedMeaning}. Treat it as an underlying influence, not an extra timeline position.\n`;
  }

  const yearlyNote=state.cardSystem==='tarot'
    ? 'For the yearly spread, an Ace can emphasize a fresh start, Major Arcana can mark a weightier chapter, and court cards may describe a person, role, or way of acting. Do not claim that any card guarantees an event.'
    : 'For the yearly spread, an Ace can emphasize a fresh start and court cards may describe a person, role, or way of acting. Do not claim that any card guarantees an event.';

  const specialNote=spread.id==='romany'
    ? 'If the Health & Future column mirrors the Relationships column in theme, it may describe the health of a relationship rather than physical health. Never diagnose illness.'
    : spread.id==='yearly'
      ? yearlyNote
      : spread.id==='celtic-cross'
        ? 'Card 2 crosses Card 1 horizontally; this placement does not make it reversed. Honor only the recorded orientation.'
        : '';

  const concerns=Array.isArray(state.concerns)&&state.concerns.length
    ? state.concerns.join(', ')
    : 'No specific concern was provided; give balanced general guidance.';

  return `${systemInstructions.role}
${systemInstructions.naming}

Create one coherent, useful reading from the supplied cards. Interpret the spread as a developing story rather than repeating dictionary meanings. Be specific about tensions, turning points, support, and practical choices. Avoid vague filler such as "trust your intuition" unless you explain what the reader can actually notice or do. Keep all statements reflective and non-deterministic.

Return ONLY one valid JSON object. Do not use markdown fences, commentary, or text before or after the JSON.

Required JSON schema:
{
  "title": "A concise title for this reading",
  "quickSummary": "A 2-3 sentence reading-at-a-glance summary",
  "mainMessage": "A focused paragraph explaining the central movement of the spread",
  "keyThemes": [
    {"title":"2-5 word theme","message":"One concise explanatory sentence"}
  ],
  "positions": [
    {
      "position":"Use the exact supplied position ID",
      "headline":"A short, memorable message for this position",
      "interpretation":"1-3 specific sentences connecting the card to this exact position",
      "action":"One realistic action or reflection focus"
    }
  ],
  "patterns": ["2-5 concise observations about card interactions, suits, numbers, reversals, court cards, or Major Arcana"],
  "guidance": ["3-5 practical, non-alarming next steps"],
  "reflectionQuestions": ["2-3 useful journal questions"],
  "closingMessage": "One reassuring closing sentence suitable for the bottom of an infographic"
}

Quality requirements:
- Include one positions item for every entered spread card, in the supplied position order.
- Do not invent, rename, omit, or change the orientation of any card.
- For every positions item, explicitly interpret what that spread position represents and how this card behaves through that lens.
- Make connections across cards. Identify phases, contrasts, repetitions, and turning points.
- For long spreads, keep each position concise enough to scan.
- keyThemes must contain exactly 3 items.
- Keep each headline under 55 characters, each action under 110 characters, and each infographic-friendly interpretation under 260 characters.
- Use the language of the reader's concern or question when clear. Otherwise use the interface locale: ${getReadingLocale()}.
- Current local date: ${getLocalDateContext()}. For a yearly spread, position 1 is the current month and the supplied display labels are authoritative.
- Pattern analysis should cover ${systemInstructions.pattern} where relevant.
- Reader context: ${readerContextLine()}.
- Life-stage guidance: ${readerSafetyInstruction()}.
- Concern or focus: ${concerns}.
- Reading style: ${settings.readingStyle||'balanced'}. Tone: ${settings.readingTone||'compassionate'}.
- This is reflective guidance, not medical, legal, financial, mental-health, or crisis advice. Encourage trusted human or professional support when a concern is serious.

Spread: ${spread.name} — ${spread.description}
${getCleanSpreadLayoutHint(spread)}
${specialNote}

Cards and positions:
${cardLines}${droppedLine}`;
}

async function generateAIReading(settings,statusElement){
  const raw=await callGemini(
    buildAIReadingPrompt(settings),
    null,
    null,
    statusElement||document.getElementById('ai-status')
  );
  const readingPackage=parseAIReadingPackage(raw);
  state.readingPackage=readingPackage;
  state.readingInfographic=buildInfographicModel(readingPackage);
  return readingPackageToMarkdown(readingPackage);
}

function parseAIReadingPackage(raw){
  const text=String(raw||'').trim();
  const candidates=[];
  const fenced=text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if(fenced)candidates.push(fenced[1].trim());
  candidates.push(text);

  const firstBrace=text.indexOf('{');
  const lastBrace=text.lastIndexOf('}');
  if(firstBrace!==-1&&lastBrace>firstBrace)candidates.push(text.slice(firstBrace,lastBrace+1));

  let parsed=null;
  let lastError=null;
  for(const candidate of candidates){
    try{
      parsed=JSON.parse(candidate);
      break;
    }catch(error){
      lastError=error;
    }
  }

  if(!parsed||typeof parsed!=='object'){
    throw new Error(`The AI returned an unreadable reading format${lastError?`: ${lastError.message}`:''}`);
  }
  return normalizeReadingPackage(parsed);
}

function normalizeReadingPackage(input){
  const spread=getSpread();
  const rawPositions=Array.isArray(input.positions)?input.positions:[];
  const byPosition=new Map();

  rawPositions.forEach(item=>{
    if(!item||typeof item!=='object')return;
    const id=String(item.position??'').trim();
    if(!id)return;
    byPosition.set(id,item);
  });

  const positions=[];
  spread.positions.forEach((pos,index)=>{
    const entry=state.cards[pos.id];
    if(!entry)return;
    const item=byPosition.get(String(pos.id))||{};
    const card=currentCards.find(c=>c.name.toLowerCase()===entry.name.toLowerCase());
    const fallbackMeaning=card?(entry.orientation==='reversed'?card.reversed:card.upright):'';
    positions.push({
      position:String(pos.id),
      displayLabel:getPositionDisplayLabel(spread,pos,index),
      positionName:pos.name,
      positionDescription:pos.description,
      cardName:entry.name,
      orientation:entry.orientation,
      headline:cleanReadingText(item.headline)||`${pos.name}: ${entry.name}`,
      interpretation:cleanReadingText(item.interpretation)||fallbackMeaning||'Consider how this card changes the meaning of this position.',
      action:cleanReadingText(item.action)||'Notice where this theme is already present and choose one small, constructive response.'
    });
  });

  if(!positions.length)throw new Error('No entered cards were available for the generated reading.');

  return {
    title:cleanReadingText(input.title)||`${spread.name} Reading`,
    quickSummary:cleanReadingText(input.quickSummary)||'This spread highlights the movement between the current situation, the central challenge, and the choices available next.',
    mainMessage:cleanReadingText(input.mainMessage)||'The cards invite a thoughtful response rather than a fixed prediction. Their value is in showing where attention and deliberate action may help.',
    keyThemes:normalizeThemeItems(input.keyThemes).slice(0,3),
    positions,
    patterns:normalizeStringArray(input.patterns,5),
    guidance:normalizeStringArray(input.guidance,5),
    reflectionQuestions:normalizeStringArray(input.reflectionQuestions,3),
    closingMessage:cleanReadingText(input.closingMessage)||'The cards describe possibilities; your next choices shape how the story develops.'
  };
}

function cleanReadingText(value){
  return String(value??'')
    .replace(/\s+/g,' ')
    .replace(/^[-•*\s]+/,'')
    .trim();
}

function normalizeStringArray(value,maxItems){
  if(!Array.isArray(value))return [];
  return value
    .map(cleanReadingText)
    .filter(Boolean)
    .slice(0,maxItems);
}

function normalizeThemeItems(value){
  if(!Array.isArray(value))return [];
  const themes=value.map(item=>{
    if(typeof item==='string')return {title:'Theme',message:cleanReadingText(item)};
    if(!item||typeof item!=='object')return null;
    return {
      title:cleanReadingText(item.title)||'Theme',
      message:cleanReadingText(item.message)
    };
  }).filter(item=>item&&item.message);

  while(themes.length<3){
    const fallbacks=[
      {title:'Awareness',message:'Notice what the spread is bringing into clearer focus.'},
      {title:'Choice',message:'Separate what can be influenced now from what needs patience.'},
      {title:'Growth',message:'Use one small, repeatable action to support the direction you want.'}
    ];
    themes.push(fallbacks[themes.length]);
  }
  return themes;
}

function readingPackageToMarkdown(readingPackage){
  const lines=[];
  lines.push('## Your Reading in 30 Seconds','',readingPackage.quickSummary,'');
  lines.push('## Main Message','',readingPackage.mainMessage,'');
  lines.push('## Key Themes','');
  readingPackage.keyThemes.forEach(theme=>{
    lines.push(`- **${theme.title}:** ${theme.message}`);
  });
  lines.push('','## Position-by-Position','');

  readingPackage.positions.forEach(item=>{
    const orientation=item.orientation==='reversed'?'Reversed':'Upright';
    lines.push(`**${item.displayLabel} — ${item.cardName} (${orientation})**`,'');
    lines.push(`**${item.headline}** — ${item.interpretation}`,'');
    lines.push(`*Practical focus:* ${item.action}`,'');
  });

  if(readingPackage.patterns.length){
    lines.push('## Patterns and Turning Points','');
    readingPackage.patterns.forEach(pattern=>lines.push(`- ${pattern}`));
    lines.push('');
  }

  if(readingPackage.guidance.length){
    lines.push('## Practical Guidance','');
    readingPackage.guidance.forEach(item=>lines.push(`- ${item}`));
    lines.push('');
  }

  if(readingPackage.reflectionQuestions.length){
    lines.push('## Reflection Questions','');
    readingPackage.reflectionQuestions.forEach(item=>lines.push(`- ${item}`));
    lines.push('');
  }

  lines.push('## Closing Message','',readingPackage.closingMessage,'');
  lines.push('*This AI-assisted reading is for reflection, not a guaranteed prediction or professional advice.*');
  return lines.join('\n');
}

function generateClassicReading(){
  const readingPackage=buildClassicReadingPackage();
  state.readingPackage=readingPackage;
  state.readingInfographic=buildInfographicModel(readingPackage);
  return readingPackageToMarkdown(readingPackage);
}

function buildClassicReadingPackage(){
  const spread=getSpread();
  const entries=[];
  const suitCounts={};
  let majorCount=0;
  let reversedCount=0;

  spread.positions.forEach((pos,index)=>{
    const entry=state.cards[pos.id];
    if(!entry)return;
    const card=currentCards.find(c=>c.name.toLowerCase()===entry.name.toLowerCase());
    if(!card)return;
    entries.push({pos,index,entry,card});
    if(card.suit)suitCounts[card.suit]=(suitCounts[card.suit]||0)+1;
    if(card.arcana==='major')majorCount++;
    if(entry.orientation==='reversed')reversedCount++;
  });

  const dominantSuit=Object.entries(suitCounts).sort((a,b)=>b[1]-a[1])[0];
  const suitThemes={
    wands:'energy, motivation, creativity, and initiative',
    cups:'feelings, relationships, empathy, and emotional needs',
    swords:'thought patterns, communication, decisions, and pressure',
    pentacles:'study, work, health routines, resources, and practical stability',
    hearts:'feelings, relationships, empathy, and emotional needs',
    spades:'thought patterns, communication, decisions, and pressure',
    diamonds:'resources, routines, effort, and practical stability',
    clubs:'energy, ambition, activity, and initiative'
  };

  const first=entries[0];
  const last=entries[entries.length-1];
  const quickParts=[];
  if(first)quickParts.push(`The reading opens with ${first.entry.name}, placing attention on ${first.card.keywords.slice(0,2).join(' and ')||'the present situation'}.`);
  if(last&&last!==first)quickParts.push(`It develops toward ${last.entry.name}, suggesting that the later direction depends on how you respond to ${last.card.keywords.slice(0,2).join(' and ')||'the final theme'}.`);
  if(dominantSuit)quickParts.push(`The strongest practical thread is ${suitThemes[dominantSuit[0]]||dominantSuit[0]}.`);

  const themes=[];
  if(dominantSuit){
    themes.push({title:`${capitalizeReadingText(dominantSuit[0])} emphasis`,message:`Several cards return to ${suitThemes[dominantSuit[0]]||dominantSuit[0]}, so this area deserves steady attention.`});
  }
  if(reversedCount){
    themes.push({title:'Inner work',message:`${reversedCount} reversed card${reversedCount===1?'':'s'} point to energy that may be delayed, internalized, or ready for review.`});
  }
  if(majorCount){
    themes.push({title:'Bigger lesson',message:`${majorCount} Major Arcana card${majorCount===1?'':'s'} add weight to the choices and lessons represented in the spread.`});
  }
  normalizeThemeItems(themes).slice(0,3);

  const positions=entries.map(({pos,index,entry,card})=>{
    const meaning=entry.orientation==='reversed'?card.reversed:card.upright;
    const keyword=card.keywords&&card.keywords.length?card.keywords[0]:'awareness';
    return {
      position:String(pos.id),
      displayLabel:getPositionDisplayLabel(spread,pos,index),
      positionName:pos.name,
      positionDescription:pos.description,
      cardName:entry.name,
      orientation:entry.orientation,
      headline:`Focus on ${keyword}`,
      interpretation:`In the position of ${pos.description}, ${card.name} points to ${ensureSentence(meaning)}`,
      action:`Ask where ${keyword} is already visible here, then choose one small response you can repeat.`
    };
  });

  const patterns=[];
  if(majorCount)patterns.push(`${majorCount} Major Arcana card${majorCount===1?'':'s'} suggest that some parts of this reading concern longer-term lessons rather than a passing mood.`);
  if(dominantSuit)patterns.push(`${capitalizeReadingText(dominantSuit[0])} appears most often, emphasizing ${suitThemes[dominantSuit[0]]||dominantSuit[0]}.`);
  if(reversedCount)patterns.push(`${reversedCount} reversal${reversedCount===1?'':'s'} ask for review, patience, or an internal adjustment before outward progress.`);

  const numbers=entries.map(item=>item.card.number).filter(value=>value!==undefined&&value!==null);
  const numberCounts={};
  numbers.forEach(number=>{numberCounts[number]=(numberCounts[number]||0)+1;});
  const repeated=Object.entries(numberCounts).filter(([,count])=>count>1);
  if(repeated.length)patterns.push(`Repeated number pattern: ${repeated.map(([number,count])=>`${number} appears ${count} times`).join('; ')}.`);

  const guidance=[
    'Choose one theme from the reading and turn it into a small action that can be repeated this week.',
    'Review any reversed card as an area to simplify, practise, or discuss rather than as a warning.',
    'Use the later positions as a direction to prepare for, not as a fixed outcome.'
  ];

  const packageThemes=normalizeThemeItems(themes).slice(0,3);
  return {
    title:`${spread.name}: A Reflective Reading`,
    quickSummary:quickParts.join(' ')||'This spread offers a reflective look at the present situation, the forces shaping it, and the choices available next.',
    mainMessage:first&&last
      ? `The spread moves from ${first.entry.name} toward ${last.entry.name}. The useful question is not whether these cards predict a fixed result, but how the qualities they describe can help you respond more deliberately.`
      : 'The cards invite a deliberate response rather than a fixed prediction. Notice what is within your influence and begin with one manageable step.',
    keyThemes:packageThemes,
    positions,
    patterns,
    guidance,
    reflectionQuestions:[
      'Which card describes what I can influence most directly right now?',
      'Where am I expecting certainty when a small experiment would teach me more?',
      'What support, routine, or conversation would make the next step easier?'
    ],
    closingMessage:'The spread is a map for reflection; your steady choices are what move the journey forward.'
  };
}

function ensureSentence(value){
  const text=cleanReadingText(value);
  if(!text)return 'a theme that deserves careful reflection.';
  return /[.!?。！？]$/.test(text)?text:`${text}.`;
}

function capitalizeReadingText(value){
  const text=String(value||'');
  return text?text.charAt(0).toUpperCase()+text.slice(1):text;
}

function cleanInfographicHeadline(headline,positionName,cardName){
  let text=cleanReadingText(headline);
  const prefixes=[positionName,`The ${positionName}`]
    .filter(Boolean)
    .map(value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  if(prefixes.length){
    text=text.replace(new RegExp(`^(?:${prefixes.join('|')})\\s*(?:[:—-])\\s*`,'i'),'').trim();
  }
  if(text.toLowerCase()===String(cardName||'').toLowerCase())return '';
  return text;
}

function buildInfographicModel(readingPackage){
  const spread=getSpread();
  return {
    title:readingPackage.title||`${spread.name} Reading`,
    subtitle:spread.layout==='yearly'||spread.id==='yearly'
      ? 'A month-by-month flow and practical guidance'
      : `${spread.name} — themes, turning points, and guidance`,
    summary:readingPackage.quickSummary,
    themes:readingPackage.keyThemes.slice(0,3),
    cards:readingPackage.positions.map(item=>({
      position:item.position,
      label:item.displayLabel||item.positionName,
      positionName:item.positionName,
      cardName:item.cardName,
      orientation:item.orientation,
      headline:cleanInfographicHeadline(item.headline,item.positionName,item.cardName),
      message:item.interpretation,
      artUrl:resolveInfographicCardArtUrl(item.cardName,item.orientation)
    })),
    advice:readingPackage.guidance.slice(0,4),
    closingMessage:readingPackage.closingMessage,
    spreadName:spread.name,
    layout:spread.layout||spread.id,
    generatedDate:getLocalDateContext()
  };
}

function resolveInfographicCardArtUrl(cardName,orientation){
  const card=currentCards.find(c=>c.name.toLowerCase()===String(cardName).toLowerCase());
  if(card){
    const direct=card.imageUrl||card.imageURL||card.artUrl||card.artURL||card.image||card.src;
    if(typeof direct==='string'&&direct.trim())return direct.trim();
  }

  const helperNames=[
    'getCardArtUrl',
    'getCardImageUrl',
    'getCardArtworkUrl',
    'cardArtUrlFor',
    'buildCardArtUrl'
  ];
  const runtime=typeof window!=='undefined'?window:globalThis;
  for(const name of helperNames){
    const helper=runtime[name];
    if(typeof helper!=='function')continue;
    try{
      const value=helper(card||cardName,orientation,state.cardSystem);
      if(typeof value==='string'&&value.trim())return value.trim();
      if(value&&typeof value.src==='string')return value.src;
    }catch(_e){
      // The installed helper may use a different signature; try the next one.
    }
  }
  return '';
}

function renderReading(text){
  const content=document.getElementById('reading-content');
  content.innerHTML=readingMarkdownToHtml(text);
  enhanceReadingOutput();
  renderReadingInfographicPanel(content);

  const jSec=document.getElementById('journal-section');
  if(jSec){
    jSec.style.display='block';
    const journalEntry=document.getElementById('journal-entry');
    if(journalEntry)journalEntry.value='';
    if(typeof wireJournalSection==='function')wireJournalSection(jSec);
  }
  setReadingReadyState(true);
  renderEntitlementsUI();
}

function readingMarkdownToHtml(text){
  const lines=String(text||'').split('\n');
  let html='';
  let sectionOpen=false;
  let listOpen=false;
  let paragraph=[];

  function flushParagraph(){
    if(!paragraph.length)return;
    html+=`<p>${paragraph.map(line=>formatReadingInline(line)).join('<br>')}</p>`;
    paragraph=[];
  }
  function closeList(){
    if(listOpen){html+='</ul>';listOpen=false;}
  }
  function closeSection(){
    flushParagraph();
    closeList();
    if(sectionOpen){html+='</div>';sectionOpen=false;}
  }

  lines.forEach(line=>{
    const trimmed=line.trim();
    if(trimmed.startsWith('## ')){
      closeSection();
      html+=`<div class="reading-section"><h3>${formatReadingInline(trimmed.slice(3))}</h3>`;
      sectionOpen=true;
      return;
    }
    if(trimmed.startsWith('- ')){
      flushParagraph();
      if(!listOpen){html+='<ul>';listOpen=true;}
      html+=`<li>${formatReadingInline(trimmed.slice(2))}</li>`;
      return;
    }
    if(!trimmed){
      flushParagraph();
      closeList();
      return;
    }
    closeList();
    paragraph.push(trimmed);
  });
  closeSection();
  return html;
}

function formatReadingInline(value){
  return escapeReadingHtml(value)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>');
}

function escapeReadingHtml(value){
  return String(value??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function renderReadingInfographicPanel(content){
  const model=state.readingInfographic||buildInfographicFromCurrentState();
  if(!model||!model.cards.length)return;

  const panel=document.createElement('section');
  panel.id='reading-infographic-panel';
  panel.className='reading-section';
  panel.style.marginTop='24px';
  panel.innerHTML=`
    <h3>Shareable Reading Infographic</h3>
    <p style="margin-bottom:14px">A visual summary made from the confirmed cards and the reading above. Card names and orientations come from your reviewed spread.</p>
    <div style="border:1px solid rgba(205,169,92,.42);border-radius:8px;overflow:hidden;background:#f6f0df;box-shadow:0 18px 50px rgba(0,0,0,.22)">
      <canvas id="reading-infographic-canvas" role="img" aria-label="Visual summary of this card reading" style="display:block;width:100%;height:auto"></canvas>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:14px">
      <button type="button" id="download-reading-infographic" class="btn btn-primary">Download PNG</button>
      <button type="button" id="redraw-reading-infographic" class="btn">Redraw</button>
      <span id="reading-infographic-status" role="status" aria-live="polite" style="font-size:12px;opacity:.78">Building infographic…</span>
    </div>`;
  content.appendChild(panel);

  const canvas=panel.querySelector('#reading-infographic-canvas');
  const status=panel.querySelector('#reading-infographic-status');
  const downloadButton=panel.querySelector('#download-reading-infographic');
  const redrawButton=panel.querySelector('#redraw-reading-infographic');

  drawReadingInfographic(canvas,model)
    .then(()=>{status.textContent='Ready to download.';})
    .catch(error=>{status.textContent=`Preview could not be completed: ${error.message}`;});

  downloadButton.addEventListener('click',()=>downloadReadingInfographic(canvas,model,status));
  redrawButton.addEventListener('click',async()=>{
    status.textContent='Redrawing…';
    try{
      await drawReadingInfographic(canvas,model);
      status.textContent='Ready to download.';
    }catch(error){
      status.textContent=`Redraw failed: ${error.message}`;
    }
  });
}

function buildInfographicFromCurrentState(){
  try{
    const packageData=state.readingPackage||buildClassicReadingPackage();
    return buildInfographicModel(packageData);
  }catch(_e){
    return null;
  }
}

function getInfographicTemplate(model){
  const cardCount=model.cards.length;
  const spreadLayout=String(model.layout||'').toLowerCase();
  const indexes=Array.from({length:cardCount},(_,index)=>index);
  const chunk=(items,size)=>{
    const rows=[];
    for(let index=0;index<items.length;index+=size)rows.push(items.slice(index,index+size));
    return rows;
  };

  if(spreadLayout==='two-pathways'){
    return {
      id:'comparison',variant:'standard',columns:2,cardHeight:220,rowGap:22,
      title:'Two paths, side by side',subtitle:'Shared context first, then each route from near future to result',
      rows:[[0,1],[2,3],[4,6],[5,7],[8,10],[9,11],[12,13]].filter(row=>row.every(index=>index<cardCount)),
      rowLabels:['Shared ground','The choice','Near future','','Distant future','','Results'],expandSingle:true
    };
  }
  if(spreadLayout==='relationship'){
    return {
      id:'relationship',variant:'standard',columns:2,cardHeight:220,rowGap:22,
      title:'The relationship landscape',subtitle:'Each perspective is paired so similarities and tensions are easier to see',
      rows:[[0,5],[1,4],[2,3],[6,7],[8,9],[10,11],[12,13],[14]].filter(row=>row.every(index=>index<cardCount)),
      rowLabels:['What each person brings','Present position','Hopes','How you see each other','Past perceptions','Doubts & fears','External influences','Relationship direction'],expandSingle:true
    };
  }
  if(spreadLayout==='yearly'){
    return {
      id:'timeline',variant:'dense',columns:3,cardHeight:210,rowGap:20,
      title:'Your year, month by month',subtitle:'Read from left to right, then continue on the next row',
      rows:chunk(indexes,3),rowLabels:['Quarter 1','Quarter 2','Quarter 3','Quarter 4'],expandSingle:false
    };
  }
  if(spreadLayout==='romany'){
    return {
      id:'matrix',variant:'dense',columns:3,cardHeight:210,rowGap:20,
      title:'Past · Present · Future',subtitle:'Seven life areas arranged as a clear three-part timeline',
      rows:chunk(indexes,3),
      rowLabels:['Emotions','Relationships','Hopes & career','Finances','Spiritual life','Obstacles','Health'],expandSingle:false
    };
  }
  if(cardCount===1){
    return {
      id:'focus',variant:'feature',columns:1,cardHeight:340,rowGap:22,
      title:'Your card',subtitle:'One clear message to carry forward',rows:[indexes],rowLabels:[],expandSingle:true
    };
  }
  if(cardCount===3){
    return {
      id:'sequence',variant:'compact',columns:3,cardHeight:280,rowGap:22,
      title:'Past · Present · Future',subtitle:'A three-part story from influence to direction',rows:[indexes],rowLabels:[],expandSingle:false
    };
  }

  const columns=cardCount>14?3:2;
  return {
    id:cardCount<=6?'balanced':'position-grid',
    variant:columns===3?'dense':'standard',
    columns,
    cardHeight:columns===3?210:220,
    rowGap:22,
    title:cardCount<=6?'The heart of the reading':'Position by position',
    subtitle:cardCount<=6?'Core influences, tensions, and direction':'Follow the spread from the opening position to the outcome',
    rows:chunk(indexes,columns),rowLabels:[],expandSingle:false
  };
}

function buildInfographicBodyLayout(model,width,bodyTop){
  const template=getInfographicTemplate(model);
  const sidePadding=54;
  const columnGap=24;
  const contentWidth=width-sidePadding*2;
  const baseCardWidth=(contentWidth-columnGap*(template.columns-1))/template.columns;
  const placements=[];
  const rowHeaders=[];
  let cursorY=bodyTop;

  template.rows.forEach((row,rowIndex)=>{
    const rowLabel=template.rowLabels[rowIndex]||'';
    if(rowLabel){
      rowHeaders.push({label:rowLabel,x:sidePadding,y:cursorY,width:contentWidth});
      cursorY+=42;
    }
    const expands=row.length===1&&template.expandSingle;
    const rowWidth=expands?contentWidth:(row.length*baseCardWidth+(row.length-1)*columnGap);
    const rowX=sidePadding+(contentWidth-rowWidth)/2;
    row.forEach((cardIndex,columnIndex)=>{
      placements.push({
        cardIndex,
        x:rowX+columnIndex*(baseCardWidth+columnGap),
        y:cursorY,
        width:expands?contentWidth:baseCardWidth,
        height:template.cardHeight
      });
    });
    cursorY+=template.cardHeight+template.rowGap;
  });

  return {template,placements,rowHeaders,contentBottom:cursorY-template.rowGap};
}

async function drawReadingInfographic(canvas,model,options={}){
  const width=1200;
  const sidePadding=54;
  const headerHeight=440;
  const adviceHeight=430;
  const footerHeight=215;
  const bodyHeadingTop=headerHeight+30;
  const bodyLayout=buildInfographicBodyLayout(model,width,headerHeight+112);
  const adviceTop=bodyLayout.contentBottom+30;
  const height=Math.max(1500,adviceTop+adviceHeight+footerHeight+80);

  canvas.width=width;
  canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas is not supported in this browser.');

  const palette={
    navy:'#092b55',
    navyDeep:'#061f3f',
    teal:'#1c7c83',
    green:'#2c816d',
    cream:'#fbf4df',
    paper:'#fffaf0',
    ink:'#15355f',
    gold:'#d6aa4f',
    goldLight:'#f1d48a',
    muted:'#657184',
    white:'#fffdf7',
    line:'#dfc68c'
  };

  ctx.fillStyle=palette.cream;
  ctx.fillRect(0,0,width,height);
  drawInfographicHeader(ctx,model,width,headerHeight,palette);

  // Subtle paper texture.
  ctx.save();
  ctx.globalAlpha=.05;
  ctx.fillStyle=palette.navy;
  for(let y=headerHeight;y<height;y+=14){
    for(let x=(y/14)%2?7:0;x<width;x+=18){ctx.fillRect(x,y,1,1);}
  }
  ctx.restore();

  drawInfographicBodyHeading(ctx,bodyLayout.template,sidePadding,bodyHeadingTop,width-sidePadding*2,palette);
  bodyLayout.rowHeaders.forEach(row=>drawInfographicRowLabel(ctx,row.label,row.x,row.y,row.width,palette));

  const imageMap=options.skipImages?new Map():await loadInfographicCardImages(model.cards);
  bodyLayout.placements.forEach(placement=>{
    const card=model.cards[placement.cardIndex];
    drawInfographicCardPanel(
      ctx,card,placement.cardIndex,placement.x,placement.y,placement.width,placement.height,
      palette,imageMap.get(placement.cardIndex),bodyLayout.template
    );
  });

  drawInfographicAdvice(ctx,model,sidePadding,adviceTop,width-sidePadding*2,adviceHeight-20,palette);
  drawInfographicFooter(ctx,model,width,adviceTop+adviceHeight,height,palette);
  return canvas;
}

function drawInfographicHeader(ctx,model,width,height,palette){
  const gradient=ctx.createLinearGradient(0,0,width,height);
  gradient.addColorStop(0,palette.navyDeep);
  gradient.addColorStop(1,palette.navy);
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,width,height);

  drawStarField(ctx,width,height,palette.goldLight);
  ctx.fillStyle=palette.gold;
  ctx.fillRect(54,184,width-108,2);

  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle=palette.white;
  setCanvasFont(ctx,64,true,true);
  drawFittedCanvasText(ctx,model.title,width/2,82,width-150,64);

  ctx.fillStyle=palette.goldLight;
  setCanvasFont(ctx,27,true,false);
  drawFittedCanvasText(ctx,model.subtitle,width/2,145,width-190,27);

  roundedCanvasRect(ctx,58,212,width-116,158,18);
  ctx.fillStyle='rgba(255,250,240,.97)';
  ctx.fill();
  ctx.strokeStyle=palette.gold;
  ctx.lineWidth=2;
  ctx.stroke();

  ctx.textAlign='left';
  ctx.fillStyle=palette.ink;
  setCanvasFont(ctx,27,true,false);
  ctx.fillText('Reading at a glance',86,246);
  setCanvasFont(ctx,23,false,false);
  drawWrappedCanvasText(ctx,model.summary,86,280,width-172,31,3,palette.ink);

  const themes=model.themes.slice(0,3);
  const chipTop=382;
  const chipGap=14;
  const chipWidth=(width-116-chipGap*2)/3;
  themes.forEach((theme,index)=>{
    const x=58+index*(chipWidth+chipGap);
    roundedCanvasRect(ctx,x,chipTop,chipWidth,38,19);
    ctx.fillStyle='rgba(255,255,255,.11)';
    ctx.fill();
    ctx.strokeStyle='rgba(241,212,138,.55)';
    ctx.stroke();
    ctx.textAlign='center';
    ctx.fillStyle=palette.goldLight;
    setCanvasFont(ctx,18,true,false);
    drawFittedCanvasText(ctx,theme.title,x+chipWidth/2,chipTop+20,chipWidth-20,18);
  });
}

function drawInfographicBodyHeading(ctx,template,x,y,width,palette){
  ctx.textAlign='left';
  ctx.textBaseline='top';
  ctx.fillStyle=palette.navy;
  setCanvasFont(ctx,29,true,true);
  ctx.fillText(template.title,x,y);
  ctx.textAlign='right';
  ctx.fillStyle=palette.muted;
  setCanvasFont(ctx,16,false,false);
  drawFittedCanvasText(ctx,template.subtitle,x+width,y+9,Math.min(650,width*.6),16);
  ctx.fillStyle=palette.gold;
  ctx.fillRect(x,y+51,width,2);
}

function drawInfographicRowLabel(ctx,label,x,y,width,palette){
  ctx.textAlign='left';
  ctx.textBaseline='middle';
  ctx.fillStyle=palette.teal;
  setCanvasFont(ctx,17,true,false);
  ctx.fillText(label,x,y+17);
  const labelWidth=Math.min(width*.42,ctx.measureText(label).width+18);
  ctx.fillStyle='rgba(28,124,131,.22)';
  ctx.fillRect(x+labelWidth,y+16,width-labelWidth,1.5);
}

function drawStarField(ctx,width,height,color){
  ctx.save();
  ctx.fillStyle=color;
  ctx.strokeStyle=color;
  for(let i=0;i<38;i++){
    const x=18+((i*83)%Math.max(1,width-36));
    const y=18+((i*47)%Math.max(1,height-36));
    const size=i%7===0?5:(i%3===0?3:1.8);
    ctx.globalAlpha=i%5===0?.95:.62;
    ctx.beginPath();
    ctx.arc(x,y,size,0,Math.PI*2);
    ctx.fill();
    if(i%7===0){
      ctx.beginPath();
      ctx.moveTo(x-11,y);ctx.lineTo(x+11,y);
      ctx.moveTo(x,y-11);ctx.lineTo(x,y+11);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawInfographicCardPanel(ctx,card,index,x,y,width,height,palette,image,template={variant:'standard'}){
  ctx.save();
  ctx.shadowColor='rgba(33,48,70,.12)';
  ctx.shadowBlur=12;
  ctx.shadowOffsetY=5;
  roundedCanvasRect(ctx,x,y,width,height,18);
  ctx.fillStyle=palette.paper;
  ctx.fill();
  ctx.shadowColor='transparent';
  ctx.strokeStyle=index===0?palette.teal:palette.line;
  ctx.lineWidth=index===0?2.5:1.7;
  ctx.stroke();

  const label=getInfographicDisplayLabel(card,template);
  const isDense=template.variant==='dense';
  const isCompact=template.variant==='compact';
  const isFeature=template.variant==='feature';
  const labelFont=isDense?13:14;
  const labelHeight=isDense?30:34;
  const labelMax=isDense?150:188;
  const labelX=x+(isDense||isCompact?18:20);
  const labelY=y+(isDense||isCompact?14:17);
  setCanvasFont(ctx,labelFont,true,false);
  const labelWidth=Math.min(labelMax,Math.max(isDense?78:92,ctx.measureText(label).width+(isDense?24:30)));
  roundedCanvasRect(ctx,labelX,labelY,labelWidth,labelHeight,labelHeight/2);
  ctx.fillStyle=index===0?palette.navy:palette.teal;
  ctx.fill();
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle=palette.white;
  setCanvasFont(ctx,labelFont,true,false);
  drawFittedCanvasText(ctx,label,labelX+labelWidth/2,labelY+labelHeight/2,labelWidth-18,labelFont);

  const displayName=`${card.cardName}${card.orientation==='reversed'?' · Reversed':''}`;
  let artX;
  let artY;
  let artW;
  let artH;
  let textX;
  let textWidth;
  let messageY;
  let messageFont;
  let messageLineHeight;
  let messageLines;

  ctx.textAlign='left';
  ctx.fillStyle=palette.ink;
  if(isFeature){
    const nameX=x+20+labelWidth+18;
    drawFittedCanvasTextLeft(ctx,displayName,nameX,y+34,width-(nameX-x)-24,28);
    artX=x+34;artY=y+78;artW=150;artH=225;
    textX=x+220;textWidth=width-260;messageY=y+92;
    messageFont=21;messageLineHeight=29;messageLines=7;
  }else if(isDense||isCompact){
    ctx.textBaseline='middle';
    const nameY=y+(isDense?60:65);
    drawFittedCanvasTextLeft(ctx,displayName,x+20,nameY,width-40,isDense?20:22);
    artX=x+20;artY=y+(isDense?82:94);artW=isDense?64:78;artH=isDense?96:117;
    textX=x+(isDense?102:118);textWidth=width-(isDense?122:138);messageY=artY+2;
    messageFont=isDense?14:15;messageLineHeight=isDense?18:20;messageLines=isDense?5:6;
  }else{
    const nameX=x+20+labelWidth+16;
    ctx.textBaseline='middle';
    drawFittedCanvasTextLeft(ctx,displayName,nameX,y+34,width-(nameX-x)-20,23);
    artX=x+24;artY=y+67;artW=88;artH=132;
    textX=x+132;textWidth=width-154;messageY=y+72;
    messageFont=16;messageLineHeight=21;messageLines=5;
  }

  drawInfographicCardArt(ctx,card,image,artX,artY,artW,artH,palette);
  ctx.textAlign='left';
  ctx.textBaseline='top';
  if(card.headline&&!isDense){
    ctx.fillStyle=index===0?palette.teal:palette.navy;
    const headlineFont=isFeature?24:(isCompact?16:18);
    const headlineLineHeight=isFeature?30:(isCompact?20:22);
    setCanvasFont(ctx,headlineFont,true,false);
    const headlineHeight=drawWrappedCanvasText(ctx,card.headline,textX,messageY,textWidth,headlineLineHeight,2,ctx.fillStyle);
    messageY+=headlineHeight+(isFeature?13:8);
  }

  ctx.fillStyle=palette.ink;
  setCanvasFont(ctx,messageFont,false,false);
  drawWrappedCanvasText(ctx,card.message,textX,messageY,textWidth,messageLineHeight,messageLines,palette.ink);
  ctx.restore();
}

function getInfographicDisplayLabel(card,template){
  const label=String(card.label||card.positionName||`Position ${card.position}`);
  if(template.id!=='matrix')return label;
  if(/\bpast\b/i.test(label))return 'Past';
  if(/\b(present|now)\b/i.test(label))return 'Present';
  if(/\bfuture\b/i.test(label))return 'Future';
  return label;
}

function drawInfographicCardArt(ctx,card,image,x,y,width,height,palette){
  roundedCanvasRect(ctx,x,y,width,height,7);
  ctx.fillStyle='#e7dfc9';
  ctx.fill();
  ctx.strokeStyle=palette.gold;
  ctx.lineWidth=2;
  ctx.stroke();

  if(image){
    ctx.save();
    roundedCanvasRect(ctx,x+3,y+3,width-6,height-6,5);
    ctx.clip();
    if(card.orientation==='reversed'){
      ctx.translate(x+width/2,y+height/2);
      ctx.rotate(Math.PI);
      drawImageCover(ctx,image,-width/2+3,-height/2+3,width-6,height-6);
    }else{
      drawImageCover(ctx,image,x+3,y+3,width-6,height-6);
    }
    ctx.restore();
    return;
  }

  const grad=ctx.createLinearGradient(x,y,x+width,y+height);
  grad.addColorStop(0,palette.navy);
  grad.addColorStop(1,palette.navyDeep);
  roundedCanvasRect(ctx,x+4,y+4,width-8,height-8,5);
  ctx.fillStyle=grad;
  ctx.fill();
  ctx.strokeStyle=palette.goldLight;
  ctx.lineWidth=1.5;
  ctx.stroke();

  ctx.save();
  ctx.translate(x+width/2,y+height/2);
  if(card.orientation==='reversed')ctx.rotate(Math.PI);
  ctx.strokeStyle=palette.goldLight;
  ctx.fillStyle=palette.goldLight;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.arc(0,0,21,0,Math.PI*2);
  ctx.stroke();
  ctx.beginPath();
  for(let i=0;i<8;i++){
    const angle=(Math.PI*2*i)/8;
    ctx.moveTo(Math.cos(angle)*9,Math.sin(angle)*9);
    ctx.lineTo(Math.cos(angle)*29,Math.sin(angle)*29);
  }
  ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawImageCover(ctx,image,x,y,width,height){
  const scale=Math.max(width/image.width,height/image.height);
  const drawWidth=image.width*scale;
  const drawHeight=image.height*scale;
  ctx.drawImage(image,x+(width-drawWidth)/2,y+(height-drawHeight)/2,drawWidth,drawHeight);
}

async function loadInfographicCardImages(cards){
  const imageMap=new Map();
  await Promise.all(cards.map(async(card,index)=>{
    if(!card.artUrl)return;
    try{
      const image=await loadCanvasImage(card.artUrl);
      imageMap.set(index,image);
    }catch(_e){
      // Artwork is decorative. A branded card-back fallback is always available.
    }
  }));
  return imageMap;
}

function loadCanvasImage(src){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    if(!String(src).startsWith('data:')&&!String(src).startsWith('blob:'))image.crossOrigin='anonymous';
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('Card artwork could not be loaded.'));
    image.src=src;
  });
}

function drawInfographicAdvice(ctx,model,x,y,width,height,palette){
  roundedCanvasRect(ctx,x,y,width,height,22);
  ctx.fillStyle=palette.paper;
  ctx.fill();
  ctx.strokeStyle=palette.gold;
  ctx.lineWidth=2.2;
  ctx.stroke();

  roundedCanvasRect(ctx,x+24,y+20,width-48,58,15);
  ctx.fillStyle=palette.navy;
  ctx.fill();
  ctx.strokeStyle=palette.gold;
  ctx.stroke();
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle=palette.white;
  setCanvasFont(ctx,30,true,true);
  ctx.fillText('Practical Guidance',x+width/2,y+49);

  ctx.textAlign='left';
  ctx.textBaseline='top';
  const advice=model.advice.length?model.advice:[
    'Choose one small action that supports the direction you want.',
    'Review difficulties early instead of carrying them alone.',
    'Treat the spread as guidance for reflection, not a fixed outcome.'
  ];
  let cursorY=y+102;
  advice.slice(0,4).forEach((item,index)=>{
    ctx.save();
    ctx.translate(x+43,cursorY+10);
    ctx.rotate(Math.PI/4);
    ctx.fillStyle=palette.gold;
    ctx.fillRect(-6,-6,12,12);
    ctx.restore();
    ctx.fillStyle=palette.ink;
    setCanvasFont(ctx,21,false,false);
    const used=drawWrappedCanvasText(ctx,item,x+76,cursorY,width-116,29,2,palette.ink);
    cursorY+=Math.max(62,used+20);
  });
}

function drawInfographicFooter(ctx,model,width,startY,height,palette){
  const ribbonY=startY+38;
  const ribbonH=112;
  roundedCanvasRect(ctx,48,ribbonY,width-96,ribbonH,18);
  ctx.fillStyle=palette.navy;
  ctx.fill();
  ctx.strokeStyle=palette.gold;
  ctx.lineWidth=3;
  ctx.stroke();

  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle=palette.white;
  setCanvasFont(ctx,28,true,true);
  drawWrappedCanvasText(ctx,model.closingMessage,width/2,ribbonY+24,width-170,34,2,palette.white,true);

  ctx.fillStyle=palette.muted;
  setCanvasFont(ctx,14,false,false);
  ctx.fillText(`Arcana Guide · ${model.spreadName} · ${model.generatedDate}`,width/2,height-34);
  ctx.fillText('Reflective guidance only — not a guaranteed prediction or professional advice.',width/2,height-14);
}

function roundedCanvasRect(ctx,x,y,width,height,radius){
  const r=Math.min(radius,width/2,height/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+width,y,x+width,y+height,r);
  ctx.arcTo(x+width,y+height,x,y+height,r);
  ctx.arcTo(x,y+height,x,y,r);
  ctx.arcTo(x,y,x+width,y,r);
  ctx.closePath();
}

function setCanvasFont(ctx,size,bold,serif){
  const weight=bold?700:400;
  const family=serif
    ? '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", Georgia, serif'
    : '"Noto Sans JP", "Yu Gothic", "Hiragino Sans", Arial, sans-serif';
  ctx.font=`${weight} ${size}px ${family}`;
}

function drawFittedCanvasText(ctx,text,x,y,maxWidth,startSize){
  let size=startSize;
  while(size>15&&ctx.measureText(String(text)).width>maxWidth){
    size-=1;
    setCanvasFont(ctx,size,true,size>=25);
  }
  ctx.fillText(String(text),x,y);
}

function drawFittedCanvasTextLeft(ctx,text,x,y,maxWidth,startSize){
  let size=startSize;
  while(size>13&&ctx.measureText(String(text)).width>maxWidth){
    size-=1;
    setCanvasFont(ctx,size,true,size>=22);
  }
  ctx.fillText(String(text),x,y);
}

function drawWrappedCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines,color,centered=false){
  const lines=wrapCanvasText(ctx,String(text||''),maxWidth,maxLines);
  ctx.fillStyle=color||ctx.fillStyle;
  ctx.textAlign=centered?'center':'left';
  ctx.textBaseline='top';
  lines.forEach((line,index)=>ctx.fillText(line,x,y+index*lineHeight));
  return lines.length*lineHeight;
}

function wrapCanvasText(ctx,text,maxWidth,maxLines){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  if(!clean)return [];
  let tokens;
  try{
    const segmenter=new Intl.Segmenter(getReadingLocale(),{granularity:'word'});
    tokens=Array.from(segmenter.segment(clean),segment=>segment.segment);
  }catch(_e){
    tokens=clean.includes(' ')?clean.split(/(\s+)/):Array.from(clean);
  }

  const lines=[];
  let line='';
  for(const token of tokens){
    const test=line+token;
    if(line&&ctx.measureText(test).width>maxWidth){
      lines.push(line.trim());
      line=token.trimStart();
      if(lines.length===maxLines)break;
    }else{
      line=test;
    }
  }
  if(lines.length<maxLines&&line.trim())lines.push(line.trim());
  if(lines.length>maxLines)lines.length=maxLines;

  if(lines.length===maxLines){
    const consumed=lines.join('').replace(/\s/g,'');
    const original=clean.replace(/\s/g,'');
    if(consumed.length<original.length){
      let last=lines[maxLines-1];
      while(last.length&&ctx.measureText(`${last}…`).width>maxWidth)last=last.slice(0,-1);
      lines[maxLines-1]=`${last.trimEnd()}…`;
    }
  }
  return lines;
}

async function downloadReadingInfographic(canvas,model,statusElement){
  if(statusElement)statusElement.textContent='Preparing PNG…';
  try{
    let blob=await canvasToPngBlob(canvas);
    if(!blob){
      await drawReadingInfographic(canvas,model,{skipImages:true});
      blob=await canvasToPngBlob(canvas);
    }
    if(!blob)throw new Error('The image could not be exported.');

    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    const spreadSlug=String(model.spreadName||'reading').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'reading';
    link.href=url;
    link.download=`arcana-${spreadSlug}-${model.generatedDate}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    if(statusElement)statusElement.textContent='PNG downloaded.';
  }catch(error){
    // Cross-origin artwork can taint a canvas on some hosts. Redraw with the built-in card backs and retry once.
    try{
      await drawReadingInfographic(canvas,model,{skipImages:true});
      const safeBlob=await canvasToPngBlob(canvas);
      if(!safeBlob)throw error;
      const url=URL.createObjectURL(safeBlob);
      const link=document.createElement('a');
      link.href=url;
      link.download=`arcana-reading-${model.generatedDate}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      if(statusElement)statusElement.textContent='PNG downloaded with the built-in card design.';
    }catch(finalError){
      if(statusElement)statusElement.textContent=`Download failed: ${finalError.message}`;
    }
  }
}

function canvasToPngBlob(canvas){
  return new Promise(resolve=>{
    try{
      canvas.toBlob(blob=>resolve(blob),'image/png',1);
    }catch(_e){
      resolve(null);
    }
  });
}


// ===== QUICK PHOTO READING OVERRIDE =====
// ui.js defines an older quickRead() that asks Gemini for one markdown response.
// This later definition intentionally replaces it because reading-engine.js loads
// after ui.js. It identifies the cards first, stores validated cards in state,
// then uses the same structured reading + infographic pipeline as guided readings.
async function quickRead(){
  if(!canGenerateReading()){
    showUpgradeModal('daily-limit');
    return;
  }

  const settings=loadSettings();
  try{requireAIConfiguration();}catch(error){alert(error.message);return;}
  if(!state.uploadedImage){alert('Please upload a photo first.');return;}

  const spread=SPREADS.find(item=>item.id===state.quickSpreadId);
  if(!spread){alert('Please choose the spread used in the photo.');return;}

  const concernElement=document.getElementById('quick-concern');
  const concern=concernElement?concernElement.value.trim():'';
  state.concerns=concern?[concern]:[];
  if(typeof saveReaderContext==='function')saveReaderContext('quick-reader-life-stage');

  // getSpread() reads state.spreadId, so make the selected quick spread the
  // authoritative spread before creating the structured reading package.
  state.spreadId=spread.id;
  state.readingPackage=null;
  state.readingInfographic=null;
  state.cards={};

  const results=document.getElementById('quick-results');
  results.innerHTML=thoughtfulLoadingHtml('quick-ai-status');
  const statusElement=document.getElementById('quick-ai-status');

  try{
    if(statusElement)statusElement.textContent='Identifying and validating the cards…';
    const detectionRequired=shouldDetectCardSystem();
    const positionDetails=spread.positions
      .map(position=>`${position.id}. ${position.name} — ${position.description}`)
      .join('\n');

    const identificationPrompt=`You are identifying physical cards in a photograph of a completed spread.

SPREAD: ${spread.name} (${spread.cardCount} cards) — ${spread.description}
${getCleanSpreadLayoutHint(spread)}

POSITIONS:
${positionDetails}

${getCardSystemPromptGuide(state.cardSystem,detectionRequired)}

For every visible spread position, identify the exact card name and whether it is upright or reversed.
Return ONLY a valid JSON array with no markdown or commentary:
[{"position":1,"card":"Card Name","orientation":"upright"}]
Use the supplied position IDs exactly. If a card cannot be identified, use null for its card value.`;

    const identificationRaw=await callGemini(
      identificationPrompt,
      null,
      state.uploadedImage,
      statusElement
    );

    if(!window.ArcanaAI||typeof window.ArcanaAI.parseIdentifiedCards!=='function'){
      throw new Error('Validated card identification is unavailable. Please reload the page and try again.');
    }

    const references=getIdentificationCardReferences(detectionRequired);
    const identified=window.ArcanaAI.parseIdentifiedCards(
      identificationRaw,
      references,
      spread.positions.map(position=>position.id)
    );
    validateIdentificationResult(identified);
    if(detectionRequired)establishDetectedCardSystem(identified);
    replaceIdentifiedSpreadCards(spread,identified);
    currentCards=getCards();

    if(statusElement)statusElement.textContent='Creating the reading and infographic…';
    const narrative=await generateAIReading(settings,statusElement);
    state.narrative=narrative;

    if(!state.readingUsageRecorded){
      recordCompletedReading();
      state.readingUsageRecorded=true;
    }

    results.innerHTML='';
    const content=document.createElement('div');
    content.id='quick-reading-content';
    content.innerHTML=readingMarkdownToHtml(narrative);
    results.appendChild(content);
    renderReadingInfographicPanel(content);

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
    const journal=results.querySelector('.journal-section');
    if(journal)wireJournalSection(journal);
    renderEntitlementsUI();
  }catch(error){
    results.innerHTML=`<p style="color:var(--danger)">Error: ${escapeReadingHtml(error.message)}</p>`;
  }
}
