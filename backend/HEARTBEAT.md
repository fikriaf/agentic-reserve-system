---
name: ars-backend
version: 1.0.0
description: Official heartbeat for the ARS Backend API Agent Use.
homepage: https://ars-backend-production.up.railway.app
---

# ARS Backend Agent Heartbeat

This file defines how an agent should report liveness and state when asked for a heartbeat.

## When to Respond

Send a heartbeat when:
- Your supervisor pings you.
- A monitoring service requests status.
- You have not performed any API requests for more than 5 minutes.
- After deployment or configuration changes.

## Required Fields

Reply with a compact JSON object:

```json
{
  "status": "ok",
  "agentName": "ars-backend-api",
  "time": "2026-02-11T05:30:00Z",
  "version": "1.0.0",
  "capabilities": [
    "ili-calculation",
    "icr-calculation",
    "reserve-management",
    "revenue-tracking",
    "governance-proposals",
    "metrics-collection"
  ],
  "lastAction": "processed ILI calculation",
  "nextAction": "waiting for next cron job"
}
```

## Status Values

- `ok`: healthy and ready, all core endpoints operational.
- `degraded`: temporary issues (external API slow, cache miss, partial outage).
- `blocked`: cannot proceed (database down, auth failed, missing config).

## Capabilities

The agent supports these operations:

- `ili-calculation`: Calculate Internet Liquidity Index from Kamino SDK
- `icr-calculation`: Calculate Internet Credit Rate from lending protocols
- `reserve-management`: Track and manage reserve vault state
- `revenue-tracking`: Monitor and report protocol revenue
- `governance-proposals`: Manage and track governance proposals
- `metrics-collection`: Collect and expose Prometheus metrics

## Health Check Endpoints

Primary health check:
```bash
GET https://ars-backend-production.up.railway.app/health
```

Extended health check with dependencies:
```bash
GET https://ars-backend-production.up.railway.app/api/v1/health
```

## Data Sources

The agent integrates with:
- **Kamino SDK**: Real on-chain data ($1.53B TVL, 55 reserves)
- **Jupiter API**: Real-time token prices (SOL $84.02)
- **Meteora API**: Pool data (1,245 pools, $218M TVL)
- **Supabase**: PostgreSQL database
- **Upstash Redis**: Cache layer

## Notes

- Do not include private API keys or database credentials in heartbeat responses.
- If status is `blocked`, include a brief reason in `lastAction`.
- If status is `degraded`, specify which capability is affected.
- Always include timestamp in ISO 8601 format.

## Example Responses

### Healthy State
```json
{
  "status": "ok",
  "agentName": "ars-backend-api",
  "time": "2026-02-11T05:30:00Z",
  "version": "1.0.0",
  "capabilities": ["ili-calculation", "icr-calculation", "reserve-management", "revenue-tracking", "governance-proposals", "metrics-collection"],
  "lastAction": "processed ILI calculation with TVL $1.51B",
  "nextAction": "waiting for next cron job in 4 minutes"
}
```

### Degraded State
```json
{
  "status": "degraded",
  "agentName": "ars-backend-api",
  "time": "2026-02-11T05:30:00Z",
  "version": "1.0.0",
  "capabilities": ["ili-calculation", "reserve-management", "revenue-tracking", "governance-proposals", "metrics-collection"],
  "lastAction": "ICR endpoint unavailable (404)",
  "nextAction": "retrying ICR calculation in 1 minute",
  "degradedCapabilities": ["icr-calculation"]
}
```

### Blocked State
```json
{
  "status": "blocked",
  "agentName": "ars-backend-api",
  "time": "2026-02-11T05:30:00Z",
  "version": "1.0.0",
  "capabilities": [],
  "lastAction": "database connection failed: ECONNREFUSED",
  "nextAction": "waiting for database to be available",
  "blockReason": "Supabase connection timeout"
}
```

## Monitoring Integration

This heartbeat format is compatible with:
- Railway health checks
- Prometheus monitoring
- Custom monitoring dashboards
- Agent orchestration systems

## Update Frequency

Heartbeat should be sent:
- Every 5 minutes during normal operation
- Every 30 seconds during degraded state
- Immediately after status change
- On supervisor request
