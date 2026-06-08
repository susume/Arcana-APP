// ===== SPREAD DEFINITIONS =====
let SPREADS=[];
async function loadSpreads(){
  let data=null;
  if(location.protocol!=='file:'){
    try{
      const res=await fetch('data/spreads.json');
      if(res.ok)data=await res.json();
    }catch(e){}
  }
  if(!data){
    const embedded=document.getElementById('spreads-data');
    if(embedded)data=JSON.parse(embedded.textContent);
  }
  if(!data)throw new Error('Unable to load spreads data.');
  SPREADS=Object.values(data);
  return SPREADS;
}
