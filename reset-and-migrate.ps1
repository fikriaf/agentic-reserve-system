# Reset and Migrate Database Script
# This script automates the database reset and migration process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ARS Database Reset & Migration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

# Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "✗ docker-compose.yml not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Start Supabase containers
Write-Host ""
Write-Host "Starting Supabase containers..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "Waiting 15 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check if containers are running
Write-Host ""
Write-Host "Checking container status..." -ForegroundColor Yellow
$containers = docker-compose ps --services
if ($containers) {
    Write-Host "✓ Containers are running:" -ForegroundColor Green
    docker-compose ps --format table
} else {
    Write-Host "✗ Containers failed to start!" -ForegroundColor Red
    exit 1
}

# Find database container name
Write-Host ""
Write-Host "Finding database container..." -ForegroundColor Yellow
$dbContainer = docker ps --filter "name=db" --format "{{.Names}}" | Select-Object -First 1

if (-not $dbContainer) {
    Write-Host "✗ Database container not found!" -ForegroundColor Red
    Write-Host "Available containers:" -ForegroundColor Yellow
    docker ps --format "{{.Names}}"
    exit 1
}

Write-Host "✓ Found database container: $dbContainer" -ForegroundColor Green

# Ask for confirmation
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "WARNING: This will DELETE ALL DATA!" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
$confirmation = Read-Host "Do you want to continue? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit 0
}

# Reset database
Write-Host ""
Write-Host "Resetting database..." -ForegroundColor Yellow

$resetSQL = @"
-- Drop all existing schemas
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS storage CASCADE;
DROP SCHEMA IF EXISTS realtime CASCADE;

-- Recreate public schema
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Success message
SELECT 'Database reset complete!' as status;
"@

# Execute reset SQL
$resetSQL | docker exec -i $dbContainer psql -U postgres -d postgres

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database reset successful!" -ForegroundColor Green
} else {
    Write-Host "✗ Database reset failed!" -ForegroundColor Red
    exit 1
}

# Backup old init.sql if exists
if (Test-Path "supabase/init.sql") {
    Write-Host ""
    Write-Host "Backing up old init.sql..." -ForegroundColor Yellow
    Move-Item "supabase/init.sql" "supabase/init.sql.old" -Force
    Write-Host "✓ Backed up to init.sql.old" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database reset complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open Supabase Studio: http://localhost:8000" -ForegroundColor White
Write-Host "2. Go to SQL Editor" -ForegroundColor White
Write-Host "3. Run migration 001: supabase/migrations/001_create_base_tables.sql" -ForegroundColor White
Write-Host "4. Run migration 002: supabase/migrations/002_add_revenue_and_staking.sql" -ForegroundColor White
Write-Host ""
Write-Host "Or use the manual method described in QUICK_START_DATABASE.md" -ForegroundColor White
Write-Host ""

# Ask if user wants to open Supabase Studio
$openBrowser = Read-Host "Open Supabase Studio in browser? (yes/no)"
if ($openBrowser -eq "yes") {
    Start-Process "http://localhost:8000"
}

Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
