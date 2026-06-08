// ===== GEMINI API =====
const GEMINI_MODELS=['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-3.5-flash','gemini-3.1-flash-lite'];

async function callGemini(prompt,apiKey,imageData=null,statusEl=null){
  const parts=[{text:prompt}];
  if(imageData){
    const base64=imageData.split(',')[1];
    const mime=imageData.split(';')[0].split(':')[1];
    parts.push({inline_data:{mime_type:mime,data:base64}});
  }
  const body=JSON.stringify({contents:[{parts}]});
  const headers={'Content-Type':'application/json'};

  for(let m=0;m<GEMINI_MODELS.length;m++){
    const model=GEMINI_MODELS[m];
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    for(let attempt=0;attempt<2;attempt++){
      if(statusEl)statusEl.textContent=`Trying ${model}${attempt>0?' (retry)':''}…`;
      const resp=await fetch(url,{method:'POST',headers,body});
      if(resp.ok){
        const data=await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text||'No response generated.';
      }
      if(resp.status===429){
        const errText=await resp.text();
        const isZeroQuota=errText.includes('limit: 0');
        // If limit is 0, this model has no quota at all — skip immediately to next model
        if(isZeroQuota){
          if(m<GEMINI_MODELS.length-1){
            if(statusEl)statusEl.textContent=`${model} has no quota. Trying ${GEMINI_MODELS[m+1]}…`;
            break;
          }
          throw new Error(`All models rate limited (limit: 0). Your API key may not have free tier access. Try creating a new key in a new project at aistudio.google.com`);
        }
        // Temporary rate limit — wait and retry once
        let wait=15;
        const delayMatch=errText.match(/retryDelay.*?(\d+)/);
        if(delayMatch)wait=Math.min(parseInt(delayMatch[1])+2,45);
        if(attempt===0){
          if(statusEl)statusEl.textContent=`Rate limited on ${model}. Waiting ${wait}s…`;
          await countdown(wait,statusEl,model);
          continue;
        }
        if(m<GEMINI_MODELS.length-1){
          if(statusEl)statusEl.textContent=`${model} quota exhausted. Trying ${GEMINI_MODELS[m+1]}…`;
          break;
        }
        throw new Error(`All models rate limited. Please wait a minute and try again.`);
      }
      // Other error (400, 403, etc)
      const e=await resp.text();
      if(resp.status===400&&m<GEMINI_MODELS.length-1)break; // model doesn't exist, try next
      if(resp.status===403)throw new Error('API key invalid or Generative Language API not enabled. Go to aistudio.google.com/apikey and create a new key in a new project.');
      if(m<GEMINI_MODELS.length-1)break;
      throw new Error(`API error ${resp.status}`);
    }
  }
  throw new Error('All models failed. Please try again later.');
}

async function countdown(secs,statusEl,model){
  for(let i=secs;i>0;i--){
    if(statusEl)statusEl.textContent=`Rate limited on ${model}. Retrying in ${i}s…`;
    await new Promise(r=>setTimeout(r,1000));
  }
}

async function testApiKey(){
  const key=document.getElementById('api-key-input').value.trim();
  const status=document.getElementById('key-status');
  if(!key){status.textContent='Enter a key first';status.style.color='var(--danger)';return;}
  status.textContent='Testing…';status.style.color='var(--muted)';
  try{
    await callGemini('Say "hello" in one word.',key,null,status);
    status.textContent='✓ Key works! (auto-saved)';status.style.color='var(--success)';
    // Auto-save on successful test
    saveSettings();
    // Re-open modal since saveSettings closes it
    document.getElementById('modal-settings').classList.add('open');
    loadSettingsUI();
  }catch(e){
    const msg=e.message||'';
    if(msg.includes('rate limit')||msg.includes('Rate limit')||msg.includes('429')){
      status.textContent='✓ Key is valid (rate limited, try later)';status.style.color='var(--gold)';
      saveSettings();
      document.getElementById('modal-settings').classList.add('open');
      loadSettingsUI();
    }else{
      status.textContent='✕ ' + (e.message||'Unknown error');status.style.color='var(--danger)';
    }
  }
}
