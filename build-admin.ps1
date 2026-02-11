# Quick build script for admin terminal
# Run this in your Administrator PowerShell

Write-Host "=== ARS Build (Admin Mode) ===" -ForegroundColor Cyan
Write-Host ""

# Add Solana tools to PATH
$solanaPath = "$env:USERPROFILE\.local\share\solana\install\releases\1.18.17\solana-release\bin"
if (Test-Path $solanaPath) {
    $env:PATH = "$solanaPath;$env:PATH"
    Write-Host "Solana tools added to PATH" -ForegroundColor Green
} else {
    Write-Host "WARNING: Solana tools not found at $solanaPath" -ForegroundColor Yellow
    Write-Host "Trying to find Solana installation..." -ForegroundColor Yellow
    
    # Try to find any Solana version
    $solanaBase = "$env:USERPROFILE\.local\share\solana\install\releases"
    if (Test-Path $solanaBase) {
        $versions = Get-ChildItem $solanaBase -Directory | Sort-Object Name -Descending
        if ($versions.Count -gt 0) {
            $solanaPath = Join-Path $versions[0].FullName "solana-release\bin"
            if (Test-Path $solanaPath) {
                $env:PATH = "$solanaPath;$env:PATH"
                Write-Host "Found Solana at: $solanaPath" -ForegroundColor Green
            }
        }
    }
}

Write-Host ""
Write-Host "Starting build (this will take 10-15 minutes)..." -ForegroundColor Cyan
Write-Host ""

$buildStart = Get-Date

& anchor build

$buildEnd = Get-Date
$buildDuration = ($buildEnd - $buildStart).TotalSeconds

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Build successful in $([math]::Round($buildDuration, 2)) seconds" -ForegroundColor Green
Write-Host ""

# Verify artifacts
Write-Host "Verifying artifacts..." -ForegroundColor Cyan
$artifacts = @("target/deploy/ars_core.so", "target/deploy/ars_reserve.so", "target/deploy/ars_token.so")

foreach ($artifact in $artifacts) {
    if (Test-Path $artifact) {
        $size = (Get-Item $artifact).Length / 1KB
        Write-Host "  $artifact ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  $artifact - MISSING" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Next: anchor deploy --provider.cluster devnet" -ForegroundColor Yellow
