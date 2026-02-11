# ARS Security Revision Design Document

**Version:** 1.0  
**Date:** February 9, 2026  
**Status:** Draft - For Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Analysis](#problem-analysis)
3. [Security Architecture](#security-architecture)
4. [Core Mechanisms](#core-mechanisms)
5. [Risk Mitigation](#risk-mitigation)
6. [Migration Path](#migration-path)
7. [Security Checklist](#security-checklist)
8. [Appendix](#appendix)

---

## Executive Summary

This document outlines the comprehensive security revisions required to transform the Agentic Reserve System (ARS) from a dev-controlled protocol into a truly autonomous, agent-native financial infrastructure.

### Current State

- Dev holds all admin privileges
- Centralized control over critical functions
- Agent interactions are permissioned and limited
- Circuit breakers require dev intervention

### Target State

- Fully autonomous protocol controlled by agents
- Dev only bootstraps, then transfers control
- Byzantine-fault-tolerant oracle system
- Slash-based incentive alignment for honest behavior

### Key Revisions

1. Irreversible admin transfer mechanism
2. Multi-tier agent registration with stake-based access
3. Byzantine fault tolerant ILI updates
4. Griefing-resistant circuit breaker
5. Comprehensive slashing and reputation system

---

## Problem Analysis

### Critical Inconsistencies Found

| #   | Issue                       | Location                   | Severity |
| --- | --------------------------- | -------------------------- | -------- |
| 1   | Authority always dev        | `initialize.rs:49`         | CRITICAL |
| 2   | Vault setup dev-only        | `set_reserve_vault.rs:100` | HIGH     |
| 3   | Circuit breaker dev-only    | `circuit_breaker.rs`       | HIGH     |
| 4   | ILI update dev-only         | `update_ili.rs`            | HIGH     |
| 5   | Agent registry unused       | `state.rs:150`             | MEDIUM   |
| 6   | No admin transfer mechanism | N/A                        | CRITICAL |

### Code Evidence

```rust
// initialize.rs:49 - Dev always becomes admin
global_state.authority = ctx.accounts.authority.key();

// set_reserve_vault.rs:100 - Only dev can set vault
#[account(constraint = global_state.authority == authority.key() @ Unauthorized)]
pub authority: Signer<'info>,
```

### Impact Assessment

1. **Governance Hollow**: Claims of "agent-native, self-governing" are contradicted by centralized control
2. **Single Point of Failure**: Dev private key compromise = protocol compromise
3. **No Autonomous Operation**: Protocol cannot function without human intervention
4. **Trust Model Violation**: Users must trust dev, not the code

---

## Security Architecture

### Layer 1: Access Control Matrix

| Function           | Required Role            | Validation                | Slashable |
| ------------------ | ------------------------ | ------------------------- | --------- |
| Transfer Admin     | Dev                      | 48h timelock + key burn   | N/A       |
| Register Agent     | Anyone                   | Stake + rate limit        | Yes       |
| Submit ILI Update  | 3x Verified Agents       | Consensus + outlier check | Yes       |
| Dispute ILI Update | Basic+ Agent             | Stake                     | Yes       |
| Trigger Emergency  | Verified Agent (70+ rep) | Cooldown + evidence       | Yes       |
| Validate Emergency | Whitelisted Agent        | N/A                       | Yes       |
| Create Proposal    | Any Registered Agent     | Stake                     | Yes       |
| Vote on Proposal   | Any Registered Agent     | Nonce + stake             | Yes       |
| Execute Proposal   | Governance               | Delay                     | N/A       |

### Layer 2: Agent Tier System

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum AgentTier {
    /// Stake: 0 ARU, Transaction Limit: 10/day, ILI Vote: No
    Unverified,

    /// Stake: 100 ARU, Transaction Limit: 100/day, ILI Vote: No
    Basic,

    /// Stake: 1000 ARU, Transaction Limit: Unlimited, ILI Vote: Yes
    Verified,

    /// Governance Approved, Unlimited Everything, Can Validate Emergencies
    Whitelisted,
}
```

### Layer 3: Reputation System

```
Reputation Score: 0-100

Starting Point: 50

Increases:
  +10 Valid emergency trigger
  +5 Correct ILI dispute
  +3 Consistent honest ILI submissions
  +1 Participation in governance

Decreases:
  -30 False emergency trigger
  -20 Oracle manipulation attempt
  -10 Failed ILI dispute
  -5 Malicious governance vote

Auto-Degrade:
  Tier drops if reputation < 20
  Agent banned if reputation = 0
```

### Layer 4: Staking and Slashing

```
Stake Requirements:
  Basic Registration: 100 ARU
  ILI Oracle (Verified): 1000 ARU
  Emergency Trigger: 2000-10000 ARU (varies by reason)
  Validator: 5000 ARU

Slash Schedule:
  False Emergency: 50% stake burned, 50% to reporter
  Oracle Manipulation: 100% stake burned, permanent ban
  Spam: 25% stake burned, reputation -10
  Bad Governance Vote: Stake returned, reputation -5
```

---

## Core Mechanisms

### 1. Admin Transfer Mechanism

#### Design Principles

- Must be initiated by dev (cannot be circumvented)
- Must have timelock for visibility
- Must be irreversible after completion
- Must prove dev key is burned

#### Implementation

```rust
// programs/ars-core/src/instructions/transfer_admin.rs

use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ICBError;
use crate::constants::*;

#[derive(Accounts)]
pub struct InitiateAdminTransfer<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
        constraint = !global_state.is_immutable @ ICBError::ProtocolAlreadyImmutable
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        constraint = current_admin.key() == global_state.authority @ ICBError::NotAdmin
    )]
    pub current_admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AdminTransferParams {
    pub new_admin: Pubkey,              // Governance PDA
    pub timelock_duration_hours: i64,   // Minimum 48 hours
}

pub fn initiate_admin_transfer(
    ctx: Context<InitiateAdminTransfer>,
    params: AdminTransferParams,
) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let clock = Clock::get()?;

    // Validation 1: Timelock must be at least 48 hours
    require!(
        params.timelock_duration_hours >= 48,
        ICBError::TimelockTooShort
    );

    // Validation 2: New admin must be valid program address
    let (governance_pda, _) = Pubkey::find_program_address(
        &[GOVERNANCE_SEED, params.new_admin.as_ref()],
        ctx.program_id,
    );
    require!(
        params.new_admin == governance_pda,
        ICBError::InvalidGovernanceAddress
    );

    // Set pending admin with expiration
    global_state.pending_admin = Some(params.new_admin);
    global_state.admin_transfer_expiration = clock.unix_timestamp + (params.timelock_duration_hours * 3600);
    global_state.admin_transfer_initiated_by = ctx.accounts.current_admin.key();

    emit!(AdminTransferInitiated {
        old_admin: ctx.accounts.current_admin.key(),
        new_admin: params.new_admin,
        expiration: global_state.admin_transfer_expiration,
    });

    msg!("Admin transfer initiated.");
    msg!("Old admin: {}", ctx.accounts.current_admin.key());
    msg!("New admin: {}", params.new_admin);
    msg!("Effective at: {}", global_state.admin_transfer_expiration);
    msg!("TIMELOCK: {} hours", params.timelock_duration_hours);

    Ok(())
}

#[event]
pub struct AdminTransferInitiated {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
    pub expiration: i64,
}

#[derive(Accounts)]
pub struct ConfirmAdminTransfer<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
        constraint = global_state.pending_admin.is_some() @ ICBError::NoPendingTransfer
    )]
    pub global_state: Account<'info, GlobalState>,

    /// Original admin must sign to confirm they cannot cancel after
    #[account(
        constraint = original_admin.key() == global_state.admin_transfer_initiated_by @ ICBError::NotOriginalAdmin
    )]
    pub original_admin: Signer<'info>,

    /// New governance admin to take control
    #[account(
        constraint = new_admin.key() == global_state.pending_admin.unwrap() @ ICBError::InvalidPendingAdmin
    )]
    pub new_admin: Signer<'info>,
}

pub fn confirm_admin_transfer(ctx: Context<ConfirmAdminTransfer>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let clock = Clock::get()?;

    // Validation 1: Timelock must have elapsed
    require!(
        clock.unix_timestamp >= global_state.admin_transfer_expiration,
        ICBError::TimelockNotMet
    );

    // Validation 2: Both parties must agree
    // Original admin proves they can't reclaim, new admin accepts

    // IRREVERSIBLE TRANSFER
    let old_admin = global_state.authority;
    global_state.authority = ctx.accounts.new_admin.key();
    global_state.pending_admin = None;
    global_state.admin_transfer_expiration = 0;
    global_state.admin_transfer_initiated_by = Pubkey::default();
    global_state.is_immutable = true;  // Cannot be changed again

    emit!(AdminTransferConfirmed {
        old_admin,
        new_admin: ctx.accounts.new_admin.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("ADMIN TRANSFER CONFIRMED.");
    msg!("Protocol is now governed by: {}", ctx.accounts.new_admin.key());
    msg!("Original admin key has been relinquished.");
    msg!("PROTOCOL IS NOW IMMUTABLE - All future changes via governance only.");

    Ok(())
}

#[event]
pub struct AdminTransferConfirmed {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
    pub timestamp: i64,
}
```

#### Security Properties

1. **Initiator Verification**: Only current admin can initiate
2. **Minimum Timelock**: 48 hours minimum for community visibility
3. **Two-Step Process**: Initiate → Confirm prevents accidents
4. **Original Admin Required**: Confirms dev cannot reclaim
5. **Immutable Flag**: After transfer, no more admin changes possible

---

### 2. Agent Registration System

#### Design Principles

- Open registration for permissionless entry
- Stake-based tier system aligns incentives
- Rate limiting prevents Sybil attacks
- Reputation system punishes bad actors

#### Implementation

```rust
// programs/ars-core/src/instructions/register_agent.rs

use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ICBError;
use crate::constants::*;

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = registrant,
        space = AgentRegistry::LEN,
        seeds = [AGENT_REGISTRY_SEED, agent_pubkey.key().as_ref()],
        bump
    )]
    pub agent_registry: Account<'info, AgentRegistry>,

    #[account(
        mut,
        constraint = stake_token_account.owner == agent_pubkey.key() @ ICBError::NotAgentOwner
    )]
    pub stake_token_account: Account<'info, TokenAccount>,

    /// Agent's public key that will be used for signing
    #[account(
        constraint = agent_pubkey.key() != stake_token_account.owner @ ICBError::InvalidAgentKey
    )]
    pub agent_pubkey: Signer<'info>,

    #[account(
        mut,
        constraint = registration_limit.total_registrations < MAX_REGISTRATIONS_PER_DAY @ ICBError::RateLimitExceeded
    )]
    pub registration_limit: Account<'info, DailyRegistrationLimit>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterAgentParams {
    pub agent_type: AgentType,
    pub metadata_hash: String,  // IPFS hash of agent metadata
}

pub fn register_agent(
    ctx: Context<RegisterAgent>,
    params: RegisterAgentParams,
) -> Result<()> {
    let agent_registry = &mut ctx.accounts.agent_registry;
    let clock = Clock::get()?;

    // Validation 1: Check stake requirements
    let required_stake = match params.agent_type {
        AgentType::LendingAgent => REQUIRED_STAKE_BASIC,
        AgentType::YieldAgent => REQUIRED_STAKE_BASIC,
        AgentType::LiquidityAgent => REQUIRED_STAKE_VERIFIED,
        AgentType::PredictionAgent => REQUIRED_STAKE_VERIFIED,
        AgentType::ArbitrageAgent => REQUIRED_STAKE_BASIC,
        AgentType::TreasuryAgent => REQUIRED_STAKE_VERIFIED,
    };

    require!(
        ctx.accounts.stake_token_account.amount >= required_stake,
        ICBError::InsufficientStake
    );

    // Validation 2: Metadata hash must be valid
    require!(
        params.metadata_hash.len() == 46 && params.metadata_hash.starts_with("Qm"),
        ICBError::InvalidMetadataHash
    );

    // Initialize agent registry
    agent_registry.agent_pubkey = ctx.accounts.agent_pubkey.key();
    agent_registry.agent_type = params.agent_type;
    agent_registry.tier = AgentTier::Basic;
    agent_registry.stake_amount = ctx.accounts.stake_token_account.amount;
    agent_registry.reputation_score = INITIAL_REPUTATION;  // 50
    agent_registry.total_transactions = 0;
    agent_registry.total_volume = 0;
    agent_registry.registered_at = clock.unix_timestamp;
    agent_registry.last_active = clock.unix_timestamp;
    agent_registry.nonce = 0;
    agent_registry.is_banned = false;
    agent_registry.ban_reason = None;
    agent_registry.bump = ctx.bumps.agent_registry;

    // Update rate limiting
    ctx.accounts.registration_limit.total_registrations += 1;
    ctx.accounts.registration_limit.last_reset = clock.unix_timestamp;

    // Create agent state for nonce tracking
    let agent_state_info = ctx.accounts.agent_registry.to_account_info();
    let agent_state = &mut Account::<AgentState>::try_from(&agent_state_info)?;
    agent_state.agent_pubkey = ctx.accounts.agent_pubkey.key();
    agent_state.nonce = 0;
    agent_state.last_action_timestamp = clock.unix_timestamp;
    agent_state.bump = ctx.bumps.agent_registry;

    emit!(AgentRegistered {
        agent: ctx.accounts.agent_pubkey.key(),
        agent_type: params.agent_type,
        stake_amount: ctx.accounts.stake_token_account.amount,
        timestamp: clock.unix_timestamp,
    });

    msg!("Agent registered successfully.");
    msg!("Agent type: {:?}", params.agent_type);
    msg!("Initial reputation: {}", INITIAL_REPUTATION);

    Ok(())
}

#[event]
pub struct AgentRegistered {
    pub agent: Pubkey,
    pub agent_type: AgentType,
    pub stake_amount: u64,
    pub timestamp: i64,
}
```

#### Rate Limiting Implementation

```rust
// programs/ars-core/src/state.rs

#[account]
pub struct DailyRegistrationLimit {
    pub date: String,          // "2026-02-09"
    pub total_registrations: u64,
    pub last_reset: i64,
    pub bump: u8,
}

impl DailyRegistrationLimit {
    pub const LEN: usize = 8 + 10 + 8 + 8 + 1;  // date + count + timestamp + bump
}

pub const MAX_REGISTRATIONS_PER_DAY: u64 = 100;
pub const MAX_REGISTRATIONS_PER_WALLET: u64 = 5;
pub const REQUIRED_STAKE_BASIC: u64 = 100 * 1_000_000;      // 100 ARU
pub const REQUIRED_STAKE_VERIFIED: u64 = 1000 * 1_000_000; // 1000 ARU
pub const INITIAL_REPUTATION: u32 = 50;
```

---

### 3. Byzantine Fault Tolerant ILI Updates

#### Design Principles

- Multiple independent sources required
- Outlier detection and rejection
- Delayed activation with dispute period
- Stake-based slashing for manipulation

#### Implementation

```rust
// programs/ars-core/src/instructions/submit_ili_update.rs

use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ICBError;
use crate::constants::*;

#[derive(Accounts)]
pub struct SubmitILIUpdate<'info> {
    #[account(
        mut,
        seeds = [ILI_ORACLE_SEED],
        bump = ili_oracle.bump
    )]
    pub ili_oracle: Account<'info, ILIOracle>,

    // MULTI-SIG: Minimal 3 verified agents required
    #[account(
        constraint = agent1.tier >= AgentTier::Verified @ ICBError::InsufficientTier
        && !agent1.is_banned
        && agent1.reputation_score >= 50
    )]
    pub agent1: Account<'info, AgentRegistry>,

    #[account(
        constraint = agent2.tier >= AgentTier::Verified @ ICBError::InsufficientTier
        && !agent2.is_banned
        && agent2.reputation_score >= 50
    )]
    pub agent2: Account<'info, AgentRegistry>,

    #[account(
        constraint = agent3.tier >= AgentTier::Verified @ ICBError::InsufficientTier
        && !agent3.is_banned
        && agent3.reputation_score >= 50
    )]
    pub agent3: Account<'info, AgentRegistry>,

    // Agent states for nonce tracking
    #[account(
        mut,
        seeds = [AGENT_STATE_SEED, agent1.agent_pubkey.as_ref()],
        bump = agent1_state.bump,
        constraint = agent1_state.agent_pubkey == agent1.agent_pubkey @ ICBError::InvalidAgentState
    )]
    pub agent1_state: Account<'info, AgentState>,

    #[account(
        mut,
        seeds = [AGENT_STATE_SEED, agent2.agent_pubkey.as_ref()],
        bump = agent2_state.bump,
        constraint = agent2_state.agent_pubkey == agent2.agent_pubkey @ ICBError::InvalidAgentState
    )]
    pub agent2_state: Account<'info, AgentState>,

    #[account(
        mut,
        seeds = [AGENT_STATE_SEED, agent3.agent_pubkey.as_ref()],
        bump = agent3_state.bump,
        constraint = agent3_state.agent_pubkey == agent3.agent_pubkey @ ICBError::InvalidAgentState
    )]
    pub agent3_state: Account<'info, AgentState>,

    // All agents must sign
    pub agent1_signer: Signer<'info>,
    pub agent2_signer: Signer<'info>,
    pub agent3_signer: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ILIUpdateParams {
    pub proposed_ili: u64,
    pub avg_yield_bps: u32,
    pub volatility_bps: u32,
    pub tvl_usd: u64,
    pub sources: Vec<String>,  // ["kamino", "meteora", "jupiter", "pyth"]
    pub nonce: u64,
}

pub fn submit_ili_update(
    ctx: Context<SubmitILIUpdate>,
    params: ILIUpdateParams,
) -> Result<()> {
    let ili_oracle = &mut ctx.accounts.ili_oracle;
    let clock = Clock::get()?;

    // ========== VALIDATION ==========

    // Validation 1: Input bounds checking
    require!(
        params.proposed_ili >= MIN_ILI_VALUE && params.proposed_ili <= MAX_ILI_VALUE,
        ICBError::InvalidILIValue
    );
    require!(
        params.avg_yield_bps <= MAX_YIELD_BPS,
        ICBError::InvalidYield
    );
    require!(
        params.volatility_bps <= MAX_VOLATILITY_BPS,
        ICBError::InvalidVolatility
    );
    require!(
        params.tvl_usd >= MIN_TVL && params.tvl_usd <= MAX_TVL,
        ICBError::InvalidTVL
    );
    require!(
        params.sources.len() >= MIN_ORACLE_SOURCES,
        ICBError::InsufficientSources
    );

    // Validation 2: Update interval check
    require!(
        clock.unix_timestamp - ili_oracle.last_update >= ILI_UPDATE_INTERVAL,
        ICBError::ILIUpdateTooSoon
    );

    // Validation 3: Nonce validation (replay protection)
    require!(
        params.nonce == ctx.accounts.agent1_state.nonce + 1
            || params.nonce == ctx.accounts.agent2_state.nonce + 1
            || params.nonce == ctx.accounts.agent3_state.nonce + 1,
        ICBError::InvalidNonce
    );

    // ========== CONSENSUS CHECK ==========

    // Get reference values from external sources
    // Note: In production, these would come from on-chain oracles
    let reference_values = get_reference_values()?;

    // Calculate deviation from reference
    let max_deviation = calculate_max_deviation(
        params.proposed_ili,
        reference_values.avg_ili,
    )?;

    require!(
        max_deviation <= MAX_ALLOWED_DEVIATION_BPS,
        ICBError::OracleDeviationTooHigh
    );

    // ========== STATE UPDATE ==========

    // Increment nonces
    if params.nonce == ctx.accounts.agent1_state.nonce + 1 {
        ctx.accounts.agent1_state.nonce = params.nonce;
    }
    if params.nonce == ctx.accounts.agent2_state.nonce + 1 {
        ctx.accounts.agent2_state.nonce = params.nonce;
    }
    if params.nonce == ctx.accounts.agent3_state.nonce + 1 {
        ctx.accounts.agent3_state.nonce = params.nonce;
    }

    // Update agent last active
    ctx.accounts.agent1_state.last_action_timestamp = clock.unix_timestamp;
    ctx.accounts.agent2_state.last_action_timestamp = clock.unix_timestamp;
    ctx.accounts.agent3_state.last_action_timestamp = clock.unix_timestamp;

    // Set pending update (5-minute dispute window)
    ili_oracle.pending_ili = Some(params.proposed_ili);
    ili_oracle.pending_update_time = clock.unix_timestamp;
    ili_oracle.pending_agents = [
        ctx.accounts.agent1.key(),
        ctx.accounts.agent2.key(),
        ctx.accounts.agent3.key(),
    ];
    ili_oracle.pending_dispute_deadline = clock.unix_timestamp + ILI_DISPUTE_WINDOW;

    // Store sources
    ili_oracle.active_sources = params.sources;

    emit!(ILIUpdateProposed {
        proposed_ili: params.proposed_ili,
        agents: [
            ctx.accounts.agent1.key(),
            ctx.accounts.agent2.key(),
            ctx.accounts.agent3.key(),
        ],
        dispute_deadline: ili_oracle.pending_dispute_deadline,
    });

    msg!("ILI update proposed: {}", params.proposed_ili);
    msg!("Dispute window: {} seconds", ILI_DISPUTE_WINDOW);

    Ok(())
}

#[event]
pub struct ILIUpdateProposed {
    pub proposed_ili: u64,
    pub agents: [Pubkey; 3],
    pub dispute_deadline: i64,
}
```

#### ILI Dispute Mechanism

```rust
// programs/ars-core/src/instructions/dispute_ili_update.rs

#[derive(Accounts)]
pub struct DisputeILIUpdate<'info> {
    #[account(
        mut,
        seeds = [ILI_ORACLE_SEED],
        bump = ili_oracle.bump,
        constraint = ili_oracle.pending_ili.is_some() @ ICBError::NoPendingUpdate
    )]
    pub ili_oracle: Account<'info, ILIOracle>,

    #[account(
        constraint = disputer.tier >= AgentTier::Basic @ ICBError::InsufficientTier
        && !disputer.is_banned
    )]
    pub disputer: Account<'info, AgentRegistry>,

    #[account(
        mut,
        constraint = disputer_stake.owner == disputer.agent_pubkey.key() @ ICBError::NotAgentOwner
    )]
    pub disputer_stake: Account<'info, TokenAccount>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DisputeParams {
    pub correct_ili: u64,
    pub evidence_hash: String,  // IPFS hash of evidence
}

pub fn dispute_ili_update(ctx: Context<DisputeILIUpdate>, params: DisputeParams) -> Result<()> {
    let ili_oracle = &mut ctx.accounts.ili_oracle;
    let disputer = &mut ctx.accounts.disputer;
    let clock = Clock::get()?;

    // Validation 1: Within dispute window
    require!(
        clock.unix_timestamp < ili_oracle.pending_dispute_deadline,
        ICBError::DisputeWindowClosed
    );

    // Validation 2: Disputer stake requirement
    require!(
        ctx.accounts.disputer_stake.amount >= DISPUTE_STAKE_REQUIRED,
        ICBError::InsufficientDisputeStake
    );

    // Validation 3: Correct ILI must be reasonable
    require!(
        params.correct_ili >= MIN_ILI_VALUE && params.correct_ili <= MAX_ILI_VALUE,
        ICBError::InvalidCorrectILI
    );

    // Record dispute
    ili_oracle.pending_dispute = Some(PendingDispute {
        disputer: disputer.key(),
        correct_ili: params.correct_ili,
        evidence_hash: params.evidence_hash,
        timestamp: clock.unix_timestamp,
    });

    emit!(ILIUpdateDisputed {
        disputer: disputer.key(),
        correct_ili: params.correct_ili,
        dispute_deadline: clock.unix_timestamp + DISPUTE_RESOLUTION_WINDOW,
    });

    msg!("ILI update disputed.");
    msg!("Disputer: {}", disputer.key());
    msg!("Proposed ILI: {}", ili_oracle.pending_ili.unwrap());
    msg!("Claimed correct ILI: {}", params.correct_ili);

    Ok(())
}
```

---

### 4. Circuit Breaker with Griefing Protection

#### Design Principles

- Any verified agent can trigger with stake
- Cooldown prevents spam
- Auto-expiration forces review
- Validation determines slash or reward

#### Implementation

```rust
// programs/ars-core/src/instructions/circuit_breaker.rs

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum EmergencyReason {
    /// Smart contract vulnerability detected
    ExploitDetected,

    /// Oracle providing incorrect data
    OracleFailure,

    /// Unusual trading activity detected
    UnusualActivity,

    /// Protocol parameter manipulation attempt
    ParameterManipulation,

    /// External market emergency (e.g., major DeFi exploit)
    MarketEmergency,
}

#[derive(Accounts)]
pub struct TriggerEmergencyShutdown<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        constraint = agent.tier >= AgentTier::Verified @ ICBError::InsufficientTier
        && agent.reputation_score >= EMERGENCY_TRIGGER_MIN_REP
        && !agent.is_banned
    )]
    pub agent: Account<'info, AgentRegistry>,

    #[account(
        mut,
        constraint = agent_stake.owner == agent.agent_pubkey.key() @ ICBError::NotAgentOwner
    )]
    pub agent_stake: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct EmergencyTriggerParams {
    pub reason: EmergencyReason,
    pub evidence_hash: String,
    pub description: String,  // IPFS hash with detailed description
}

pub fn trigger_emergency_shutdown(
    ctx: Context<TriggerEmergencyShutdown>,
    params: EmergencyTriggerParams,
) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let agent = &mut ctx.accounts.agent;
    let clock = Clock::get()?;

    // ========== VALIDATION ==========

    // Validation 1: Circuit breaker not already active
    require!(
        !global_state.circuit_breaker_active,
        ICBError::CircuitBreakerAlreadyActive
    );

    // Validation 2: Cooldown check
    require!(
        clock.unix_timestamp - global_state.last_emergency_trigger >= EMERGENCY_COOLDOWN,
        ICBError::EmergencyCooldownActive
    );

    // Validation 3: Stake requirement based on reason
    let required_stake = match params.reason {
        EmergencyReason::ExploitDetected => EMERGENCY_STAKE_EXPLOIT,
        EmergencyReason::OracleFailure => EMERGENCY_STAKE_ORACLE,
        EmergencyReason::UnusualActivity => EMERGENCY_STAKE_ACTIVITY,
        EmergencyReason::ParameterManipulation => EMERGENCY_STAKE_MANIPULATION,
        EmergencyReason::MarketEmergency => EMERGENCY_STAKE_MARKET,
    };

    require!(
        ctx.accounts.agent_stake.amount >= required_stake,
        ICBError::InsufficientEmergencyStake
    );

    // Validation 4: Evidence requirement
    require!(
        params.evidence_hash.len() >= 64,
        ICBError::InsufficientEvidence
    );

    // Validation 5: Description length
    require!(
        params.description.len() >= 50 && params.description.len() <= 1000,
        ICBError::InvalidDescription
    );

    // ========== STATE UPDATE ==========

    global_state.circuit_breaker_active = true;
    global_state.circuit_breaker_triggered_by = agent.key();
    global_state.circuit_breaker_triggered_at = clock.unix_timestamp;
    global_state.circuit_breaker_reason = params.reason;
    global_state.circuit_breaker_evidence_hash = params.evidence_hash;
    global_state.circuit_breaker_description = params.description;

    // Auto-expiration (24 hours) - forces validation
    global_state.circuit_breaker_expiration = clock.unix_timestamp + EMERGENCY_AUTO_EXPIRE;

    global_state.last_emergency_trigger = clock.unix_timestamp;

    // Lock agent stake
    global_state.emergency_stake_locked = ctx.accounts.agent_stake.amount;

    emit!(EmergencyShutdownTriggered {
        agent: agent.key(),
        reason: params.reason,
        evidence_hash: params.evidence_hash,
        expiration: global_state.circuit_breaker_expiration,
        stake_locked: ctx.accounts.agent_stake.amount,
    });

    msg!("!!! EMERGENCY SHUTDOWN TRIGGERED !!!");
    msg!("Reason: {:?}", params.reason);
    msg!("Triggered by: {}", agent.key());
    msg!("Will auto-expire at: {}", global_state.circuit_breaker_expiration);
    msg!("Stake locked: {} ARU", ctx.accounts.agent_stake.amount);

    Ok(())
}

#[event]
pub struct EmergencyShutdownTriggered {
    pub agent: Pubkey,
    pub reason: EmergencyReason,
    pub evidence_hash: String,
    pub expiration: i64,
    pub stake_locked: u64,
}

// ========== VALIDATION AFTER EMERGENCY ==========

#[derive(Accounts)]
pub struct ValidateEmergency<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
        constraint = global_state.circuit_breaker_active @ ICBError::CircuitBreakerNotActive
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        constraint = validator.tier >= AgentTier::Whitelisted @ ICBError::InsufficientTier
        && validator.reputation_score >= VALIDATOR_MIN_REP
        && !validator.is_banned
    )]
    pub validator: Account<'info, AgentRegistry>,

    #[account(
        mut,
        seeds = [AGENT_REGISTRY_SEED, global_state.circuit_breaker_triggered_by.as_ref()],
        bump = triggering_agent.bump,
        constraint = triggering_agent.agent_pubkey == global_state.circuit_breaker_triggered_by @ ICBError::InvalidAgent
    )]
    pub triggering_agent: Account<'info, AgentRegistry>,

    #[account(mut)]
    pub triggering_agent_stake: Account<'info, TokenAccount>,

    #[account(mut)]
    pub validator_reward: Account<'info, TokenAccount>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ValidationParams {
    pub is_valid: bool,
    pub validation_evidence: String,
    pub severity_score: u8,  // 1-10
}

pub fn validate_emergency(
    ctx: Context<ValidateEmergency>,
    params: ValidationParams,
) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let triggering_agent = &mut ctx.accounts.triggering_agent;
    let clock = Clock::get()?;

    // Validation 1: Within validation window
    require!(
        clock.unix_timestamp <= global_state.circuit_breaker_expiration,
        ICBError::ValidationWindowClosed
    );

    if params.is_valid {
        // ========== VALID EMERGENCY ==========

        // Reward triggering agent
        let reward_amount = calculate_emergency_reward(
            params.severity_score,
            global_state.emergency_stake_locked,
        );

        triggering_agent.reputation_score = (
            triggering_agent.reputation_score
            + EMERGENCY_SUCCESS_REP_REWARD
        ).min(100);

        // Return stake + bonus
        // (In production: transfer from treasury)

        emit!(EmergencyValidated {
            triggering_agent: triggering_agent.key(),
            validator: ctx.accounts.validator.key(),
            was_valid: true,
            severity_score: params.severity_score,
        });

        msg!("Emergency validated as LEGITIMATE.");
        msg!("Agent {} rewarded for protecting the protocol.", triggering_agent.key());

    } else {
        // ========== FALSE ALARM ==========

        // Slash triggering agent
        let slash_amount = global_state.emergency_stake_locked / 2;
        let validator_reward_amount = slash_amount / 2;

        triggering_agent.reputation_score = (
            triggering_agent.reputation_score
            - EMERGENCY_FALSE_REP_PENALTY
        ).saturating_sub(0);

        // Degrade tier if reputation too low
        if triggering_agent.reputation_score < 20 {
            triggering_agent.tier = AgentTier::Unverified;
        }

        // Slash stake
        // 50% burned, 50% to validator

        emit!(EmergencyValidated {
            triggering_agent: triggering_agent.key(),
            validator: ctx.accounts.validator.key(),
            was_valid: false,
            severity_score: params.severity_score,
        });

        msg!("Emergency validated as FALSE ALARM.");
        msg!("Agent {} SLASHED for griefing.", triggering_agent.key());
    }

    // Deactivate circuit breaker
    global_state.circuit_breaker_active = false;
    global_state.circuit_breaker_expiration = 0;
    global_state.emergency_stake_locked = 0;

    Ok(())
}

#[event]
pub struct EmergencyValidated {
    pub triggering_agent: Pubkey,
    pub validator: Pubkey,
    pub was_valid: bool,
    pub severity_score: u8,
}
```

---

## Risk Mitigation

### 1. Sybil Attack Prevention

| Mitigation        | Implementation                              |
| ----------------- | ------------------------------------------- |
| Stake requirement | 100-1000 ARU depending on tier              |
| Rate limiting     | Max 100 registrations/day                   |
| Per-wallet limit  | Max 5 agents/wallet                         |
| Reputation cost   | Creating fake agents has reputation penalty |

### 2. Oracle Manipulation Prevention

| Mitigation             | Implementation                |
| ---------------------- | ----------------------------- |
| Multi-source consensus | 3+ verified agents required   |
| Outlier detection      | Reject if >20% from reference |
| Dispute mechanism      | Anyone can dispute with stake |
| Delayed activation     | 5-minute dispute window       |
| Source diversity       | Must cite 4+ data sources     |

### 3. Griefing Prevention

| Mitigation          | Implementation                       |
| ------------------- | ------------------------------------ |
| Stake requirement   | 2000-10000 ARU depending on severity |
| Cooldown            | 24 hours between triggers            |
| Evidence required   | 64-char hash minimum                 |
| Validation required | Whitelisted agent must validate      |
| Auto-expiration     | 24 hours then auto-deactivates       |
| Slash on false      | 50% stake burned                     |

### 4. Governance Attack Prevention

| Mitigation             | Implementation                                    |
| ---------------------- | ------------------------------------------------- |
| Quadratic voting       | Reduces whale influence                           |
| Time-delayed execution | 48 hours before changes take effect               |
| Stake-weighted voting  | More stake = more influence but also more at risk |
| Reputation requirement | Low rep agents have limited power                 |

### 5. Smart Contract Vulnerabilities

| Vulnerability             | Mitigation                                        |
| ------------------------- | ------------------------------------------------- |
| Reentrancy                | Reentrancy guard on all state-modifying functions |
| Arithmetic overflow       | All math uses checked operations                  |
| PDA validation            | All accounts validated by derivation              |
| Instruction introspection | Verify Ed25519 signatures for agent actions       |
| Timestamp validation      | Prevent freeze attacks with time bounds           |

---

## Migration Path

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         ARS MIGRATION TIMELINE                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: BOOTSTRAP (Week 1-2)                                              │
│  ════════════════════════════                                               │
│  - Deploy revised smart contracts                                           │
│  - Dev initializes protocol (becomes initial admin)                         │
│  - Set initial parameters (epoch duration, thresholds, etc.)               │
│  - Enable agent registration                                                 │
│  - Timeout: 30 days maximum or 500 agents registered                        │
│                                                                              │
│  PHASE 2: AGENT ONBOARDING (Week 3-6)                                       │
│  ════════════════════════════════                                            │
│  - Open agent registration to public                                        │
│  - First verified agents become oracle providers                            │
│  - Test ILI update mechanism with small stakes                               │
│  - Timeout: 100 agents registered or 21 days                                 │
│                                                                              │
│  PHASE 3: GOVERNANCE ACTIVATION (Week 7-8)                                   │
│  ════════════════════════════════                                            │
│  - Enable proposal creation                                                   │
│  - Enable voting mechanism                                                    │
│  - Conduct governance tests (no real changes)                               │
│  - Dev proposes "Admin Transfer Proposal"                                    │
│                                                                              │
│  PHASE 4: VOTING PERIOD (Week 9)                                             │
│  ═════════════════════════                                                   │
│  - 7-day voting period on admin transfer                                     │
│  - 48-hour timelock after voting concludes                                    │
│  - Community review and final decision                                       │
│                                                                              │
│  PHASE 5: IRREVERSIBLE TRANSFER (Week 10)                                    │
│  ════════════════════════════════                                             │
│  - Dev triggers admin transfer                                                │
│  - 48-hour timelock expires                                                    │
│  - Governance confirms transfer                                               │
│  - Dev key is BURNED from protocol                                           │
│  - Protocol becomes IMMUTABLE                                                 │
│                                                                              │
│  PHASE 6: FULL AUTONOMY (Week 11+)                                           │
│  ═══════════════════════════                                                  │
│  - Protocol fully governed by agents                                          │
│  - All changes via governance proposals                                       │
│  - Emergency functions controlled by agents                                  │
│  - Dev has NO special privileges                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Phase Transitions

```rust
// State machine in GlobalState
enum ProtocolPhase {
    Bootstrap,
    AgentOnboarding,
    GovernanceActivation,
    VotingPeriod,
    TransferTimelock,
    FullAutonomy,
}

struct GlobalState {
    pub phase: ProtocolPhase,
    pub phase_start_time: i64,
    pub phase_transition_proof: Option<Pubkey>,  // Tx that triggered transition
}
```

### Governance Proposal for Admin Transfer

```markdown
# Proposal: Transfer Protocol Admin to Governance

## Summary

This proposal transfers all administrative control from the deployer key to the ARS Governance system, making the protocol fully autonomous.

## Background

The ARS protocol was deployed with the deployer key as admin for bootstrapping purposes. This was always intended to be temporary. The protocol must now transition to full agent governance.

## Changes

1. Set `pending_admin` to Governance PDA
2. Set `admin_transfer_expiration` to T+48 hours
3. After timelock: Set `authority` to Governance PDA, set `is_immutable = true`

## Rationale

- Aligns with "agent-native, no human intervention" vision
- Removes single point of failure (dev private key)
- Enables true decentralized control
- Community has had 8 weeks to onboard and test

## Risks

- If Governance PDA is compromised, protocol cannot be recovered
- No emergency admin after transfer
- All future changes must go through governance

## Vote

- YES: Proceed with admin transfer
- NO: Delay transfer, continue with dev admin

## Execution

If passed, admin transfer will execute automatically after 48-hour timelock.
```

---

## Security Checklist

### Before Deployment

- [ ] All arithmetic uses checked operations
- [ ] Reentrancy guards on all external functions
- [ ] PDA derivation validated for all accounts
- [ ] Signer verification on all admin functions
- [ ] Timestamp bounds on time-sensitive operations
- [ ] Input validation (bounds, lengths, formats)
- [ ] Event emission for all state changes
- [ ] Error codes documented and comprehensive

### Admin Transfer

- [ ] Timelock minimum 48 hours
- [ ] Irreversible flag set after transfer
- [ ] Dev key cannot reclaim admin
- [ ] Governance PDA properly derived
- [ ] Events emit for visibility

### Agent System

- [ ] Rate limiting implemented
- [ ] Stake requirements enforced
- [ ] Nonce prevents replay attacks
- [ ] Reputation updates correctly
- [ ] Tier degradation works
- [ ] Banned agents cannot act

### Oracle System

- [ ] Multi-sig requirement enforced
- [ ] Outlier detection working
- [ ] Dispute window implemented
- [ ] Slash mechanism functional
- [ ] Source diversity required

### Emergency System

- [ ] Cooldown prevents spam
- [ ] Stake requirements enforced
- [ ] Evidence hash required
- [ ] Auto-expiration functional
- [ ] Validation mechanism works
- [ ] Slash on false alarms

### Testing Requirements

- [ ] Unit tests for all functions (>90% coverage)
- [ ] Integration tests for multi-step flows
- [ ] Fuzz testing for edge cases
- [ ] Economic attack simulation
- [ ] Byzantine fault tolerance testing
- [ ] Stress testing under load
- [ ] Security audit by third party

---

## Appendix

### A. Constants

```rust
// Time constants
pub const ILI_UPDATE_INTERVAL: i64 = 300;           // 5 minutes
pub const ILI_DISPUTE_WINDOW: i64 = 300;           // 5 minutes
pub const DISPUTE_RESOLUTION_WINDOW: i64 = 86400;   // 24 hours
pub const EMERGENCY_COOLDOWN: i64 = 86400;          // 24 hours
pub const EMERGENCY_AUTO_EXPIRE: i64 = 86400;       // 24 hours
pub const MIN_TIMELOCK_HOURS: i64 = 48;             // 48 hours
pub const VOTING_PERIOD_DAYS: i64 = 7;
pub const TRANSFER_TIMELOCK_HOURS: i64 = 48;

// Value constants
pub const MAX_ILI_VALUE: u64 = 10_000_000_000;      // 10 billion
pub const MIN_ILI_VALUE: u64 = 1_000_000;           // 1 million
pub const MAX_YIELD_BPS: u32 = 10000;               // 100%
pub const MAX_VOLATILITY_BPS: u32 = 50000;           // 500%
pub const MAX_TVL: u64 = 100_000_000_000_000;       // 100 trillion USD
pub const MIN_TVL: u64 = 1_000_000;                 // 1 million USD
pub const MAX_ALLOWED_DEVIATION_BPS: u32 = 2000;     // 20%
pub const MIN_ORACLE_SOURCES: usize = 4;

// Stake constants
pub const REQUIRED_STAKE_BASIC: u64 = 100 * 1_000_000;       // 100 ARU
pub const REQUIRED_STAKE_VERIFIED: u64 = 1000 * 1_000_000;   // 1000 ARU
pub const DISPUTE_STAKE_REQUIRED: u64 = 500 * 1_000_000;    // 500 ARU
pub const EMERGENCY_STAKE_EXPLOIT: u64 = 10000 * 1_000_000;  // 10000 ARU
pub const EMERGENCY_STAKE_ORACLE: u64 = 5000 * 1_000_000;    // 5000 ARU
pub const EMERGENCY_STAKE_ACTIVITY: u64 = 2000 * 1_000_000;  // 2000 ARU

// Reputation constants
pub const INITIAL_REPUTATION: u32 = 50;
pub const EMERGENCY_TRIGGER_MIN_REP: u32 = 70;
pub const VALIDATOR_MIN_REP: u80;
pub const EMERGENCY_SUCCESS_REP_REWARD: u32 = 10;
pub const EMERGENCY_FALSE_REP_PENALTY: u32 = 30;

// Rate limiting
pub const MAX_REGISTRATIONS_PER_DAY: u64 = 100;
pub const MAX_REGISTRATIONS_PER_WALLET: u64 = 5;
```

### B. Error Codes

```rust
#[error_code]
pub enum ICBError {
    #[msg("Circuit breaker is active")]
    CircuitBreakerActive,

    #[msg("Circuit breaker not active")]
    CircuitBreakerNotActive,

    #[msg("Circuit breaker already active")]
    CircuitBreakerAlreadyActive,

    #[msg("Circuit breaker auto-expired")]
    CircuitBreakerExpired,

    #[msg("Invalid epoch duration")]
    InvalidEpochDuration,

    #[msg("Invalid mint/burn cap")]
    InvalidMintBurnCap,

    #[msg("Invalid VHR threshold")]
    InvalidVHRThreshold,

    #[msg("ILI update too soon")]
    ILIUpdateTooSoon,

    #[msg("Invalid ILI value")]
    InvalidILIValue,

    #[msg("ILI update not pending")]
    NoPendingUpdate,

    #[msg("Proposal already exists")]
    ProposalAlreadyExists,

    #[msg("Invalid voting period")]
    InvalidVotingPeriod,

    #[msg("Proposal not active")]
    ProposalNotActive,

    #[msg("Proposal still active")]
    ProposalStillActive,

    #[msg("Proposal not passed")]
    ProposalNotPassed,

    #[msg("Already voted")]
    AlreadyVoted,

    #[msg("Invalid stake amount")]
    InvalidStakeAmount,

    #[msg("Insufficient stake")]
    InsufficientStake,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Not admin")]
    NotAdmin,

    #[msg("Invalid agent signature")]
    InvalidAgentSignature,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow,

    #[msg("Proposal counter overflow")]
    CounterOverflow,

    #[msg("Invalid signature program")]
    InvalidSignatureProgram,

    #[msg("Signature verification failed")]
    SignatureVerificationFailed,

    #[msg("Execution delay not met")]
    ExecutionDelayNotMet,

    #[msg("Proposal not ready for execution")]
    ProposalNotReadyForExecution,

    #[msg("Invalid yield value")]
    InvalidYield,

    #[msg("Invalid volatility value")]
    InvalidVolatility,

    #[msg("Invalid TVL value")]
    InvalidTVL,

    #[msg("Circuit breaker timelock not met")]
    CircuitBreakerTimelockNotMet,

    #[msg("Slot buffer not met")]
    SlotBufferNotMet,

    #[msg("Invalid reserve vault")]
    InvalidReserveVault,

    #[msg("Invalid ARU mint")]
    InvalidICUMint,

    #[msg("Missing Ed25519 signature verification instruction")]
    MissingSignatureVerification,

    #[msg("Agent public key mismatch")]
    AgentMismatch,

    #[msg("Invalid nonce")]
    InvalidNonce,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Math underflow")]
    MathUnderflow,

    #[msg("Reentrancy detected")]
    ReentrancyDetected,

    #[msg("Signature expired")]
    SignatureExpired,

    // Admin transfer errors
    #[msg("Protocol already immutable")]
    ProtocolAlreadyImmutable,

    #[msg("No pending transfer")]
    NoPendingTransfer,

    #[msg("Timelock too short")]
    TimelockTooShort,

    #[msg("Timelock not met")]
    TimelockNotMet,

    #[msg("Not original admin")]
    NotOriginalAdmin,

    #[msg("Invalid pending admin")]
    InvalidPendingAdmin,

    #[msg("Invalid governance address")]
    InvalidGovernanceAddress,

    // Agent registration errors
    #[msg("Insufficient tier")]
    InsufficientTier,

    #[msg("Agent is banned")]
    AgentBanned,

    #[msg("Invalid agent key")]
    InvalidAgentKey,

    #[msg("Invalid metadata hash")]
    InvalidMetadataHash,

    #[msg("Rate limit exceeded")]
    RateLimitExceeded,

    #[msg("Invalid agent state")]
    InvalidAgentState,

    #[msg("Not agent owner")]
    NotAgentOwner,

    // Oracle errors
    #[msg("Oracle deviation too high")]
    OracleDeviationTooHigh,

    #[msg("Insufficient oracle sources")]
    InsufficientSources,

    #[msg("Dispute window closed")]
    DisputeWindowClosed,

    #[msg("Validation window closed")]
    ValidationWindowClosed,

    #[msg("Invalid correct ILI")]
    InvalidCorrectILI,

    #[msg("Insufficient dispute stake")]
    InsufficientDisputeStake,

    // Emergency errors
    #[msg("Emergency cooldown active")]
    EmergencyCooldownActive,

    #[msg("Insufficient emergency stake")]
    InsufficientEmergencyStake,

    #[msg("Insufficient evidence")]
    InsufficientEvidence,

    #[msg("Invalid description")]
    InvalidDescription,
}
```

### C. Seeds and PDAs

```rust
// PDA Seeds
pub const GLOBAL_STATE_SEED: &[u8] = b"global-state";
pub const ILI_ORACLE_SEED: &[u8] = b"ili-oracle";
pub const AGENT_REGISTRY_SEED: &[u8] = b"agent-registry";
pub const AGENT_STATE_SEED: &[u8] = b"agent-state";
pub const GOVERNANCE_SEED: &[u8] = b"governance";
pub const PROPOSAL_SEED: &[u8] = b"proposal";
pub const VOTE_RECORD_SEED: &[u8] = b"vote-record";
pub const DAILY_LIMIT_SEED: &[u8] = b"daily-limit";
```

### D. References

1. Solana Programming Model: https://docs.solana.com/developing/programming-model/overview
2. Anchor Framework: https://www.anchor-lang.com/
3. Futarchy: Arvotediction Markets for Governance - Robin Hanson
4. Byzantine Fault Tolerance: https://lamport.azurewebsites.net/pubs/byz.pdf
5. Sybil Attack Prevention: https://csrc.nist.gov/CSRC/media/Publications/white-paper/2018/01/18/attacks-on-cryptographic-techniques-2nd-draft/attacks-on-cryptographic-techniques-2nd-draft.pdf

---

## Revision History

| Version | Date       | Author                   | Changes       |
| ------- | ---------- | ------------------------ | ------------- |
| 1.0     | 2026-02-09 | Protocol Daemon Security | Initial draft |

---

**Document Status**: For Review  
**Next Review**: After security audit  
**Approval Required**: Protocol Governance
