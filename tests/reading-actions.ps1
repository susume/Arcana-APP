$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$ui = Get-Content -LiteralPath (Join-Path $root 'js/ui.js') -Raw
$app = Get-Content -LiteralPath (Join-Path $root 'js/app.js') -Raw
$readingEngine = Get-Content -LiteralPath (Join-Path $root 'js/reading-engine.js') -Raw
$storage = Get-Content -LiteralPath (Join-Path $root 'js/storage.js') -Raw
$subscription = Get-Content -LiteralPath (Join-Path $root 'js/subscription.js') -Raw
$css = Get-Content -LiteralPath (Join-Path $root 'css/main.css') -Raw
$placement = Get-Content -LiteralPath (Join-Path $root 'templates/placement.html') -Raw
$results = Get-Content -LiteralPath (Join-Path $root 'templates/results.html') -Raw
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

function Assert-Count($Haystack, $Needle, $Expected, $Message) {
  $actual = ([regex]::Matches($Haystack, [regex]::Escape($Needle))).Count
  if ($actual -ne $Expected) {
    throw "$Message Expected $Expected occurrence(s), found $actual."
  }
}

Assert-Contains $ui 'function getReadingSpread(' 'Expected shared getReadingSpread helper for guided and quick spread context.'
Assert-Contains $ui 'function getCardSystemPromptGuide(' 'Expected shared deck-specific identification guidance.'
Assert-Contains $ui 'function shouldDetectCardSystem(' 'Expected photo flows to distinguish a fallback deck from an established deck.'
Assert-Contains $ui 'function establishDetectedCardSystem(' 'Expected validated photo results to establish one detected deck.'
Assert-Contains $ui 'function validateIdentificationResult(identified)' 'Expected every identification mode to reject empty validated card results.'
Assert-Count $ui 'validateIdentificationResult(parsedByArcana)' 2 'Expected both identification paths to fail closed before replacing spread state.'
Assert-Contains $ui 'function migrateRestoredCardSystemState(' 'Expected legacy autosaves to infer deck establishment safely.'
Assert-Contains $app 'migrateRestoredCardSystemState(savedState)' 'Expected restored autosaves to run deck establishment migration.'
Assert-Contains $ui 'function applyQuickReadingCardSystem(' 'Expected quick readings to persist the detected deck before rendering.'
Assert-Contains $ui 'Your exact first line must be CARD_SYSTEM: tarot or CARD_SYSTEM: playing' 'Expected quick detection prompts to require a machine-readable deck marker.'
Assert-Contains $ui 'const narrative=applyQuickReadingCardSystem(rawNarrative,detectionRequired)' 'Expected quick reading deck state to be applied before narrative storage and rendering.'
Assert-Count $ui 'getCardSystemPromptGuide(state.cardSystem,detectionRequired)' 2 'Expected known and unknown quick spreads to use established-deck guidance when detection is not required.'
Assert-Count $ui 'getQuickPatternAnalysisGuide(state.cardSystem,detectionRequired)' 2 'Expected known and unknown quick spreads to use deck-specific pattern guidance.'
Assert-NotContains $ui 'getCardSystemPromptGuide(null,true)' 'Expected unknown quick spreads not to force detection after a deck is established.'
Assert-NotContains $ui 'getQuickPatternAnalysisGuide(null,true)' 'Expected unknown quick spreads not to force detection pattern guidance after a deck is established.'
Assert-Contains $ui 'function switchPickerCardSystem(' 'Expected manual picker deck switching.'
Assert-Contains $ui 'function hasSelectedReadingCards(' 'Expected guarded mixed-deck detection.'
Assert-Contains $ui '>Tarot</button>' 'Expected visible Tarot manual-picker tab.'
Assert-Contains $ui '>Playing Cards</button>' 'Expected visible Playing Cards manual-picker tab.'
Assert-Contains $ui 'Keep playing-card names as Hearts, Diamonds, Clubs, and Spades' 'Expected playing-card naming guard.'
Assert-Contains $readingEngine 'function getReadingSystemInstructions(' 'Expected deck-specific reading instructions.'
Assert-Contains $readingEngine 'Meaning:' 'Expected full card meanings in AI prompt card lines.'
Assert-Contains $readingEngine "entry.orientation==='reversed'?card.reversed:card.upright" 'Expected guided AI card lines to use the full active-orientation meaning.'
Assert-Contains $readingEngine 'Do not rename playing cards as tarot equivalents' 'Expected playing-card terminology guard.'
Assert-Contains $readingEngine 'Do not discuss Major Arcana' 'Expected playing-card pattern-analysis rule.'
Assert-Contains $readingEngine 'Do not invent, rename, omit, or change the orientation of any card.' 'Expected reading guidance to respect every recorded orientation.'
Assert-NotContains $readingEngine 'retains its meaning regardless of orientation' 'Expected Celtic Cross guidance not to erase recorded orientation.'
Assert-Contains $ui 'function replaceIdentifiedSpreadCards(spread,identified)' 'Expected a shared helper to replace only active spread identification state.'
Assert-Contains $ui 'const allowedPositions=new Set(spread.positions.map(pos=>String(pos.id)))' 'Expected replacement to derive the current spread position allow-list.'
Assert-Contains $ui 'if(!allowedPositions.has(String(position)))delete state.cards[position]' 'Expected replacement to remove stale non-spread card keys.'
Assert-Contains $ui 'delete state.cards[pos.id]' 'Expected fresh identification to clear stale cards for each active spread position.'
Assert-Contains $ui 'if(allowedPositions.has(String(position)))state.cards[position]=entry' 'Expected replacement to assign only validated current-spread positions.'
Assert-Count $ui 'replaceIdentifiedSpreadCards(spread,parsedByArcana)' 2 'Expected guided and quick upload identification to share stale-state replacement behavior.'
Assert-Count $ui 'spread.positions.map(p=>p.id)' 2 'Expected both identification parser calls to receive the current spread position allow-list.'
Assert-NotContains $ui 'Object.assign(state.cards,parsedByArcana)' 'Expected identification paths not to merge validated results onto stale spread cards.'
Assert-NotContains $ui 'result.match(/\[[\s\S]*?\]/)' 'Expected identification to fail closed when the validated parser is unavailable.'
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
Assert-Contains $cardArt 'CC0 English-pattern playing cards by Dmitry Fomin' 'Expected the playing-card source and public-domain license to be recorded.'
Assert-Contains $cardArt 'English pattern ${rank} of ${suit}.svg' 'Expected standard playing cards to map to English-pattern SVG filenames.'
Assert-Contains $cardArt "if (card.system === 'playing')" 'Expected playing cards to use the shared card-art helper.'
Assert-Contains $cardArt "if (!match) return ''" 'Expected Joker and malformed playing-card names to retain fallback rendering.'
Assert-Contains $ui 'renderCardArt' 'Expected picker and overview UI to render real tarot card art with fallback.'
Assert-Contains $css '.tarot-card-thumb' 'Expected card art thumbnails to be styled.'
Assert-Contains $ui "Major Arcana</button>" 'Expected picker header filters to use text-only labels without decorative tarot glyphs.'
Assert-Contains $ui ">Major</span>" 'Expected manual suit filter to use text-only Major label.'
Assert-Contains $ui 'type="button" class="orient-btn' 'Expected manual orientation controls to use native buttons.'
Assert-Contains $ui 'data-pos="${pos.id}" aria-pressed="${orientation' 'Expected manual orientation controls to keep their spread position and expose reversal state.'
Assert-Contains $ui 'el.setAttribute(''aria-label'',`Card orientation:' 'Expected orientation changes to update the accessible label.'
Assert-NotContains $ui "'? Upright'" 'Expected overview orientation labels to render without broken placeholder glyphs.'
Assert-NotContains $storage 'prompt(' 'Expected saved-reading naming to use an in-product dialog instead of a blocking browser prompt.'
Assert-Contains $storage 'role="dialog" aria-modal="true"' 'Expected saved-reading naming to expose accessible dialog semantics.'
Assert-Contains $storage "if(event.key==='Escape')" 'Expected the saved-reading dialog to support Escape dismissal.'
Assert-Contains $ui 'row.querySelector(''.card-pick-btn[data-pos]'')' 'Expected card confirmation to read picker button selections, not only legacy text inputs.'
Assert-Contains $ui 'syncOrientationState(el)' 'Expected orientation toggles to update stored card state immediately.'
Assert-Contains $ui 'onclick="shareReading()"' 'Expected quick upload readings to expose the same share action as guided readings.'
Assert-Contains $ui "data.layout==='romany'" 'Expected share canvas to understand the Romany advanced spread layout.'
Assert-Contains $ui "data.layout==='two-pathways'" 'Expected share canvas to understand the Two Pathways advanced spread layout.'
Assert-Contains $ui "data.layout==='relationship'" 'Expected share canvas to understand the Relationship advanced spread layout.'
Assert-Contains $ui 'function useReflectionPrompt(' 'Expected reflection prompt chips to insert guided journal prompts.'
Assert-Contains $ui 'function wireJournalSection(' 'Expected reflection save button state to be wired for static and quick readings.'
Assert-Contains $results 'journal-badge' 'Expected guided reading reflection panel to show the premium journal badge.'
Assert-Contains $results 'reflection-chips' 'Expected guided reading reflection panel to include prompt chips.'
Assert-Contains $index 'reading-actions-secondary' 'Expected mobile reading actions to use the improved non-clipping action layout.'
Assert-Contains $results 'result-only' 'Expected reading-only actions to begin in a hidden readiness group.'
Assert-Contains $ui 'function setReadingReadyState(' 'Expected reading loading and ready states to share one helper.'
Assert-Contains $readingEngine 'setReadingReadyState(false)' 'Expected reading generation to hide result-only actions while loading.'
Assert-Contains $readingEngine 'setReadingReadyState(true)' 'Expected completed reading rendering to reveal result-only actions.'
Assert-NotContains $ui '${TAROT_SUIT_SYM[s]} ${TAROT_SUIT_NAMES[s]}</button>' 'Expected tarot picker filter buttons to omit suit glyphs.'
Assert-NotContains $ui '${TAROT_SUIT_SYM[s]} ${TAROT_SUIT_NAMES[s]}</span>' 'Expected manual tarot suit filters to omit suit glyphs.'
Assert-NotContains $ui '${PLAYING_SYM[s]} ${s.charAt(0).toUpperCase()+s.slice(1)}</button>' 'Expected playing-card picker filter buttons to omit suit glyphs.'
Assert-NotContains $ui '${PLAYING_SYM[s]} ${s.charAt(0).toUpperCase()+s.slice(1)}</span>' 'Expected manual playing-card suit filters to omit suit glyphs.'

Write-Host 'reading-actions regression passed'
