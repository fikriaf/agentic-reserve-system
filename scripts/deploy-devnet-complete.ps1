# ARS Devnet Deployment Script (PowerShell)
# Deploys all three programs to Solana devnet

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ARS Devnet Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Anchor is installed
Write-Host "[1/8] Checking Anchor installation..." -ForegroundColor Yellow
$anchorVersion = anchor --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Anchor not found. Please install Anchor framework." -ForegroundColor Red
    Write-Host "Visit: https://www.anchor-lang.com/docs/installation" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Anchor installed: $anchorVersion" -ForegroundColor Green

# Check if Solana CLI is installed
Write-Host "`n[2/8] Checking Solana CLI..." -ForegroundColor Yellow
$solanaVersion = solana --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Solana CLI not found. Please install Solana CLI." -ForegroundColor Red
    Write-Host "Visit: https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Solana CLI installed: $solanaVersion" -ForegroundColor Green

# Set Solana to devnet
Write-Host "`n[3/8] Configuring Solana for devnet..." -ForegroundColor Yellow
solana config set --url https://api.devnet.solana.com
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to set Solana config" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Solana configured for devnet" -ForegroundColor Green

# Check wallet balance
Write-Host "`n[4/8] Checking wallet balance..." -ForegroundColor Yellow
$balance = solana balance 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ No wallet found. Creating new wallet..." -ForegroundColor Yellow
    solana-keygen new --no-bip39-passphrase
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to create wallet" -ForegroundColor Red
        exit 1
    }
}

$balance = solana balance
Write-Host "Current balance: $balance" -ForegroundColor Cyan

# Airdrop if balance is low
if ($balance -match "^0") {
    Write-Host "Low balance detected. Requesting airdrop..." -ForegroundColor Yellow
    solana airdrop 2
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Airdrop failed. Please try again or use faucet." -ForegroundColor Red
        Write-Host "Faucet: https://faucet.solana.com" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✓ Airdrop successful" -ForegroundColor Green
}

# Build programs
Write-Host "`n[5/8] Building Anchor programs..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan
anchor build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build successful" -ForegroundColor Green

# Show program IDs
Write-Host "`n[6/8] Program IDs:" -ForegroundColor Yellow
Write-Host "Reading from Anchor.toml..." -ForegroundColor Cyan

$anchorToml = Get-Content "Anchor.toml" -Raw
if ($anchorToml -match 'ars_core = "([^"]+)"') {
    $arsCoreId = $matches[1]
    Write-Host "  ars-core:    $arsCoreId" -ForegroundColor Cyan
}
if ($anchorToml -match 'ars_reserve = "([^"]+)"') {
    $arsReserveId = $matches[1]
    Write-Host "  ars-reserve: $arsReserveId" -ForegroundColor Cyan
}
if ($anchorToml -match 'ars_token = "([^"]+)"') {
    $arsTokenId = $matches[1]
    Write-Host "  ars-token:   $arsTokenId" -ForegroundColor Cyan
}

# Deploy programs
Write-Host "`n[7/8] Deploying to devnet..." -ForegroundColor Yellow
Write-Host "This will deploy all three programs..." -ForegroundColor Cyan

anchor deploy --provider.cluster devnet
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Deployment failed" -ForegroundColor Red
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check your wallet balance: solana balance" -ForegroundColor White
    Write-Host "2. Request more SOL: solana airdrop 2" -ForegroundColor White
    Write-Host "3. Check network status: solana cluster-version" -ForegroundColor White
    exit 1
}

Write-Host "✓ Deployment successful!" -ForegroundColor Green

# Verify deployment
Write-Host "`n[8/8] Verifying deployment..." -ForegroundColor Yellow

if ($arsCoreId) {
    $coreInfo = solana program show $arsCoreId 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ars-core deployed and verified" -ForegroundColor Green
    } else {
        Write-Host "⚠ ars-core deployment could not be verified" -ForegroundColor Yellow
    }
}

if ($arsReserveId) {
    $reserveInfo = solana program show $arsReserveId 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ars-reserve deployed and verified" -ForegroundColor Green
    } else {
        Write-Host "⚠ ars-reserve deployment could not be verified" -ForegroundColor Yellow
    }
}

if ($arsTokenId) {
    $tokenInfo = solana program show $arsTokenId 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ars-token deployed and verified" -ForegroundColor Green
    } else {
        Write-Host "⚠ ars-token deployment could not be verified" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nProgram IDs (save these):" -ForegroundColor Yellow
Write-Host "  ars-core:    $arsCoreId" -ForegroundColor White
Write-Host "  ars-reserve: $arsReserveId" -ForegroundColor White
Write-Host "  ars-token:   $arsTokenId" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Update backend .env with program IDs" -ForegroundColor White
Write-Host "2. Initialize programs with: anchor run initialize" -ForegroundColor White
Write-Host "3. Test endpoints: npm run backend:test" -ForegroundColor White
Write-Host "4. Monitor on Solana Explorer:" -ForegroundColor White
Write-Host "   https://explorer.solana.com/address/$arsCoreId?cluster=devnet" -ForegroundColor Cyan

Write-Host "`n========================================`n" -ForegroundColor Cyan
