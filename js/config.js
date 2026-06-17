// Production should use a backend proxy so the browser never receives the Google key.
// Example: const ARCANA_AI_PROXY_URL = 'https://your-worker.your-subdomain.workers.dev';
const ARCANA_AI_PROXY_URL = 'https://ancient-smoke-2917.susume1982.workers.dev/';
const ARCANA_ACTIVATION_API_URL = '';
const ARCANA_GUMROAD_PRODUCT_URL = 'https://thelayersapp.gumroad.com/l/vjptlg';

// Development-only fallback. Do not commit a real Google Gemini API key here.
const ARCANA_GOOGLE_API_KEY = '';

function getAIProxyUrl(){
  return String(ARCANA_AI_PROXY_URL || '').trim();
}

function getGoogleApiKey(){
  return String(ARCANA_GOOGLE_API_KEY || '').trim();
}

function getActivationApiUrl(){
  const configured = String(ARCANA_ACTIVATION_API_URL || '').trim();
  if(configured) return configured;
  const proxy = getAIProxyUrl();
  if(!proxy) return '';
  return proxy.replace(/\/$/, '') + '/api/activate';
}

function getGumroadProductUrl(){
  return String(ARCANA_GUMROAD_PRODUCT_URL || '').trim();
}
