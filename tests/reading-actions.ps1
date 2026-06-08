$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$ui = Get-Content -LiteralPath (Join-Path $root 'js/ui.js') -Raw
$storage = Get-Content -LiteralPath (Join-Path $root 'js/storage.js') -Raw
$subscription = Get-Content -LiteralPath (Join-Path $root 'js/subscription.js') -Raw
$css = Get-Content -LiteralPath (Join-Path $root 'css/main.css') -Raw
$placement = Get-Content -LiteralPath (Join-Path $root 'templates/placement.html') -Raw
$cardArt = Get-Content -LiteralPath (Join-Path $root 'js/card-art.js') -Raw -ErrorAction SilentlyContinue
$index = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw

function Assert-Contains($Haystack, $Needle, $Message) {
  if ($Haystack -notmatch [regex]::Escape($Needle)) {
    throw $Message
  }
}

function Assert-NotContains($Haystack, $Needle, $Message) {
  if ($Haystack -match [regex]::Escape($Needle)) {
    throw $Message
  }
}

Assert-Contains $ui 'function getReadingSpread(' 'Expected shared getReadingSpread helper for guided and quick spread context.'
Assert-Contains $ui 'text:state.narrative' 'Expected sharing to use the stored narrative instead of a missing narrative-text element.'
Assert-Contains $ui 'spread=getReadingSpread()' 'Expected journal saving to use the active guided or quick spread.'
Assert-Contains $storage 'const spread=getReadingSpread()' 'Expected saved readings to use the active guided or quick spread.'
Assert-Contains $storage 'spread:spread?spread.id' 'Expected saved readings to persist the actual spread id when available.'
Assert-Contains $ui 'const ACTIVE_SPREAD_IDS' 'Expected a canonical spread allow-list to avoid legacy duplicate spread choices.'
Assert-Contains $ui 'ACTIVE_SPREAD_IDS.includes(s.id)' 'Expected quick spread rendering/reference prompts to filter legacy duplicate spreads.'
Assert-Contains $ui 'document.body.scrollTop=0' 'Expected screen navigation to reset body scroll for browsers that scroll body instead of documentElement.'
Assert-Contains $subscription 'removeAttribute(''aria-disabled'')' 'Expected premium upsell triggers to remain accessible/clickable instead of aria-disabled.'
Assert-Contains $placement 'Choose a card from the picker' 'Expected manual entry copy to match the card picker interaction.'
Assert-Contains $css '.card-picker-item svg' 'Expected card picker icons to have bounded dimensions.'
Assert-Contains $css '.card-picker-item span' 'Expected card picker names to have readable flexible layout.'
Assert-Contains $index '<script src="js/card-art.js"></script>' 'Expected public-domain tarot art helper to load before UI rendering.'
Assert-Contains $cardArt 'function getCardArtUrl(' 'Expected a shared tarot card art URL helper.'
Assert-Contains $cardArt 'commons.wikimedia.org/wiki/Special:FilePath' 'Expected card art to use Wikimedia Commons public-domain file paths.'
Assert-Contains $ui 'renderCardArt' 'Expected picker and overview UI to render real tarot card art with fallback.'
Assert-Contains $css '.tarot-card-thumb' 'Expected card art thumbnails to be styled.'
Assert-Contains $ui "Major Arcana</button>" 'Expected picker header filters to use text-only labels without decorative tarot glyphs.'
Assert-Contains $ui ">Major</span>" 'Expected manual suit filter to use text-only Major label.'
Assert-NotContains $ui '${TAROT_SUIT_SYM[s]} ${TAROT_SUIT_NAMES[s]}</button>' 'Expected tarot picker filter buttons to omit suit glyphs.'
Assert-NotContains $ui '${TAROT_SUIT_SYM[s]} ${TAROT_SUIT_NAMES[s]}</span>' 'Expected manual tarot suit filters to omit suit glyphs.'
Assert-NotContains $ui '${PLAYING_SYM[s]} ${s.charAt(0).toUpperCase()+s.slice(1)}</button>' 'Expected playing-card picker filter buttons to omit suit glyphs.'
Assert-NotContains $ui '${PLAYING_SYM[s]} ${s.charAt(0).toUpperCase()+s.slice(1)}</span>' 'Expected manual playing-card suit filters to omit suit glyphs.'

Write-Host 'reading-actions regression passed'
