# Requires PowerShell 7 and a JDK. Reuse the same upload key on subsequent Play releases.
param(
  [Parameter(Mandatory)] [string] $Bundle,
  [Parameter(Mandatory)] [string] $Output,
  [switch] $CreateUploadKey
)

$ErrorActionPreference = 'Stop'
$bundlePath = (Resolve-Path -LiteralPath $Bundle).Path
$signedPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Output)
if ($signedPath -eq $bundlePath) { throw 'Choose a separate path for the signed bundle.' }
$signingDirectory = Join-Path $env:LOCALAPPDATA 'ArcanaGuide\release-signing'
$keyPath = Join-Path $signingDirectory 'arcana-upload.p12'
$passwordPath = Join-Path $signingDirectory 'upload-password.dpapi'
$alias = 'arcana-play-upload'
$hasKey = Test-Path -LiteralPath $keyPath
$hasPassword = Test-Path -LiteralPath $passwordPath
if ($hasKey -ne $hasPassword) { throw 'Restore the existing upload key and its password together.' }
if (!$hasKey -and !$CreateUploadKey) {
  throw 'The Arcana upload key is missing. Use -CreateUploadKey only for a new Play app.'
}

$securePassword = if ($hasKey) {
  Get-Content -LiteralPath $passwordPath -Raw | ConvertTo-SecureString
} else {
  [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) |
    ConvertTo-SecureString -AsPlainText -Force
}
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:ARCANA_UPLOAD_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  if (!$hasKey) {
    New-Item -ItemType Directory -Path $signingDirectory -Force | Out-Null
    $keyArguments = @('-genkeypair', '-keystore', $keyPath, '-storetype', 'PKCS12',
      '-alias', $alias, '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
      '-dname', 'CN=Arcana Guide Upload', '-storepass:env', 'ARCANA_UPLOAD_KEY_PASSWORD')
    & keytool @keyArguments
    if ($LASTEXITCODE -ne 0) { throw 'Upload key creation failed.' }
    $securePassword | ConvertFrom-SecureString | Set-Content -LiteralPath $passwordPath -NoNewline
  }
  New-Item -ItemType Directory -Path (Split-Path -Parent $signedPath) -Force | Out-Null
  $signArguments = @('-keystore', $keyPath, '-storetype', 'PKCS12', '-storepass:env', 'ARCANA_UPLOAD_KEY_PASSWORD',
    '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256', '-signedjar', $signedPath, $bundlePath, $alias)
  & jarsigner @signArguments
  if ($LASTEXITCODE -ne 0) { throw 'Bundle signing failed.' }
  & jarsigner -verify $signedPath
  if ($LASTEXITCODE -ne 0) { throw 'Bundle signature verification failed.' }
} finally {
  Remove-Item Env:ARCANA_UPLOAD_KEY_PASSWORD -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
Write-Output $signedPath
