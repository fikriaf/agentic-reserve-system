#!/bin/bash
# Install Anchor CLI v0.31.0 with dependencies

echo "📦 Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y \
    libudev-dev \
    libusb-1.0-0-dev \
    libhidapi-dev \
    pkg-config \
    build-essential

echo ""
echo "🔧 Installing Anchor CLI v0.31.0..."
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.0 anchor-cli --locked

echo ""
echo "✅ Installation complete!"
echo ""
echo "Verify installation:"
echo "  anchor --version"
