// ===== CARD DATABASE =====
// ===== GLYPHS & ICONS (refined, emoji-free) =====
const _svg=(inner,fill)=>`<svg viewBox="0 0 24 24" ${fill?'fill="currentColor"':'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${inner}</svg>`;
const GLYPH={
  star4:_svg('<path d="M12 1.6c.8 6 4.4 9.6 10.4 10.4-6 .8-9.6 4.4-10.4 10.4-.8-6-4.4-9.6-10.4-10.4 6-.8 9.6-4.4 10.4-10.4Z"/>',true),
  star8:_svg('<path d="M12 1.5 13.61 8.12 19.42 4.58 15.88 10.39 22.5 12 15.88 13.61 19.42 19.42 13.61 15.88 12 22.5 10.39 15.88 4.58 19.42 8.12 13.61 1.5 12 8.12 10.39 4.58 4.58 10.39 8.12Z"/>',true)
};
const SUIT={
  fire:_svg('<path d="M12 3.5 20.5 20 3.5 20Z"/>'),
  water:_svg('<path d="M3.5 4.5 20.5 4.5 12 20.5Z"/>'),
  air:_svg('<path d="M12 3.5 20.5 20 3.5 20Z"/><path d="M6.8 14.7H17.2"/>'),
  earth:_svg('<path d="M3.5 4.5 20.5 4.5 12 20.5Z"/><path d="M6.8 9.3H17.2"/>')
};
const ICON={
  camera:_svg('<rect x="3" y="6.6" width="18" height="13" rx="2.6"/><circle cx="12" cy="13.1" r="3.4"/><path d="M8.4 6.6 9.6 4.4h4.8L15.6 6.6"/>'),
  settings:_svg('<line x1="3.2" y1="8" x2="20.8" y2="8"/><line x1="3.2" y1="16" x2="20.8" y2="16"/><circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="16" r="2.6"/>'),
  book:_svg('<path d="M12 6.4C10.4 5 7.6 4.5 4.6 5v13.4c3-.5 5.8 0 7.4 1.4M12 6.4c1.6-1.4 4.4-1.9 7.4-1.4v13.4c-3-.5-5.8 0-7.4 1.4M12 6.4V20"/>'),
  help:_svg('<circle cx="12" cy="12" r="9"/><path d="M9.3 9.3a2.9 2.9 0 0 1 5.6.9c0 1.9-2.8 2.4-2.8 4.1"/><circle cx="12" cy="17.4" r=".7" fill="currentColor" stroke="none"/>'),
  printer:_svg('<path d="M7 9.5V4.2h10v5.3"/><rect x="4.4" y="9.5" width="15.2" height="7.4" rx="1.6"/><rect x="7.4" y="14" width="9.2" height="5.4"/><circle cx="16.6" cy="12.2" r=".7" fill="currentColor" stroke="none"/>'),
  save:_svg('<path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.3L6 20V5.5a1 1 0 0 1 1-1Z"/>'),
  bolt:_svg('<path d="M13.2 3 5.5 13.2H10l-1 7.8 8-10.6H12.4l.8-7.4Z"/>'),
  layers:_svg('<path d="M12 3.6 20.5 8 12 12.4 3.5 8Z"/><path d="M3.7 12 12 16.4 20.3 12"/><path d="M3.7 15.6 12 20 20.3 15.6"/>')
};
const cardBackIco=()=>`<div class="card-back mode-ico"><div class="cb-star">${GLYPH.star8}</div></div>`;

const TAROT_MAJOR = [
{name:'The Fool',arcana:'major',suit:null,number:0,keywords:['beginnings','innocence','spontaneity','leap of faith'],upright:'A leap of faith into the unknown. New beginnings, unlimited potential, and the courage to start a journey without knowing the destination.',reversed:'Recklessness, naivety, foolish risk-taking. Holding back from a necessary leap due to fear.'},
{name:'The Magician',arcana:'major',suit:null,number:1,keywords:['willpower','manifestation','skill','resourcefulness'],upright:'You have all the tools you need. Channel your willpower to manifest your desires. Skill and resourcefulness lead to success.',reversed:'Manipulation, trickery, untapped potential. Misuse of talent or deception.'},
{name:'The High Priestess',arcana:'major',suit:null,number:2,keywords:['intuition','mystery','subconscious','inner voice'],upright:'Trust your intuition. Hidden knowledge is revealing itself. Look beyond the surface and listen to your inner voice.',reversed:'Secrets withheld, disconnection from intuition, superficial understanding.'},
{name:'The Empress',arcana:'major',suit:null,number:3,keywords:['abundance','nurturing','fertility','nature'],upright:'Abundance flows to you through nurturing and creativity. A time of growth, comfort, and connection with the natural world.',reversed:'Creative block, dependence, neglect of self-care or others.'},
{name:'The Emperor',arcana:'major',suit:null,number:4,keywords:['authority','structure','stability','leadership'],upright:'Establish order and structure. Authority exercised wisely brings stability. Take charge of your situation with discipline.',reversed:'Rigidity, tyranny, lack of discipline, loss of control.'},
{name:'The Hierophant',arcana:'major',suit:null,number:5,keywords:['tradition','guidance','conformity','spiritual wisdom'],upright:'Seek wisdom through established traditions and mentors. Spiritual guidance is available if you are open to learning.',reversed:'Challenging convention, unorthodox approaches, rejecting tradition.'},
{name:'The Lovers',arcana:'major',suit:null,number:6,keywords:['love','union','choices','alignment'],upright:'A deep connection or important choice. Alignment of values and desires. Union of complementary forces.',reversed:'Disharmony, misalignment, difficult choices, broken trust.'},
{name:'The Chariot',arcana:'major',suit:null,number:7,keywords:['determination','willpower','victory','control'],upright:'Victory through determination and willpower. Harness opposing forces and drive forward with confidence.',reversed:'Lack of direction, aggression, obstacles overwhelming willpower.'},
{name:'Strength',arcana:'major',suit:null,number:8,keywords:['courage','patience','inner strength','compassion'],upright:'True strength comes from patience and compassion, not force. Tame your inner fears with gentle courage.',reversed:'Self-doubt, weakness, raw emotion overwhelming reason.'},
{name:'The Hermit',arcana:'major',suit:null,number:9,keywords:['solitude','introspection','wisdom','inner light'],upright:'Withdraw from the noise and seek answers within. Solitude brings wisdom. Your inner light guides the way.',reversed:'Isolation, loneliness, withdrawal from help, lost direction.'},
{name:'Wheel of Fortune',arcana:'major',suit:null,number:10,keywords:['cycles','fate','turning point','luck'],upright:'The wheel turns — change is coming. A turning point in your journey. Embrace the cycles of fortune.',reversed:'Bad luck, resistance to change, feeling stuck in a cycle.'},
{name:'Justice',arcana:'major',suit:null,number:11,keywords:['fairness','truth','accountability','balance'],upright:'Truth and fairness prevail. Take responsibility for your actions. A balanced decision is required.',reversed:'Injustice, dishonesty, lack of accountability, unfair treatment.'},
{name:'The Hanged Man',arcana:'major',suit:null,number:12,keywords:['surrender','new perspective','pause','sacrifice'],upright:'Surrender control and see things from a new perspective. A willing pause that leads to enlightenment.',reversed:'Stalling, resistance to necessary sacrifice, indecision.'},
{name:'Death',arcana:'major',suit:null,number:13,keywords:['transformation','endings','rebirth','transition'],upright:'A profound transformation. Something must end for something new to begin. Embrace the rebirth.',reversed:'Resistance to change, stagnation, fear of letting go.'},
{name:'Temperance',arcana:'major',suit:null,number:14,keywords:['balance','moderation','patience','harmony'],upright:'Find the middle path. Patience and moderation bring harmony. Blend opposing elements into something beautiful.',reversed:'Imbalance, excess, impatience, lack of harmony.'},
{name:'The Devil',arcana:'major',suit:null,number:15,keywords:['bondage','materialism','shadow self','temptation'],upright:'Examine what binds you — addiction, materialism, toxic patterns. Awareness of your shadow self is the first step to freedom.',reversed:'Breaking free, releasing attachments, reclaiming power.'},
{name:'The Tower',arcana:'major',suit:null,number:16,keywords:['upheaval','sudden change','revelation','awakening'],upright:'Sudden upheaval shatters false structures. Though shocking, this destruction clears the way for truth and rebuilding.',reversed:'Avoidance of disaster, fear of change, personal transformation.'},
{name:'The Star',arcana:'major',suit:null,number:17,keywords:['hope','healing','inspiration','renewal'],upright:'A guiding light appears after darkness. Hope, healing, and renewed faith. Trust that you are on the right path.',reversed:'Despair, disconnection, lack of faith, lost inspiration.'},
{name:'The Moon',arcana:'major',suit:null,number:18,keywords:['illusion','fear','subconscious','uncertainty'],upright:'Things are not as they seem. Navigate through uncertainty by trusting your instincts. Face your fears and illusions.',reversed:'Release of fear, clarity emerging, overcoming confusion.'},
{name:'The Sun',arcana:'major',suit:null,number:19,keywords:['joy','success','vitality','clarity'],upright:'Radiant joy and success. Everything becomes clear under the sun. Vitality, warmth, and achievement.',reversed:'Temporary sadness, lack of clarity, delayed success.'},
{name:'Judgement',arcana:'major',suit:null,number:20,keywords:['rebirth','calling','reflection','reckoning'],upright:'A calling to rise up and embrace your purpose. Reflect on your journey and answer the call to transformation.',reversed:'Self-doubt, refusal to learn, harsh self-judgement.'},
{name:'The World',arcana:'major',suit:null,number:21,keywords:['completion','integration','accomplishment','wholeness'],upright:'A cycle reaches completion. Integration of all you have learned. Wholeness, accomplishment, and celebration.',reversed:'Incomplete, shortcuts taken, lack of closure.'}
];

const TAROT_SUITS = ['wands','cups','swords','pentacles'];
const TAROT_SUIT_NAMES = {wands:'Wands',cups:'Cups',swords:'Swords',pentacles:'Pentacles'};
const TAROT_SUIT_SYM = {wands:SUIT.fire,cups:SUIT.water,swords:SUIT.air,pentacles:SUIT.earth};
const MINOR_MEANINGS = {
wands:{
  keywords:[['creation','inspiration','willpower','passion'],['planning','decisions','discovery','future'],['expansion','foresight','enterprise','trade'],['celebration','harmony','homecoming','peace'],['conflict','competition','tension','disagreement'],['victory','recognition','pride','reward'],['perseverance','defiance','courage','challenge'],['speed','movement','action','change'],['resilience','persistence','boundaries','stamina'],['burden','responsibility','hard work','pressure']],
  upright:['Creative spark and inspired action.','Planning your future path with both options open.','Expansion and looking ahead — your ships are coming in.','Celebration, stability, and joyful homecoming.','Petty conflict and competitive tension.','Public recognition and victory after effort.','Holding your ground despite opposition.','Swift movement and rapid developments.','Standing firm through perseverance and endurance.','Carrying heavy burdens and responsibilities.'],
  reversed:['Delays in new ventures, lack of direction.','Fear of the unknown, poor planning.','Setbacks in plans, lack of foresight.','Instability, transition, feeling unwelcome.','Avoiding conflict, inner tension.','Failure, lack of recognition, self-doubt.','Giving up, overwhelmed, cannot keep fighting.','Delays, frustration, losing momentum.','Paranoia, defensiveness, stubbornness.','Burnout, taking on too much, inability to delegate.']
},
cups:{
  keywords:[['love','new feelings','intuition','compassion'],['partnership','unity','mutual attraction','connection'],['celebration','friendship','joy','creativity'],['apathy','contemplation','reevaluation','boredom'],['grief','loss','regret','disappointment'],['nostalgia','childhood','innocence','memories'],['illusion','fantasy','choices','wishful thinking'],['departure','letting go','moving on','searching'],['contentment','satisfaction','gratitude','pleasure'],['harmony','family','love','emotional fulfillment']],
  upright:['New emotional beginning, love offered or received.','Deep connection and mutual attraction forming.','Celebration with friends, creative collaboration, joy.','Turning inward, emotional apathy, missed opportunities.','Grief and loss, but something remains — focus on what is left.','Sweet nostalgia and happy memories, an old friend returns.','So many dreams, but which is real? Choose carefully.','Walking away from what no longer serves you.','Wishes fulfilled, emotional and material satisfaction.','Loving family, deep emotional fulfillment, lasting happiness.'],
  reversed:['Blocked emotions, love unrequited.','Imbalance in relationship, broken connection.','Overindulgence, scattered creativity, isolation.','Motivation returns, new opportunity noticed.','Acceptance, moving on, finding peace after loss.','Living in the past, unrealistic expectations.','Confusion clears, grounding in reality.','Fear of change, clinging to comfort.','Smugness, materialism, dissatisfaction despite having enough.','Family discord, broken home, misaligned values.']
},
swords:{
  keywords:[['clarity','truth','breakthrough','new idea'],['stalemate','denial','blocked emotions','avoidance'],['heartbreak','sorrow','grief','painful truth'],['rest','recovery','contemplation','solitude'],['conflict','defeat','dishonor','betrayal'],['transition','moving on','mental shift','recovery'],['deception','betrayal','stealth','strategy'],['restriction','powerlessness','isolation','victimhood'],['anxiety','nightmares','worry','despair'],['ending','pain','betrayal','loss','rock bottom']],
  upright:['A breakthrough of clarity and truth.','Refusing to see or address a difficult situation.','Heartbreak and deep sorrow; a painful but necessary truth.','Rest and recovery — you need to step back and heal.','Conflict and defeat, possibly through dishonor.','A necessary transition; moving toward something better.','Strategic action, possibly deception — check your motives.','Feeling trapped and powerless, but the bonds are mental.','Overwhelming anxiety and worry keeping you up at night.','A painful ending, but the worst is over.'],
  reversed:['Confusion, miscommunication, mental fog.','Releasing denial, confronting truth.','Recovery from heartbreak, releasing pain.','Restlessness, burnout from refusing rest.','Learning from defeat, making amends.','Resistance to change, unfinished business.','Coming clean, being caught, confession.','Finding a way out, self-empowerment.','Recovery from anxiety, hope returning.','Survival, rising from disaster, unable to let go.']
},
pentacles:{
  keywords:[['opportunity','prosperity','new venture','manifestation'],['balance','adaptability','juggling','resourcefulness'],['mastery','teamwork','craftsmanship','skill'],['control','security','possessiveness','stability'],['hardship','loss','poverty','isolation'],['generosity','charity','sharing','kindness'],['patience','investment','long-term vision','assessment'],['dedication','craftsmanship','mastery','diligence'],['independence','luxury','self-sufficiency','abundance'],['legacy','wealth','family','inheritance','establishment']],
  upright:['A new financial or material opportunity manifests.','Balancing multiple priorities with adaptability.','Teamwork producing quality results; recognition of skill.','Holding tight to what you have; security through control.','Financial hardship and feeling left out in the cold.','Generous spirit, giving or receiving needed help.','Patience as long-term investments take root.','Dedicated mastery through disciplined practice.','Self-sufficient abundance and well-earned independence.','Lasting legacy, family wealth, and material fulfillment.'],
  reversed:['Missed opportunity, poor financial planning.','Overcommitted, financial disorganization.','Mediocre work, lack of teamwork, shortcuts.','Greed, financial insecurity despite having enough.','Recovery from financial setback, spiritual poverty.','Strings attached to generosity, debt.','Impatience, poor returns, frustration with slow progress.','Cutting corners, lack of ambition, dead-end work.','Over-investment in material life, financial setbacks.','Family disputes over money, failure to plan legacy.']
}
};
const COURT_MEANINGS = {
wands:{page:{kw:['exploration','enthusiasm','discovery','free spirit'],u:'An enthusiastic messenger bringing exciting news or opportunities.',r:'Setbacks to plans, hasty actions, lack of direction.'},knight:{kw:['adventure','energy','passion','impulsiveness'],u:'Passionate pursuit of a goal with fiery determination.',r:'Recklessness, scattered energy, delays in travel.'},queen:{kw:['confidence','warmth','determination','vibrancy'],u:'A warm, confident presence who inspires others with courage.',r:'Jealousy, selfishness, demanding temperament.'},king:{kw:['leadership','vision','entrepreneurship','honor'],u:'Bold leadership with a clear vision and natural charisma.',r:'Impulsiveness, ruthlessness, unrealistic expectations.'}},
cups:{page:{kw:['creativity','intuition','sensitivity','dreamer'],u:'A sensitive soul bringing creative inspiration or emotional news.',r:'Emotional immaturity, creative blocks, escapism.'},knight:{kw:['romance','charm','imagination','following the heart'],u:'A romantic idealist following their heart toward new horizons.',r:'Moodiness, unrealistic expectations, emotional manipulation.'},queen:{kw:['compassion','calm','emotional security','intuition'],u:'Deep emotional wisdom and compassion; nurturing intuition.',r:'Codependency, emotional insecurity, martyrdom.'},king:{kw:['emotional balance','diplomacy','generosity','wisdom'],u:'Emotionally balanced leadership with generous wisdom.',r:'Emotional manipulation, volatility, moodiness.'}},
swords:{page:{kw:['curiosity','mental agility','new ideas','communication'],u:'A sharp mind eager to learn and communicate new ideas.',r:'Gossip, deception, all talk and no action.'},knight:{kw:['ambition','speed','directness','intellect'],u:'Swift intellectual pursuit, charging ahead with determination.',r:'Aggression, impatience, scattered thinking.'},queen:{kw:['perception','clarity','independence','direct communication'],u:'Clear-sighted perception that cuts through deception.',r:'Cruelty, cold-heartedness, bitterness.'},king:{kw:['authority','intellect','truth','ethical leadership'],u:'Intellectual authority wielded with ethical clarity.',r:'Tyrannical thinking, abuse of power, manipulation.'}},
pentacles:{page:{kw:['ambition','desire to learn','new skill','opportunity'],u:'A diligent student manifesting new practical opportunities.',r:'Lack of focus, procrastination, missed opportunities.'},knight:{kw:['hard work','routine','patience','reliability'],u:'Steady, reliable progress through patient hard work.',r:'Laziness, boredom, stagnation, perfectionism.'},queen:{kw:['nurturing','practical','generous','down-to-earth'],u:'Practical generosity and nurturing abundance in daily life.',r:'Neglect of finances, smothering, work-life imbalance.'},king:{kw:['wealth','business','security','discipline'],u:'Material mastery and disciplined abundance; a provider.',r:'Greed, materialism, stubbornness, poor financial management.'}}
};

function buildTarotMinor(){
  const cards=[];
  const ranks=['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'];
  const courts=['Page','Knight','Queen','King'];
  TAROT_SUITS.forEach(suit=>{
    ranks.forEach((rank,i)=>{
      cards.push({name:`${rank} of ${TAROT_SUIT_NAMES[suit]}`,arcana:'minor',suit,number:i+1,
        keywords:MINOR_MEANINGS[suit].keywords[i],
        upright:MINOR_MEANINGS[suit].upright[i],
        reversed:MINOR_MEANINGS[suit].reversed[i]});
    });
    courts.forEach(court=>{
      const c=COURT_MEANINGS[suit][court.toLowerCase()];
      cards.push({name:`${court} of ${TAROT_SUIT_NAMES[suit]}`,arcana:'minor',suit,number:court==='Page'?11:court==='Knight'?12:court==='Queen'?13:14,
        keywords:c.kw,upright:c.u,reversed:c.r});
    });
  });
  return cards;
}
const TAROT_CARDS = [...TAROT_MAJOR,...buildTarotMinor()].map(c=>({...c,system:'tarot'}));

const PLAYING_SUITS=['hearts','spades','diamonds','clubs'];
const PLAYING_SYM={hearts:'♥',spades:'♠',diamonds:'♦',clubs:'♣'};
const PLAYING_RANKS=['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Jack','Queen','King'];
const PLAYING_MEANINGS={
hearts:['New friendship, romance','Deepening attraction','Joy in company, friendship, celebration','Turning inwards, apathy','Loss, despair','Childhood, nostalgia, good memories, an old friendship resumes','Daydreaming, wishful thinking, choices','Emotional detachment, leaving love behind, making a hard choice','Satisfaction, sensual pleasure, spiritual growth','Contentment, fulfilment, joy, family','Falls in love easily, romantic, chatterbox','Emotional, dependent, empathic','Wise, tolerant, diplomatic, feeling, patient'],
spades:['New insights, realizations','Failure to communicate','Miscommunication, misunderstanding','Recuperation, recovery, contemplation','Discord, dishonour, hollow victory','Moving on, travel, mentally getting to a better place','Lying, deceitfulness, theft, irresponsibility','Illusion of being trapped, powerlessness','Nightmares, problems, worry, guilt','Giving up, victim, martyrdom','Rebel, fights for a cause, intellectual, political','Sharp, intelligent, ruthless, insightful, organized','Introspective, ethical, communicator, stern'],
diamonds:['New project, job, home, win','Juggling resources, waiting on results','Teamwork, improving skills','Miserliness, possessiveness','Loss of possessions or job or money','Giving or receiving money, a pay-rise, obtaining resources','Reassessment, turning point, mild dissatisfaction','Paying attention to detail, focus, practice','Independence, self-reliance, increasing wealth','Great wealth, family property, inheritance','Reliable, hard-working, quiet, hidden depths','Practical, warm, dependable, motherhood','Self-made, business owner, encouraging, enjoys the fruits of his labors, jolly'],
clubs:['New idea, business, action','Planning and preparation','Leadership, exploration','A goal achieved, rest from action','Competition, disagreement, irritation','Victory, achievement, passing exams','Defence, conviction, strong belief','Organization, moving quickly, pregnancy','Continuing a battle, endurance, physical strength','Carrying burdens, responsibility, debt','Unreliable, hot-headed, risk taker, athletic','Energetic, career-minded, untidy, disorganized','Creative, forceful, entrepreneurial, charismatic, hot-tempered']
};

function buildPlayingCards(includeJoker){
  const cards=[];
  PLAYING_SUITS.forEach(suit=>{
    PLAYING_RANKS.forEach((rank,i)=>{
      const meaning=PLAYING_MEANINGS[suit][i];
      const kws=meaning.split(',').map(s=>s.trim()).slice(0,4);
      const isNumber=i<10;
      const rev=isNumber?`Blocked: ${meaning.toLowerCase()} — energy delayed or inverted.`:`Shadow side: ${meaning.toLowerCase()} — qualities become excessive or harmful.`;
      cards.push({system:'playing',name:`${rank} of ${suit.charAt(0).toUpperCase()+suit.slice(1)}`,suit,number:i+1,keywords:kws,upright:meaning,reversed:rev});
    });
  });
  if(includeJoker){
    cards.push({system:'playing',name:'The Joker',suit:null,number:0,keywords:['unlimited potential','wild card','trust','risk'],upright:'Unlimited potential — taking a big risk but having trust that all will be well.',reversed:'Foolish risk, chaos, lack of direction.'});
  }
  return cards;
}
