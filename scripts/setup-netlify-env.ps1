# ──────────────────────────────────────────────────────────────
# Push .env.local → Netlify environment variables
# ──────────────────────────────────────────────────────────────
# Usage:
#   1. Run:  netlify login          (one-time, opens browser)
#   2. Run:  netlify link           (link this folder to your site)
#   3. Run:  .\scripts\setup-netlify-env.ps1
#   4. Then trigger a redeploy on Netlify (or run: netlify deploy --build)
# ──────────────────────────────────────────────────────────────

$envFile = Join-Path $PSScriptRoot "..\\.env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env.local not found at $envFile" -ForegroundColor Red
    exit 1
}

$lines = [System.IO.File]::ReadAllLines($envFile)
$count = 0

foreach ($line in $lines) {
    $line = $line.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { continue }
    if ($line -notmatch '=') { continue }

    $parts = $line -split '=', 2
    $key   = $parts[0].Trim()
    $value = $parts[1].Trim()

    if ($key -eq '' -or $value -eq '') { continue }

    Write-Host "Setting $key ..." -ForegroundColor Cyan
    & netlify env:set $key $value 2>&1 | Out-Null
    $count++
}

Write-Host "`nDone! Set $count environment variable(s) on Netlify." -ForegroundColor Green
Write-Host "Now trigger a redeploy:  netlify deploy --build --prod" -ForegroundColor Yellow

