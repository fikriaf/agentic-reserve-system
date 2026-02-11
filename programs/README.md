# ICB Protocol - Smart Contracts

This directory contains the three Anchor programs that make up the Internet Central Bank (ICB) protocol.

## Programs

### 1. ICB Core (`icb-core`)

**Program ID:** `9H91snZVEiEZkKFNs2NC7spJG3ieJtF2oeu6SwSnvy4S`

Main protocol logic for ILI calculation, futarchy governance, and policy execution.

**Key Features:**
- ILI oracle management
- Futarchy proposal creation and voting
- Policy execution with slashing
- Circuit breaker controls
- Agent registry

**Instructions:**
- `initialize` - Initialize the protocol
- `update_ili` - Update ILI oracle value
- `query_ili` - Query current ILI
- `create_proposal` - Create futarchy proposal
- `vote_on_proposal` - Vote on proposal
- `execute_proposal` - Execute approved proposal
- `activate_circuit_breaker` - Toggle circuit breaker

**Accounts:**
- `GlobalState` - Protocol configuration
- `ILIOracle` - Current ILI and history
- `PolicyProposal` - Futarchy proposals
- `VoteRecord` - Agent votes
- `AgentRegistry` - Agent metadata

### 2. ICB Reserve (`icb-reserve`)

**Program ID:** `gaN527TnpTBtPQVdZvVeuzKrwdV2HiarZAX8H6jTAVL`

Multi-asset reserve vault management with algorithmic rebalancing.

**Key Features:**
- Multi-asset vault (USDC, SOL, mSOL)
- VHR (Vault Health Ratio) calculation
- Automated rebalancing
- Deposit/withdraw operations

**Instructions:**
- `initialize_vault` - Initialize reserve vault
- `deposit` - Deposit assets
- `withdraw` - Withdraw assets
- `update_vhr` - Calculate and update VHR
- `rebalance` - Trigger rebalancing

**Accounts:**
- `ReserveVault` - Vault state and composition
- `AssetConfig` - Per-asset configuration

### 3. ICU Token (`icb-token`)

**Program ID:** `3KGdConvEfZnGdtAtcKDfozVDPM97gf5WkX9m1Z73i4A`

SPL token with controlled mint/burn authority and epoch-based caps.

**Key Features:**
- Controlled mint/burn (±2% per epoch)
- Stability fee collection (0.1%)
- Circuit breaker integration
- Event emission for transparency

**Instructions:**
- `initialize_mint` - Initialize ICU token
- `mint_icu` - Mint tokens (with cap check)
- `burn_icu` - Burn tokens (with cap check)
- `start_new_epoch` - Start new epoch

**Accounts:**
- `TokenState` - Token configuration and epoch tracking

**Events:**
- `MintBurnEvent` - Emitted on mint/burn with reasoning hash

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ICB Core Program                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ ILI Oracle   │  │  Futarchy    │  │   Circuit    │ │
│  │  Management  │  │  Governance  │  │   Breaker    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           │ CPI Calls
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
        ▼                                      ▼
┌──────────────────┐                  ┌──────────────────┐
│ ICB Reserve      │                  │  ICU Token       │
│   Program        │                  │   Program        │
│                  │                  │                  │
│ • Vault Mgmt     │                  │ • Mint/Burn      │
│ • VHR Calc       │                  │ • Epoch Caps     │
│ • Rebalancing    │                  │ • Stability Fee  │
└──────────────────┘                  └──────────────────┘
```

## Building

Build all programs:
```bash
anchor build
```

Build specific program:
```bash
anchor build --program-name icb-core
```

## Testing

Run all tests:
```bash
anchor test
```

Run specific program tests:
```bash
anchor test --program-name icb-core
```

## Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed deployment instructions.

Quick deploy to devnet:
```bash
anchor deploy --provider.cluster devnet
```

## Security Considerations

### Access Control
- All state-changing operations require authority signature
- Circuit breaker can pause critical operations
- Multi-sig recommended for mainnet deployment

### Input Validation
- All numeric inputs are bounds-checked
- Overflow/underflow protection via checked arithmetic
- Signature verification on agent operations

### Circuit Breakers
- Automatic pause when VHR < 150%
- Manual pause by authority
- Prevents minting when active

### Oracle Security
- Multi-source aggregation (Pyth, Switchboard, Birdeye)
- Outlier detection
- Staleness checks

## Gas Optimization

### Compute Units
- ILI update: ~10,000 CU
- Create proposal: ~15,000 CU
- Vote on proposal: ~12,000 CU
- Execute proposal: ~20,000 CU
- Mint/burn: ~8,000 CU

### Account Size Optimization
- Compact data structures
- Limited historical snapshots
- Efficient PDA derivation

## Upgradeability

Programs are upgradeable via Anchor's upgrade mechanism:

```bash
anchor upgrade target/deploy/icb_core.so \
  --program-id 9H91snZVEiEZkKFNs2NC7spJG3ieJtF2oeu6SwSnvy4S \
  --provider.cluster devnet
```

**Mainnet Recommendation:** Transfer upgrade authority to multi-sig or make immutable.

## Monitoring

### On-Chain Events
- `MintBurnEvent` - Token supply changes
- Proposal state changes
- VHR updates
- Rebalancing events

### Recommended Monitoring
- ILI update frequency
- Proposal success rate
- VHR health
- Circuit breaker activations
- Mint/burn cap utilization

## Contributing

When modifying programs:

1. Update account structures in `state.rs`
2. Add new instructions in `instructions/`
3. Update error codes in `errors.rs`
4. Add tests in `tests/`
5. Update IDL and TypeScript types
6. Document changes in this README

## License

See [LICENSE](../LICENSE) for details.
