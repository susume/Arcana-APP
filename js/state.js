// ===== APP STATE =====
let state={
  mode:'guided',concerns:[],cardSystem:'tarot',spreadId:null,
  cards:{},droppedCard:null,hasDroppedCard:false,
  uploadedImage:null,narrative:'',readingMode:'ai',
  readerLifeStage:'',
  guidedStep:0,reversals:false,quickSpreadId:null,
  readingUsageRecorded:false
};
let currentCards=[];

function getCards(){
  if(state.cardSystem==='tarot')return TAROT_CARDS;
  return buildPlayingCards(state.cardSystem==='playing-joker');
}
function getSpread(){return SPREADS.find(s=>s.id===state.spreadId)}
function getSuitSym(card){
  if(card.system==='tarot'){
    if(card.arcana==='major')return GLYPH.star8;
    return TAROT_SUIT_SYM[card.suit]||'';
  }
  return PLAYING_SYM[card.suit]||GLYPH.star4;
}
