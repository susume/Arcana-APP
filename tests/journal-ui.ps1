$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $root 'js/ui.js'
$ui = Get-Content -LiteralPath $uiPath -Raw
$results = Get-Content -LiteralPath (Join-Path $root 'templates/results.html') -Raw
$history = Get-Content -LiteralPath (Join-Path $root 'templates/history.html') -Raw

function Assert-Contains($Haystack, $Needle, $Message) {
  if ($Haystack -notmatch [regex]::Escape($Needle)) {
    throw $Message
  }
}

Assert-Contains $results 'id="journal-composer" hidden' 'Expected the reflection composer to be hidden until Premium access is known.'
Assert-Contains $results 'for="journal-entry"' 'Expected an explicit label for the optional reflection.'
Assert-Contains $results 'id="view-saved-journal"' 'Expected a direct journal action after saving a reading.'
if ($history.IndexOf('id="history-list"') -gt $history.IndexOf('Download backup')) {
  throw 'Expected saved readings and reflections to appear before backup controls.'
}

Write-Host 'journal-ui regression passed'
