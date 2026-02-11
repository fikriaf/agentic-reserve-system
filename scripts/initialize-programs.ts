/**
 * Initialize ARS Smart Contracts on Devnet
 * 
 * This script initializes all three programs:
 * 1. ars-core: GlobalState and ILI Oracle
 * 2. ars-reserve: Reserve Vault
 * 3. ars-token: ARU Token State
 */

import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

// Program IDs from deployment
const ARS_CORE_PROGRAM_ID = new PublicKey(process.env.ARS_CORE_PROGRAM_ID!);
const ARS_RESERVE_PROGRAM_ID = new PublicKey(process.env.ARS_RESERVE_PROGRAM_ID!);
const ARS_TOKEN_PROGRAM_ID = new PublicKey(process.env.ARS_TOKEN_PROGRAM_ID!);

// Seeds
const GLOBAL_STATE_SEED = Buffer.from('global_state');
const ILI_ORACLE_SEED = Buffer.from('ili_oracle');
const VAULT_SEED = Buffer.from('reserve_vault');
const TOKEN_STATE_SEED = Buffer.from('token_state');

// Configuration
const EPOCH_DURATION = 86400; // 24 hours
const MINT_BURN_CAP_BPS = 500; // 5%
const STABILITY_FEE_BPS = 50; // 0.5%
const VHR_THRESHOLD = 15000; // 150%
const REBALANCE_THRESHOLD_BPS = 500; // 5%

async function main() {
  console.log('========================================');
  console.log('ARS Smart Contract Initialization');
  console.log('========================================\n');

  // Setup connection
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  );

  // Load wallet
  const walletPath = process.env.SOLANA_WALLET_PATH || path.join(process.env.HOME || process.env.USERPROFILE || '', '.config', 'solana', 'id.json');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  console.log('Authority:', wallet.publicKey.toString());
  console.log('Network:', connection.rpcEndpoint);
  console.log('');

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  
  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    console.error('❌ Insufficient balance. Need at least 0.5 SOL for initialization.');
    console.log('Request airdrop: solana airdrop 2');
    process.exit(1);
  }
  console.log('');

  // Load IDLs
  const arsCoreIdl = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'target', 'idl', 'ars_core.json'), 'utf-8')
  );
  const arsReserveIdl = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'target', 'idl', 'ars_reserve.json'), 'utf-8')
  );
  const arsTokenIdl = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'target', 'idl', 'ars_token.json'), 'utf-8')
  );

  const arsCoreProgram = new Program(arsCoreIdl, provider);
  const arsReserveProgram = new Program(arsReserveIdl, provider);
  const arsTokenProgram = new Program(arsTokenIdl, provider);

  console.log('Programs loaded:');
  console.log('  ars-core:', ARS_CORE_PROGRAM_ID.toString());
  console.log('  ars-reserve:', ARS_RESERVE_PROGRAM_ID.toString());
  console.log('  ars-token:', ARS_TOKEN_PROGRAM_ID.toString());
  console.log('');

  // Derive PDAs
  const [globalState] = PublicKey.findProgramAddressSync(
    [GLOBAL_STATE_SEED],
    ARS_CORE_PROGRAM_ID
  );
  const [iliOracle] = PublicKey.findProgramAddressSync(
    [ILI_ORACLE_SEED],
    ARS_CORE_PROGRAM_ID
  );
  const [reserveVault] = PublicKey.findProgramAddressSync(
    [VAULT_SEED],
    ARS_RESERVE_PROGRAM_ID
  );
  const [tokenState] = PublicKey.findProgramAddressSync(
    [TOKEN_STATE_SEED],
    ARS_TOKEN_PROGRAM_ID
  );

  console.log('PDAs:');
  console.log('  GlobalState:', globalState.toString());
  console.log('  ILI Oracle:', iliOracle.toString());
  console.log('  Reserve Vault:', reserveVault.toString());
  console.log('  Token State:', tokenState.toString());
  console.log('');

  // Step 1: Initialize ars-core
  console.log('Step 1: Initializing ars-core...');
  try {
    const tx1 = await arsCoreProgram.methods
      .initialize(
        new anchor.BN(EPOCH_DURATION),
        MINT_BURN_CAP_BPS,
        STABILITY_FEE_BPS,
        VHR_THRESHOLD
      )
      .accounts({
        globalState,
        iliOracle,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log('✅ ars-core initialized');
    console.log('   Transaction:', tx1);
  } catch (error: any) {
    if (error.message?.includes('already in use')) {
      console.log('⚠️  ars-core already initialized');
    } else {
      console.error('❌ Failed to initialize ars-core:', error.message);
      throw error;
    }
  }
  console.log('');

  // Step 2: Create ARU mint
  console.log('Step 2: Creating ARU token mint...');
  const aruMintKeypair = Keypair.generate();
  const aruMint: PublicKey = aruMintKeypair.publicKey;
  
  try {
    // Create mint account
    const mintRent = await connection.getMinimumBalanceForRentExemption(82); // Mint account size
    
    const createMintTx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: aruMint,
        lamports: mintRent,
        space: 82,
        programId: TOKEN_PROGRAM_ID,
      }),
      // Initialize mint instruction (manual construction)
      new anchor.web3.TransactionInstruction({
        keys: [
          { pubkey: aruMint, isSigner: false, isWritable: true },
          { pubkey: anchor.web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: TOKEN_PROGRAM_ID,
        data: Buffer.from([
          0, // InitializeMint instruction
          9, // decimals
          ...wallet.publicKey.toBuffer(), // mint authority
          1, // Option::Some for freeze authority
          ...wallet.publicKey.toBuffer(), // freeze authority
        ]),
      })
    );
    
    await provider.sendAndConfirm(createMintTx, [aruMintKeypair]);
    
    console.log('✅ ARU mint created:', aruMint.toString());
  } catch (error: any) {
    console.error('❌ Failed to create mint:', error.message);
    throw error;
  }
  console.log('');

  // Step 3: Initialize ars-token
  console.log('Step 3: Initializing ars-token...');
  try {
    const tx2 = await arsTokenProgram.methods
      .initializeMint(
        new anchor.BN(EPOCH_DURATION),
        MINT_BURN_CAP_BPS,
        STABILITY_FEE_BPS
      )
      .accounts({
        tokenState,
        mint: aruMint,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    console.log('✅ ars-token initialized');
    console.log('   Transaction:', tx2);
  } catch (error: any) {
    if (error.message?.includes('already in use')) {
      console.log('⚠️  ars-token already initialized');
    } else {
      console.error('❌ Failed to initialize ars-token:', error.message);
      throw error;
    }
  }
  console.log('');

  // Step 4: Initialize ars-reserve
  console.log('Step 4: Initializing ars-reserve...');
  try {
    const tx3 = await arsReserveProgram.methods
      .initializeVault(REBALANCE_THRESHOLD_BPS)
      .accounts({
        vault: reserveVault,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log('✅ ars-reserve initialized');
    console.log('   Transaction:', tx3);
  } catch (error: any) {
    if (error.message?.includes('already in use')) {
      console.log('⚠️  ars-reserve already initialized');
    } else {
      console.error('❌ Failed to initialize ars-reserve:', error.message);
      throw error;
    }
  }
  console.log('');

  // Step 5: Create reserve token accounts (USDC, SOL, mSOL)
  console.log('Step 5: Creating reserve token accounts...');
  // Note: This requires actual token mints for USDC, SOL wrapper, mSOL
  // For devnet testing, we'll skip this and document it
  console.log('⚠️  Token accounts creation skipped (requires actual token mints)');
  console.log('   Manual steps required:');
  console.log('   1. Get devnet USDC mint address');
  console.log('   2. Create wrapped SOL account');
  console.log('   3. Get mSOL mint address');
  console.log('   4. Create associated token accounts for vault');
  console.log('');

  // Summary
  console.log('========================================');
  console.log('Initialization Complete!');
  console.log('========================================');
  console.log('');
  console.log('Deployed Accounts:');
  console.log('  GlobalState:', globalState.toString());
  console.log('  ILI Oracle:', iliOracle.toString());
  console.log('  Reserve Vault:', reserveVault.toString());
  console.log('  Token State:', tokenState.toString());
  console.log('  ARU Mint:', aruMint.toString());
  console.log('');
  console.log('Next Steps:');
  console.log('  1. Update backend/.env with ARU_MINT_ADDRESS');
  console.log('  2. Create reserve token accounts');
  console.log('  3. Link reserve vault to ars-core via set_reserve_vault');
  console.log('  4. Fund vault with initial assets');
  console.log('  5. Update ILI oracle with initial value');
  console.log('');

  // Save addresses to file
  const addresses = {
    network: 'devnet',
    timestamp: new Date().toISOString(),
    programs: {
      ars_core: ARS_CORE_PROGRAM_ID.toString(),
      ars_reserve: ARS_RESERVE_PROGRAM_ID.toString(),
      ars_token: ARS_TOKEN_PROGRAM_ID.toString(),
    },
    accounts: {
      global_state: globalState.toString(),
      ili_oracle: iliOracle.toString(),
      reserve_vault: reserveVault.toString(),
      token_state: tokenState.toString(),
      aru_mint: aruMint.toString(),
    },
    authority: wallet.publicKey.toString(),
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'deployed-addresses.json'),
    JSON.stringify(addresses, null, 2)
  );
  console.log('Addresses saved to: deployed-addresses.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('');
    console.error('========================================');
    console.error('Initialization Failed');
    console.error('========================================');
    console.error(error);
    process.exit(1);
  });
