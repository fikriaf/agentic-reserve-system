# Build using Docker (no Windows privilege issues)

Write-Host "=== ARS Docker Build ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Cyan
$dockerRunning = $false
try {
    $null = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
        Write-Host "Docker is running" -ForegroundColor Green
    }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "Docker is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
    Write-Host "Or use WSL2: wsl bash -c 'cd /mnt/d/script/Agentic/agentic-reserve-system && anchor build'" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Building with Docker (this will take 10-15 minutes)..." -ForegroundColor Cyan
Write-Host ""

$buildStart = Get-Date

# Run build in Docker container
docker run --rm -v "${PWD}:/workspace" -w /workspace projectserum/build:v0.30.1 anchor build

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
