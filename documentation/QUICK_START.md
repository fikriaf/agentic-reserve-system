# Quick Start - Build & Deploy ARS Protocol

## TL;DR - Fast Track to Deployment

```bash
# 1. Install Anchor 0.29.0
avm install 0.29.0 && avm use 0.29.0

# 2. Build
cargo clean && anchor build

# 3. Deploy to devnet
solana config set --url https://api.devnet.solana.com
solana airdrop 2 && solana airdrop 2
anchor deploy --provider.cluster devnet
```

## What's Ready

✅ **All 3 smart contracts fully implemented** (~3,200 lines of Rust)
- ARS Core: ILI oracle, futarchy governance, circuit breaker
- ARS Reserve: Multi-asset vault, VHR calculation, rebalancing
- ARU Token: Controlled mint/burn with epoch caps

✅ **Configuration files updated to Anchor 0.29.0**
✅ **All development tools installed**
✅ **Documentation complete**

## If Build Fails

### Option 1: Use Docker Verified Build
```bash
solana-verify build
```

### Option 2: Build Each Program Separately
```bash
cargo build-sbf --manifest-path programs/ars-core/Cargo.toml
cargo build-sbf --manifest-path programs/ars-reserve/Cargo.toml
cargo build-sbf --manifest-path programs/ars-token/Cargo.toml
```

## After Successful Deployment

1. ✅ Mark task complete in `.kiro/specs/internet-central-bank/tasks.md`
2. 📝 Document program IDs in README
3. 🧪 Test basic instructions
4. 🚀 Proceed with backend/frontend development

## Need More Details?

- **Full instructions**: See `MANUAL_BUILD_INSTRUCTIONS.md`
- **Build status**: See `BUILD_STATUS.md`
- **Smart contracts summary**: See `SMART_CONTRACTS_SUMMARY.md`
- **Deployment guide**: See `DEPLOYMENT.md`

## Program Structure

```
programs/
├── ars-core/          # Main protocol logic (7 instructions)
│   ├── initialize
│   ├── update_ili
│   ├── query_ili
│   ├── create_proposal
│   ├── vote_on_proposal
│   ├── execute_proposal
│   └── circuit_breaker
├── ars-reserve/       # Vault management (5 instructions)
│   ├── initialize_vault
│   ├── deposit
│   ├── withdraw
│   ├── rebalance
│   └── update_vhr
└── ars-token/         # ARU token (4 instructions)
    ├── initialize_mint
    ├── mint_icu
    ├── burn_icu
    └── start_new_epoch
```

## Expected Build Output

```
target/
├── deploy/
│   ├── ars_core.so
│   ├── ars_core-keypair.json
│   ├── ars_reserve.so
│   ├── ars_reserve-keypair.json
│   ├── ars_token.so
│   └── ars_token-keypair.json
└── idl/
    ├── ars_core.json
    ├── ars_reserve.json
    └── ars_token.json
```

## Verify Deployment

```bash
# Check program on Solana Explorer
# https://explorer.solana.com/?cluster=devnet

# Or use CLI
solana program show <PROGRAM_ID> --url devnet
```

---

**Ready to build!** 🚀 Run the commands above in your WSL terminal.
