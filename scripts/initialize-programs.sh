#!/bin/bash
# Initialize ARS Programs on Devnet
# Run this in WSL2: bash scripts/initialize-programs.sh

set -e

echo "========================================="
echo "ARS Programs Initialization"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo "Error: Anchor.toml not found. Run this from project root."
    exit 1
fi

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo "Error: Solana CLI not found. Install it first."
    exit 1
fi

# Check Anchor CLI
if ! command -v anchor &> /dev/null; then
    echo "Error: Anchor CLI not found. Install it first."
    exit 1
fi

# Set cluster to devnet
echo "Setting cluster to devnet..."
solana config set --url devnet

# Check wallet balance
WALLET=$(solana address)
BALANCE=$(solana balance --url devnet | awk '{print $1}')
echo ""
echo "Wallet: $WALLET"
echo "Balance: $BALANCE SOL"
echo ""

# Check if we have enough SOL (need ~0.5 SOL for initialization)
if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo "Warning: Low balance. You need at least 0.5 SOL for initialization."
    echo "Requesting airdrop..."
    solana airdrop 2 --url devnet || echo "Airdrop failed (rate limited). Please wait and try again."
    sleep 5
fi

# Program IDs from Anchor.toml
ARS_CORE="9JhnkugG8q9QG9LedUs2F93H9xJ9zSHcn5Zfm1uzF624"
ARS_RESERVE="6ojet9MMHSZiXoZ3w4AM72EKzFe7cMgw2toCrtmBjEER"
ARS_TOKEN="8Eh2foHjxgoHcQ69HPvGGijiLCXzncnB6bpTrRp94VoG"

echo "========================================="
echo "Step 1: Initialize ARS Core"
echo "========================================="
echo "Program ID: $ARS_CORE"
echo ""

# Build initialize instruction for ars-core
# This would normally use anchor client, but we'll use a TypeScript script
echo "Creating initialization transaction..."

# For now, we'll create a simple TypeScript script to do this
cat > /tmp/init-core.ts << 'EOF'
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const walletPath = process.env.HOME + '/.config/solana/id.json';
const keypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
);
const wallet = new Wallet(keypair);
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

const PROGRAM_ID = new PublicKey('9JhnkugG8q9QG9LedUs2F93H9xJ9zSHcn5Zfm1uzF624');

async function initializeCore() {
  console.log('Initializing ARS Core...');
  console.log('Authority:', wallet.publicKey.toBase58());
  
  // Find GlobalState PDA
  const [globalStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    PROGRAM_ID
  );
  
  console.log('GlobalState PDA:', globalStatePDA.toBase58());
  
  // Check if already initialized
  const accountInfo = await connection.getAccountInfo(globalStatePDA);
  if (accountInfo) {
    console.log('✓ Already initialized');
    return;
  }
  
  console.log('Note: Manual initialization required via Anchor client');
  console.log('Run: anchor run initialize-core --provider.cluster devnet');
}

initializeCore().catch(console.error);
EOF

echo "Checking initialization status..."
npx ts-node /tmp/init-core.ts

echo ""
echo "========================================="
echo "Step 2: Initialize ARS Reserve"
echo "========================================="
echo "Program ID: $ARS_RESERVE"
echo ""

# Check Reserve Vault
cat > /tmp/init-reserve.ts << 'EOF'
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('6ojet9MMHSZiXoZ3w4AM72EKzFe7cMgw2toCrtmBjEER');

async function checkReserve() {
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID
  );
  
  console.log('Vault PDA:', vaultPDA.toBase58());
  
  const accountInfo = await connection.getAccountInfo(vaultPDA);
  if (accountInfo) {
    console.log('✓ Already initialized');
  } else {
    console.log('Note: Manual initialization required');
    console.log('Run: anchor run initialize-reserve --provider.cluster devnet');
  }
}

checkReserve().catch(console.error);
EOF

npx ts-node /tmp/init-reserve.ts

echo ""
echo "========================================="
echo "Step 3: Initialize ARS Token"
echo "========================================="
echo "Program ID: $ARS_TOKEN"
echo ""

# Check Token Mint
cat > /tmp/init-token.ts << 'EOF'
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('8Eh2foHjxgoHcQ69HPvGGijiLCXzncnB6bpTrRp94VoG');

async function checkToken() {
  const [mintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('mint')],
    PROGRAM_ID
  );
  
  console.log('Mint PDA:', mintPDA.toBase58());
  
  const accountInfo = await connection.getAccountInfo(mintPDA);
  if (accountInfo) {
    console.log('✓ Already initialized');
  } else {
    console.log('Note: Manual initialization required');
    console.log('Run: anchor run initialize-token --provider.cluster devnet');
  }
}

checkToken().catch(console.error);
EOF

npx ts-node /tmp/init-token.ts

echo ""
echo "========================================="
echo "Initialization Summary"
echo "========================================="
echo ""
echo "Programs are deployed but need to be initialized."
echo "This requires calling the initialize instruction on each program."
echo ""
echo "Next steps:"
echo "1. Make sure you have enough SOL in your wallet"
echo "2. Run initialization via Anchor client or custom script"
echo "3. Verify initialization: curl http://localhost:4000/programs/status"
echo ""
echo "For manual initialization, you need to:"
echo "- Build transactions with initialize instructions"
echo "- Sign with your wallet"
echo "- Send to devnet"
echo ""
