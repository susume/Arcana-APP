$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$index = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw

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
