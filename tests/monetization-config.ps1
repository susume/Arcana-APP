$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$subscription = Get-Content -LiteralPath (Join-Path $root 'js/subscription.js') -Raw
$storage = Get-Content -LiteralPath (Join-Path $root 'js/storage.js') -Raw
$ai = Get-Content -LiteralPath (Join-Path $root 'js/ai.js') -Raw
$config = Get-Content -LiteralPath (Join-Path $root 'js/config.js') -Raw
$settings = Get-Content -LiteralPath (Join-Path $root 'templates/settings.html') -Raw
$help = Get-Content -LiteralPath (Join-Path $root 'templates/help.html') -Raw
$welcome = Get-Content -LiteralPath (Join-Path $root 'templates/welcome.html') -Raw
$index = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw
$worker = Get-Content -LiteralPath (Join-Path $root 'server/cloudflare-worker.js') -Raw

function Assert-Contains($Haystack, $Needle, $Message) {
  if ($Haystack -notmatch [regex]::Escape($Needle)) { throw $Message }
}

function Assert-NotContains($Haystack, $Needle, $Message) {
  if ($Haystack -match [regex]::Escape($Needle)) { throw $Message }
}

Assert-NotContains $subscription 'ARCANA_ACTIVATION_KEYS' 'Activation keys must not be hardcoded in browser JavaScript.'
Assert-Contains $subscription 'activatePremiumKey' 'Expected activation helper to remain available.'
Assert-Contains $subscription 'getActivationApiUrl()' 'Expected premium activation to call the configured backend endpoint.'
Assert-Contains $subscription '$29 lifetime unlock' 'Expected premium copy to advertise a one-time $29 lifetime unlock.'
Assert-NotContains $subscription '$4.99/month' 'Expected subscription pricing copy to be removed.'

Assert-Contains $config 'ARCANA_ACTIVATION_API_URL' 'Expected activation endpoint configuration.'
Assert-Contains $config 'ARCANA_GUMROAD_PRODUCT_URL' 'Expected Gumroad product URL configuration.'
Assert-Contains $config 'https://thelayersapp.gumroad.com/l/vjptlg' 'Expected Gumroad purchase URL to point at the live Arcana product.'

Assert-Contains $settings 'Premium Access' 'Expected Settings to include Premium Access section.'
Assert-Contains $settings 'AI Configuration' 'Expected Settings to include AI Configuration section.'
Assert-Contains $settings 'gemini-key-input' 'Expected Settings to include Gemini key input.'
Assert-Contains $settings 'testAndSaveGeminiKey()' 'Expected Settings to test and save Gemini keys.'
Assert-Contains $settings 'openGeminiKeyGuide()' 'Expected Settings to link to the Gemini key guide.'

Assert-Contains $storage 'geminiKey:saved.geminiKey' 'Expected loadSettings to preserve saved Gemini key.'
Assert-Contains $storage 'function testAndSaveGeminiKey(' 'Expected Settings Gemini key save helper.'
Assert-Contains $storage 'function removeGeminiKey(' 'Expected Settings Gemini key removal helper.'

Assert-Contains $ai "'x-goog-api-key':apiKey" 'Expected direct Gemini calls to authenticate through x-goog-api-key.'
Assert-Contains $ai 'function getSavedGeminiKey(' 'Expected AI helper to read saved Gemini key.'
Assert-Contains $ai 'async function testApiKey(' 'Expected Gemini key validation helper.'

Assert-Contains $help 'How to get a free Gemini API key' 'Expected help guide for Gemini keys.'
Assert-Contains $help 'aistudio.google.com' 'Expected guide to link users to Google AI Studio.'
Assert-Contains $help 'Create API key in a new project' 'Expected non-technical setup step.'
Assert-Contains $index 'How to get a free Gemini API key' 'Expected embedded help fallback to include Gemini key guide.'

Assert-Contains $welcome 'Premium lifetime unlock' 'Expected homepage Premium copy to use lifetime language.'
Assert-Contains $welcome '$29' 'Expected homepage to show the one-time price.'
Assert-NotContains $welcome '$4.99/month' 'Expected homepage subscription pricing to be removed.'
Assert-Contains $index 'Premium lifetime unlock' 'Expected embedded welcome fallback to use lifetime language.'

Assert-Contains $worker 'handleActivate' 'Expected Worker activation route handler.'
Assert-Contains $worker 'GUMROAD_PRODUCT_ID' 'Expected Worker to use Gumroad product id.'
Assert-Contains $worker 'HOp54WHc-rZtK8nTrqtFcg==' 'Expected Worker to include the live Arcana Gumroad product id fallback.'
Assert-Contains $worker 'dNW90VHgyFlXSIHD7Xr6Sw==' 'Expected Worker to include the live Gumroad seller id fallback.'
Assert-Contains $worker 'ARCANA_LICENSES' 'Expected Worker to persist activation metadata to KV.'
Assert-Contains $worker '/api/gumroad/webhook' 'Expected Worker Gumroad webhook route.'

Write-Host 'monetization-config regression passed'
