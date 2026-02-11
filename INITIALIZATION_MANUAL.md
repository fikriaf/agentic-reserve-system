# Manual Smart Contract Initialization

Programs sudah deployed tapi belum initialized. Perlu manual initialization karena IDL files tidak tersedia.

## Deployed Program IDs

```
ars_core: 9JhnkugG8q9QG9LedUs2F93H9xJ9zSHcn5Zfm1uzF624
ars_reserve: 6ojet9MMHSZiXoZ3w4AM72EKzFe7cMgw2toCrtmBjEER
ars_token: 8Eh2foHjxgoHcQ69HPvGGijiLCXzncnB6bpTrRp94VoG
```

## Option 1: Build dengan IDL (Recommended)

```bash
# Di WSL2
cd /mnt/d/script/Agentic/agentic-reserve-system
anchor build

# Setelah build selesai, jalankan initialization script
npm run initialize
```

## Option 2: Manual Initialization via Anchor CLI

### Step 1: Initialize ars-core

```bash
anchor run initialize-core -- \
  --epoch-duration 86400 \
  --mint-burn-cap-bps 500 \
  --stability-fee-bps 50 \
  --vhr-threshold 15000
```

### Step 2: Create ARU Token Mint

```bash
spl-token create-token --decimals 9
# Save mint address
```

### Step 3: Initialize ars-token

```bash
anchor run initialize-token -- \
  --mint <ARU_MINT_ADDRESS> \
  --epoch-duration 86400 \
  --mint-burn-cap-bps 500 \
  --stability-fee-bps 50
```

### Step 4: Initialize ars-reserve

```bash
anchor run initialize-reserve -- \
  --rebalance-threshold-bps 500
```

## Option 3: Skip Initialization (Use Mock Data)

Backend sudah punya mock data di database. Frontend bisa jalan tanpa on-chain state untuk demo purposes.

**Current Status:**
- ✅ Programs deployed to devnet
- ✅ Backend API running with database
- ✅ Frontend dashboard working
- ❌ On-chain state not initialized
- ❌ Cannot interact with smart contracts yet

**What Works:**
- Dashboard displays ILI/ICR/Reserve data from database
- WebSocket real-time updates
- All API endpoints functional

**What Doesn't Work:**
- Creating proposals on-chain
- Voting on proposals
- Executing policies
- Minting/burning ARU tokens
- Vault rebalancing

## Next Steps

1. **For Demo:** Continue with mock data, showcase UI/UX
2. **For Production:** Build programs with IDL, run initialization script
3. **For Testing:** Manual initialization via Anchor CLI

## Configuration

Update `.env` files dengan deployed addresses setelah initialization:

```env
# backend/.env
ARU_MINT_ADDRESS=<mint_address>
GLOBAL_STATE_ADDRESS=<global_state_pda>
ILI_ORACLE_ADDRESS=<ili_oracle_pda>
RESERVE_VAULT_ADDRESS=<reserve_vault_pda>
TOKEN_STATE_ADDRESS=<token_state_pda>
```
