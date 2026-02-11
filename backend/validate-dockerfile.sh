#!/bin/bash
# Dockerfile Validation Script
# Run this before deploying to Railway

set -e

echo "🔍 Validating Dockerfile configuration..."

# Check if required files exist
echo "✓ Checking required files..."
test -f Dockerfile.railway || (echo "❌ Dockerfile.railway not found" && exit 1)
test -f .dockerignore || (echo "❌ .dockerignore not found" && exit 1)
test -f package.json || (echo "❌ package.json not found" && exit 1)
test -f tsconfig.build.json || (echo "❌ tsconfig.build.json not found" && exit 1)

echo "✓ All required files present"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not installed - skipping build test"
    echo "   Install Docker to test locally: https://docs.docker.com/get-docker/"
    exit 0
fi

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -f Dockerfile.railway -t ars-backend:test .

# Check image size
echo "📦 Checking image size..."
SIZE=$(docker images ars-backend:test --format "{{.Size}}")
echo "   Image size: $SIZE"

# Run container for health check
echo "🏥 Testing health check..."
CONTAINER_ID=$(docker run -d -p 4000:4000 \
  -e NODE_ENV=production \
  -e PORT=4000 \
  -e SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
  ars-backend:test)

# Wait for container to start
sleep 10

# Check health endpoint
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    docker logs $CONTAINER_ID
    docker stop $CONTAINER_ID
    exit 1
fi

# Cleanup
docker stop $CONTAINER_ID
docker rm $CONTAINER_ID

echo ""
echo "✅ All validations passed!"
echo "   Ready for Railway deployment"
