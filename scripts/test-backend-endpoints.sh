#!/bin/bash
# Test all backend endpoints

BASE_URL="http://localhost:4000"

echo "🧪 Testing ARS Backend Endpoints"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_endpoint() {
  local endpoint=$1
  local name=$2
  
  echo -n "Testing $name... "
  response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ OK${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}✗ FAILED (HTTP $http_code)${NC}"
    echo "$body"
  fi
  echo ""
}

# Test all endpoints
test_endpoint "/health" "Health Check"
test_endpoint "/programs/status" "Program Status"
test_endpoint "/ili/current" "Current ILI"
test_endpoint "/ili/history" "ILI History"
test_endpoint "/icr/current" "Current ICR"
test_endpoint "/reserve/state" "Reserve State"
test_endpoint "/reserve/rebalance-history" "Rebalance History"
test_endpoint "/proposals" "All Proposals"
test_endpoint "/proposals?status=active" "Active Proposals"
test_endpoint "/proposals/1" "Proposal Detail"
test_endpoint "/revenue/current" "Current Revenue"
test_endpoint "/revenue/breakdown" "Revenue Breakdown"
test_endpoint "/agents/staking/metrics" "Staking Metrics"
test_endpoint "/history/policies" "Policy History"

echo "=================================="
echo "✅ Backend endpoint testing complete!"
