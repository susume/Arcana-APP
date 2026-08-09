// ===== INIT =====
async function initApp(){
  await renderScreen();
  await loadSpreads();
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
  // Auto-restore
  const saved=restoreState();
  const savedState=saved&&saved.state?saved.state:null;
  if(savedState){
    state=Object.assign(state,savedState);
    migrateRestoredCardSystemState(savedState);
    const savedRoute=saved.route || (state.spreadId?'screen-spread':'screen-concerns');
    goScreen(screenForRoute(savedRoute),true);
  }else{
    goScreen(screenForRoute(location.hash.slice(1)||'welcome'),true);
  }
  document.querySelectorAll('.modal-overlay').forEach(m=>{
    m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)});
  });
  renderEntitlementsUI();
}

window.addEventListener('hashchange',()=>goScreen(screenForRoute(location.hash.slice(1)),true));
initApp();
