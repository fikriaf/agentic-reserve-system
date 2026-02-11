# Manual build using cargo-build-sbf directly
# Bypasses Anchor version manager issues

Write-Host "=== Manual SBF Build ===" -ForegroundColor Cyan
Write-Host ""

# Set required environment variables
$env:HOME = "C:\Users\HYPE AMD"
$solanaPath = "C:\Users\HYPE AMD\.local\share\solana\install\releases\1.18.17\solana-release\bin"
$env:PATH = "$solanaPath;$env:PATH"

# Fix Cargo.lock version (v4 -> v3 for compatibility)
if (Test-Path "Cargo.lock") {
    (Get-Content Cargo.lock) -replace 'version = 4', 'version = 3' | Set-Content Cargo.lock
    Write-Host "Fixed Cargo.lock version" -ForegroundColor Green
}

Write-Host "Environment configured" -ForegroundColor Green
Write-Host "Building programs manually..." -ForegroundColor Cyan
Write-Host ""

$programs = @("ars-core", "ars-reserve", "ars-token")

foreach ($program in $programs) {
    Write-Host "Building $program..." -ForegroundColor Yellow
    
    $manifestPath = "programs/$program/Cargo.toml"
    
    cargo-build-sbf --manifest-path=$manifestPath --sbf-out-dir=target/deploy
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to build $program" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  $program built successfully" -ForegroundColor Green
    Write-Host ""
}

Write-Host "=== Build Complete ===" -ForegroundColor Green
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
