$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $root 'js/ui.js'
$ui = Get-Content -LiteralPath $uiPath -Raw

function Assert-Contains($Haystack, $Needle, $Message) {
  if ($Haystack -notmatch [regex]::Escape($Needle)) {
    throw $Message
  }
}

Assert-Contains $ui 'function renderJournalSection(' 'Expected a reusable renderJournalSection helper.'
Assert-Contains $ui 'renderJournalSection(results)' 'Expected quick readings to append journal UI to quick results.'
Assert-Contains $ui 'event.currentTarget.closest' 'Expected saveJournal to find the journal textarea near the clicked button.'
Assert-Contains $ui 'journalRoot.querySelector' 'Expected saveJournal to read from the clicked journal section.'

Write-Host 'journal-ui regression passed'
