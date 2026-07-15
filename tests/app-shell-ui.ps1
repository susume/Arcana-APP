$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$index = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw
$ui = Get-Content -LiteralPath (Join-Path $root "js\ui.js") -Raw
$theme = Get-Content -LiteralPath (Join-Path $root "src\premium-theme.css") -Raw

$screenTemplates = @{
  "concerns.html" = @("ritual-screen ritual-screen-focus", "concerns")
  "card-system.html" = @("ritual-screen ritual-screen-choice", "card-system")
  "choose-reading.html" = @("ritual-screen ritual-screen-choice", "choose-reading")
  "reflection.html" = @("ritual-screen ritual-screen-focus", "reflection")
  "placement.html" = @("ritual-screen ritual-screen-workspace", "placement")
  "overview.html" = @("ritual-screen ritual-screen-review", "overview")
  "results.html" = @("ritual-screen ritual-screen-reading", "results")
  "history.html" = @("ritual-screen ritual-screen-archive", "history")
  "quick.html" = @("ritual-screen ritual-screen-workspace", "quick")
}

foreach ($entry in $screenTemplates.GetEnumerator()) {
  $path = Join-Path $root ("templates\" + $entry.Key)
  $content = Get-Content -LiteralPath $path -Raw
  $classes = $entry.Value[0]
  $templateId = $entry.Value[1]
  if ($content -notlike ('*class="screen ' + $classes + '"*')) {
    throw "$($entry.Key) is missing its Arcana ritual screen classes."
  }

  $match = [regex]::Match($index, '(?s)<template id="template-' + [regex]::Escape($templateId) + '">\s*(.*?)\s*</template>')
  if (-not $match.Success) {
    throw "Embedded template-$templateId is missing from index.html."
  }
  $embedded = $match.Groups[1].Value.Trim() -replace "`r`n", "`n"
  $external = $content.Trim() -replace "`r`n", "`n"
  if ($embedded -ne $external) {
    throw "Embedded template-$templateId is not synced with templates\$($entry.Key)."
  }
}

$settings = Get-Content -LiteralPath (Join-Path $root "templates\settings.html") -Raw
$help = Get-Content -LiteralPath (Join-Path $root "templates\help.html") -Raw

if ($settings -notlike '*class="modal ritual-modal ritual-settings-modal"*') {
  throw "Settings modal is missing its Arcana ritual modal classes."
}

if ($help -notlike '*class="modal ritual-modal ritual-help-modal"*') {
  throw "Help modal is missing its Arcana ritual modal classes."
}

if ($ui -notlike '*function ensureRitualUtilities()*' -or $ui -notlike '*ritual-journal-shortcut*') {
  throw "Shared Journal utility is missing from the Ritual Shell."
}

foreach ($semanticControl in @(
  '<button type="button" class="card-opt"',
  '<button type="button" class="reading-choice-card"',
  '<button type="button" class="tag-chip"',
  '<button type="button" class="tab-btn',
  '<button type="button" class="upload-zone"',
  '<button type="button" class="upload-deck-option',
  '<button type="button" class="orient-btn"',
  '<button type="button" class="footer-link footer-link-button"'
)) {
  if ($index -notlike "*$semanticControl*") {
    throw "Expected semantic control is missing: $semanticControl"
  }
}

if ($theme -notlike '*.ritual-home .ritual-nav-links*' -or $theme -notlike '*grid-row: 2*') {
  throw "Mobile homepage navigation is missing its two-row reflow treatment."
}

if ($theme -notlike '*.ritual-screen-workspace .upload-deck-selector*' -or $theme -notlike '*min-height: 44px*') {
  throw "Upload deck selection is missing its responsive touch-target treatment."
}

if (
  $theme -notlike '*position: sticky !important*' -or
  $theme -notlike '*bottom: 0 !important*' -or
  $theme -notlike '*safe-area-inset-bottom*'
) {
  throw "Mobile guided navigation is missing its sticky safe-area treatment."
}

if ($theme -notlike '*font-size: 14.5px*' -or $theme -notlike '*color: #b2bac9*') {
  throw "Mobile Ritual Shell copy is missing its readability treatment."
}

if ($theme -notlike '*.ritual-screen .ritual-journal-shortcut*') {
  throw "Shared Journal utility is missing its Ritual Shell styling."
}

if ($theme -notlike '*.ritual-screen-reading:not(.reading-ready) .result-only*') {
  throw "Reading result-only controls are not hidden until content is ready."
}

if ($theme -notlike '*.ritual-screen .context-grid select*' -or $theme -notlike '*min-width: 220px*') {
  throw "Ritual Shell context selects are missing their readable desktop width."
}

if ($theme -match 'Final cascade lock for product screens') {
  throw "Duplicate Ritual Shell cascade-lock block still exists."
}

foreach ($modal in @(
  @("settings.html", "settings", $settings),
  @("help.html", "help", $help)
)) {
  $match = [regex]::Match($index, '(?s)<template id="template-' + $modal[1] + '">\s*(.*?)\s*</template>')
  if (-not $match.Success) {
    throw "Embedded template-$($modal[1]) is missing from index.html."
  }
  $embedded = $match.Groups[1].Value.Trim() -replace "`r`n", "`n"
  $external = $modal[2].Trim() -replace "`r`n", "`n"
  if ($embedded -ne $external) {
    throw "Embedded template-$($modal[1]) is not synced with templates\$($modal[0])."
  }
}

Write-Output "app-shell-ui regression passed"
