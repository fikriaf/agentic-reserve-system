# Sipher Privacy Integration - Operations Guide

## Table of Contents

1. [Deployment Procedures](#deployment-procedures)
2. [Monitoring and Alerting](#monitoring-and-alerting)
3. [Incident Response](#incident-response)
4. [Key Rotation Procedures](#key-rotation-procedures)
5. [Backup and Recovery](#backup-and-recovery)
6. [Performance Tuning](#performance-tuning)

---

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] Sipher API key obtained and configured
- [ ] Protocol master key generated and stored in HSM
- [ ] Database migrations tested in staging
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Monitoring dashboards configured
- [ ] Backup procedures tested
- [ ] Rollback plan documented

### Production Deployment Steps

#### 1. Database Migration

```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Apply migrations
psql $DATABASE_URL < supabase/migrations/010_create_viewing_keys_table.sql
psql $DATABASE_URL < supabase/migrations/011_create_disclosures_table.sql

# Verify migrations
psql $DATABASE_URL -c "SELECT * FROM viewing_keys LIMIT 1;"
psql $DATABASE_URL -c "SELECT * FROM disclosures LIMIT 1;"
```

#### 2. Service Deployment

```bash
# Build backend
cd backend
npm run build

# Deploy with PM2
pm2 start ecosystem.config.js --env production

# Verify services
pm2 status
pm2 logs ars-backend --lines 50
```

#### 3. Health Checks

```bash
# Check API health
curl https://api.ars-protocol.org/health

# Check Sipher API connectivity
curl https://api.ars-protocol.org/api/privacy/health

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check Redis connectivity
redis-cli -u $REDIS_URL ping
```

#### 4. Smoke Tests

```bash
# Test stealth address generation
curl -X POST https://api.ars-protocol.org/api/privacy/stealth-address \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"test-agent","label":"smoke-test"}'

# Test viewing key generation
curl -X POST https://api.ars-protocol.org/api/compliance/viewing-key/generate \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path":"m/0"}'
```

### Rollback Procedure

```bash
# Stop services
pm2 stop ars-backend

# Restore database backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Deploy previous version
git checkout <previous-tag>
npm run build --workspace=backend
pm2 restart ars-backend

# Verify rollback
curl https://api.ars-protocol.org/health
```

---

## Monitoring and Alerting

### Key Metrics

#### Privacy Metrics

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| Privacy Score | < 70 | Warning |
| Privacy Score | < 50 | Critical |
| MEV Reduction | < 80% | Warning |
| MEV Reduction | < 60% | Critical |

#### Performance Metrics

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| API Response Time | > 1s | Warning |
| API Response Time | > 3s | Critical |
| Payment Scan Latency | > 5s | Warning |
| Database Query Time | > 500ms | Warning |

#### Security Metrics

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| Failed Decryption Attempts | > 5/hour | Warning |
| Failed Decryption Attempts | > 20/hour | Critical |
| Unauthorized Access Attempts | > 10/hour | Critical |
| Expired Disclosures | > 100 | Warning |

### Monitoring Dashboard

Configure Grafana dashboards for:

1. **Privacy Overview**:
   - Average privacy score (last 24h)
   - MEV reduction percentage (last 24h)
   - Shielded transactions count
   - Active stealth addresses

2. **Performance**:
   - API request rate
   - API response time (p50, p95, p99)
   - Database connection pool usage
   - Redis cache hit rate

3. **Security**:
   - Failed authentication attempts
   - Disclosure expiration timeline
   - Key rotation status
   - Multi-sig approval requests

### Alert Configuration

#### Prometheus Alerts

```yaml
groups:
  - name: privacy_alerts
    rules:
      - alert: LowPrivacyScore
        expr: privacy_score < 70
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Privacy score below threshold"
          description: "Vault {{ $labels.vault_id }} has privacy score {{ $value }}"

      - alert: HighMEVExtraction
        expr: mev_reduction_percentage < 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "MEV reduction below target"
          description: "MEV reduction is {{ $value }}%, target is 80%"

      - alert: SipherAPIDown
        expr: up{job="sipher-api"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Sipher API is down"
          description: "Cannot reach Sipher API for {{ $value }} minutes"
```

#### PagerDuty Integration

```bash
# Configure PagerDuty webhook
export PAGERDUTY_INTEGRATION_KEY=your_key_here

# Test alert
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "'$PAGERDUTY_INTEGRATION_KEY'",
    "event_action": "trigger",
    "payload": {
      "summary": "Test alert from ARS Privacy",
      "severity": "info",
      "source": "ars-privacy-monitoring"
    }
  }'
```

---

## Incident Response

### Incident Classification

| Severity | Description | Response Time |
|----------|-------------|---------------|
| P1 (Critical) | Service down, data breach | 15 minutes |
| P2 (High) | Degraded performance, security issue | 1 hour |
| P3 (Medium) | Non-critical bug, minor issue | 4 hours |
| P4 (Low) | Enhancement request, documentation | 1 business day |

### Common Incidents

#### Incident 1: Sipher API Unavailable

**Symptoms**:
- 503 errors from privacy endpoints
- Payment scanning failures
- Shielded transfer failures

**Response**:
1. Check Sipher API status: https://status.sipher.sip-protocol.org
2. Verify API key validity
3. Check network connectivity
4. Enable retry logic with exponential backoff
5. Notify users of degraded service
6. Escalate to Sipher support if issue persists > 30 minutes

**Recovery**:
```bash
# Verify Sipher API connectivity
curl -H "X-API-Key: $SIPHER_API_KEY" \
  https://sipher.sip-protocol.org/v1/health

# Restart payment scanner
pm2 restart payment-scanner

# Verify recovery
curl https://api.ars-protocol.org/api/privacy/health
```

#### Incident 2: Key Decryption Failures

**Symptoms**:
- Multiple failed decryption attempts
- "Failed to decrypt viewing key" errors
- Disclosure access failures

**Response**:
1. Check protocol master key configuration
2. Verify HSM connectivity
3. Review encryption service logs
4. Check for key rotation issues
5. Verify database integrity

**Recovery**:
```bash
# Verify protocol master key
echo $PROTOCOL_MASTER_KEY | wc -c  # Should be 64 characters

# Test encryption service
npm run test:encryption --workspace=backend

# Rotate compromised keys if necessary
npm run rotate-keys --workspace=backend
```

#### Incident 3: Privacy Score Degradation

**Symptoms**:
- Privacy scores dropping below 70
- Increased MEV extraction
- Suspicious transaction patterns

**Response**:
1. Analyze privacy score factors
2. Review recent transactions
3. Check for address reuse
4. Verify stealth address generation
5. Implement enhanced protection

**Recovery**:
```bash
# Analyze vault privacy
curl https://api.ars-protocol.org/api/privacy/score/VAULT_ADDRESS

# Generate new stealth addresses
curl -X POST https://api.ars-protocol.org/api/privacy/stealth-address \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"agentId":"vault-agent","label":"recovery"}'

# Force protected swap
curl -X POST https://api.ars-protocol.org/api/privacy/protected-swap \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"vaultId":"vault-123","inputMint":"SOL","outputMint":"USDC","amount":"1000000"}'
```

---

## Key Rotation Procedures

### Quarterly Viewing Key Rotation

**Schedule**: Every 90 days (automated)

**Procedure**:
1. Generate new viewing keys for all roles
2. Update disclosure mappings
3. Revoke old viewing keys
4. Notify auditors of new keys
5. Update documentation

**Script**:
```bash
#!/bin/bash
# rotate-viewing-keys.sh

echo "Starting viewing key rotation..."

# Get all active viewing keys
KEYS=$(psql $DATABASE_URL -t -c "SELECT id FROM viewing_keys WHERE revoked_at IS NULL;")

# Rotate each key
for KEY_ID in $KEYS; do
  echo "Rotating key $KEY_ID..."
  curl -X POST https://api.ars-protocol.org/api/compliance/viewing-key/rotate \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"keyId\":$KEY_ID}"
done

echo "Viewing key rotation complete"
```

### Protocol Master Key Rotation

**Schedule**: Annually or on security incident

**Procedure**:
1. Generate new protocol master key in HSM
2. Re-encrypt all viewing keys with new master key
3. Update environment configuration
4. Restart all services
5. Verify all decryption operations
6. Securely destroy old master key

**Script**:
```bash
#!/bin/bash
# rotate-protocol-master-key.sh

echo "WARNING: This will rotate the protocol master key"
echo "All services will be restarted"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted"
  exit 1
fi

# Generate new master key (in production, use HSM)
NEW_MASTER_KEY=$(openssl rand -hex 32)

# Re-encrypt all viewing keys
npm run reencrypt-keys --workspace=backend -- --new-key=$NEW_MASTER_KEY

# Update environment
echo "PROTOCOL_MASTER_KEY=$NEW_MASTER_KEY" >> .env.production

# Restart services
pm2 restart all

# Verify
curl https://api.ars-protocol.org/health

echo "Protocol master key rotation complete"
```

---

## Backup and Recovery

### Database Backup

**Schedule**: Daily at 2:00 AM UTC

**Procedure**:
```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backups/ars-privacy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ars_privacy_$TIMESTAMP.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE.gz s3://ars-backups/privacy/

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Database backup complete: $BACKUP_FILE.gz"
```

### Key Backup

**Schedule**: After each key generation/rotation

**Procedure**:
```bash
#!/bin/bash
# backup-keys.sh

BACKUP_DIR="/secure/key-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Export viewing keys (encrypted)
psql $DATABASE_URL -c "COPY (SELECT * FROM viewing_keys) TO STDOUT" \
  | gpg --encrypt --recipient ops@ars-protocol.org \
  > $BACKUP_DIR/viewing_keys_$TIMESTAMP.gpg

# Export stealth addresses (encrypted)
psql $DATABASE_URL -c "COPY (SELECT * FROM stealth_addresses) TO STDOUT" \
  | gpg --encrypt --recipient ops@ars-protocol.org \
  > $BACKUP_DIR/stealth_addresses_$TIMESTAMP.gpg

echo "Key backup complete"
```

### Disaster Recovery

**RTO (Recovery Time Objective)**: 4 hours  
**RPO (Recovery Point Objective)**: 24 hours

**Procedure**:
1. Provision new infrastructure
2. Restore database from latest backup
3. Restore key backups
4. Configure environment variables
5. Deploy services
6. Verify all functionality
7. Update DNS records
8. Monitor for issues

---

## Performance Tuning

### Database Optimization

```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_shielded_tx_created 
  ON shielded_transactions(created_at DESC);

CREATE INDEX CONCURRENTLY idx_disclosures_auditor_expires 
  ON disclosures(auditor_id, expires_at);

-- Analyze tables
ANALYZE stealth_addresses;
ANALYZE shielded_transactions;
ANALYZE viewing_keys;
ANALYZE disclosures;

-- Vacuum tables
VACUUM ANALYZE stealth_addresses;
VACUUM ANALYZE shielded_transactions;
```

### Redis Caching

```typescript
// Cache privacy scores
const cacheKey = `privacy:score:${address}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const score = await analyzePrivacy(address);
await redis.setex(cacheKey, 300, JSON.stringify(score)); // 5 min TTL

return score;
```

### Connection Pooling

```typescript
// Configure Supabase connection pool
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    db: {
      pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      }
    }
  }
);
```

---

## Maintenance Windows

### Scheduled Maintenance

**Schedule**: First Sunday of each month, 2:00-4:00 AM UTC

**Activities**:
- Database maintenance (VACUUM, ANALYZE)
- Key rotation (if due)
- Security patches
- Performance optimization
- Log rotation

**Notification**:
```bash
# Send maintenance notification
curl -X POST https://api.ars-protocol.org/api/notifications \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "type": "maintenance",
    "message": "Scheduled maintenance: Sunday 2:00-4:00 AM UTC",
    "recipients": ["all-agents"]
  }'
```

---

## Support Contacts

- **On-Call Engineer**: oncall@ars-protocol.org
- **Security Team**: security@ars-protocol.org
- **Sipher Support**: support@sip-protocol.org
- **PagerDuty**: https://ars-protocol.pagerduty.com

---

## Runbooks

### Runbook 1: Service Restart

```bash
# Stop services
pm2 stop ars-backend payment-scanner

# Clear Redis cache
redis-cli -u $REDIS_URL FLUSHDB

# Restart services
pm2 start ars-backend payment-scanner

# Verify
pm2 status
curl https://api.ars-protocol.org/health
```

### Runbook 2: Emergency Key Revocation

```bash
# Revoke compromised viewing key
curl -X POST https://api.ars-protocol.org/api/compliance/viewing-key/revoke \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"keyId":COMPROMISED_KEY_ID}'

# Revoke all related disclosures
psql $DATABASE_URL -c "
  UPDATE disclosures 
  SET revoked_at = NOW() 
  WHERE viewing_key_hash = 'COMPROMISED_KEY_HASH';
"

# Notify affected auditors
npm run notify-auditors --workspace=backend -- --key-id=COMPROMISED_KEY_ID

# Generate incident report
npm run generate-incident-report --workspace=backend
```

### Runbook 3: Performance Degradation

```bash
# Check system resources
top
df -h
free -m

# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql $DATABASE_URL -c "
  SELECT query, calls, total_time, mean_time 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;
"

# Restart services if necessary
pm2 restart all

# Monitor recovery
watch -n 5 'curl -s https://api.ars-protocol.org/health | jq'
```

---

## Compliance

### Audit Trail

All operations are logged for compliance:

```sql
-- View audit trail
SELECT * FROM audit_log 
WHERE event_type IN ('disclosure_created', 'key_rotated', 'key_revoked')
ORDER BY timestamp DESC 
LIMIT 100;
```

### Compliance Reports

Generate monthly compliance reports:

```bash
# Generate report for last month
npm run generate-compliance-report --workspace=backend -- \
  --start=$(date -d "last month" +%Y-%m-01) \
  --end=$(date -d "last month" +%Y-%m-31) \
  --format=pdf
```

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-05 | 1.0.0 | Initial operations guide |

