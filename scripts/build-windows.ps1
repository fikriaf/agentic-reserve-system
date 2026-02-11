# ARS Windows Build Script
# Handles privilege checks and provides clear guidance

param(
    [switch]$Force,
    [switch]$Clean
)

Write-Host "=== ARS Windows Build Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check if Developer Mode is enabled
function Test-DeveloperMode {
    try {
        $devMode = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -ErrorAction SilentlyContinue
        return ($devMode.AllowDevelopmentWithoutDevLicense -eq 1)
    } catch {
        return $false
    }
}

$isAdmin = Test-Administrator
$devModeEnabled = Test-DeveloperMode

Write-Host "Privilege Check:" -ForegroundColor Yellow
Write-Host "  Administrator: $isAdmin"
Write-Host "  Developer Mode: $devModeEnabled"
Write-Host ""

if (-not $isAdmin -and -not $devModeEnabled) {
    Write-Host "WARNING: Build may fail due to insufficient privileges" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solana platform-tools require either:" -ForegroundColor Yellow
    Write-Host "  1. Administrator privileges (RECOMMENDED)" -ForegroundColor Yellow
    Write-Host "  2. Windows Developer Mode enabled" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Cyan
    Write-Host "  A. Close this window and run PowerShell as Administrator"
    Write-Host "  B. Enable Developer Mode: Settings -> For Developers -> Developer Mode"
    Write-Host "  C. Use WSL2: wsl bash -c 'cd /mnt/d/script/Agentic/agentic-reserve-system && anchor build'"
    Write-Host "  D. Use Docker: docker run --rm -v `${PWD}:/workspace -w /workspace projectserum/build:v0.30.1 anchor build"
    Write-Host ""
    
    if (-not $Force) {
        $response = Read-Host "Continue anyway? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Host "Build cancelled. See BUILD_WINDOWS_GUIDE.md for detailed instructions." -ForegroundColor Yellow
            exit 1
        }
    }
}

# Check required tools
Write-Host "Checking required tools..." -ForegroundColor Cyan

try {
    $anchorVersion = & anchor --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host "Anchor: $anchorVersion" -ForegroundColor Green
} catch {
    Write-Host "Anchor not found" -ForegroundColor Red
    Write-Host "Install: cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --locked" -ForegroundColor Yellow
    exit 1
}

try {
    $solanaVersion = & solana --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host "Solana: $solanaVersion" -ForegroundColor Green
} catch {
    Write-Host "Solana CLI not found" -ForegroundColor Red
    Write-Host "Install: sh -c `"`$(curl -sSfL https://release.solana.com/v1.18.17/install)`"" -ForegroundColor Yellow
    exit 1
}

try {
    $rustVersion = & rustc --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host "Rust: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "Rust not found" -ForegroundColor Red
    Write-Host "Install: https://rustup.rs/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Clean if requested
if ($Clean) {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Cyan
    & anchor clean
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Clean failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "Clean complete" -ForegroundColor Green
    Write-Host ""
}

# Set Solana tools in PATH
$solanaPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
if (Test-Path $solanaPath) {
    $env:PATH = "$solanaPath;$env:PATH"
    Write-Host "Added Solana tools to PATH" -ForegroundColor Green
}

# Build
Write-Host "Starting build..." -ForegroundColor Cyan
Write-Host "This may take 10-15 minutes on first build..." -ForegroundColor Yellow
Write-Host ""

$buildStart = Get-Date

& anchor build

$buildEnd = Get-Date
$buildDuration = ($buildEnd - $buildStart).TotalSeconds

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed" -ForegroundColor Red
    Write-Host ""
    
    if (-not $isAdmin -and -not $devModeEnabled) {
        Write-Host "This is likely due to insufficient privileges." -ForegroundColor Yellow
        Write-Host "See BUILD_WINDOWS_GUIDE.md for solutions." -ForegroundColor Yellow
    }
    
    exit 1
}

Write-Host ""
Write-Host "Build successful in $([math]::Round($buildDuration, 2)) seconds" -ForegroundColor Green
Write-Host ""

# Verify artifacts
Write-Host "Verifying build artifacts..." -ForegroundColor Cyan

$artifacts = @(
    "target/deploy/ars_core.so",
    "target/deploy/ars_reserve.so",
    "target/deploy/ars_token.so"
)

$allFound = $true
foreach ($artifact in $artifacts) {
    if (Test-Path $artifact) {
        $size = (Get-Item $artifact).Length / 1KB
        Write-Host "$artifact ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host "$artifact not found" -ForegroundColor Red
        $allFound = $false
    }
}

if (-not $allFound) {
    Write-Host ""
    Write-Host "Some artifacts missing" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Deploy to devnet: anchor deploy --provider.cluster devnet"
Write-Host "  2. Verify deployment: solana program show <PROGRAM_ID> --url devnet"
Write-Host "  3. Update backend/.env with program IDs"
Write-Host ""
Write-Host "Program IDs can be found in:" -ForegroundColor Yellow
Write-Host "  - target/deploy/ars_core-keypair.json"
Write-Host "  - target/deploy/ars_reserve-keypair.json"
Write-Host "  - target/deploy/ars_token-keypair.json"
Write-Host ""
