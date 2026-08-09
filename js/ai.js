// ===== GEMINI API =====
const GEMINI_MODELS=(typeof ARCANA_GEMINI_MODELS!=='undefined'&&Array.isArray(ARCANA_GEMINI_MODELS)&&ARCANA_GEMINI_MODELS.length)
  ? ARCANA_GEMINI_MODELS
  : ['gemini-3.6-flash','gemini-3.5-flash','gemini-3.1-flash-lite','gemini-2.5-flash'];
let activeAIController=null;
const AI_REQUEST_TIMEOUT_MS=30000;

function cancelAIRequest(){
  if(activeAIController)activeAIController.abort();
  activeAIController=null;
}

async function fetchAIWithTimeout(resource,init,timeoutMs=AI_REQUEST_TIMEOUT_MS){
  const controller=new AbortController();
  activeAIController=controller;
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(resource,{...init,signal:controller.signal});}
  finally{clearTimeout(timer);if(activeAIController===controller)activeAIController=null;}
}

function hasAIConfiguration(){
  return !!(getSavedGeminiKey() || getGoogleApiKey() || getAIProxyUrl());
}

function requireAIConfiguration(){
  if(hasAIConfiguration()) return true;
  throw new Error('Arcana AI is not configured yet. Open Settings and add your Gemini API key.');
}

function requireGoogleApiKey(){
  const key=getSavedGeminiKey() || getGoogleApiKey();
  if(!key)throw new Error('Open Settings and add your Gemini API key.');
  return key;
}

function getSavedGeminiKey(){
  return loadSettings().geminiKey || '';
}

async function callGemini(prompt,apiKey,imageData=null,statusEl=null){
  const parts=[{text:prompt}];
  if(imageData){
    const base64=imageData.split(',')[1];
    const mime=imageData.split(';')[0].split(':')[1];
    parts.push({inline_data:{mime_type:mime,data:base64}});
  }
  const body=JSON.stringify({contents:[{parts}]});
  apiKey=apiKey || getSavedGeminiKey() || getGoogleApiKey();

  if(apiKey){
    const directHeaders={'Content-Type':'application/json','x-goog-api-key':apiKey};
    for(let m=0;m<GEMINI_MODELS.length;m++){
      const model=GEMINI_MODELS[m];
      const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      for(let attempt=0;attempt<2;attempt++){
        if(statusEl)statusEl.textContent=`Trying ${model}${attempt>0?' (retry)':''}...`;
        const resp=await fetchAIWithTimeout(url,{method:'POST',headers:directHeaders,body});
        if(resp.ok){
          const data=await resp.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text||'No response generated.';
        }
        if(resp.status===429){
          const errText=await resp.text();
          const isZeroQuota=errText.includes('limit: 0');
          if(isZeroQuota){
            if(m<GEMINI_MODELS.length-1){
              if(statusEl)statusEl.textContent=`${model} has no quota. Trying ${GEMINI_MODELS[m+1]}...`;
              break;
            }
            throw new Error(`All models rate limited (limit: 0). Your API key may not have free tier access. Try creating a new key in a new project at aistudio.google.com`);
          }
          let wait=15;
          const delayMatch=errText.match(/retryDelay.*?(\d+)/);
          if(delayMatch)wait=Math.min(parseInt(delayMatch[1])+2,45);
          if(attempt===0){
            if(statusEl)statusEl.textContent=`Rate limited on ${model}. Waiting ${wait}s...`;
            await countdown(wait,statusEl,model);
            continue;
          }
          if(m<GEMINI_MODELS.length-1){
            if(statusEl)statusEl.textContent=`${model} quota exhausted. Trying ${GEMINI_MODELS[m+1]}...`;
            break;
          }
          throw new Error(`All models rate limited. Please wait a minute and try again.`);
        }
        const e=await resp.text();
        if(resp.status===400&&m<GEMINI_MODELS.length-1)break;
        if(resp.status===403)throw new Error('API key invalid or Generative Language API not enabled. Go to aistudio.google.com/apikey and create a new key in a new project.');
        if(m<GEMINI_MODELS.length-1)break;
        throw new Error(`The AI service returned an error (${resp.status}). Please try again or use Classic Reading.`);
      }
    }
    throw new Error('All models failed. Please try again later.');
  }

  const proxyUrl=getAIProxyUrl();
  if(proxyUrl){
    if(statusEl)statusEl.textContent='Contacting Arcana AI...';
    const resp=await fetchAIWithTimeout(proxyUrl,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({prompt,imageData})
    });
    const data=await resp.json().catch(()=>({}));
    if(!resp.ok)throw new Error(data.error||'The AI service is temporarily unavailable. Please try again.');
    return data.text||data.candidates?.[0]?.content?.parts?.[0]?.text||'No response generated.';
  }

  requireGoogleApiKey();
  throw new Error('Arcana AI is not configured yet. Open Settings and add your Gemini API key.');
}

async function testApiKey(key){
  const result=await callGemini('Reply with the single word Arcana.', key, null, null);
  if(!result)throw new Error('This key could not be validated.');
  return true;
}

async function countdown(secs,statusEl,model){
  for(let i=secs;i>0;i--){
    if(statusEl)statusEl.textContent=`Rate limited on ${model}. Retrying in ${i}s...`;
    await new Promise(r=>setTimeout(r,1000));
  }
}
