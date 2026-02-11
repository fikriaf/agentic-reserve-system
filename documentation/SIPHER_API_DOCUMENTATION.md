# Sipher Privacy Integration - API Documentation

## Overview

This document provides comprehensive API documentation for the Sipher Privacy Integration endpoints in the Agentic Reserve System (ARS). The integration enables shielded ARU transfers, MEV-protected rebalancing, and compliance-friendly selective disclosure.

**Base URL**: `http://localhost:4000/api/privacy` (development)  
**Authentication**: Bearer token (agent authentication)  
**Content-Type**: `application/json`

---

## Phase 1: Shielded ARU Transfers

### Generate Stealth Address

Generate a stealth meta-address for receiving private ARU transfers.

**Endpoint**: `POST /api/privacy/stealth-address`

**Request Body**:
```json
{
  "agentId": "agent-123",
  "label": "trading-wallet"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "agentId": "agent-123",
  "metaAddress": {
    "spendingPublicKey": "5xK7...",
    "viewingPublicKey": "8mP3..."
  },
  "label": "trading-wallet",
  "createdAt": "2026-02-05T10:30:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `500 Internal Server Error`: Server error

---

### Build Shielded Transfer

Build a shielded ARU transfer transaction with hidden recipient and amount.

**Endpoint**: `POST /api/privacy/shielded-transfer`

**Request Body**:
```json
{
  "senderId": "agent-123",
  "recipientMetaAddressId": 1,
  "amount": "1000000",
  "mint": "ARU_MINT_ADDRESS"
}
```

**Response** (200 OK):
```json
{
  "txSignature": "3Kx9...",
  "stealthAddress": "7pL2...",
  "commitment": "0x1a2b3c...",
  "status": "pending",
  "createdAt": "2026-02-05T10:35:00Z"
}
```

---

### Get Detected Payments

Retrieve incoming shielded payments for an agent.

**Endpoint**: `GET /api/privacy/payments/:agentId`

**Parameters**:
- `agentId` (path): Agent identifier

**Response** (200 OK):
```json
{
  "payments": [
    {
      "stealthAddress": "7pL2...",
      "ephemeralPublicKey": "9qR4...",
      "commitment": "0x1a2b3c...",
      "slot": 123456789,
      "timestamp": 1707134400000
    }
  ]
}
```

---

### Claim Payment

Claim a stealth payment to the agent's real wallet.

**Endpoint**: `POST /api/privacy/claim`

**Request Body**:
```json
{
  "stealthAddress": "7pL2...",
  "ephemeralPublicKey": "9qR4...",
  "destinationAddress": "agent-wallet-address",
  "mint": "ARU_MINT_ADDRESS"
}
```

**Response** (200 OK):
```json
{
  "txSignature": "5Yz8...",
  "claimedAt": "2026-02-05T10:40:00Z"
}
```

---

### Get Transaction History

Retrieve shielded transaction history for an agent.

**Endpoint**: `GET /api/privacy/transactions/:agentId`

**Parameters**:
- `agentId` (path): Agent identifier
- `limit` (query, optional): Number of transactions (default: 50)

**Response** (200 OK):
```json
{
  "transactions": [
    {
      "id": 1,
      "txSignature": "3Kx9...",
      "sender": "agent-123",
      "stealthAddress": "7pL2...",
      "commitment": "0x1a2b3c...",
      "status": "claimed",
      "createdAt": "2026-02-05T10:35:00Z",
      "claimedAt": "2026-02-05T10:40:00Z"
    }
  ]
}
```

---

## Phase 2: MEV-Protected Rebalancing

### Create Commitment

Create a Pedersen commitment for hiding swap amounts.

**Endpoint**: `POST /api/privacy/commitment`

**Request Body**:
```json
{
  "value": "1000000"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "commitment": "0x1a2b3c...",
  "value": "1000000",
  "createdAt": "2026-02-05T11:00:00Z"
}
```

---

### Verify Commitment

Verify a Pedersen commitment opening.

**Endpoint**: `POST /api/privacy/commitment/verify`

**Request Body**:
```json
{
  "commitmentId": 1,
  "value": "1000000"
}
```

**Response** (200 OK):
```json
{
  "valid": true
}
```

---

### Add Commitments

Perform homomorphic addition of two commitments.

**Endpoint**: `POST /api/privacy/commitment/add`

**Request Body**:
```json
{
  "commitmentIdA": 1,
  "commitmentIdB": 2
}
```

**Response** (200 OK):
```json
{
  "id": 3,
  "commitment": "0x4d5e6f...",
  "value": "2000000",
  "createdAt": "2026-02-05T11:05:00Z"
}
```

---

### Get Privacy Score

Analyze wallet privacy posture.

**Endpoint**: `GET /api/privacy/score/:address`

**Parameters**:
- `address` (path): Wallet address
- `limit` (query, optional): Transaction limit for analysis (default: 100)

**Response** (200 OK):
```json
{
  "address": "vault-address",
  "score": 75,
  "grade": "C",
  "factors": [
    "High transaction count",
    "Address reuse detected"
  ],
  "recommendations": [
    "Use stealth addresses for future transactions",
    "Consolidate small UTXOs"
  ],
  "analyzedAt": "2026-02-05T11:10:00Z"
}
```

---

### Execute Protected Swap

Execute a MEV-protected swap with stealth destinations and hidden amounts.

**Endpoint**: `POST /api/privacy/protected-swap`

**Request Body**:
```json
{
  "vaultId": "vault-123",
  "inputMint": "SOL",
  "outputMint": "USDC",
  "amount": "1000000",
  "slippageBps": 50
}
```

**Response** (200 OK):
```json
{
  "txSignature": "8Lm4...",
  "mevReduction": 85.5,
  "privacyScore": 78,
  "timestamp": "2026-02-05T11:15:00Z"
}
```

---

### Get MEV Metrics

Retrieve MEV extraction metrics for a vault.

**Endpoint**: `GET /api/privacy/mev-metrics/:vaultId`

**Parameters**:
- `vaultId` (path): Vault identifier

**Response** (200 OK):
```json
{
  "vaultId": "vault-123",
  "mevBeforeIntegration": 1250.50,
  "mevAfterIntegration": 187.58,
  "reductionPercentage": 85.0,
  "privacyScoreTrend": [65, 70, 75, 78]
}
```

---

## Phase 3: Compliance Layer

### Generate Master Viewing Key

Generate a master viewing key for compliance hierarchy.

**Endpoint**: `POST /api/compliance/viewing-key/generate`

**Request Body**:
```json
{
  "path": "m/0"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "keyHash": "hash_master_123",
  "path": "m/0",
  "role": "master",
  "createdAt": "2026-02-05T12:00:00Z"
}
```

---

### Derive Child Viewing Key

Derive a child viewing key from a parent.

**Endpoint**: `POST /api/compliance/viewing-key/derive`

**Request Body**:
```json
{
  "parentId": 1,
  "childPath": "org"
}
```

**Response** (200 OK):
```json
{
  "id": 2,
  "keyHash": "hash_org_456",
  "path": "m/0/org",
  "parentHash": "hash_master_123",
  "role": "regulator",
  "expiresAt": "2027-02-05T12:00:00Z",
  "createdAt": "2026-02-05T12:05:00Z"
}
```

---

### Verify Viewing Key Hierarchy

Verify parent-child viewing key relationship.

**Endpoint**: `POST /api/compliance/viewing-key/verify`

**Request Body**:
```json
{
  "parentId": 1,
  "childId": 2
}
```

**Response** (200 OK):
```json
{
  "valid": true
}
```

---

### Disclose Transaction

Disclose a transaction to an auditor with role-based access.

**Endpoint**: `POST /api/compliance/disclose`

**Request Body**:
```json
{
  "transactionId": 1,
  "auditorId": "auditor-external-001",
  "role": "external"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "transactionId": 1,
  "auditorId": "auditor-external-001",
  "viewingKeyHash": "hash_yearly_789",
  "disclosedFields": ["sender", "recipient", "amount", "timestamp", "txSignature"],
  "expiresAt": "2026-03-07T12:10:00Z",
  "createdAt": "2026-02-05T12:10:00Z"
}
```

---

### Decrypt Disclosure

Decrypt disclosed transaction data with viewing key.

**Endpoint**: `POST /api/compliance/decrypt`

**Request Body**:
```json
{
  "disclosureId": 1,
  "viewingKeyHash": "hash_yearly_789"
}
```

**Response** (200 OK):
```json
{
  "sender": "agent-123",
  "recipient": "7pL2...",
  "amount": "1000000",
  "timestamp": 1707134400000,
  "txSignature": "3Kx9..."
}
```

---

### List Disclosures

List all disclosures for an auditor.

**Endpoint**: `GET /api/compliance/disclosures/:auditorId`

**Parameters**:
- `auditorId` (path): Auditor identifier

**Response** (200 OK):
```json
{
  "disclosures": [
    {
      "id": 1,
      "transactionId": 1,
      "viewingKeyHash": "hash_yearly_789",
      "disclosedFields": ["sender", "recipient", "amount", "timestamp"],
      "expiresAt": "2026-03-07T12:10:00Z",
      "createdAt": "2026-02-05T12:10:00Z"
    }
  ]
}
```

---

### Generate Compliance Report

Generate a compliance report for a date range.

**Endpoint**: `POST /api/compliance/report`

**Request Body**:
```json
{
  "dateRange": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-02-05T23:59:59Z"
  },
  "role": "external",
  "format": "json"
}
```

**Response** (200 OK):
```json
{
  "reportId": "compliance-1707134400-abc123",
  "transactions": 150,
  "compliant": 145,
  "flagged": 5,
  "averageRiskScore": 25.5,
  "filePath": "/reports/compliance-1707134400-abc123.json"
}
```

---

### Approve Master Key Access

Approve master viewing key access with multi-sig.

**Endpoint**: `POST /api/compliance/master-key/approve`

**Request Body**:
```json
{
  "requestId": "master-key-1707134400-xyz789",
  "signer": "signer-001",
  "signature": "0x9a8b7c..."
}
```

**Response** (200 OK):
```json
{
  "requestId": "master-key-1707134400-xyz789",
  "signatures": 3,
  "threshold": 3,
  "status": "approved",
  "approvedAt": "2026-02-05T12:30:00Z"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Sipher API unavailable |

---

## Rate Limiting

- **Default**: 100 requests per minute per agent
- **Burst**: 200 requests per minute
- **Headers**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

---

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <agent_token>
```

Tokens are issued during agent registration and expire after 24 hours.

---

## Webhooks

Subscribe to privacy events:

- `payment.detected`: New shielded payment detected
- `transaction.claimed`: Payment claimed successfully
- `disclosure.created`: Transaction disclosed to auditor
- `disclosure.expired`: Disclosure expired

Configure webhooks in agent settings.

---

## SDK Support

Official SDKs available:
- TypeScript/Node.js: `@ars/privacy-sdk`
- Python: `ars-privacy-py`
- Rust: `ars-privacy-rs`

---

## Support

- Documentation: https://docs.ars-protocol.org/privacy
- API Status: https://status.ars-protocol.org
- Support: privacy-support@ars-protocol.org
