# Final Build Script - Run as Administrator
# This will upgrade Solana CLI and build programs

Write-Host "=== ARS Final Build (Admin Required) ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Running as Administrator" -ForegroundColor Green
Write-Host ""

# Step 1: Upgrade Solana CLI to get newer Rust
Write-Host "Step 1: Upgrading Solana CLI to 1.19.0..." -ForegroundColor Cyan
Write-Host "This will install Rust 1.79+ which is compatible with modern dependencies" -ForegroundColor Yellow
Write-Host ""

solana-install init 1.19.0

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Failed to upgrade Solana CLI" -ForegroundColor Red
    Write-Host "Try manually: solana-install init 1.19.0" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Solana CLI upgraded successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Update PATH
Write-Host "Step 2: Updating PATH..." -ForegroundColor Cyan
$env:PATH = "$env:USERPROFILE\.local\share\solana\install\active_release\bin;$env:PATH"
Write-Host "PATH updated" -ForegroundColor Green
Write-Host ""

# Step 3: Verify versions
Write-Host "Step 3: Verifying versions..." -ForegroundColor Cyan
Write-Host "Solana:" -NoNewline
solana --version
Write-Host "Anchor:" -NoNewline
anchor --version
Write-Host "Rust (Solana):" -NoNewline
cargo-build-sbf --version
Write-Host ""

# Step 4: Clean and regenerate lockfile
Write-Host "Step 4: Cleaning and regenerating Cargo.lock..." -ForegroundColor Cyan
if (Test-Path "Cargo.lock") {
    Remove-Item Cargo.lock -Force
    Write-Host "Removed old Cargo.lock" -ForegroundColor Green
}

cargo generate-lockfile
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to generate lockfile" -ForegroundColor Red
    exit 1
}

# Fix lockfile version
(Get-Content Cargo.lock) -replace 'version = 4', 'version = 3' | Set-Content Cargo.lock
Write-Host "Lockfile generated and fixed" -ForegroundColor Green
Write-Host ""

# Step 5: Build with Anchor
Write-Host "Step 5: Building programs with Anchor..." -ForegroundColor Cyan
Write-Host "This will take 10-15 minutes on first build..." -ForegroundColor Yellow
Write-Host ""

$buildStart = Get-Date

anchor build

$buildEnd = Get-Date
$buildDuration = ($buildEnd - $buildStart).TotalSeconds

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "If you see dependency errors, try:" -ForegroundColor Yellow
    Write-Host "  anchor clean" -ForegroundColor Yellow
    Write-Host "  cargo clean" -ForegroundColor Yellow
    Write-Host "  anchor build" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Build successful in $([math]::Round($buildDuration, 2)) seconds" -ForegroundColor Green
Write-Host ""

# Step 6: Verify artifacts
Write-Host "Step 6: Verifying build artifacts..." -ForegroundColor Cyan

$artifacts = @(
    "target/deploy/ars_core.so",
    "target/deploy/ars_reserve.so",
    "target/deploy/ars_token.so"
)

$allFound = $true
foreach ($artifact in $artifacts) {
    if (Test-Path $artifact) {
        $size = (Get-Item $artifact).Length / 1KB
        Write-Host "  $artifact ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  $artifact - MISSING" -ForegroundColor Red
        $allFound = $false
    }
}

if (-not $allFound) {
    Write-Host ""
    Write-Host "Some artifacts missing!" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== BUILD COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Deploy to devnet: anchor deploy --provider.cluster devnet" -ForegroundColor White
Write-Host "  2. Get program IDs: anchor keys list" -ForegroundColor White
Write-Host "  3. Update backend/.env with program IDs" -ForegroundColor White
Write-Host "  4. Start backend: npm run dev:simple --prefix backend" -ForegroundColor White
Write-Host ""
Write-Host "Program keypairs are in target/deploy/*-keypair.json" -ForegroundColor Yellow
Write-Host ""
