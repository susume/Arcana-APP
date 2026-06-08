// Add your Google Gemini API key here for this static build.
// For a public paid app, move this key to a backend proxy so it is not visible in browser source.
const ARCANA_GOOGLE_API_KEY = 'AQ.Ab8RN6KqgbClThdACyffxRmR0PGggapykcZORFq7Os23iBLKUg';

function getGoogleApiKey(){
  return String(ARCANA_GOOGLE_API_KEY || '').trim();
}
