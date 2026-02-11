use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::ICBError;

#[derive(Accounts)]
pub struct UpdateILI<'info> {
    #[account(
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        mut,
        seeds = [ILI_ORACLE_SEED],
        bump = ili_oracle.bump,
        constraint = ili_oracle.authority == authority.key() @ ICBError::Unauthorized
    )]
    pub ili_oracle: Account<'info, ILIOracle>,
    
    pub authority: Signer<'info>,
    
    /// CHECK: Instructions sysvar for agent verification (ARS-SA-2026-001)
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handler(
    ctx: Context<UpdateILI>,
    ili_value: u64,
    avg_yield: u32,
    volatility: u32,
    tvl: u64,
) -> Result<()> {
    // ARS-SA-2026-001: Validate agent authentication
    crate::validate_agent_auth(
        &ctx.accounts.instructions_sysvar,
        &ctx.accounts.authority.key(),
    )?;
    
    let ili_oracle = &mut ctx.accounts.ili_oracle;
    let clock = Clock::get()?;
    
    // FIX #9: Combine timestamp AND slot checks for clock manipulation protection
    let time_delta = clock.unix_timestamp - ili_oracle.last_update;
    let slot_delta = clock.slot - ili_oracle.last_update_slot;
    
    require!(
        time_delta >= ili_oracle.update_interval && slot_delta >= MIN_SLOT_BUFFER,
        ICBError::ILIUpdateTooSoon
    );
    
    // FIX #6: Validate all oracle inputs
    require!(
        ili_value > 0 && ili_value <= MAX_ILI_VALUE,
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
        tvl > 0,
        ICBError::InvalidTVL
    );
    
    // Update ILI oracle
    ili_oracle.current_ili = ili_value;
    ili_oracle.last_update = clock.unix_timestamp;
    ili_oracle.last_update_slot = clock.slot; // FIX #9: Update slot
    ili_oracle.snapshot_count = ili_oracle.snapshot_count.saturating_add(1);
    
    msg!("ILI updated to: {}", ili_value);
    msg!("Avg yield: {} bps", avg_yield);
    msg!("Volatility: {} bps", volatility);
    msg!("TVL: ${}", tvl);
    msg!("Timestamp: {}", clock.unix_timestamp);
    msg!("Slot: {}", clock.slot);
    
    Ok(())
}
