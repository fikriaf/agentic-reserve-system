#!/bin/bash
# ARS Build Commands for WSL2
# Run these commands one by one in your WSL2 terminal

echo "=== ARS Build Process ==="
echo ""
echo "Current directory: $(pwd)"
echo ""

# Step 1: Clean previous build artifacts
echo "Step 1: Cleaning previous builds..."
anchor clean
rm -f Cargo.lock
echo ""

# Step 2: Build all programs
echo "Step 2: Building programs..."
anchor build
echo ""

# Step 3: Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "Step 3: Setting up Solana wallet..."
    echo "Run: solana-keygen new -o ~/.config/solana/id.json"
    echo ""
    echo "Step 4: Get devnet SOL..."
    echo "Run: solana airdrop 2 --url devnet"
    echo ""
    echo "Step 5: Deploy to devnet..."
    echo "Run: anchor deploy --provider.cluster devnet"
    echo ""
    echo "Step 6: Get program IDs..."
    echo "Run: anchor keys list"
else
    echo "❌ Build failed. Check errors above."
fi
