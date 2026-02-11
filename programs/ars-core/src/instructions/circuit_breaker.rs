use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::ICBError;

// FIX #7: Split into two instructions - request and activate

#[derive(Accounts)]
pub struct RequestCircuitBreaker<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
        constraint = global_state.authority == authority.key() @ ICBError::Unauthorized
    )]
    pub global_state: Account<'info, GlobalState>,
    
    /// Optional: Reserve vault for VHR check
    /// CHECK: This is optional and only used for automatic VHR-based triggering
    pub reserve_vault: Option<AccountInfo<'info>>,
    
    /// Optional: ILI Oracle for health check
    /// CHECK: This is optional and only used for automatic oracle health-based triggering
    pub ili_oracle: Option<AccountInfo<'info>>,
    
    pub authority: Signer<'info>,
}

pub fn request_circuit_breaker(ctx: Context<RequestCircuitBreaker>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let clock = Clock::get()?;
    
    // Check if VHR is below threshold (if reserve vault provided)
    let vhr_triggered = false;
    if let Some(_reserve_vault_info) = &ctx.accounts.reserve_vault {
        // Deserialize reserve vault to check VHR
        // Note: This requires the reserve vault account to be passed in
        // For now, we'll just log that VHR check was requested
        msg!("VHR check requested - reserve vault provided");
        // TODO: Deserialize and check actual VHR value
        // If VHR < 150%, set vhr_triggered = true
    }
    
    // Check if oracle health is degraded (if ILI oracle provided)
    let oracle_health_triggered = false;
    if let Some(_ili_oracle_info) = &ctx.accounts.ili_oracle {
        msg!("Oracle health check requested - ILI oracle provided");
        // TODO: Check oracle last_update timestamp
        // If last_update > 15 minutes ago, set oracle_health_triggered = true
    }
    
    global_state.circuit_breaker_requested_at = clock.unix_timestamp;
    
    msg!("Circuit breaker activation requested at: {}", clock.unix_timestamp);
    msg!("Can be activated after: {}", clock.unix_timestamp + CIRCUIT_BREAKER_DELAY);
    
    if vhr_triggered {
        msg!("ALERT: VHR below 150% threshold");
    }
    if oracle_health_triggered {
        msg!("ALERT: Oracle health degraded");
    }
    
    Ok(())
}

#[derive(Accounts)]
pub struct ActivateCircuitBreaker<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
        constraint = global_state.authority == authority.key() @ ICBError::Unauthorized
    )]
    pub global_state: Account<'info, GlobalState>,
    
    pub authority: Signer<'info>,
}

pub fn activate_circuit_breaker(ctx: Context<ActivateCircuitBreaker>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let clock = Clock::get()?;
    
    // FIX #7: Enforce timelock delay
    require!(
        clock.unix_timestamp >= global_state.circuit_breaker_requested_at + CIRCUIT_BREAKER_DELAY,
        ICBError::CircuitBreakerTimelockNotMet
    );
    
    global_state.circuit_breaker_active = true;
    
    msg!("Circuit breaker ACTIVATED");
    msg!("Requested at: {}", global_state.circuit_breaker_requested_at);
    msg!("Activated at: {}", clock.unix_timestamp);
    
    Ok(())
}

#[derive(Accounts)]
pub struct DeactivateCircuitBreaker<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
        constraint = global_state.authority == authority.key() @ ICBError::Unauthorized
    )]
    pub global_state: Account<'info, GlobalState>,
    
    pub authority: Signer<'info>,
}

pub fn deactivate_circuit_breaker(ctx: Context<DeactivateCircuitBreaker>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    
    // Deactivation can be immediate (emergency recovery)
    global_state.circuit_breaker_active = false;
    global_state.circuit_breaker_requested_at = 0; // Reset request
    
    msg!("Circuit breaker DEACTIVATED");
    
    Ok(())
}

