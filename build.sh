#!/bin/bash

echo "Building ICB Protocol Smart Contracts..."
echo "=========================================="
echo ""

# Build all programs
echo "Running: anchor build"
anchor build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "Build successful!"
    echo "=========================================="
    echo ""
    echo "Program IDs:"
    anchor keys list
    echo ""
    echo "Next step: Deploy to devnet"
    echo "Run: anchor deploy --provider.cluster devnet"
else
    echo ""
    echo "Build failed. Check errors above."
    exit 1
fi
