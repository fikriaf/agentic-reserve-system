# Test Frontend-Backend Integration

Write-Host "🧪 Testing ARS Frontend-Backend Integration" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:4000/health" -Method Get
    Write-Host "   ✅ Backend is running" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Backend is NOT running on port 4000" -ForegroundColor Red
    Write-Host "   Please start backend with: npm run dev:simple --workspace=backend" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if frontend is running
Write-Host "2. Checking frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method Get -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Frontend is running on port 5173" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend is NOT running on port 5173" -ForegroundColor Red
    Write-Host "   Please start frontend with: npm run dev --workspace=frontend" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test API endpoints that frontend uses
Write-Host "3. Testing API endpoints..." -ForegroundColor Yellow

$endpoints = @(
    @{ Path = "/ili/current"; Name = "ILI Current" },
    @{ Path = "/icr/current"; Name = "ICR Current" },
    @{ Path = "/reserve/state"; Name = "Reserve State" },
    @{ Path = "/proposals"; Name = "Proposals" },
    @{ Path = "/revenue/current"; Name = "Revenue Current" },
    @{ Path = "/agents/staking/metrics"; Name = "Staking Metrics" }
)

foreach ($endpoint in $endpoints) {
    try {
        $data = Invoke-RestMethod -Uri "http://localhost:4000$($endpoint.Path)" -Method Get
        Write-Host "   ✅ $($endpoint.Name)" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ $($endpoint.Name) - Failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Integration test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Dashboard URL: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔌 Backend API: http://localhost:4000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open http://localhost:5173 in your browser" -ForegroundColor Gray
Write-Host "  2. Check browser console for any errors" -ForegroundColor Gray
Write-Host "  3. Verify data is loading in dashboard components" -ForegroundColor Gray
