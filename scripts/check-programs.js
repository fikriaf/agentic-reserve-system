/**
 * Check ARS Programs Status
 * Run: node scripts/check-programs.js
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://api.devnet.solana.com';
const WALLET_PATH = path.join(process.env.HOME || '', '.config/solana/id.json');

// Program IDs
const PROGRAMS = {
  ARS_CORE: '9JhnkugG8q9QG9LedUs2F93H9xJ9zSHcn5Zfm1uzF624',
  ARS_RESERVE: '6ojet9MMHSZiXoZ3w4AM72EKzFe7cMgw2toCrtmBjEER',
  ARS_TOKEN: '8Eh2foHjxgoHcQ69HPvGGijiLCXzncnB6bpTrRp94VoG',
};

async function main() {
  console.log('=========================================');
  console.log('ARS Programs Status Check');
  console.log('=========================================\n');

  // Connect to devnet
  const connection = new Connection(RPC_URL, 'confirmed');

  // Load wallet if exists
  if (fs.existsSync(WALLET_PATH)) {
    const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
    const { Keypair } = require('@solana/web3.js');
    const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
    console.log('Wallet:', wallet.publicKey.toBase58());
    
    const balance = await connection.getBalance(wallet.publicKey);
    console.log('Balance:', (balance / 1e9).toFixed(4), 'SOL\n');
  }

  // Check each program
  console.log('Checking Programs...\n');

  // 1. ARS Core
  const coreProgramId = new PublicKey(PROGRAMS.ARS_CORE);
  const [globalStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    coreProgramId
  );
  
  console.log('1. ARS Core');
  console.log('   Program ID:', PROGRAMS.ARS_CORE);
  console.log('   GlobalState PDA:', globalStatePDA.toBase58());
  
  const coreAccount = await connection.getAccountInfo(globalStatePDA);
  console.log('   Status:', coreAccount ? '✅ Initialized' : '❌ Not initialized\n');

  // 2. ARS Reserve
  const reserveProgramId = new PublicKey(PROGRAMS.ARS_RESERVE);
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    reserveProgramId
  );
  
  console.log('2. ARS Reserve');
  console.log('   Program ID:', PROGRAMS.ARS_RESERVE);
  console.log('   Vault PDA:', vaultPDA.toBase58());
  
  const reserveAccount = await connection.getAccountInfo(vaultPDA);
  console.log('   Status:', reserveAccount ? '✅ Initialized' : '❌ Not initialized\n');

  // 3. ARS Token
  const tokenProgramId = new PublicKey(PROGRAMS.ARS_TOKEN);
  const [mintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('mint')],
    tokenProgramId
  );
  
  console.log('3. ARS Token');
  console.log('   Program ID:', PROGRAMS.ARS_TOKEN);
  console.log('   Mint PDA:', mintPDA.toBase58());
  
  const tokenAccount = await connection.getAccountInfo(mintPDA);
  console.log('   Status:', tokenAccount ? '✅ Initialized' : '❌ Not initialized\n');

  // Summary
  console.log('=========================================');
  console.log('Summary');
  console.log('=========================================\n');
  
  const allInitialized = coreAccount && reserveAccount && tokenAccount;
  
  if (allInitialized) {
    console.log('✅ All programs initialized!\n');
    console.log('Backend can now read on-chain data.');
  } else {
    console.log('❌ Programs not initialized\n');
    console.log('Programs are deployed but need initialization.');
    console.log('For now, backend uses mock data from Supabase.\n');
    console.log('To initialize:');
    console.log('1. Build with IDL: anchor build');
    console.log('2. Use Anchor client to call initialize instructions');
    console.log('3. Or wait for initialization script');
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
