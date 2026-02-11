#!/bin/bash

# ARS Protocol - Devnet Deployment Script
# This script deploys all three programs to Solana devnet

set -e

echo "========================================="
echo "ARS Protocol - Devnet Deployment"
echo "========================================="
echo ""

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "Error: Anchor CLI is not installed"
    echo "Install from: https://www.anchor-lang.com/docs/installation"
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "Error: Solana CLI is not installed"
    echo "Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Set Solana cluster to devnet
echo "Setting Solana cluster to devnet..."
solana config set --url https://api.devnet.solana.com

# Check wallet balance
echo ""
echo "Checking wallet balance..."
BALANCE=$(solana balance)
echo "Current balance: $BALANCE"

# Request airdrop if balance is low
if [[ "$BALANCE" == "0 SOL" ]]; then
    echo "Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

# Build programs
echo ""
echo "Building programs..."
anchor build

# Deploy programs
echo ""
echo "Deploying programs to devnet..."
anchor deploy --provider.cluster devnet

# Get program IDs
echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Program IDs:"
anchor keys list

echo ""
echo "Next steps:"
echo "1. Initialize the ARS Core program"
echo "2. Initialize the Reserve Vault"
echo "3. Initialize the ARU Token"
echo "4. Update the frontend with program IDs"
echo ""
echo "Run: npm run initialize-programs"
