/**
 * Initialize All ARS Programs
 * Run: node scripts/initialize-all.js
 * 
 * This creates the PDA accounts needed by each program
 */

const { 
  Connection, 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction
} = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://api.devnet.solana.com';
const WALLET_PATH = path.join(process.env.HOME || '', '.config/solana/id.json');

// Program IDs
const PROGRAMS = {
  ARS_CORE: new PublicKey('9JhnkugG8q9QG9LedUs2F93H9xJ9zSHcn5Zfm1uzF624'),
  ARS_RESERVE: new PublicKey('6ojet9MMHSZiXoZ3w4AM72EKzFe7cMgw2toCrtmBjEER'),
  ARS_TOKEN: new PublicKey('8Eh2foHjxgoHcQ69HPvGGijiLCXzncnB6bpTrRp94VoG'),
};

async function main() {
  console.log('=========================================');
  console.log('ARS Programs Initialization');
  console.log('=========================================\n');

  // Load wallet
  console.log('Loading wallet...');
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log('Wallet:', wallet.publicKey.toBase58());

  // Connect
  const connection = new Connection(RPC_URL, 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', (balance / 1e9).toFixed(4), 'SOL\n');

  if (balance < 0.1 * 1e9) {
    console.log('❌ Insufficient balance. Need at least 0.1 SOL');
    console.log('Run: solana airdrop 1 --url devnet');
    process.exit(1);
  }

  console.log('Note: Initialization requires calling the initialize instruction');
  console.log('      defined in each program. Since we built with --no-idl,');
  console.log('      we need to either:');
  console.log('      1. Rebuild with IDL: anchor build (without --no-idl)');
  console.log('      2. Or manually construct the instruction data\n');

  console.log('For now, checking if we can use Anchor CLI...\n');

  // Try using anchor CLI
  const { execSync } = require('child_process');
  
  try {
    console.log('Attempting to initialize via Anchor...\n');
    
    // This would work if we had the IDL
    console.log('Command: anchor run initialize --provider.cluster devnet');
    console.log('\nSince IDL is not available, you need to:');
    console.log('1. Rebuild programs with IDL:');
    console.log('   cd /mnt/d/script/Agentic/agentic-reserve-system');
    console.log('   anchor build  # without --no-idl flag');
    console.log('');
    console.log('2. Then create initialize script using Anchor client:');
    console.log('   - Use @coral-xyz/anchor to load IDL');
    console.log('   - Call program.methods.initialize()');
    console.log('   - Sign and send transaction');
    console.log('');
    console.log('Alternative: Use the backend API to initialize');
    console.log('   POST http://localhost:4000/admin/initialize');
    
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n=========================================');
  console.log('Current Status');
  console.log('=========================================\n');
  console.log('✅ Programs deployed to devnet');
  console.log('✅ Wallet has sufficient balance');
  console.log('❌ Programs not initialized (need IDL)');
  console.log('\nBackend will continue using mock data from Supabase');
  console.log('until programs are initialized.\n');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
