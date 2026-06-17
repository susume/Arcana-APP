$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $root "templates/welcome.html"
$indexPath = Join-Path $root "index.html"

$template = Get-Content -LiteralPath $templatePath -Raw
$index = Get-Content -LiteralPath $indexPath -Raw

function Assert-Contains($content, $needle, $message) {
  if ($content -notlike "*$needle*") {
    throw $message
  }
}

Assert-Contains $template 'Read Your Real Tarot Cards With AI' "Homepage hero headline is missing."
Assert-Contains $template 'onclick="startGuided()"' "Guided reading CTA handler changed or disappeared."
Assert-Contains $template 'onclick="startQuick()"' "Quick upload CTA handler changed or disappeared."
Assert-Contains $template 'onclick="openModal(''modal-settings'')"' "Settings modal handler changed or disappeared."
Assert-Contains $template 'id="how-it-works"' "How It Works section anchor is missing."
Assert-Contains $template 'id="premium"' "Premium section anchor is missing."
Assert-Contains $template 'id="journal"' "Journal section anchor is missing."
Assert-Contains $template 'Real Cards With Arcana Guide' "Real-card comparison message is missing."
Assert-Contains $template 'Random Generators' "Random-generator comparison message is missing."
Assert-Contains $template '<span class="comparison-mark" aria-hidden="true">+</span>' "Positive comparison mark is malformed."
Assert-Contains $template '<span class="comparison-mark" aria-hidden="true">-</span>' "Negative comparison mark is malformed."
Assert-Contains $template 'Your Cards Have A Story. Let AI Help You Read It.' "Final CTA headline is missing."

if ($template -match 'generated_images|\.codex') {
  throw "Homepage template references a local Codex generated image path."
}

if ($template -match '(?<!<)/span>|<span class="comparison-mark" aria-hidden="true">[^+-]') {
  throw "Homepage template contains malformed encoded markup."
}

$match = [regex]::Match($index, '(?s)<template id="template-welcome">\s*(.*?)\s*</template>')
if (-not $match.Success) {
  throw "Embedded template-welcome block is missing from index.html."
}

$embedded = $match.Groups[1].Value.Trim()
$external = $template.Trim()

if ($embedded -ne $external) {
  throw "Embedded template-welcome in index.html is not synced with templates/welcome.html."
}

Write-Output "homepage-ui regression passed"
