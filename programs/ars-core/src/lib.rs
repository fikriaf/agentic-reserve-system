use anchor_lang::prelude::*;

declare_id!("srtj367mvvmoZQCx2w75DxkPHtYDzZ3fW8toirw9TUY");

pub mod state;
pub mod instructions;
pub mod errors;
pub mod constants;
pub mod utils;
pub mod math;

use instructions::*;
use state::*;
use errors::ICBError;

// ARS-SA-2026-001: Secure Agent Verification
// This module prevents policy manipulation by illegal agents
use anchor_lang::solana_program::ed25519_program;
use anchor_lang::solana_program::sysvar::instructions as sysvar_instructions;

/// Validates that the agent is properly authenticated via Ed25519 signature
/// 
/// Security Advisory: ARS-SA-2026-001
/// This function ensures that:
/// 1. The previous instruction is an Ed25519 signature verification
/// 2. The public key in the signature matches the expected agent
/// 3. Prevents agent impersonation attacks
///
/// # Arguments
/// * `instructions_sysvar` - The instructions sysvar account
/// * `expected_agent` - The public key of the expected agent
///
/// # Returns
/// * `Result<()>` - Ok if validation passes, Error otherwise
pub fn validate_agent_auth(
    instructions_sysvar: &AccountInfo,
    expected_agent: &Pubkey,
) -> Result<()> {
    // Load the instructions sysvar
    let _data = instructions_sysvar.try_borrow_data()?;
    let current_index = sysvar_instructions::load_current_index_checked(instructions_sysvar)?;
    
    // Ensure there is a previous instruction
    if current_index == 0 {
        return err!(ICBError::MissingSignatureVerification);
    }
    
    // Load the previous instruction (signature verification)
    let prev_index = current_index.saturating_sub(1);
    let prev_ix = sysvar_instructions::load_instruction_at_checked(
        prev_index as usize,
        instructions_sysvar,
    )?;
    
    // Verify that the previous instruction is Ed25519 signature verification
    if prev_ix.program_id != ed25519_program::ID {
        return err!(ICBError::InvalidSignatureProgram);
    }
    
    // Extract and verify the public key from the Ed25519 instruction data
    // Ed25519 instruction format:
    // - Bytes 0-1: Number of signatures (u16, little-endian)
    // - Bytes 2-3: Padding
    // - Bytes 4-67: Signature (64 bytes)
    // - Bytes 68-99: Public key (32 bytes)
    // - Bytes 100+: Message
    
    if prev_ix.data.len() < 100 {
        return err!(ICBError::SignatureVerificationFailed);
    }
    
    // Extract public key (bytes 68-99, but we use 16-48 for the actual key data)
    let pubkey_offset = 16; // Adjusted offset for Ed25519 instruction format
    let pubkey_end = pubkey_offset + 32;
    
    if prev_ix.data.len() < pubkey_end {
        return err!(ICBError::SignatureVerificationFailed);
    }
    
    let pubkey_data = &prev_ix.data[pubkey_offset..pubkey_end];
    
    // Verify that the public key matches the expected agent
    if pubkey_data != expected_agent.as_ref() {
        msg!("Agent mismatch: expected {:?}, got {:?}", expected_agent, pubkey_data);
        return err!(ICBError::AgentMismatch);
    }
    
    msg!("Agent authentication successful for: {:?}", expected_agent);
    Ok(())
}

#[program]
pub mod ars_core {
    use super::*;

    /// Initialize the ARS protocol
    pub fn initialize(
        ctx: Context<Initialize>,
        epoch_duration: i64,
        mint_burn_cap_bps: u16,
        stability_fee_bps: u16,
        vhr_threshold: u16,
    ) -> Result<()> {
        instructions::initialize::handler(
            ctx,
            epoch_duration,
            mint_burn_cap_bps,
            stability_fee_bps,
            vhr_threshold,
        )
    }

    /// Set reserve vault after initialization (FIX #10)
    pub fn set_reserve_vault(ctx: Context<SetReserveVault>) -> Result<()> {
        instructions::initialize::set_reserve_vault(ctx)
    }

    /// Update the ILI oracle value
    pub fn update_ili(
        ctx: Context<UpdateILI>,
        ili_value: u64,
        avg_yield: u32,
        volatility: u32,
        tvl: u64,
    ) -> Result<()> {
        instructions::update_ili::handler(ctx, ili_value, avg_yield, volatility, tvl)
    }

    /// Query the current ILI value
    pub fn query_ili(ctx: Context<QueryILI>) -> Result<u64> {
        instructions::query_ili::handler(ctx)
    }

    /// Create a new policy proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        policy_type: PolicyType,
        policy_params: Vec<u8>,
        duration: i64,
    ) -> Result<()> {
        instructions::create_proposal::handler(ctx, policy_type, policy_params, duration)
    }

    /// Vote on a policy proposal (FIX #2, #5)
    pub fn vote_on_proposal(
        ctx: Context<VoteOnProposal>,
        prediction: bool,
        stake_amount: u64,
        agent_signature: [u8; 64],
    ) -> Result<()> {
        instructions::vote_on_proposal::handler(ctx, prediction, stake_amount, agent_signature)
    }

    /// Execute an approved proposal (FIX #3, #8)
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        instructions::execute_proposal::handler(ctx)
    }

    /// Request circuit breaker activation (FIX #7)
    pub fn request_circuit_breaker(ctx: Context<RequestCircuitBreaker>) -> Result<()> {
        instructions::circuit_breaker::request_circuit_breaker(ctx)
    }

    /// Activate circuit breaker after timelock (FIX #7)
    pub fn activate_circuit_breaker(ctx: Context<ActivateCircuitBreaker>) -> Result<()> {
        instructions::circuit_breaker::activate_circuit_breaker(ctx)
    }

    /// Deactivate circuit breaker (FIX #7)
    pub fn deactivate_circuit_breaker(ctx: Context<DeactivateCircuitBreaker>) -> Result<()> {
        instructions::circuit_breaker::deactivate_circuit_breaker(ctx)
    }
}
