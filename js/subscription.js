// ===== SUBSCRIPTION / ENTITLEMENTS =====
const ARCANA_ACTIVATION_KEYS = [
  'ARCANA-FOUNDER-4F99-2026'
];
const FREE_DAILY_READING_LIMIT = 1;
const PREMIUM_SPREAD_IDS = ['celtic-cross', 'romany', 'yearly', 'two-pathways', 'relationship'];

function todayKey(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function monthKey(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function normalizeActivationKey(key){
  return String(key || '').trim().toUpperCase().replace(/\s+/g, '');
}

function getSubscription(){
  try{
    return JSON.parse(localStorage.getItem('arcana_subscription')) || {tier:'free'};
  }catch(e){
    return {tier:'free'};
  }
}

function saveSubscription(sub){
  localStorage.setItem('arcana_subscription', JSON.stringify(sub));
}

function isPremium(){
  return getSubscription().tier === 'premium';
}

function activatePremiumKey(key){
  const clean = normalizeActivationKey(key);
  if(!ARCANA_ACTIVATION_KEYS.includes(clean)) return false;
  saveSubscription({tier:'premium', key:clean, activatedAt:new Date().toISOString()});
  return true;
}

function deactivatePremium(){
  localStorage.setItem('arcana_subscription', JSON.stringify({tier:'free'}));
}

function getUsage(){
  let usage;
  try{usage = JSON.parse(localStorage.getItem('arcana_usage')) || {};}catch(e){usage = {};}
  const today = todayKey();
  const month = monthKey();
  if(usage.dailyDate !== today){
    usage.dailyDate = today;
    usage.dailyCount = 0;
  }
  if(usage.monthKey !== month){
    usage.monthKey = month;
    usage.monthlyCount = 0;
    usage.monthlyUpgradePrompted = false;
  }
  localStorage.setItem('arcana_usage', JSON.stringify(usage));
  return usage;
}

function remainingFreeReadings(){
  if(isPremium()) return Infinity;
  const usage = getUsage();
  return Math.max(0, FREE_DAILY_READING_LIMIT - (usage.dailyCount || 0));
}

function canGenerateReading(){
  return isPremium() || remainingFreeReadings() > 0;
}

function recordCompletedReading(){
  const usage = getUsage();
  usage.monthlyCount = (usage.monthlyCount || 0) + 1;
  if(!isPremium()) usage.dailyCount = (usage.dailyCount || 0) + 1;
  localStorage.setItem('arcana_usage', JSON.stringify(usage));
  renderEntitlementsUI();

  if(!isPremium() && usage.monthlyCount >= 3 && !usage.monthlyUpgradePrompted){
    usage.monthlyUpgradePrompted = true;
    localStorage.setItem('arcana_usage', JSON.stringify(usage));
    setTimeout(() => showUpgradeModal('value'), 900);
  }
}

function premiumFeature(name){
  return isPremium() || !['journal', 'voice', 'advanced-spreads', 'comparison', 'unlimited'].includes(name);
}

function requestPremiumFeature(name){
  if(premiumFeature(name)) return true;
  showUpgradeModal(name);
  return false;
}

function featureTitle(reason){
  const titles = {
    'daily-limit':'Your free reading is complete for today',
    'history':'Reading History is Premium',
    'journal':'Journal tools are Premium',
    'voice':'Voice narration is Premium',
    'advanced-spreads':'Advanced spreads are Premium',
    'comparison':'Reading comparison is Premium',
    'unlimited':'Unlimited readings are Premium',
    'value':"You've completed 3 readings this month"
  };
  return titles[reason] || 'Upgrade to Premium';
}

function showUpgradeModal(reason){
  let modal = document.getElementById('modal-upgrade');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'modal-upgrade';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }
  const usage = getUsage();
  const countLine = reason === 'value'
    ? `<p class="upgrade-note">You've completed ${usage.monthlyCount || 3} readings this month.</p>`
    : '<p class="upgrade-note">People should experience the magic before we ask for money. Free includes one complete AI-assisted reading each day.</p>';
  modal.innerHTML = `
    <div class="modal upgrade-modal">
      <button class="close-btn" onclick="closeModal('modal-upgrade')">&times;</button>
      <div class="plan-pill">Premium - $4.99/month</div>
      <h2>${featureTitle(reason)}</h2>
      ${countLine}
      <div class="upgrade-grid">
        <span>Unlimited readings</span>
        <span>Reading history</span>
        <span>Voice narration</span>
        <span>Journal tools</span>
        <span>Advanced spreads</span>
        <span>Reading comparison</span>
        <span>Priority AI processing</span>
      </div>
      <div class="activation-box">
        <label>Activation Key</label>
        <input id="activation-key-input" type="text" placeholder="Enter activation key">
        <button class="btn btn-primary btn-sm" onclick="submitActivationKey()">Activate Premium</button>
        <p id="activation-status" class="activation-status"></p>
      </div>
    </div>`;
  modal.classList.add('open');
}

function submitActivationKey(){
  const input = document.getElementById('activation-key-input');
  const status = document.getElementById('activation-status');
  if(activatePremiumKey(input.value)){
    status.textContent = 'Premium activated on this device.';
    status.style.color = 'var(--success)';
    renderEntitlementsUI();
    setTimeout(() => closeModal('modal-upgrade'), 650);
  }else{
    status.textContent = 'That activation key was not recognized.';
    status.style.color = 'var(--danger)';
  }
}

function thoughtfulLoadingHtml(statusId){
  const priority = isPremium() ? '<li>Priority AI processing enabled...</li>' : '';
  return `<div class="loading thoughtful-loading">
    <p>Analyzing your reading...</p>
    <ul>
      <li>Examining card positions...</li>
      <li>Interpreting symbolism...</li>
      <li>Looking for recurring themes...</li>
      ${priority}
      <li>Preparing guidance...</li>
    </ul>
    <p id="${statusId}" style="font-size:11px;color:var(--muted);margin-top:4px"></p>
  </div>`;
}

function renderEntitlementsUI(){
  const premium = isPremium();
  document.body.classList.toggle('is-premium', premium);
  document.body.classList.toggle('is-free', !premium);

  const status = document.getElementById('subscription-status');
  if(status){
    status.textContent = premium ? 'Premium active' : `${remainingFreeReadings()} free reading left today`;
  }

  const settingsStatus = document.getElementById('premium-settings-status');
  if(settingsStatus){
    const sub = getSubscription();
    settingsStatus.textContent = premium ? `Premium active (${sub.key || 'activation key'})` : 'Free plan active';
  }

  document.querySelectorAll('[data-premium-feature]').forEach(el => {
    const feature = el.dataset.premiumFeature;
    const locked = !premiumFeature(feature);
    el.classList.toggle('premium-locked', locked);
    el.removeAttribute('aria-disabled');
    if(locked)el.setAttribute('title', `${featureTitle(feature)} - activate Premium to use this.`);
    else el.removeAttribute('title');
  });
}

function narrateReading(){
  if(!requestPremiumFeature('voice')) return;
  const content = document.getElementById('reading-content') || document.getElementById('quick-reading-content');
  if(!content || !('speechSynthesis' in window)) return showToast('Voice narration is not available in this browser.');
  if(window.speechSynthesis.speaking){
    window.speechSynthesis.cancel();
    showToast('Narration stopped.');
    return;
  }
  const text = getNarrationText(content);
  if(!text) return showToast('No reading text is ready to narrate.');
  const utterance = new SpeechSynthesisUtterance(text);
  const settings = loadSettings();
  const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
  const selectedVoice = voices.find(v => v.name === settings.narratorVoice);
  if(selectedVoice) utterance.voice = selectedVoice;
  utterance.rate = 0.92;
  utterance.pitch = 0.96;
  window.speechSynthesis.speak(utterance);
}

function getNarrationText(content){
  const sections = Array.from(content.querySelectorAll('.reading-section'));
  if(!sections.length) return content.innerText.trim();
  const start = sections.findIndex(section => /introduction/i.test(section.querySelector('h3')?.textContent || ''));
  const end = sections.findIndex(section => /guidance/i.test(section.querySelector('h3')?.textContent || ''));
  const from = start >= 0 ? start : 0;
  const to = end >= 0 ? end : sections.length - 1;
  return sections.slice(from, to + 1).map(section => section.innerText.trim()).filter(Boolean).join('\n\n');
}

function compareSelectedReadings(){
  if(!requestPremiumFeature('comparison')) return;
  const checks = Array.from(document.querySelectorAll('.compare-reading-check:checked'));
  if(checks.length < 2){
    showToast('Select two readings to compare.');
    return;
  }
  const readings = JSON.parse(localStorage.getItem('arcana_readings') || '[]');
  const selected = checks.slice(0, 2).map(c => readings[Number(c.value)]).filter(Boolean);
  if(selected.length < 2) return;
  const output = document.getElementById('comparison-output');
  output.innerHTML = `<div class="comparison-card">
    <h3>${selected[0].title || 'First Reading'} / ${selected[1].title || 'Second Reading'}</h3>
    <p><strong>Earlier focus:</strong> ${(selected[0].concerns || []).join(', ') || 'Open guidance'}</p>
    <p><strong>Later focus:</strong> ${(selected[1].concerns || []).join(', ') || 'Open guidance'}</p>
    <p>Notice what repeated, what softened, and what became more specific. Use the journal notes in each reading to track how your interpretation changed over time.</p>
  </div>`;
}
