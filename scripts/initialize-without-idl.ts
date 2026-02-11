import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import * as borsh from 'borsh';

// Program IDs from deployment
const ARS_CORE_PROGRAM_ID = new PublicKey('9JhnkugG8q9QG9LedUs2F93H9xJ9zSHcn5Zfm1uzF624');
const ARS_RESERVE_PROGRAM_ID = new PublicKey('6ojet9MMHSZiXoZ3w4AM72EKzFe7cMgw2toCrtmBjEER');
const ARS_TOKEN_PROGRAM_ID = new PublicKey('8Eh2foHjxgoHcQ69HPvGGijiLCXzncnB6bpTrRp94VoG');

// RPC endpoint
const RPC_URL = 'https://api.devnet.solana.com';

// Instruction discriminators (first 8 bytes of SHA256 hash of "global:initialize")
const INITIALIZE_DISCRIMINATOR = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);

async function main() {
  console.log('🚀 Initializing ARS programs without IDL...\n');

  // Load wallet
  const walletPath = `${homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, 'utf-8')))
  );
  console.log('Wallet:', walletKeypair.publicKey.toBase58());

  // Create connection
  const connection = new Connection(RPC_URL, 'confirmed');
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL\n');

  if (balance < 0.1 * 1e9) {
    console.error('❌ Insufficient balance. Need at least 0.1 SOL');
    process.exit(1);
  }

  // Derive PDAs
  const [globalStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    ARS_CORE_PROGRAM_ID
  );

  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    ARS_RESERVE_PROGRAM_ID
  );

  const [mintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('aru_mint')],
    ARS_TOKEN_PROGRAM_ID
  );

  console.log('📍 PDAs:');
  console.log('  GlobalState:', globalStatePDA.toBase58());
  console.log('  Vault:', vaultPDA.toBase58());
  console.log('  Mint:', mintPDA.toBase58());
  console.log();

  // Check if already initialized
  console.log('🔍 Checking initialization status...');
  const globalStateInfo = await connection.getAccountInfo(globalStatePDA);
  const vaultInfo = await connection.getAccountInfo(vaultPDA);
  const mintInfo = await connection.getAccountInfo(mintPDA);

  if (globalStateInfo) {
    console.log('✅ ars-core already initialized');
  } else {
    console.log('⚠️  ars-core NOT initialized');
  }

  if (vaultInfo) {
    console.log('✅ ars-reserve already initialized');
  } else {
    console.log('⚠️  ars-reserve NOT initialized');
  }

  if (mintInfo) {
    console.log('✅ ars-token already initialized');
  } else {
    console.log('⚠️  ars-token NOT initialized');
  }

  console.log('\n📝 To initialize, you need to:');
  console.log('1. Build programs with: anchor build --no-idl');
  console.log('2. Use Anchor TypeScript client with program source code');
  console.log('3. Or call initialize instructions manually with correct instruction data');
  console.log('\nFor now, backend will use Supabase data until programs are initialized.');
}

main().catch(console.error);
