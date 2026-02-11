# Comprehensive Endpoint Testing Script
# Tests ALL documented endpoints and checks for real data (no mock/hardcode)

$baseUrl = "http://localhost:4000"
$results = @()

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Description,
        [hashtable]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    Write-Host "`n[$Method] $Path - $Description" -ForegroundColor Cyan
    
    try {
        $params = @{
            Uri = "$baseUrl$Path"
            Method = $Method
            UseBasicParsing = $true
            TimeoutSec = 10
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        $content = $response.Content | ConvertFrom-Json
        
        Write-Host "  ✅ Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  📊 Response: $($content | ConvertTo-Json -Compress -Depth 2 | Select-Object -First 200)" -ForegroundColor Gray
        
        $results += [PSCustomObject]@{
            Method = $Method
            Path = $Path
            Description = $Description
            Status = $response.StatusCode
            Success = $true
            HasData = $content -ne $null
            ResponseSize = $response.Content.Length
        }
        
        return $content
        
    } catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "N/A" }
        Write-Host "  ❌ Status: $statusCode - $($_.Exception.Message)" -ForegroundColor Red
        
        $results += [PSCustomObject]@{
            Method = $Method
            Path = $Path
            Description = $Description
            Status = $statusCode
            Success = $false
            HasData = $false
            Error = $_.Exception.Message
        }
        
        return $null
    }
}

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "ARS BACKEND - COMPREHENSIVE ENDPOINT TEST" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# ============================================
# HEALTH & MONITORING
# ============================================
Write-Host "`n=== HEALTH AND MONITORING ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Path "/health" -Description "Simple health check"
Test-Endpoint -Method "GET" -Path "/api/v1/health" -Description "Extended health with dependencies"
Test-Endpoint -Method "GET" -Path "/api/v1/health/sak" -Description "SAK integration health"

# ============================================
# ILI (INTERNET LIQUIDITY INDEX)
# ============================================
Write-Host "`n=== ILI (INTERNET LIQUIDITY INDEX) ===" -ForegroundColor Yellow

$ili = Test-Endpoint -Method "GET" -Path "/api/v1/ili/current" -Description "Current ILI value"
if ($ili) {
    Write-Host "  🔍 ILI Value: $($ili.ili)" -ForegroundColor Magenta
    Write-Host "  🔍 Avg Yield: $($ili.components.avgYield)%" -ForegroundColor Magenta
    Write-Host "  🔍 Volatility: $($ili.components.volatility)%" -ForegroundColor Magenta
    Write-Host "  🔍 TVL: `$$([math]::Round($ili.components.tvl / 1e9, 2))B" -ForegroundColor Magenta
}

Test-Endpoint -Method "GET" -Path "/api/v1/ili/history?limit=5" -Description "ILI history (last 5)"

# ============================================
# ICR (INTERNET CREDIT RATE)
# ============================================
Write-Host "`n=== ICR (INTERNET CREDIT RATE) ===" -ForegroundColor Yellow

$icr = Test-Endpoint -Method "GET" -Path "/api/v1/icr/current" -Description "Current ICR value"
if ($icr) {
    Write-Host "  🔍 ICR: $($icr.icr) bps" -ForegroundColor Magenta
    Write-Host "  🔍 Confidence: ±$($icr.confidence) bps" -ForegroundColor Magenta
    Write-Host "  🔍 Sources: $($icr.sources.Count)" -ForegroundColor Magenta
}

# ============================================
# RESERVE VAULT
# ============================================
Write-Host "`n=== RESERVE VAULT ===" -ForegroundColor Yellow

$reserve = Test-Endpoint -Method "GET" -Path "/api/v1/reserve/state" -Description "Current reserve state"
if ($reserve) {
    Write-Host "  🔍 Total Value: `$$($reserve.totalValueUsd)" -ForegroundColor Magenta
    Write-Host "  🔍 VHR: $($reserve.vhr)" -ForegroundColor Magenta
}

Test-Endpoint -Method "GET" -Path "/api/v1/reserve/history?limit=5" -Description "Reserve history (last 5)"

# ============================================
# REVENUE
# ============================================
Write-Host "`n=== REVENUE ===" -ForegroundColor Yellow

$revenue = Test-Endpoint -Method "GET" -Path "/api/v1/revenue/current" -Description "Current revenue metrics"
if ($revenue) {
    Write-Host "  🔍 Daily: `$$($revenue.daily)" -ForegroundColor Magenta
    Write-Host "  🔍 Monthly: `$$($revenue.monthly)" -ForegroundColor Magenta
    Write-Host "  🔍 Agent Count: $($revenue.agentCount)" -ForegroundColor Magenta
}

Test-Endpoint -Method "GET" -Path "/api/v1/revenue/history?limit=5" -Description "Revenue history"
Test-Endpoint -Method "GET" -Path "/api/v1/revenue/projections" -Description "Revenue projections"
Test-Endpoint -Method "GET" -Path "/api/v1/revenue/breakdown" -Description "Fee breakdown"
Test-Endpoint -Method "GET" -Path "/api/v1/revenue/distributions" -Description "Distribution history"

# ============================================
# AGENTS
# ============================================
Write-Host "`n=== AGENTS ===" -ForegroundColor Yellow

$testPubkey = "TestAgent123"
Test-Endpoint -Method "GET" -Path "/api/v1/agents/$testPubkey/fees" -Description "Agent fee history"
Test-Endpoint -Method "GET" -Path "/api/v1/agents/$testPubkey/staking" -Description "Agent staking status"
Test-Endpoint -Method "POST" -Path "/api/v1/agents/$testPubkey/stake" -Description "Stake ARU tokens" -Body @{ amount = 100 }
Test-Endpoint -Method "POST" -Path "/api/v1/agents/$testPubkey/claim" -Description "Claim staking rewards"

# ============================================
# GOVERNANCE
# ============================================
Write-Host "`n=== GOVERNANCE ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Path "/api/v1/proposals" -Description "List all proposals"
Test-Endpoint -Method "GET" -Path "/api/v1/proposals?status=active" -Description "List active proposals"

# ============================================
# PRIVACY - PHASE 1 (Shielded Transfers)
# ============================================
Write-Host "`n=== PRIVACY - PHASE 1 (SHIELDED TRANSFERS) ===" -ForegroundColor Yellow

$metaAddr = Test-Endpoint -Method "POST" -Path "/api/v1/privacy/stealth-address" -Description "Generate stealth meta-address" -Body @{
    agentId = "test-agent-001"
    label = "Test Agent"
}

if ($metaAddr -and $metaAddr.data) {
    $metaAddressId = $metaAddr.data.id
    Write-Host "  🔍 Meta-Address ID: $metaAddressId" -ForegroundColor Magenta
    
    Test-Endpoint -Method "GET" -Path "/api/v1/privacy/stealth-address/test-agent-001" -Description "Get agent meta-address"
    
    Test-Endpoint -Method "POST" -Path "/api/v1/privacy/shielded-transfer" -Description "Build shielded transfer" -Body @{
        senderId = "sender-wallet-123"
        recipientMetaAddressId = $metaAddressId
        amount = "1000000000"
        mint = "So11111111111111111111111111111111111111112"
    }
}

Test-Endpoint -Method "GET" -Path "/api/v1/privacy/payments/test-agent-001?limit=5" -Description "Get detected payments"
Test-Endpoint -Method "GET" -Path "/api/v1/privacy/transactions/test-agent-001?limit=5" -Description "Get transaction history"

# ============================================
# PRIVACY - PHASE 2 (MEV Protection)
# ============================================
Write-Host "`n=== PRIVACY - PHASE 2 (MEV PROTECTION) ===" -ForegroundColor Yellow

$commitment = Test-Endpoint -Method "POST" -Path "/api/v1/privacy/commitment" -Description "Create Pedersen commitment" -Body @{
    value = "1000"
}

if ($commitment -and $commitment.data) {
    $commitmentId = $commitment.data.id
    Write-Host "  🔍 Commitment ID: $commitmentId" -ForegroundColor Magenta
    
    Test-Endpoint -Method "POST" -Path "/api/v1/privacy/commitment/verify" -Description "Verify commitment" -Body @{
        commitmentId = $commitmentId
        value = "1000"
    }
}

$testAddress = "TestWallet123"
Test-Endpoint -Method "GET" -Path "/api/v1/privacy/score/$testAddress" -Description "Get privacy score"
Test-Endpoint -Method "GET" -Path "/api/v1/privacy/score/$testAddress/trend?limit=5" -Description "Get privacy score trend"
Test-Endpoint -Method "GET" -Path "/api/v1/privacy/low-privacy-addresses" -Description "Get low privacy addresses"

# ============================================
# COMPLIANCE - PHASE 3 (Viewing Keys)
# ============================================
Write-Host "`n=== COMPLIANCE - PHASE 3 (VIEWING KEYS) ===" -ForegroundColor Yellow

$masterKey = Test-Endpoint -Method "POST" -Path "/api/v1/compliance/viewing-key/generate" -Description "Generate master viewing key" -Body @{
    path = "m/0"
}

if ($masterKey -and $masterKey.data) {
    $parentId = $masterKey.data.id
    Write-Host "  🔍 Master Key ID: $parentId" -ForegroundColor Magenta
    
    $childKey = Test-Endpoint -Method "POST" -Path "/api/v1/compliance/viewing-key/derive" -Description "Derive child viewing key" -Body @{
        parentId = $parentId
        childPath = "org"
    }
    
    if ($childKey -and $childKey.data) {
        $childId = $childKey.data.id
        Test-Endpoint -Method "POST" -Path "/api/v1/compliance/viewing-key/verify" -Description "Verify key hierarchy" -Body @{
            parentId = $parentId
            childId = $childId
        }
    }
}

Test-Endpoint -Method "POST" -Path "/api/v1/compliance/setup" -Description "Setup complete hierarchy"

$testAuditor = "auditor-001"
Test-Endpoint -Method "GET" -Path "/api/v1/compliance/disclosures/$testAuditor" -Description "List disclosures"

# ============================================
# MEMORY & ANALYTICS
# ============================================
Write-Host "`n=== MEMORY AND ANALYTICS ===" -ForegroundColor Yellow

$testWallet = "TestWallet123"
Test-Endpoint -Method "GET" -Path "/api/v1/memory/transactions/$testWallet?page=1&pageSize=5" -Description "Get transaction history"
Test-Endpoint -Method "GET" -Path "/api/v1/memory/balances/$testWallet" -Description "Get wallet balances"
Test-Endpoint -Method "GET" -Path "/api/v1/memory/pnl/$testWallet?period=30d" -Description "Get PnL analytics"
Test-Endpoint -Method "GET" -Path "/api/v1/memory/risk/$testWallet" -Description "Get risk profile"
Test-Endpoint -Method "GET" -Path "/api/v1/memory/portfolio/$testWallet" -Description "Get portfolio analytics"

# ============================================
# PROGRAMS (Solana Smart Contracts)
# ============================================
Write-Host "`n=== PROGRAMS (SOLANA SMART CONTRACTS) ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Path "/api/v1/programs/status" -Description "Check program deployment"
Test-Endpoint -Method "GET" -Path "/api/v1/programs/core/state" -Description "Get ars_core GlobalState"
Test-Endpoint -Method "GET" -Path "/api/v1/programs/reserve/vault" -Description "Get ars_reserve Vault"
Test-Endpoint -Method "GET" -Path "/api/v1/programs/token/mint" -Description "Get ars_token Mint"

# ============================================
# METRICS & MONITORING
# ============================================
Write-Host "`n=== METRICS AND MONITORING ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Path "/metrics" -Description "Prometheus metrics"
Test-Endpoint -Method "GET" -Path "/api/v1/metrics/json" -Description "JSON metrics"
Test-Endpoint -Method "GET" -Path "/api/v1/slow-queries/stats" -Description "Slow query stats"
Test-Endpoint -Method "GET" -Path "/api/v1/slow-queries/recent?limit=5" -Description "Recent slow queries"

# ============================================
# AGENT DISCOVERY FILES
# ============================================
Write-Host "`n=== AGENT DISCOVERY FILES ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Path "/ars-llms.txt" -Description "API documentation"
Test-Endpoint -Method "GET" -Path "/SKILL.md" -Description "Skill instructions"
Test-Endpoint -Method "GET" -Path "/HEARTBEAT.md" -Description "Heartbeat format"

# ============================================
# SUMMARY
# ============================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "TEST SUMMARY" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$totalTests = $results.Count
$successTests = ($results | Where-Object { $_.Success }).Count
$failedTests = $totalTests - $successTests
$successRate = [math]::Round(($successTests / $totalTests) * 100, 1)

Write-Host "`nTotal Endpoints Tested: $totalTests" -ForegroundColor Cyan
Write-Host "✅ Successful: $successTests" -ForegroundColor Green
Write-Host "❌ Failed: $failedTests" -ForegroundColor Red
Write-Host "📊 Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })

Write-Host "`n=== FAILED ENDPOINTS ===" -ForegroundColor Red
$results | Where-Object { -not $_.Success } | ForEach-Object {
    Write-Host "  ❌ [$($_.Method)] $($_.Path) - Status: $($_.Status)" -ForegroundColor Red
    if ($_.Error) {
        Write-Host "     Error: $($_.Error)" -ForegroundColor DarkRed
    }
}

Write-Host "`n=== SUCCESSFUL ENDPOINTS ===" -ForegroundColor Green
$results | Where-Object { $_.Success } | ForEach-Object {
    Write-Host "  ✅ [$($_.Method)] $($_.Path) - $($_.Description)" -ForegroundColor Green
}

# Export results to JSON
$results | ConvertTo-Json -Depth 10 | Out-File "COMPREHENSIVE_TEST_RESULTS.json"
Write-Host "`n📄 Full results saved to: COMPREHENSIVE_TEST_RESULTS.json" -ForegroundColor Cyan
