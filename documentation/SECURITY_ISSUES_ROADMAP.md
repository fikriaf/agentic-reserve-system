# Security Issues Roadmap
## Implementation Plan for High and Medium Priority Issues

Version 1.0  
Last Updated: February 5, 2026

## Overview

This document tracks all identified security issues and provides detailed implementation plans for resolution before mainnet launch.

## Issue Tracking Summary

| Priority | Total | Resolved | In Progress | Planned |
|----------|-------|----------|-------------|---------|
| High     | 3     | 0        | 0           | 3       |
| Medium   | 2     | 0        | 0           | 2       |
| **Total**| **5** | **0**    | **0**       | **5**   |

## High Priority Issues

### Issue #1: Ed25519 Signature Verification (Incomplete)

**Status**: Planned  
**Priority**: High  
**Timeline**: Q1 2026 (January - March)  
**Assigned**: Smart Contract Team

#### Current State

**Location**: `programs/ars-core/src/instructions/create_proposal.rs`, `vote_on_proposal.rs`

**Current Implementation**:
```rust
// Partial signature verification
pub fn create_proposal(ctx: Context<CreateProposal>, description: String) -> Result<()> {
    // TODO: Complete Ed25519 signature verification
    // Currently only checks if signer is present
    require!(ctx.accounts.proposer.is_signer, ErrorCode::Unauthorized);
    
    // Missing: Verify signature against agent's public key
    // Missing: Validate signature format
    // Missing: Check signature timestamp
    
    // ... rest of implementation
}
```

**Risk Assessment**:
- **Severity**: High
- **Exploitability**: Medium
- **Impact**: Unauthorized agents could create proposals or vote
- **CVSS Score**: 7.5 (High)

#### Implementation Plan

**Phase 1: Research and Design (Week 1-2)**

1. Research Ed25519 implementation in Anchor
   - Review Solana's ed25519_program
   - Study best practices from audited projects
   - Analyze gas costs and performance

2. Design signature verification flow
   ```
   Agent Request
        ↓
   Generate Signature (off-chain)
        ↓
   Submit Transaction with Signature
        ↓
   Verify Signature (on-chain)
        ↓
   Execute if Valid / Reject if Invalid
   ```

3. Define signature message format
   ```rust
   struct SignatureMessage {
       agent_pubkey: Pubkey,
       action: String,  // "create_proposal", "vote", etc.
       timestamp: i64,
       nonce: u64,
       payload: Vec<u8>,
   }
   ```

**Phase 2: Implementation (Week 3-4)**

1. Add Ed25519 program dependency
   ```toml
   # Cargo.toml
   [dependencies]
   solana-program = "1.18"
   ed25519-dalek = "2.0"
   ```

2. Implement signature verification helper
   ```rust
   // src/utils/signature.rs
   use ed25519_dalek::{PublicKey, Signature, Verifier};
   
   pub fn verify_agent_signature(
       agent_pubkey: &Pubkey,
       message: &[u8],
       signature: &[u8; 64],
   ) -> Result<()> {
       // Convert Solana pubkey to Ed25519 public key
       let public_key = PublicKey::from_bytes(agent_pubkey.as_ref())
           .map_err(|_| ErrorCode::InvalidPublicKey)?;
       
       // Parse signature
       let sig = Signature::from_bytes(signature)
           .map_err(|_| ErrorCode::InvalidSignature)?;
       
       // Verify signature
       public_key.verify(message, &sig)
           .map_err(|_| ErrorCode::SignatureVerificationFailed)?;
       
       Ok(())
   }
   ```

3. Update create_proposal instruction
   ```rust
   #[derive(Accounts)]
   pub struct CreateProposal<'info> {
       #[account(mut)]
       pub proposer: Signer<'info>,
       
       #[account(
           init,
           payer = proposer,
           space = 8 + Proposal::LEN
       )]
       pub proposal: Account<'info, Proposal>,
       
       pub system_program: Program<'info, System>,
   }
   
   pub fn create_proposal(
       ctx: Context<CreateProposal>,
       description: String,
       signature: [u8; 64],
       timestamp: i64,
       nonce: u64,
   ) -> Result<()> {
       // Verify timestamp is recent (within 5 minutes)
       let current_time = Clock::get()?.unix_timestamp;
       require!(
           current_time - timestamp < 300,
           ErrorCode::SignatureExpired
       );
       
       // Construct message to verify
       let message = construct_proposal_message(
           &ctx.accounts.proposer.key(),
           &description,
           timestamp,
           nonce,
       );
       
       // Verify signature
       verify_agent_signature(
           &ctx.accounts.proposer.key(),
           &message,
           &signature,
       )?;
       
       // Continue with proposal creation
       let proposal = &mut ctx.accounts.proposal;
       proposal.proposer = ctx.accounts.proposer.key();
       proposal.description = description;
       proposal.created_at = current_time;
       // ... rest of implementation
       
       Ok(())
   }
   ```

4. Add nonce tracking to prevent replay attacks
   ```rust
   #[account]
   pub struct AgentState {
       pub agent: Pubkey,
       pub nonce: u64,
       pub last_action: i64,
   }
   
   // In instruction handler
   require!(
       nonce > agent_state.nonce,
       ErrorCode::InvalidNonce
   );
   agent_state.nonce = nonce;
   ```

**Phase 3: Testing (Week 5-6)**

1. Unit tests
   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;
       
       #[test]
       fn test_valid_signature() {
           // Test with valid signature
       }
       
       #[test]
       fn test_invalid_signature() {
           // Test with invalid signature
       }
       
       #[test]
       fn test_expired_signature() {
           // Test with expired timestamp
       }
       
       #[test]
       fn test_replay_attack() {
           // Test nonce protection
       }
   }
   ```

2. Integration tests
3. Fuzzing tests for edge cases
4. Gas cost analysis

**Phase 4: Audit and Deployment (Week 7-8)**

1. Internal security review
2. External audit of signature verification
3. Deploy to devnet
4. Monitor for issues
5. Deploy to testnet
6. Final verification before mainnet

#### Success Criteria

- All agent actions require valid Ed25519 signatures
- Signatures expire after 5 minutes
- Nonce prevents replay attacks
- Gas costs < 10,000 compute units per verification
- Zero signature bypass vulnerabilities
- External audit approval

#### Dependencies

- Solana ed25519_program
- ed25519-dalek crate
- Updated SDK for signature generation


### Issue #2: Floating Point in Quadratic Staking

**Status**: Planned  
**Priority**: High  
**Timeline**: Q1 2026 (February - March)  
**Assigned**: Smart Contract Team

#### Current State

**Location**: `programs/ars-core/src/instructions/vote_on_proposal.rs`

**Current Implementation**:
```rust
pub fn vote_on_proposal(ctx: Context<VoteOnProposal>, stake_amount: u64) -> Result<()> {
    // ISSUE: Using floating point for quadratic calculation
    let voting_power = (stake_amount as f64).sqrt() as u64;
    
    // Risk: Precision loss, rounding errors, potential manipulation
    // Example: sqrt(10000) = 100.0, but floating point could give 99.999...
    
    if ctx.accounts.vote.support {
        proposal.stake_for += voting_power;
    } else {
        proposal.stake_against += voting_power;
    }
    
    Ok(())
}
```

**Risk Assessment**:
- **Severity**: High
- **Exploitability**: Medium
- **Impact**: Vote manipulation, unfair governance
- **CVSS Score**: 7.0 (High)

**Attack Scenarios**:
1. Precision loss accumulation over many votes
2. Rounding manipulation by choosing specific stake amounts
3. Inconsistent results across different compute environments

#### Implementation Plan

**Phase 1: Research Fixed-Point Arithmetic (Week 1)**

1. Research fixed-point libraries
   - Review fixed crate
   - Study Uniswap V2 sqrt implementation
   - Analyze Compound's exponential math

2. Choose precision level
   - Option A: 18 decimals (like Ethereum)
   - Option B: 9 decimals (Solana native)
   - Decision: 9 decimals for gas efficiency

**Phase 2: Implement Fixed-Point Sqrt (Week 2-3)**

1. Implement Babylonian method for sqrt
   ```rust
   // src/math/fixed_point.rs
   
   const PRECISION: u64 = 1_000_000_000; // 9 decimals
   
   /// Calculate square root using fixed-point arithmetic
   /// Uses Babylonian method (Newton's method)
   pub fn sqrt_fixed(x: u64) -> Result<u64> {
       if x == 0 {
           return Ok(0);
       }
       
       // Convert to fixed-point
       let x_fixed = x.checked_mul(PRECISION)
           .ok_or(ErrorCode::MathOverflow)?;
       
       // Initial guess: x / 2
       let mut z = x_fixed / 2;
       if z == 0 {
           z = x_fixed;
       }
       
       // Iterate until convergence (max 10 iterations)
       let mut y = x_fixed;
       for _ in 0..10 {
           if z >= y {
               break;
           }
           y = z;
           z = (x_fixed / z + z) / 2;
       }
       
       // Convert back from fixed-point
       Ok(y / PRECISION)
   }
   
   #[cfg(test)]
   mod tests {
       use super::*;
       
       #[test]
       fn test_sqrt_perfect_squares() {
           assert_eq!(sqrt_fixed(0).unwrap(), 0);
           assert_eq!(sqrt_fixed(1).unwrap(), 1);
           assert_eq!(sqrt_fixed(4).unwrap(), 2);
           assert_eq!(sqrt_fixed(9).unwrap(), 3);
           assert_eq!(sqrt_fixed(16).unwrap(), 4);
           assert_eq!(sqrt_fixed(10000).unwrap(), 100);
       }
       
       #[test]
       fn test_sqrt_non_perfect_squares() {
           // sqrt(2) ≈ 1.414
           let result = sqrt_fixed(2).unwrap();
           assert!(result >= 1 && result <= 2);
           
           // sqrt(10) ≈ 3.162
           let result = sqrt_fixed(10).unwrap();
           assert!(result >= 3 && result <= 4);
       }
       
       #[test]
       fn test_sqrt_large_numbers() {
           // sqrt(1000000) = 1000
           assert_eq!(sqrt_fixed(1_000_000).unwrap(), 1_000);
           
           // sqrt(10^18) = 10^9
           assert_eq!(sqrt_fixed(1_000_000_000_000_000_000).unwrap(), 1_000_000_000);
       }
   }
   ```

2. Add overflow protection
   ```rust
   pub fn checked_sqrt(x: u64) -> Result<u64> {
       // Check for overflow before calculation
       if x > u64::MAX / PRECISION {
           return Err(ErrorCode::MathOverflow.into());
       }
       
       sqrt_fixed(x)
   }
   ```

3. Implement voting power calculation
   ```rust
   pub fn calculate_voting_power(stake_amount: u64) -> Result<u64> {
       // Validate input
       require!(stake_amount > 0, ErrorCode::InvalidStakeAmount);
       
       // Calculate sqrt using fixed-point arithmetic
       let voting_power = checked_sqrt(stake_amount)?;
       
       // Ensure minimum voting power
       let min_voting_power = 1;
       Ok(voting_power.max(min_voting_power))
   }
   ```

**Phase 3: Update Vote Instruction (Week 4)**

1. Replace floating point with fixed-point
   ```rust
   pub fn vote_on_proposal(
       ctx: Context<VoteOnProposal>,
       stake_amount: u64,
   ) -> Result<()> {
       let proposal = &mut ctx.accounts.proposal;
       let vote = &mut ctx.accounts.vote;
       
       // Validate stake amount
       require!(stake_amount >= MIN_STAKE, ErrorCode::StakeTooLow);
       require!(stake_amount <= MAX_STAKE, ErrorCode::StakeTooHigh);
       
       // Calculate voting power using fixed-point sqrt
       let voting_power = calculate_voting_power(stake_amount)?;
       
       // Update proposal stakes
       if vote.support {
           proposal.stake_for = proposal.stake_for
               .checked_add(voting_power)
               .ok_or(ErrorCode::MathOverflow)?;
       } else {
           proposal.stake_against = proposal.stake_against
               .checked_add(voting_power)
               .ok_or(ErrorCode::MathOverflow)?;
       }
       
       // Record vote
       vote.stake_amount = stake_amount;
       vote.voting_power = voting_power;
       vote.timestamp = Clock::get()?.unix_timestamp;
       
       emit!(VoteEvent {
           proposal: proposal.key(),
           voter: ctx.accounts.voter.key(),
           stake_amount,
           voting_power,
           support: vote.support,
       });
       
       Ok(())
   }
   ```

**Phase 4: Property-Based Testing (Week 5)**

1. Implement property tests
   ```rust
   use proptest::prelude::*;
   
   proptest! {
       #[test]
       fn test_sqrt_monotonic(x in 1u64..1_000_000_000) {
           let sqrt_x = sqrt_fixed(x).unwrap();
           let sqrt_x_plus_1 = sqrt_fixed(x + 1).unwrap();
           
           // sqrt should be monotonically increasing
           prop_assert!(sqrt_x_plus_1 >= sqrt_x);
       }
       
       #[test]
       fn test_sqrt_bounds(x in 1u64..1_000_000_000) {
           let sqrt_x = sqrt_fixed(x).unwrap();
           
           // sqrt(x)^2 should be close to x
           let squared = sqrt_x * sqrt_x;
           let diff = if squared > x { squared - x } else { x - squared };
           
           // Allow small error margin
           prop_assert!(diff <= sqrt_x);
       }
       
       #[test]
       fn test_voting_power_fairness(
           stake1 in 100u64..1_000_000,
           stake2 in 100u64..1_000_000
       ) {
           let vp1 = calculate_voting_power(stake1).unwrap();
           let vp2 = calculate_voting_power(stake2).unwrap();
           
           // Larger stake should have more voting power
           if stake1 > stake2 {
               prop_assert!(vp1 > vp2);
           } else if stake1 < stake2 {
               prop_assert!(vp1 < vp2);
           } else {
               prop_assert_eq!(vp1, vp2);
           }
       }
   }
   ```

**Phase 5: Gas Optimization (Week 6)**

1. Benchmark gas costs
2. Optimize iteration count
3. Compare with floating point version
4. Target: < 5,000 compute units

**Phase 6: Migration and Deployment (Week 7-8)**

1. Create migration plan for existing votes
2. Deploy to devnet
3. Test with real stake amounts
4. External audit
5. Deploy to testnet
6. Monitor for issues
7. Mainnet deployment

#### Success Criteria

- No floating point arithmetic in voting calculations
- Deterministic results across all environments
- Voting power calculation accurate within 0.1%
- Gas costs < 5,000 compute units
- All property tests pass
- External audit approval

#### Breaking Changes

- Existing votes may have slightly different voting power
- Migration required for active proposals
- SDK update required for vote calculation


### Issue #3: Reentrancy Guards

**Status**: Planned  
**Priority**: High  
**Timeline**: Q1 2026 (March)  
**Assigned**: Smart Contract Team

#### Current State

**Location**: All state-changing instructions in `programs/ars-reserve/src/instructions/`

**Current Implementation**:
```rust
// No reentrancy protection
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // ISSUE: No reentrancy guard
    // External call could reenter before state update
    
    // Transfer tokens
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;
    
    // Update state AFTER external call (vulnerable)
    let vault = &mut ctx.accounts.vault;
    vault.total_deposits += amount;
    
    Ok(())
}
```

**Risk Assessment**:
- **Severity**: High
- **Exploitability**: Low (Solana's account model provides some protection)
- **Impact**: Potential fund drainage through reentrancy
- **CVSS Score**: 6.5 (Medium-High)

**Attack Scenario**:
```
1. Attacker calls deposit()
2. During token transfer, malicious token program calls back
3. Reentrant call to withdraw() before state update
4. State inconsistency allows double-spending
```

#### Implementation Plan

**Phase 1: Design Reentrancy Protection (Week 1)**

1. Research Solana-specific reentrancy patterns
   - Study Anchor's account constraints
   - Review Solana's account locking mechanism
   - Analyze existing reentrancy exploits

2. Design protection strategy
   ```
   Option A: Checks-Effects-Interactions Pattern
   Option B: Reentrancy Guard Flag
   Option C: Account Locking
   
   Decision: Combination of A and B
   ```

3. Define reentrancy guard structure
   ```rust
   #[account]
   pub struct ReentrancyGuard {
       pub locked: bool,
       pub last_caller: Pubkey,
       pub last_timestamp: i64,
   }
   ```

**Phase 2: Implement Reentrancy Guard (Week 2)**

1. Create reentrancy guard macro
   ```rust
   // src/utils/reentrancy.rs
   
   use anchor_lang::prelude::*;
   
   #[macro_export]
   macro_rules! nonreentrant {
       ($guard:expr, $code:block) => {{
           // Check if already locked
           require!(!$guard.locked, ErrorCode::ReentrancyDetected);
           
           // Lock
           $guard.locked = true;
           $guard.last_caller = *ctx.accounts.user.key;
           $guard.last_timestamp = Clock::get()?.unix_timestamp;
           
           // Execute code
           let result = $code;
           
           // Unlock
           $guard.locked = false;
           
           result
       }};
   }
   
   #[error_code]
   pub enum ErrorCode {
       #[msg("Reentrancy detected")]
       ReentrancyDetected,
   }
   ```

2. Add guard to vault state
   ```rust
   #[account]
   pub struct Vault {
       pub authority: Pubkey,
       pub total_deposits: u64,
       pub total_withdrawals: u64,
       pub assets: Vec<Asset>,
       
       // Reentrancy protection
       pub locked: bool,
       pub last_caller: Pubkey,
       pub last_action_timestamp: i64,
       
       pub bump: u8,
   }
   ```

3. Implement Checks-Effects-Interactions pattern
   ```rust
   pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
       let vault = &mut ctx.accounts.vault;
       
       // CHECKS: Validate inputs and state
       require!(!vault.locked, ErrorCode::ReentrancyDetected);
       require!(amount > 0, ErrorCode::InvalidAmount);
       require!(amount <= MAX_DEPOSIT, ErrorCode::DepositTooLarge);
       
       // EFFECTS: Update state BEFORE external calls
       vault.locked = true;
       vault.total_deposits = vault.total_deposits
           .checked_add(amount)
           .ok_or(ErrorCode::MathOverflow)?;
       vault.last_caller = ctx.accounts.user.key();
       vault.last_action_timestamp = Clock::get()?.unix_timestamp;
       
       // INTERACTIONS: External calls AFTER state updates
       token::transfer(
           CpiContext::new(
               ctx.accounts.token_program.to_account_info(),
               Transfer {
                   from: ctx.accounts.user_token_account.to_account_info(),
                   to: ctx.accounts.vault_token_account.to_account_info(),
                   authority: ctx.accounts.user.to_account_info(),
               },
           ),
           amount,
       )?;
       
       // Unlock
       vault.locked = false;
       
       emit!(DepositEvent {
           vault: vault.key(),
           user: ctx.accounts.user.key(),
           amount,
           timestamp: vault.last_action_timestamp,
       });
       
       Ok(())
   }
   ```

4. Apply to all state-changing functions
   ```rust
   // withdraw.rs
   pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
       let vault = &mut ctx.accounts.vault;
       
       // CHECKS
       require!(!vault.locked, ErrorCode::ReentrancyDetected);
       require!(amount > 0, ErrorCode::InvalidAmount);
       require!(
           vault.total_deposits >= vault.total_withdrawals + amount,
           ErrorCode::InsufficientFunds
       );
       
       // EFFECTS
       vault.locked = true;
       vault.total_withdrawals = vault.total_withdrawals
           .checked_add(amount)
           .ok_or(ErrorCode::MathOverflow)?;
       
       // INTERACTIONS
       token::transfer(
           CpiContext::new_with_signer(
               ctx.accounts.token_program.to_account_info(),
               Transfer {
                   from: ctx.accounts.vault_token_account.to_account_info(),
                   to: ctx.accounts.user_token_account.to_account_info(),
                   authority: ctx.accounts.vault.to_account_info(),
               },
               &[&[b"vault", &[vault.bump]]],
           ),
           amount,
       )?;
       
       // Unlock
       vault.locked = false;
       
       Ok(())
   }
   
   // rebalance.rs
   pub fn rebalance(ctx: Context<Rebalance>) -> Result<()> {
       let vault = &mut ctx.accounts.vault;
       
       // CHECKS
       require!(!vault.locked, ErrorCode::ReentrancyDetected);
       require!(
           Clock::get()?.unix_timestamp - vault.last_rebalance > MIN_REBALANCE_INTERVAL,
           ErrorCode::RebalanceTooFrequent
       );
       
       // EFFECTS
       vault.locked = true;
       vault.last_rebalance = Clock::get()?.unix_timestamp;
       
       // INTERACTIONS (multiple swaps)
       for swap in calculate_rebalancing_swaps(&vault)? {
           execute_swap(ctx, swap)?;
       }
       
       // Update VHR
       vault.vhr = calculate_vhr(&vault)?;
       
       // Unlock
       vault.locked = false;
       
       Ok(())
   }
   ```

**Phase 3: Testing (Week 3)**

1. Unit tests for reentrancy protection
   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;
       
       #[test]
       fn test_reentrancy_blocked() {
           // Attempt to call deposit while locked
           // Should fail with ReentrancyDetected error
       }
       
       #[test]
       fn test_sequential_calls_allowed() {
           // Call deposit, wait for completion
           // Call deposit again
           // Should succeed
       }
       
       #[test]
       fn test_unlock_on_error() {
           // Call deposit with invalid amount
           // Verify vault is unlocked after error
       }
   }
   ```

2. Integration tests with malicious token program
3. Fuzzing tests for race conditions

**Phase 4: Audit and Deployment (Week 4)**

1. Internal security review
2. External audit focusing on reentrancy
3. Deploy to devnet
4. Stress testing
5. Deploy to testnet
6. Final verification

#### Success Criteria

- All state-changing functions protected
- Reentrancy attempts blocked
- No false positives (legitimate sequential calls work)
- Vault unlocks properly on errors
- Gas overhead < 1,000 compute units
- External audit approval

#### Additional Protections

1. **Account Constraints**
   ```rust
   #[derive(Accounts)]
   pub struct Deposit<'info> {
       #[account(mut)]
       pub user: Signer<'info>,
       
       #[account(
           mut,
           constraint = !vault.locked @ ErrorCode::ReentrancyDetected
       )]
       pub vault: Account<'info, Vault>,
       
       // ... other accounts
   }
   ```

2. **Time-Based Protection**
   ```rust
   // Prevent rapid successive calls from same user
   require!(
       Clock::get()?.unix_timestamp - vault.last_action_timestamp > MIN_ACTION_INTERVAL,
       ErrorCode::ActionTooFrequent
   );
   ```

3. **Caller Tracking**
   ```rust
   // Detect suspicious patterns
   if vault.last_caller == ctx.accounts.user.key() {
       require!(
           Clock::get()?.unix_timestamp - vault.last_action_timestamp > 1,
           ErrorCode::SuspiciousActivity
       );
   }
   ```


## Medium Priority Issues

### Issue #4: Oracle Data Validation

**Status**: Planned  
**Priority**: Medium  
**Timeline**: Q2 2026 (April - June)  
**Assigned**: Spute units
- Zero false rejections of valid data

s
   }
   ```

2. Integration tests with real oracles
3. Stress testing with malicious data

**Phase 5: Deployment (Week 10-12)**

1. Deploy oracle registry
2. Whitelist Pyth, Switchboard, Birdeye
3. Update backend to use new format
4. Deploy to devnet
5. Monitor for issues
6. Deploy to testnet
7. Mainnet deployment

#### Success Criteria

- All ILI updates validated on-chain
- Malicious data rejected
- 3+ oracle sources required
- Median calculation verified
- Data freshness enforced
- Gas costs < 15,000 com
               birdeyeData
           ])
       };
   }
   ```

**Phase 4: Testing (Week 8-9)**

1. Test validation rules
   ```rust
   #[test]
   fn test_ili_bounds_validation() {
       // Test MIN_ILI boundary
       // Test MAX_ILI boundary
   }
   
   #[test]
   fn test_change_limit_validation() {
       // Test 50% change limit
   }
   
   #[test]
   fn test_insufficient_sources() {
       // Test with < 3 sources
   }
   
   #[test]
   fn test_stale_data_rejection() {
       // Test with old timestampData([pythData, switchboardData, birdeyeData]);
       
       // Calculate median
       const median = this.calculateMedian([
           pythData.value,
           switchboardData.value,
           birdeyeData.value
       ]);
       
       // Prepare on-chain update with proof
       return {
           ili_value: median,
           sources: [pythData, switchboardData, birdeyeData],
           calculation_proof: this.generateCalculationProof(median, [
               pythData,
               switchboardData,y.last_update = Clock::get()?.unix_timestamp;
       
       Ok(())
   }
   ```

**Phase 3: Update Backend (Week 6-7)**

1. Modify oracle aggregator to provide proof
   ```typescript
   async prepareILIUpdate(): Promise<ILIUpdate> {
       // Fetch from multiple sources
       const pythData = await this.fetchPythData();
       const switchboardData = await this.fetchSwitchboardData();
       const birdeyeData = await this.fetchBirdeyeData();
       
       // Validate off-chain first
       this.validateOracle       pub oracle_weights: Vec<u64>,
       pub last_update: i64,
   }
   
   pub fn add_oracle(
       ctx: Context<AddOracle>,
       oracle_pubkey: Pubkey,
       weight: u64,
   ) -> Result<()> {
       let registry = &mut ctx.accounts.oracle_registry;
       
       require!(
           ctx.accounts.authority.key() == registry.authority,
           ErrorCode::Unauthorized
       );
       
       registry.whitelisted_oracles.push(oracle_pubkey);
       registry.oracle_weights.push(weight);
       registrrces: &[OracleData]) -> Result<u64> {
       let mut values: Vec<u64> = sources.iter().map(|s| s.value).collect();
       values.sort();
       
       let len = values.len();
       let median = if len % 2 == 0 {
           (values[len / 2 - 1] + values[len / 2]) / 2
       } else {
           values[len / 2]
       };
       
       Ok(median)
   }
   ```

4. Add oracle registry
   ```rust
   #[account]
   pub struct OracleRegistry {
       pub authority: Pubkey,
       pub whitelisted_oracles: Vec<Pubkey>,
 // Verify oracle signature
       verify_oracle_signature(source)?;
       
       // Verify confidence level
       require!(
           source.confidence >= MIN_CONFIDENCE,
           ErrorCode::LowConfidence
       );
       
       // Verify value is reasonable
       require!(
           source.value > 0 && source.value < MAX_ORACLE_VALUE,
           ErrorCode::InvalidOracleValue
       );
       
       Ok(())
   }
   ```

3. Implement median calculation verification
   ```rust
   fn calculate_median(sou  sources: ili_update.sources.len() as u8,
           timestamp: current_time,
       });
       
       Ok(())
   }
   ```

2. Implement oracle source verification
   ```rust
   fn verify_oracle_source(
       source: &OracleData,
       accounts: &UpdateILI,
   ) -> Result<()> {
       // Verify oracle is whitelisted
       let oracle_registry = &accounts.oracle_registry;
       require!(
           oracle_registry.is_whitelisted(&source.source),
           ErrorCode::UnauthorizedOracle
       );
       
      leOracleData
           );
       }
       
       // Update state
       global_state.ili = ili_update.ili_value;
       global_state.last_update = current_time;
       global_state.update_count += 1;
       
       // Store oracle sources for verification
       global_state.last_oracle_sources = ili_update.sources
           .iter()
           .map(|s| s.source)
           .collect();
       
       emit!(ILIUpdateEvent {
           old_ili: global_state.ili,
           new_ili: ili_update.ili_value,
         _oracle_source(source, &ctx.accounts)?;
       }
       
       // Validation 6: Verify median calculation
       let calculated_median = calculate_median(&ili_update.sources)?;
       require!(
           calculated_median == ili_update.ili_value,
           ErrorCode::InvalidILICalculation
       );
       
       // Validation 7: Check data freshness
       for source in &ili_update.sources {
           require!(
               current_time - source.timestamp < 600, // 10 minutes
               ErrorCode::Statage(
               global_state.ili,
               ili_update.ili_value
           )?;
           require!(
               change_pct <= MAX_CHANGE_PCT,
               ErrorCode::ILIChangeTooLarge
           );
       }
       
       // Validation 4: Verify multi-source data
       require!(
           ili_update.sources.len() >= 3,
           ErrorCode::InsufficientOracleSources
       );
       
       // Validation 5: Verify each oracle source
       for source in &ili_update.sources {
           verify/ Validation 1: Check update frequency
       require!(
           current_time - global_state.last_update >= MIN_UPDATE_INTERVAL,
           ErrorCode::UpdateTooFrequent
       );
       
       // Validation 2: Check ILI bounds
       require!(
           ili_update.ili_value >= MIN_ILI && ili_update.ili_value <= MAX_ILI,
           ErrorCode::ILIOutOfBounds
       );
       
       // Validation 3: Check change magnitude
       if global_state.ili > 0 {
           let change_pct = calculate_change_percene {
       pub ili_value: u64,
       pub sources: Vec<OracleData>, // Must have 3+ sources
       pub calculation_proof: Vec<u8>, // Proof of calculation
   }
   ```

**Phase 2: Implement On-Chain Validation (Week 3-5)**

1. Add validation to update_ili instruction
   ```rust
   pub fn update_ili(
       ctx: Context<UpdateILI>,
       ili_update: ILIUpdate,
   ) -> Result<()> {
       let global_state = &mut ctx.accounts.global_state;
       let current_time = Clock::get()?.unix_timestamp;
       
       /240; // 4 minutes minimum
   ```

2. Design multi-source verification
   ```rust
   #[derive(AnchorSerialize, AnchorDeserialize, Clone)]
   pub struct OracleData {
       pub source: Pubkey,      // Oracle program ID
       pub value: u64,          // Price/rate value
       pub confidence: u64,     // Confidence interval
       pub timestamp: i64,      // Data timestamp
       pub signature: [u8; 64], // Oracle signature
   }
   
   #[derive(AnchorSerialize, AnchorDeserialize, Clone)]
   pub struct ILIUpdatMax 50% change per update
   const MIN_UPDATE_INTERVAL: i64 = ast_update = Clock::get()?.unix_timestamp;
    Ok(())
}
```

**Risk Assessment**:
- **Severity**: Medium
- **Exploitability**: Low (requires compromised backend)
- **Impact**: Incorrect ILI could affect agent decisions
- **CVSS Score**: 5.5 (Medium)

#### Implementation Plan

**Phase 1: Design On-Chain Validation (Week 1-2)**

1. Define validation rules
   ```rust
   const MIN_ILI: u64 = 100;        // Minimum valid ILI
   const MAX_ILI: u64 = 10_000;     // Maximum valid ILI
   const MAX_CHANGE_PCT: u64 = 50;  // );
  const outliers = this.detectOutliers([pythPrice, switchboardPrice, birdeyePrice]);
  
  // Submit to on-chain without validation
  await this.submitILI(median);
}
```

```rust
// On-chain: No validation
pub fn update_ili(ctx: Context<UpdateILI>, ili_value: u64) -> Result<()> {
    // ISSUE: Accepts any value without validation
    let global_state = &mut ctx.accounts.global_state;
    global_state.ili = ili_value;
    global_state.ledian([pythPrice, switchboardPrice, birdeyePrice]mart Contract + Backend Team

#### Current State

**Location**: `backend/src/services/oracle-aggregator.ts`, `programs/ars-core/src/instructions/update_ili.rs`

**Current Implementation**:
```typescript
// Off-chain validation only
async aggregateOracleData() {
  const pythPrice = await this.pythClient.getPrice();
  const switchboardPrice = await this.switchboardClient.getPrice();
  const birdeyePrice = await this.birdeyeClient.getPrice();
  
  // Validation happens off-chain
  const median = this.calculateM