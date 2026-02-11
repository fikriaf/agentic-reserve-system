# Colosseum Agent Hackathon - Automated Heartbeat
# Run this script every 30 minutes to stay synced with the hackathon

# Load environment variables
$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

$API_KEY = $env:API_KEY
$API_BASE = $env:API_BASE

# Fallback if env vars not loaded
if (-not $API_KEY) {
    Write-Host "Error: API_KEY not found in .env" -ForegroundColor Red
    exit 1
}

Write-Host "=== Colosseum Heartbeat Check ===" -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# 1. Check Agent Status
Write-Host "[1/5] Checking agent status..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $API_KEY" }
    $status = Invoke-RestMethod -Uri "$API_BASE/agents/status" -Headers $headers -Method Get
    Write-Host "  Status: $($status.status)" -ForegroundColor Green
    Write-Host "  Hackathon: $($status.hackathon.name)" -ForegroundColor Green
    Write-Host "  Active: $($status.hackathon.isActive)" -ForegroundColor Green
    Write-Host "  Forum Posts: $($status.engagement.forumPostCount)" -ForegroundColor Green
    Write-Host "  Project Status: $($status.engagement.projectStatus)" -ForegroundColor Green
    Write-Host "  Next Steps:" -ForegroundColor Cyan
    $status.nextSteps | ForEach-Object { Write-Host "    - $_" -ForegroundColor White }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 2. Check Skill File Version
Write-Host "[2/5] Checking skill file version..." -ForegroundColor Yellow
try {
    $skillContent = Invoke-WebRequest -Uri "https://colosseum.com/skill.md" -UseBasicParsing
    $versionLine = ($skillContent.Content -split "`n" | Select-String -Pattern "version:" | Select-Object -First 1).ToString()
    Write-Host "  $versionLine" -ForegroundColor Green
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Check Leaderboard
Write-Host "[3/5] Fetching leaderboard..." -ForegroundColor Yellow
$hackathonId = $status.hackathon.id
$leaderboard = curl -s "$API_BASE/hackathons/$hackathonId/leaderboard?limit=5" | ConvertFrom-Json
Write-Host "  Top 5 Projects:" -ForegroundColor Green
$leaderboard.projects | ForEach-Object {
    Write-Host "    $($_.rank). $($_.name) - Votes: $($_.totalVotes)" -ForegroundColor White
}
Write-Host ""

# 4. Check Forum Activity
Write-Host "[4/5] Checking forum activity..." -ForegroundColor Yellow
$forumPosts = curl -s "$API_BASE/forum/posts?sort=new&limit=5" | ConvertFrom-Json
Write-Host "  Recent Posts:" -ForegroundColor Green
$forumPosts.posts | ForEach-Object {
    Write-Host "    - $($_.title) by $($_.agentName)" -ForegroundColor White
}
Write-Host ""

# 5. Check My Project
Write-Host "[5/5] Checking my project..." -ForegroundColor Yellow
$myProject = curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE/my-project" 2>$null
if ($LASTEXITCODE -eq 0 -and $myProject) {
    $project = $myProject | ConvertFrom-Json
    Write-Host "  Project: $($project.project.name)" -ForegroundColor Green
    Write-Host "  Status: $($project.project.status)" -ForegroundColor Green
    Write-Host "  Votes: $($project.project.agentUpvotes + $project.project.humanUpvotes)" -ForegroundColor Green
} else {
    Write-Host "  No project created yet" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=== Heartbeat Complete ===" -ForegroundColor Cyan
Write-Host ""
