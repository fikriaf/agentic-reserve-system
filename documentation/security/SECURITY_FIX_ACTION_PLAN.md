# ARS Security Fix Action Plan

**Status:** IN PROGRESS  
**Target Completion:** 2 weeks  
**Priority:** CRITICAL - Block all deployments until complete

---

## Phase 1: Critical Issues (Week 1)

### ✅ Task 1.1: Fix Ed25519 Signature Verification

**Issue:** CRITICAL-01  
**Assignee:** Smart Contract Team  
**Estimated Time:** 3 days  

**Action Items:**
1. Remove hardcoded offset parsing
2. Use Solana's official Ed25519 instruction parsing
3. Add comprehensive unit tests
4. Test with multiple signature formats
5. Add integration tests with real Ed25519 instructions

**Implementation:**
```rust
// File: programs/ars-core/src/utils/signature.rs

use anchor_lang::prelude::*;
use anchor_lang::solana_program::ed25519_program;
use anchor_lang::solana_program::sysvar::instructions as sysvar_instructions;

pub fn validate_ed25519_signature(
    instructions_sysvar: &AccountInfo,
    expected_pubkey: &Pubkey,
    message: &[u8],
) -> Result<()> {
    let current_index = sysvar_instructions::load_current_index_checked(instructions_sysvar)?;
    
    require!(current_index > 0, ICBError::MissingSignatureVerification);
    
    let prev_index = current_index.saturating_sub(1);
    let prev_ix = sysvar_instructions::load_instruction_at_checked(
        prev_index as usize,
        instructions_sysvar,
    )?;
    
    require!(
        prev_ix.program_id == ed25519_program::ID,
        ICBError::InvalidSignatureProgram
    );
    
    // Parse Ed25519 instruction data properly
    // Format: [num_signatures: u16][padding: u16][signature: 64][pubkey: 32][message: var]
    require!(prev_ix.data.len() >= 100, ICBError::SignatureVerificationFailed);
    
    let num_signatures = u16::from_le_bytes([prev_ix.data[0], prev_ix.data[1]]);
    require!(num_signatures == 1, ICBError::SignatureVerificationFailed);
    
    // Extract signature (bytes 4-67)
    let signature = &prev_ix.data[4..68];
    
    // Extract public key (bytes 68-99)
    let pubkey = &prev_ix.data[68..100];
    
    // Verify public key matches expected
    require!(
        pubkey == expected_pubkey.as_ref(),
        ICBError::AgentMismatch
    );
    
    // Extract message (bytes 100+)
    let ix_message = &prev_ix.data[100..];
    
    // Verify message matches
    require!(
        ix_message == message,
        ICBError::SignatureVerificationFailed
    );
    
    msg!("Ed25519 signature verified for: {:?}", expected_pubkey);
    Ok(())
}
```

**Tests:**
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_valid_signature() {
        // Test with valid Ed25519 signature
    }
    
    #[test]
    fn test_invalid_pubkey() {
        // Test with wrong public key
    }
    
    #[test]
    fn test_invalid_message() {
        // Test with tampered message
    }
    
    #[test]
    fn test_missing_signature_instruction() {
        // Test without Ed25519 instruction
    }
}
```

**Acceptance Criteria:**
- [ ] All unit tests pass
- [ ] Integration tests with real Ed25519 instructions pass
- [ ] Code review approved
- [ ] Documentation updated

---

### ✅ Task 1.2: Implement Fixed-Point Quadratic Staking

**Issue:** CRITICAL-02  
**Assignee:** Smart Contract Team  
**Estimated Time:** 2 days  

**Action Items:**
1. Implement integer square root function
2. Add overflow/underflow checks
3. Test with edge cases
4. Benchmark performance

**Implementation:**
```rust
// File: programs/ars-core/src/math/fixed_point.rs

use anchor_lang::prelude::*;
use crate::errors::ICBError;

/// Calculate integer square root using Newton's method
/// Returns sqrt(n) rounded down to nearest integer
pub fn integer_sqrt(n: u64) -> Result<u64> {
    if n == 0 {
        return Ok(0);
    }
    
    if n < 4 {
        return Ok(1);
    }
    
    // Initial guess: n / 2
    let mut x = n / 2;
    let mut y = (x + n / x) / 2;
    
    // Newton's method iteration (max 64 iterations for u64)
    let mut iterations = 0;
    while y < x && iterations < 64 {
        x = y;
        y = (x + n / x) / 2;
        iterations += 1;
    }
    
    Ok(x)
}

/// Calculate quadratic voting power: sqrt(stake_amount)
/// Prevents whale dominance while rewarding larger stakes
pub fn calculate_voting_power(stake_amount: u64) -> Result<u64> {
    require!(stake_amount > 0, ICBError::InvalidStakeAmount);
    
    let voting_power = integer_sqrt(stake_amount)?;
    
    // Ensure voting power is non-zero for any non-zero stake
    let final_power = if voting_power == 0 { 1 } else { voting_power };
    
    Ok(final_power)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_integer_sqrt_edge_cases() {
        assert_eq!(integer_sqrt(0).unwrap(), 0);
        assert_eq!(integer_sqrt(1).unwrap(), 1);
        assert_eq!(integer_sqrt(4).unwrap(), 2);
        assert_eq!(integer_sqrt(9).unwrap(), 3);
        assert_eq!(integer_sqrt(16).unwrap(), 4);
        assert_eq!(integer_sqrt(100).unwrap(), 10);
        assert_eq!(integer_sqrt(10000).unwrap(), 100);
    }
    
    #[test]
    fn test_integer_sqrt_large_numbers() {
        assert_eq!(integer_sqrt(1_000_000).unwrap(), 1000);
        assert_eq!(integer_sqrt(1_000_000_000).unwrap(), 31622);
        assert_eq!(integer_sqrt(u64::MAX).unwrap(), 4294967295);
    }
    
    #[test]
    fn test_voting_power_monotonic() {
        // Voting power should increase with stake
        let power1 = calculate_voting_power(100).unwrap();
        let power2 = calculate_voting_power(400).unwrap();
        let power3 = calculate_voting_power(900).unwrap();
        
        assert!(power1 < power2);
        assert!(power2 < power3);
        assert_eq!(power1, 10);
        assert_eq!(power2, 20);
        assert_eq!(power3, 30);
    }
}
```

**Update vote_on_proposal instruction:**
```rust
// File: programs/ars-core/src/instructions/vote_on_proposal.rs

use crate::math::fixed_point::calculate_voting_power;

pub fn handler(
    ctx: Context<VoteOnProposal>,
    prediction: bool,
    stake_amount: u64,
    agent_signature: [u8; 64],
) -> Result<()> {
    // ... existing validation ...
    
    // Calculate voting power using fixed-point arithmetic
    let voting_power = calculate_voting_power(stake_amount)?;
    
    // Update proposal stakes
    if prediction {
        proposal.yes_stake = proposal.yes_stake
            .checked_add(voting_power)
            .ok_or(ICBError::ArithmeticOverflow)?;
    } else {
        proposal.no_stake = proposal.no_stake
            .checked_add(voting_power)
            .ok_or(ICBError::ArithmeticOverflow)?;
    }
    
    // ... rest of logic ...
    
    Ok(())
}
```

**Acceptance Criteria:**
- [ ] Integer sqrt function passes all tests
- [ ] Voting power calculation is deterministic
- [ ] No floating point operations
- [ ] Performance benchmarks acceptable
- [ ] Property-based tests pass

---

### ✅ Task 1.3: Add Reentrancy Guards to Vault Operations

**Issue:** CRITICAL-03  
**Assignee:** Smart Contract Team  
**Estimated Time:** 2 days  

**Action Items:**
1. Implement reentrancy guards in withdraw
2. Implement reentrancy guards in rebalance
3. Implement reentrancy guards in deposit
4. Add reentrancy attack tests
5. Follow Checks-Effects-Interactions pattern

**Implementation:**
```rust
// File: programs/ars-reserve/src/utils/security.rs

use anchor_lang::prelude::*;
use crate::errors::ReserveError;
use crate::state::ReserveVault;

/// Reentrancy guard macro
/// Usage: reentrancy_guard!(vault, { /* protected code */ })?;
#[macro_export]
macro_rules! reentrancy_guard {
    ($vault:expr, $code:block) => {{
        // Check: Ensure not locked
        require!(!$vault.locked, ReserveError::ReentrancyDetected);
        
        // Effect: Set lock
        $vault.locked = true;
        
        // Interaction: Execute protected code
        let result = (|| -> Result<()> { $code })();
        
        // Effect: Release lock (even if error occurred)
        $vault.locked = false;
        
        result
    }};
}
```

**Update withdraw instruction:**
```rust
// File: programs/ars-reserve/src/instructions/withdraw.rs

use crate::reentrancy_guard;

pub fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    // Reentrancy protection
    reentrancy_guard!(vault, {
        // Checks
        require!(amount > 0, ReserveError::InvalidAmount);
        require!(
            ctx.accounts.vault_token_account.amount >= amount,
            ReserveError::InsufficientVaultBalance
        );
        
        // Effects: Update state BEFORE external calls
        vault.total_value_usd = vault.total_value_usd
            .checked_sub(amount)
            .ok_or(ReserveError::ArithmeticUnderflow)?;
        
        // Interactions: External calls
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, amount)?;
        
        Ok(())
    })?;
    
    Ok(())
}
```

**Tests:**
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_reentrancy_protection() {
        // Attempt to call withdraw while locked
        // Should fail with ReentrancyDetected error
    }
    
    #[test]
    fn test_lock_released_on_error() {
        // Ensure lock is released even if operation fails
    }
}
```

**Acceptance Criteria:**
- [ ] All vault operations protected
- [ ] Reentrancy tests pass
- [ ] Lock always released (even on error)
- [ ] Checks-Effects-Interactions pattern followed

---

## Phase 2: High Severity Issues (Week 2)

### ✅ Task 2.1: Add Proposal Counter Overflow Protection

**Issue:** HIGH-01  
**Estimated Time:** 1 day  

**Implementation:**
```rust
// File: programs/ars-core/src/instructions/create_proposal.rs

pub fn handler(
    ctx: Context<CreateProposal>,
    policy_type: PolicyType,
    policy_params: Vec<u8>,
    duration: i64,
) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    
    // Check for overflow BEFORE incrementing
    let new_id = global_state.proposal_counter
        .checked_add(1)
        .ok_or(ICBError::CounterOverflow)?;
    
    // Validate proposal parameters
    require!(duration > 0 && duration <= MAX_VOTING_PERIOD, ICBError::InvalidVotingPeriod);
    require!(policy_params.len() <= PolicyProposal::MAX_PARAMS_LEN, ICBError::InvalidPolicyParams);
    
    // Update counter
    global_state.proposal_counter = new_id;
    
    // Initialize proposal
    let proposal = &mut ctx.accounts.proposal;
    proposal.id = new_id;
    // ... rest of initialization ...
    
    Ok(())
}
```

---

### ✅ Task 2.2: Implement Oracle Data Validation

**Issue:** HIGH-02  
**Estimated Time:** 1 day  

**Implementation:**
```rust
// File: programs/ars-core/src/constants.rs

// Oracle validation bounds
pub const MIN_ILI: u64 = 0;
pub const MAX_ILI: u64 = 10_000; // 10,000 max ILI
pub const MAX_YIELD_BPS: u32 = 5_000; // 50% max yield
pub const MAX_VOLATILITY_BPS: u32 = 10_000; // 100% max volatility
pub const MAX_TVL: u64 = 1_000_000_000_000_000; // $1 quadrillion

// File: programs/ars-core/src/instructions/update_ili.rs

pub fn handler(
    ctx: Context<UpdateILI>,
    ili_value: u64,
    avg_yield: u32,
    volatility: u32,
    tvl: u64,
) -> Result<()> {
    // Validate all oracle inputs
    require!(
        ili_value >= MIN_ILI && ili_value <= MAX_ILI,
        ICBError::InvalidILIValue
    );
    
    require!(
        avg_yield <= MAX_YIELD_BPS,
        ICBError::InvalidYield
    );
    
    require!(
        volatility <= MAX_VOLATILITY_BPS,
        ICBError::InvalidVolatility
    );
    
    require!(
        tvl <= MAX_TVL,
        ICBError::InvalidTVL
    );
    
    // ... rest of logic ...
}
```

---

### ✅ Task 2.3: Add Proposal Rate Limiting

**Issue:** HIGH-03  
**Estimated Time:** 1 day  

**Implementation:**
```rust
// File: programs/ars-core/src/state.rs

pub struct AgentRegistry {
    // ... existing fields ...
    pub proposals_created: u64,
    pub last_proposal_time: i64,
}

// File: programs/ars-core/src/instructions/create_proposal.rs

pub const PROPOSAL_COOLDOWN: i64 = 86400; // 24 hours

pub fn handler(/* ... */) -> Result<()> {
    let agent = &mut ctx.accounts.agent_registry;
    let clock = Clock::get()?;
    
    // Rate limit check
    let time_since_last = clock.unix_timestamp - agent.last_proposal_time;
    require!(
        time_since_last >= PROPOSAL_COOLDOWN,
        ICBError::ProposalRateLimitExceeded
    );
    
    // Update agent state
    agent.last_proposal_time = clock.unix_timestamp;
    agent.proposals_created = agent.proposals_created
        .checked_add(1)
        .ok_or(ICBError::ArithmeticOverflow)?;
    
    // ... rest of logic ...
}
```

---

### ✅ Task 2.4: Add Slippage Protection to Rebalancing

**Issue:** HIGH-04  
**Estimated Time:** 2 days  

**Implementation:**
```rust
// File: programs/ars-reserve/src/instructions/rebalance.rs

pub fn handler(
    ctx: Context<Rebalance>,
    max_slippage_bps: u16, // e.g., 100 = 1%
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    // Reentrancy protection
    reentrancy_guard!(vault, {
        // Calculate expected swap output
        let expected_output = calculate_expected_output(/* ... */)?;
        
        // Calculate minimum acceptable output
        let min_output = expected_output
            .checked_mul(10000 - max_slippage_bps as u64)
            .ok_or(ReserveError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(ReserveError::ArithmeticUnderflow)?;
        
        // Execute swap (via Jupiter CPI)
        let actual_output = execute_jupiter_swap(
            ctx.accounts,
            amount,
            min_output,
        )?;
        
        // Verify slippage tolerance
        require!(
            actual_output >= min_output,
            ReserveError::SlippageExceeded
        );
        
        // Update vault state
        update_vault_composition(vault, actual_output)?;
        
        Ok(())
    })?;
    
    Ok(())
}
```

---

### ✅ Task 2.5: Fix Epoch Supply Cap Enforcement

**Issue:** HIGH-05  
**Estimated Time:** 1 day  

**Implementation:**
```rust
// File: programs/ars-token/src/instructions/mint_icu.rs

pub fn handler(
    ctx: Context<MintICU>,
    amount: u64,
    reasoning_hash: [u8; 32],
) -> Result<()> {
    let token_state = &mut ctx.accounts.token_state;
    let clock = Clock::get()?;
    
    // Auto-transition epoch if needed
    if clock.unix_timestamp >= token_state.epoch_start_time + token_state.epoch_duration {
        start_new_epoch_internal(token_state, &clock)?;
    }
    
    // Calculate max mintable (2% of supply at epoch start)
    let max_mint = token_state.total_supply_at_epoch_start
        .checked_mul(token_state.mint_burn_cap_bps as u64)
        .ok_or(TokenError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TokenError::ArithmeticUnderflow)?;
    
    // ATOMIC check: verify new total doesn't exceed cap
    let new_epoch_minted = token_state.epoch_minted
        .checked_add(amount)
        .ok_or(TokenError::ArithmeticOverflow)?;
    
    require!(
        new_epoch_minted <= max_mint,
        TokenError::MintCapExceeded
    );
    
    // Update state BEFORE minting (Checks-Effects-Interactions)
    token_state.epoch_minted = new_epoch_minted;
    
    // Mint tokens
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.to.to_account_info(),
        authority: ctx.accounts.token_state.to_account_info(),
    };
    
    let seeds = &[
        b"token_state",
        &[token_state.bump],
    ];
    let signer = &[&seeds[..]];
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    token::mint_to(cpi_ctx, amount)?;
    
    // Emit event
    emit!(MintBurnEvent {
        event_type: "mint".to_string(),
        amount,
        reasoning_hash,
        timestamp: clock.unix_timestamp,
        epoch: token_state.current_epoch,
    });
    
    Ok(())
}
```

---

## Testing Plan

### Unit Tests
- [ ] All critical functions have unit tests
- [ ] Edge cases covered (0, 1, MAX values)
- [ ] Error cases tested
- [ ] 90%+ code coverage

### Integration Tests
- [ ] Full governance workflow
- [ ] Vault operations with real tokens
- [ ] Token minting/burning across epochs
- [ ] Circuit breaker scenarios

### Property-Based Tests
- [ ] VHR calculation properties
- [ ] Voting power monotonicity
- [ ] Supply cap enforcement
- [ ] Arithmetic overflow/underflow

### Security Tests
- [ ] Reentrancy attack attempts
- [ ] Signature replay attacks
- [ ] Oracle manipulation attempts
- [ ] Rate limit bypass attempts

---

## Timeline

**Week 1:**
- Days 1-3: Fix CRITICAL-01 (Ed25519 signatures)
- Days 4-5: Fix CRITICAL-02 (Quadratic staking)
- Days 6-7: Fix CRITICAL-03 (Reentrancy guards)

**Week 2:**
- Day 1: Fix HIGH-01 (Counter overflow)
- Day 2: Fix HIGH-02 (Oracle validation)
- Day 3: Fix HIGH-03 (Rate limiting)
- Days 4-5: Fix HIGH-04 (Slippage protection)
- Day 6: Fix HIGH-05 (Epoch caps)
- Day 7: Final testing and review

---

## Success Criteria

- [ ] All CRITICAL issues resolved
- [ ] All HIGH issues resolved
- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Ready for devnet deployment

---

## Next Steps After Fixes

1. Deploy to devnet
2. Run integration tests on devnet
3. Monitor for 2 weeks
4. Engage external auditor
5. Fix audit findings
6. Deploy to mainnet (with TVL caps)

---

**Status:** Ready to begin implementation  
**Last Updated:** February 7, 2026
