# Sipher Privacy Integration - Developer Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Interfaces](#component-interfaces)
3. [Database Schema](#database-schema)
4. [Code Examples](#code-examples)
5. [Testing Guide](#testing-guide)
6. [Deployment](#deployment)

---

## Architecture Overview

The Sipher Privacy Integration consists of three phases:

### Phase 1: Shielded ARU Transfers
- **Stealth Address Manager**: Generates and manages stealth meta-addresses
- **Shielded Transfer Builder**: Builds shielded transfer transactions
- **Payment Scanner Service**: Scans for incoming shielded payments
- **Encryption Service**: Encrypts private keys at rest

### Phase 2: MEV-Protected Rebalancing
- **Commitment Manager**: Creates and verifies Pedersen commitments
- **Privacy Score Analyzer**: Analyzes wallet privacy posture
- **MEV Protection Service**: Executes protected swaps with stealth destinations

### Phase 3: Compliance Layer
- **Viewing Key Manager**: Manages hierarchical viewing keys (BIP32-style)
- **Disclosure Service**: Encrypts/decrypts transaction data for auditors
- **Compliance Service**: Manages role-based disclosure and compliance reports
- **Multi-Sig Service**: Enforces multi-signature approval for master keys
- **AML Service**: Performs AML/CFT compliance checks

---

## Component Interfaces

### Sipher API Client

```typescript
import { SipherClient } from './services/privacy/sipher-client';

const client = new SipherClient({
  baseUrl: 'https://sipher.sip-protocol.org',
  apiKey: process.env.SIPHER_API_KEY,
  timeout: 30000,
  retries: 3
});

// Generate stealth meta-address
const metaAddress = await client.generateMetaAddress('agent-wallet');

// Build shielded transfer
const transfer = await client.buildShieldedTransfer({
  sender: 'agent-123',
  recipientMetaAddress: metaAddress,
  amount: '1000000',
  mint: 'ARU_MINT_ADDRESS'
});
```

### Stealth Address Manager

```typescript
import { StealthAddressManager } from './services/privacy/stealth';

const manager = new StealthAddressManager(
  sipherClient,
  database,
  encryptionService
);

// Generate stealth address for agent
const stealthAddress = await manager.generateForAgent(
  'agent-123',
  'trading-wallet'
);

// Derive one-time stealth address
const oneTimeAddress = await manager.deriveStealthAddress(
  stealthAddress.id
);
```

### Viewing Key Manager

```typescript
import { ViewingKeyManager } from './services/privacy/viewing-key-manager';

const viewingKeyManager = new ViewingKeyManager(
  sipherClient,
  database,
  encryptionService,
  protocolMasterKey
);

// Generate master viewing key
const master = await viewingKeyManager.generateMaster('m/0');

// Derive organizational key
const org = await viewingKeyManager.derive(master.id, 'org');

// Verify hierarchy
const isValid = await viewingKeyManager.verifyHierarchy(
  master.id,
  org.id
);
```

### Compliance Service

```typescript
import { ComplianceService } from './services/privacy/compliance-service';

const complianceService = new ComplianceService(
  sipherClient,
  viewingKeyManager,
  disclosureService,
  database,
  amlService
);

// Setup viewing key hierarchy
const hierarchy = await complianceService.setupHierarchy();

// Disclose transaction to auditor
const disclosure = await complianceService.discloseToAuditor(
  transactionId,
  'auditor-external-001',
  'external'
);

// Generate compliance report
const report = await complianceService.generateReport(
  {
    start: new Date('2026-01-01'),
    end: new Date('2026-02-05')
  },
  'external'
);
```

---

## Database Schema

### Stealth Addresses

```sql
CREATE TABLE stealth_addresses (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  meta_address JSONB NOT NULL,
  encrypted_spending_key TEXT NOT NULL,
  encrypted_viewing_key TEXT NOT NULL,
  label VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Shielded Transactions

```sql
CREATE TABLE shielded_transactions (
  id SERIAL PRIMARY KEY,
  tx_signature VARCHAR(255) UNIQUE NOT NULL,
  sender VARCHAR(255) NOT NULL,
  stealth_address VARCHAR(255) NOT NULL,
  ephemeral_public_key VARCHAR(255) NOT NULL,
  commitment TEXT NOT NULL,
  amount_encrypted TEXT NOT NULL,
  viewing_key_hash VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  claimed_at TIMESTAMP
);
```

### Viewing Keys

```sql
CREATE TABLE viewing_keys (
  id SERIAL PRIMARY KEY,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  encrypted_key TEXT NOT NULL,
  path VARCHAR(255) NOT NULL,
  parent_hash VARCHAR(255),
  role VARCHAR(50),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  FOREIGN KEY (parent_hash) REFERENCES viewing_keys(key_hash)
);
```

### Disclosures

```sql
CREATE TABLE disclosures (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL,
  auditor_id VARCHAR(255) NOT NULL,
  viewing_key_hash VARCHAR(255) NOT NULL,
  encrypted_data TEXT NOT NULL,
  disclosed_fields JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES shielded_transactions(id),
  FOREIGN KEY (viewing_key_hash) REFERENCES viewing_keys(key_hash)
);
```

---

## Code Examples

### Example 1: Shielded Transfer Workflow

```typescript
import {
  initializeSipherClient,
  initializeStealthAddressManager,
  initializeShieldedTransferBuilder
} from './services/privacy';

// Initialize services
const sipherClient = initializeSipherClient({
  baseUrl: process.env.SIPHER_API_URL,
  apiKey: process.env.SIPHER_API_KEY
});

const stealthManager = initializeStealthAddressManager(
  sipherClient,
  database,
  encryptionService
);

const transferBuilder = initializeShieldedTransferBuilder(
  sipherClient,
  stealthManager,
  database,
  solanaClient
);

// Generate recipient meta-address
const recipientMeta = await stealthManager.generateForAgent(
  'recipient-agent',
  'receiving-wallet'
);

// Build shielded transfer
const { transaction, record } = await transferBuilder.buildTransfer({
  senderId: 'sender-agent',
  recipientMetaAddressId: recipientMeta.id,
  amount: '1000000',
  mint: 'ARU_MINT_ADDRESS'
});

// Submit transaction
const txSignature = await transferBuilder.submitTransfer(
  transaction,
  record
);

console.log(`Shielded transfer submitted: ${txSignature}`);
```

### Example 2: MEV-Protected Swap

```typescript
import {
  initializeMEVProtectionService,
  initializePrivacyScoreAnalyzer
} from './services/privacy';

// Initialize services
const mevProtection = initializeMEVProtectionService(
  sipherClient,
  commitmentManager,
  stealthManager,
  jupiterClient,
  database
);

// Analyze vault privacy
const privacyScore = await mevProtection.analyzeVaultPrivacy(
  'vault-address'
);

console.log(`Privacy score: ${privacyScore.score} (${privacyScore.grade})`);

// Execute protected swap if score is sufficient
if (privacyScore.score >= 70) {
  const result = await mevProtection.executeProtectedSwap(
    'vault-123',
    {
      inputMint: 'SOL',
      outputMint: 'USDC',
      amount: '1000000',
      slippageBps: 50
    }
  );

  console.log(`Protected swap executed: ${result.txSignature}`);
  console.log(`MEV reduction: ${result.metrics.reductionPercentage}%`);
}
```

### Example 3: Compliance Disclosure

```typescript
import {
  initializeComplianceService,
  initializeViewingKeyManager,
  initializeDisclosureService
} from './services/privacy';

// Initialize services
const viewingKeyManager = initializeViewingKeyManager(
  sipherClient,
  database,
  encryptionService,
  protocolMasterKey
);

const disclosureService = initializeDisclosureService(
  sipherClient,
  database
);

const complianceService = initializeComplianceService(
  sipherClient,
  viewingKeyManager,
  disclosureService,
  database,
  amlService
);

// Setup viewing key hierarchy (one-time)
const hierarchy = await complianceService.setupHierarchy();

// Disclose transaction to external auditor
const disclosure = await complianceService.discloseToAuditor(
  transactionId,
  'auditor-external-001',
  'external'
);

console.log(`Transaction disclosed to auditor`);
console.log(`Expires at: ${disclosure.expiresAt}`);
console.log(`Disclosed fields: ${disclosure.disclosedFields.join(', ')}`);
```

---

## Testing Guide

### Unit Tests

Run unit tests with Vitest:

```bash
npm run test --workspace=backend
```

### Property-Based Tests

Property tests use fast-check for 100+ iterations:

```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Property: Homomorphic Commitment Addition', () => {
  it('should satisfy C(a) + C(b) = C(a+b)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        async (a, b) => {
          const commitmentA = await manager.create(a.toString());
          const commitmentB = await manager.create(b.toString());
          const commitmentSum = await manager.add(
            commitmentA.id,
            commitmentB.id
          );
          
          const valid = await manager.verify(
            commitmentSum.id,
            (a + b).toString()
          );
          
          expect(valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

End-to-end integration tests:

```typescript
describe('E2E: Shielded Transfer Workflow', () => {
  it('should complete full workflow', async () => {
    // Generate meta-address
    const recipientMeta = await stealthManager.generateForAgent(
      'recipient',
      'test'
    );

    // Build transfer
    const { transaction, record } = await transferBuilder.buildTransfer({
      senderId: 'sender',
      recipientMetaAddressId: recipientMeta.id,
      amount: '1000000'
    });

    // Submit transaction
    const txSignature = await transferBuilder.submitTransfer(
      transaction,
      record
    );

    // Scan for payment
    const payments = await paymentScanner.scanForAgent('recipient');
    expect(payments.length).toBeGreaterThan(0);

    // Claim payment
    const claimTx = await transferBuilder.claimPayment({
      stealthAddress: payments[0].stealthAddress,
      ephemeralPublicKey: payments[0].ephemeralPublicKey,
      destinationAddress: 'recipient-wallet'
    });

    expect(claimTx).toBeDefined();
  });
});
```

---

## Deployment

### Environment Variables

```bash
# Sipher API Configuration
SIPHER_API_URL=https://sipher.sip-protocol.org
SIPHER_API_KEY=your_api_key_here
SIPHER_ENABLED=true
SIPHER_TIMEOUT=30000

# Privacy Features
PRIVACY_ENABLED=true
MEV_PROTECTION_ENABLED=true
COMPLIANCE_MODE=selective

# Privacy Thresholds
PRIVACY_SCORE_THRESHOLD=70
MEV_REDUCTION_TARGET=80

# Key Management
KEY_ROTATION_DAYS=90
VIEWING_KEY_EXPIRATION_DAYS=30
MASTER_KEY_MULTISIG_THRESHOLD=3
PROTOCOL_MASTER_KEY=your_protocol_master_key

# Scanning Configuration
PAYMENT_SCAN_INTERVAL_SECONDS=60
PAYMENT_SCAN_BATCH_SIZE=100
PAYMENT_SCAN_RETRY_ATTEMPTS=3

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ars
REDIS_URL=redis://localhost:6379

# Encryption
ENCRYPTION_ALGORITHM=aes-256-gcm
ENCRYPTION_KEY_DERIVATION=pbkdf2
ENCRYPTION_ITERATIONS=100000
```

### Database Migrations

Apply migrations:

```bash
# Local development
supabase db push

# Production
psql $DATABASE_URL < supabase/migrations/010_create_viewing_keys_table.sql
psql $DATABASE_URL < supabase/migrations/011_create_disclosures_table.sql
```

### Service Initialization

```typescript
// backend/src/index.ts

import { initializePrivacyServices } from './services/privacy';

async function startServer() {
  // Initialize privacy services
  const privacyServices = await initializePrivacyServices({
    sipherApiUrl: process.env.SIPHER_API_URL,
    sipherApiKey: process.env.SIPHER_API_KEY,
    database: supabaseClient,
    protocolMasterKey: process.env.PROTOCOL_MASTER_KEY
  });

  // Start payment scanner
  await privacyServices.paymentScanner.start({
    intervalSeconds: 60,
    batchSize: 100,
    retryAttempts: 3
  });

  // Start API server
  app.listen(4000, () => {
    console.log('ARS API server running on port 4000');
  });
}

startServer();
```

---

## Best Practices

### Security

1. **Key Management**:
   - Use HSM for protocol master key in production
   - Rotate viewing keys quarterly
   - Encrypt all private keys at rest with AES-256-GCM

2. **Multi-Sig**:
   - Require M >= 3 signatures for master key access
   - Store signatures in secure audit log
   - Implement signature verification with ed25519

3. **Expiration**:
   - Set disclosure expiration to 30 days (default)
   - Implement automatic cleanup of expired disclosures
   - Alert auditors before expiration

### Performance

1. **Caching**:
   - Cache privacy scores in Redis (TTL: 5 minutes)
   - Cache viewing keys for active sessions
   - Batch commitment operations

2. **Database**:
   - Use indexes on frequently queried fields
   - Implement connection pooling
   - Archive old transactions periodically

3. **API**:
   - Implement rate limiting (100 req/min)
   - Use exponential backoff for retries
   - Monitor Sipher API health

### Monitoring

1. **Metrics**:
   - Track privacy score trends
   - Monitor MEV reduction percentage
   - Alert on scores below threshold

2. **Logging**:
   - Log all disclosure events
   - Log all key operations
   - Log all compliance checks

3. **Alerts**:
   - Alert on repeated decryption failures
   - Alert on unauthorized access attempts
   - Alert on Sipher API downtime

---

## Support

- **Documentation**: https://docs.ars-protocol.org/privacy
- **GitHub**: https://github.com/ars-protocol/ars-protocol
- **Discord**: https://discord.gg/ars-protocol
- **Email**: dev-support@ars-protocol.org
