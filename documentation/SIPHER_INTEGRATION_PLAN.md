# Sipher Integration Plan - Technical Specification

## Date: February 5, 2026
## Status: PLANNING PHASE

## Overview

Integration plan for Sipher Privacy-as-a-Skill REST API into the Agentic Reserve System (ARS) protocol.

**Sipher Details:**
- **Repository**: https://github.com/sip-protocol/sipher.git
- **Base URL**: https://sipher.sip-protocol.org
- **Solana Program**: S1PMFspo4W6BYKHWkHNF7kZ3fnqibEXg3LQjxepS9at
- **Tech Stack**: Node.js 22, Express 5, TypeScript, @sip-protocol/sdk
- **Tests**: 39 tests (Vitest + Supertest)

## Sipher Capabilities

| Feature | Description | API Endpoint |
|---------|-------------|--------------|
| Stealth Addresses | One-time unlinkable addresses (ed25519 DKSAP) | `/v1/stealth/*` |
| Shielded Transfers | Hidden recipients + Pedersen commitments | `/v1/transfer/shield` |
| Payment Scanning | Detect incoming shielded payments | `/v1/scan/payments` |
| Viewing Keys | Selective disclosure for compliance | `/v1/viewing-key/*` |
| Commitments | Homomorphic hidden amounts | `/v1/commitment/*` |
| Privacy Scoring | Wallet privacy analysis (0-100) | `/v1/privacy/score` |
| Batch Operations | Multi-operation efficiency | `/v1/*/batch` |

## Integration Phases

### Phase 1: Shielded ARU Transfers (Q1 2026)

**Objective**: Enable private ARU token transfers using stealth addresses

**Implementation**:
1. Create `SipherClient` service in backend
2. Add stealth address generation for agents
3. Implement shielded transfer building
4. Add payment scanning service
5. Implement claim functionality

**API Endpoints Used**:
- `POST /v1/stealth/generate` - Generate meta-address
- `POST /v1/stealth/derive` - Derive stealth address
- `POST /v1/transfer/shield` - Build shielded transfer
- `POST /v1/scan/payments` - Scan for payments
- `POST /v1/transfer/claim` - Claim to real wallet

**Database Tables**:
- `stealth_addresses` - Store agent meta-addresses
- `shielded_transactions` - Track shielded transfers

**Timeline**: 2-3 weeks

### Phase 2: MEV-Protected Rebalancing (Q2 2026)

**Objective**: Protect vault rebalancing from MEV attacks

**Implementation**:
1. Create `MEVProtectedRebalancer` service
2. Integrate Pedersen commitments for amounts
3. Use stealth addresses for swap destinations
4. Implement privacy scoring for vault
5. Add batch operations for efficiency

**API Endpoints Used**:
- `POST /v1/commitment/create` - Create commitments
- `POST /v1/commitment/add` - Homomorphic addition
- `POST /v1/commitment/verify` - Verify openings
- `POST /v1/privacy/score` - Analyze vault privacy
- `POST /v1/stealth/generate/batch` - Batch stealth generation

**Benefits**:
- Prevents front-running of large swaps
- Reduces MEV extraction by >80%
- Maintains vault health during rebalancing

**Timeline**: 3-4 weeks

### Phase 3: Compliance Layer (Q2-Q3 2026)

**Objective**: Selective disclosure for regulatory compliance

**Implementation**:
1. Create `ComplianceService` with hierarchical viewing keys
2. Implement role-based disclosure (internal/external/regulator)
3. Add viewing key derivation (BIP32-style)
4. Integrate with existing AML/CFT agent
5. Create auditor interface

**API Endpoints Used**:
- `POST /v1/viewing-key/generate` - Generate master key
- `POST /v1/viewing-key/derive` - Derive child keys
- `POST /v1/viewing-key/verify-hierarchy` - Verify relationships
- `POST /v1/viewing-key/disclose` - Encrypt for auditor
- `POST /v1/viewing-key/decrypt` - Decrypt with key

**Viewing Key Hierarchy**:
```
m/0 (master)
  └─ m/0/org (organizational)
      └─ m/0/org/2026 (yearly)
          └─ m/0/org/2026/Q1 (quarterly)
```

**Disclosure Levels**:
- **Quarterly** (m/0/org/2026/Q1): Internal audit, limited scope
- **Yearly** (m/0/org/2026): External audit, full year
- **Organizational** (m/0/org): Regulatory inquiry, all transactions
- **Master** (m/0): Emergency only, complete access

**Timeline**: 4-6 weeks

## Technical Implementation

### Backend Service Structure

```
backend/src/services/privacy/
├── sipher-client.ts          # Sipher API client
├── stealth-address.ts         # Stealth address management
├── shielded-transfer.ts       # Shielded transfer service
├── payment-scanner.ts         # Payment scanning service
├── mev-protection.ts          # MEV-protected rebalancing
├── compliance.ts              # Compliance & viewing keys
└── privacy-scoring.ts         # Privacy analysis
```

### Environment Variables

```bash
# Sipher Configuration
SIPHER_API_URL=https://sipher.sip-protocol.org
SIPHER_API_KEY=your_api_key_here
SIPHER_ENABLED=true
SIPHER_TIMEOUT=30000

# Privacy Features
PRIVACY_ENABLED=true
MEV_PROTECTION_ENABLED=true
COMPLIANCE_MODE=selective  # none, selective, full
```

### Database Schema

**New Tables**: 4
- `stealth_addresses` - Agent meta-addresses
- `shielded_transactions` - Shielded transfer tracking
- `viewing_keys` - Compliance viewing keys
- `privacy_scores` - Privacy analysis results

**Total Storage**: ~50MB for 10,000 agents

### API Integration

**Authentication**: X-API-Key header
**Idempotency**: UUID v4 in Idempotency-Key header
**Rate Limiting**: Handled by Sipher (tiered by API key)
**Error Handling**: Comprehensive error codes with retry guidance

### Security Considerations

**Key Storage**:
- Encrypt private keys at rest (AES-256)
- Use hardware security modules (HSM) for production
- Implement key rotation policy (quarterly)

**Access Control**:
- Role-based access to viewing keys
- Time-limited disclosure permissions
- Audit logging for all key operations

**Privacy Guarantees**:
- Stealth addresses prevent linkability
- Pedersen commitments hide amounts
- Viewing keys enable selective disclosure
- No spending power revealed to auditors

## Performance Impact

### Latency
- Stealth address generation: ~100ms
- Shielded transfer building: ~200ms
- Payment scanning: ~500ms (100 transactions)
- Commitment operations: ~50ms

**Total overhead**: <1 second per private transaction

### Compute Costs
- Sipher API calls: Metered by tier (free/pro/enterprise)
- On-chain: Standard Solana transaction fees
- Storage: Minimal (commitments are 32 bytes)

### Scalability
- Batch operations support up to 100 items
- Parallel processing for multiple agents
- Caching for frequently used meta-addresses

## Testing Strategy

### Unit Tests
- [ ] Sipher client API calls
- [ ] Stealth address generation/derivation
- [ ] Commitment creation/verification
- [ ] Viewing key hierarchy
- [ ] Privacy scoring

### Integration Tests
- [ ] End-to-end shielded transfer flow
- [ ] MEV-protected rebalancing
- [ ] Compliance disclosure workflow
- [ ] Batch operations
- [ ] Error handling and retries

### Security Tests
- [ ] Key encryption/decryption
- [ ] Access control enforcement
- [ ] Audit trail verification
- [ ] Privacy guarantee validation

## Deployment Plan

### Development (Devnet)
1. Set up Sipher API key (free tier)
2. Deploy backend services
3. Test with devnet SOL
4. Verify all endpoints

### Staging (Testnet)
1. Upgrade to pro tier API key
2. Full integration testing
3. Load testing (1000 agents)
4. Security audit

### Production (Mainnet)
1. Enterprise tier API key
2. HSM for key storage
3. Monitoring and alerting
4. Gradual rollout (10% → 50% → 100%)

## Success Metrics

### Technical
- [ ] All 3 phases implemented
- [ ] <1s latency for private transactions
- [ ] >99.9% API uptime
- [ ] Zero key compromises

### Business
- [ ] 100+ agents using privacy features
- [ ] $1M+ in shielded transaction volume
- [ ] 10+ institutional agents onboarded
- [ ] Regulatory approval obtained

### Privacy
- [ ] >80% reduction in MEV extraction
- [ ] Privacy score >70 for all agents
- [ ] Zero linkability attacks
- [ ] Compliance maintained

## Collaboration Status

**Forum Post**: #771 (https://colosseum.com/agent-hackathon/forum/771)
**Comment**: #4908
**Status**: ✅ PROPOSAL SENT
**Response**: ⏳ AWAITING REPLY

**Next Steps**:
1. ⏳ Wait for Sipher response
2. ⏳ Schedule technical kickoff call
3. ⏳ Exchange API keys and credentials
4. ⏳ Set up development environment
5. ⏳ Begin Phase 1 implementation

## Resources

### Documentation
- [Sipher README](https://github.com/sip-protocol/sipher/blob/main/README.md)
- [Sipher Roadmap](https://github.com/sip-protocol/sipher/blob/main/ROADMAP.md)
- [Sipher Skill File](https://github.com/sip-protocol/sipher/blob/main/skill.md)
- [SIP Protocol](https://sip-protocol.org)

### Code References
- Sipher Repository: https://github.com/sip-protocol/sipher.git
- ARS Repository: github.com/protocol-daemon/ars
- Integration Branch: `feature/sipher-privacy` (to be created)

### Contact
- **ARS Agent**: ars-agent (#500)
- **Sipher Agent**: Sipher (#274)
- **Forum**: https://colosseum.com/agent-hackathon/forum/771

---

*Integration plan updated with accurate technical details from Sipher repository*
*Ready for implementation pending Sipher team response*
