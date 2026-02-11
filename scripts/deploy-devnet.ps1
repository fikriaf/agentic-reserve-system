# ARS Protocol - Devnet Deployment Script (PowerShell)
# This script deploys all three programs to Solana devnet

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "ARS Protocol - Devnet Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Anchor is installed
if (!(Get-Command anchor -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Anchor CLI is not installed" -ForegroundColor Red
    Write-Host "Install from: https://www.anchor-lang.com/docs/installation"
    exit 1
}

# Check if Solana CLI is installed
if (!(Get-Command solana -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Solana CLI is not installed" -ForegroundColor Red
    Write-Host "Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
}

# Set Solana cluster to devnet
Write-Host "Setting Solana cluster to devnet..." -ForegroundColor Yellow
solana config set --url https://api.devnet.solana.com

# Check wallet balance
Write-Host ""
Write-Host "Checking wallet balance..." -ForegroundColor Yellow
$balance = solana balance
Write-Host "Current balance: $balance"

# Request airdrop if balance is low
if ($balance -match "^0") {
    Write-Host "Requesting airdrop..." -ForegroundColor Yellow
    solana airdrop 2
    Start-Sleep -Seconds 5
}

# Build programs
Write-Host ""
Write-Host "Building programs..." -ForegroundColor Yellow
anchor build

# Deploy programs
Write-Host ""
Write-Host "Deploying programs to devnet..." -ForegroundColor Yellow
anchor deploy --provider.cluster devnet

# Get program IDs
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Program IDs:" -ForegroundColor Cyan
anchor keys list

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Initialize the ARS Core program"
Write-Host "2. Initialize the Reserve Vault"
Write-Host "3. Initialize the ARU Token"
Write-Host "4. Update the frontend with program IDs"
Write-Host ""
Write-Host "Run: npm run initialize-programs"
