// Production should use a backend proxy so the browser never receives the Google key.
// Example: const ARCANA_AI_PROXY_URL = 'https://your-worker.your-subdomain.workers.dev';
const ARCANA_AI_PROXY_URL = 'https://ancient-smoke-2917.susume1982.workers.dev/';

// Development-only fallback. Do not commit a real Google Gemini API key here.
const ARCANA_GOOGLE_API_KEY = '';

function getAIProxyUrl(){
  return String(ARCANA_AI_PROXY_URL || '').trim();
}

function getGoogleApiKey(){
  return String(ARCANA_GOOGLE_API_KEY || '').trim();
}
