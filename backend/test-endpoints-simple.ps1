$baseUrl = "http://localhost:4000"
$results = @()

function Test-EP {
    param([string]$M, [string]$P, [string]$D, $B = $null, $H = @{})
    Write-Host "`n[$M] $P" -ForegroundColor Cyan
    try {
        $params = @{ Uri = "$baseUrl$P"; Method = $M; UseBasicParsing = $true; TimeoutSec = 10; Headers = $H }
        if ($B) { $params.Body = ($B | ConvertTo-Json); $params.ContentType = "application/json" }
        $r = Invoke-WebRequest @params
        
        # Check if response is JSON
        $isJson = $r.Headers['Content-Type'] -match 'application/json'
        
        if ($isJson) {
            $c = $r.Content | ConvertFrom-Json
            Write-Host "  ✅ $($r.StatusCode)" -ForegroundColor Green
            Write-Host "  $($c | ConvertTo-Json -Compress | Select-Object -First 150)" -ForegroundColor Gray
        } else {
            # Text response (like static files)
            Write-Host "  ✅ $($r.StatusCode)" -ForegroundColor Green
            $preview = $r.Content.Substring(0, [Math]::Min(100, $r.Content.Length))
            Write-Host "  $preview..." -ForegroundColor Gray
        }
        
        $script:results += @{ M=$M; P=$P; D=$D; S=$r.StatusCode; OK=$true }
        return $r.Content
    } catch {
        $s = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "ERR" }
        Write-Host "  ❌ $s - $($_.Exception.Message)" -ForegroundColor Red
        $script:results += @{ M=$M; P=$P; D=$D; S=$s; OK=$false }
        return $null
    }
}

Write-Host "=== ARS BACKEND COMPREHENSIVE TEST ===" -ForegroundColor Yellow

# HEALTH
Write-Host "`n=== HEALTH ===" -ForegroundColor Yellow
Test-EP "GET" "/health" "Simple health"
Test-EP "GET" "/api/v1/health" "Extended health"
Test-EP "GET" "/api/v1/health/sak" "SAK health"

# ILI
Write-Host "`n=== ILI ===" -ForegroundColor Yellow
$ili = Test-EP "GET" "/api/v1/ili/current" "Current ILI"
if ($ili) { Write-Host "  ILI: $($ili.ili), TVL: `$$([math]::Round($ili.components.tvl/1e9,2))B" -ForegroundColor Magenta }
Test-EP "GET" "/api/v1/ili/history?limit=5" "ILI history"

# ICR
Write-Host "`n=== ICR ===" -ForegroundColor Yellow
$icr = Test-EP "GET" "/api/v1/icr/current" "Current ICR"
if ($icr) { Write-Host "  ICR: $($icr.icr) bps" -ForegroundColor Magenta }

# RESERVE
Write-Host "`n=== RESERVE ===" -ForegroundColor Yellow
Test-EP "GET" "/api/v1/reserve/state" "Reserve state"
Test-EP "GET" "/api/v1/reserve/history?limit=5" "Reserve history"

# REVENUE
Write-Host "`n=== REVENUE ===" -ForegroundColor Yellow
Test-EP "GET" "/api/v1/revenue/current" "Current revenue"
Test-EP "GET" "/api/v1/revenue/history?limit=5" "Revenue history"
Test-EP "GET" "/api/v1/revenue/projections" "Projections"
Test-EP "GET" "/api/v1/revenue/breakdown" "Breakdown"
Test-EP "GET" "/api/v1/revenue/distributions" "Distributions"

# AGENTS
Write-Host "`n=== AGENTS ===" -ForegroundColor Yellow
$pk = "TestAgent123"
Test-EP "GET" "/api/v1/agents/$pk/fees" "Agent fees"
Test-EP "GET" "/api/v1/agents/$pk/staking" "Staking status"
Test-EP "POST" "/api/v1/agents/$pk/stake" "Stake" @{amount=100}
Test-EP "POST" "/api/v1/agents/$pk/claim" "Claim rewards"

# PROPOSALS
Write-Host "`n=== PROPOSALS ===" -ForegroundColor Yellow
Test-EP "GET" "/api/v1/proposals" "List proposals"
Test-EP "GET" "/api/v1/proposals?status=active" "Active proposals"

# PRIVACY PHASE 1
Write-Host "`n=== PRIVACY PHASE 1 ===" -ForegroundColor Yellow
$ma = Test-EP "POST" "/api/v1/privacy/stealth-address" "Gen meta-address" @{agentId="test-001";label="Test"}
if ($ma -and $ma.data) {
    $mid = $ma.data.id
    Write-Host "  Meta-Address ID: $mid" -ForegroundColor Magenta
    Test-EP "GET" "/api/v1/privacy/stealth-address/test-001" "Get meta-address"
    Test-EP "POST" "/api/v1/privacy/shielded-transfer" "Build transfer" @{senderId="sender-123";recipientMetaAddressId=$mid;amount="1000000000";mint="So11111111111111111111111111111111111111112"}
}
Test-EP "GET" "/api/v1/privacy/payments/test-001?limit=5" "Get payments"
Test-EP "GET" "/api/v1/privacy/transactions/test-001?limit=5" "Get transactions"

# PRIVACY PHASE 2
Write-Host "`n=== PRIVACY PHASE 2 ===" -ForegroundColor Yellow
$cm = Test-EP "POST" "/api/v1/privacy/commitment" "Create commitment" @{value="1000"}
if ($cm -and $cm.data) {
    $cid = $cm.data.id
    Write-Host "  Commitment ID: $cid" -ForegroundColor Magenta
    Test-EP "POST" "/api/v1/privacy/commitment/verify" "Verify commitment" @{commitmentId=$cid;value="1000"}
}
$wa = "TestWallet123"
Test-EP "GET" "/api/v1/privacy/score/${wa}" "Privacy score"
Test-EP "GET" "/api/v1/privacy/score/${wa}/trend?limit=5" "Score trend"
Test-EP "GET" "/api/v1/privacy/low-privacy-addresses" "Low privacy addresses"

# COMPLIANCE PHASE 3
Write-Host "`n=== COMPLIANCE PHASE 3 ===" -ForegroundColor Yellow
$mk = Test-EP "POST" "/api/v1/compliance/viewing-key/generate" "Gen master key" @{path="m/0"}
if ($mk -and $mk.data) {
    $pid = $mk.data.id
    Write-Host "  Master Key ID: $pid" -ForegroundColor Magenta
    $ck = Test-EP "POST" "/api/v1/compliance/viewing-key/derive" "Derive child key" @{parentId=$pid;childPath="org"}
    if ($ck -and $ck.data) {
        $cid = $ck.data.id
        Test-EP "POST" "/api/v1/compliance/viewing-key/verify" "Verify hierarchy" @{parentId=$pid;childId=$cid}
    }
}
Test-EP "POST" "/api/v1/compliance/setup" "Setup hierarchy"
Test-EP "GET" "/api/v1/compliance/disclosures/auditor-001" "List disclosures"

# MEMORY
Write-Host "`n=== MEMORY ===" -ForegroundColor Yellow
$tw = "TestWallet123"
$memHeaders = @{ "x-agent-id" = "test-agent-001" }
Test-EP "GET" "/api/v1/memory/transactions/${tw}?page=1&pageSize=5" "Transactions" $null $memHeaders
Test-EP "GET" "/api/v1/memory/balances/${tw}" "Balances" $null $memHeaders
Test-EP "GET" "/api/v1/memory/pnl/${tw}?period=30d" "PnL" $null $memHeaders
Test-EP "GET" "/api/v1/memory/risk/${tw}" "Risk profile" $null $memHeaders
Test-EP "GET" "/api/v1/memory/portfolio/${tw}" "Portfolio" $null $memHeaders

# PROGRAMS
Write-Host "`n=== PROGRAMS ===" -ForegroundColor Yellow
Test-EP "GET" "/api/v1/programs/status" "Program status"
Test-EP "GET" "/api/v1/programs/core/state" "Core state"
Test-EP "GET" "/api/v1/programs/reserve/vault" "Reserve vault"
Test-EP "GET" "/api/v1/programs/token/mint" "Token mint"

# METRICS
Write-Host "`n=== METRICS ===" -ForegroundColor Yellow
Test-EP "GET" "/metrics" "Prometheus"
Test-EP "GET" "/api/v1/metrics/json" "JSON metrics"
Test-EP "GET" "/api/v1/slow-queries/stats" "Slow query stats"
Test-EP "GET" "/api/v1/slow-queries/recent?limit=5" "Recent slow queries"

# DISCOVERY
Write-Host "`n=== DISCOVERY ===" -ForegroundColor Yellow
Test-EP "GET" "/ars-llms.txt" "API docs"
Test-EP "GET" "/SKILL.md" "Skill"
Test-EP "GET" "/HEARTBEAT.md" "Heartbeat"

# SUMMARY
Write-Host "`n=== SUMMARY ===" -ForegroundColor Yellow
$total = $results.Count
$ok = ($results | Where-Object { $_.OK }).Count
$fail = $total - $ok
$rate = [math]::Round(($ok/$total)*100,1)
Write-Host "Total: $total | OK: $ok | FAIL: $fail | Rate: $rate%" -ForegroundColor Cyan

Write-Host "`n=== FAILED ===" -ForegroundColor Red
$results | Where-Object { -not $_.OK } | ForEach-Object { Write-Host "  ❌ [$($_.M)] $($_.P)" -ForegroundColor Red }

$results | ConvertTo-Json | Out-File "TEST_RESULTS_FULL.json"
Write-Host "`nSaved to: TEST_RESULTS_FULL.json" -ForegroundColor Cyan
