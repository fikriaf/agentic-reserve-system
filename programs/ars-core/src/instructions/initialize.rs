use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use crate::state::*;
use crate::constants::*;
use crate::errors::ICBError;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = GlobalState::LEN,
        seeds = [GLOBAL_STATE_SEED],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        init,
        payer = authority,
        space = ILIOracle::LEN,
        seeds = [ILI_ORACLE_SEED],
        bump
    )]
    pub ili_oracle: Account<'info, ILIOracle>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Initialize>,
    epoch_duration: i64,
    mint_burn_cap_bps: u16,
    stability_fee_bps: u16,
    vhr_threshold: u16,
) -> Result<()> {
    require!(epoch_duration > 0, ICBError::InvalidEpochDuration);
    require!(mint_burn_cap_bps <= BPS_DENOMINATOR, ICBError::InvalidMintBurnCap);
    require!(vhr_threshold >= 10000, ICBError::InvalidVHRThreshold); // At least 100%
    
    let global_state = &mut ctx.accounts.global_state;
    let ili_oracle = &mut ctx.accounts.ili_oracle;
    let clock = Clock::get()?;
    
    // Initialize global state
    global_state.authority = ctx.accounts.authority.key();
    global_state.ili_oracle = ili_oracle.key();
    global_state.reserve_vault = Pubkey::default(); // Set later via set_reserve_vault
    global_state.icu_mint = Pubkey::default(); // Set later via set_reserve_vault
    global_state.epoch_duration = epoch_duration;
    global_state.mint_burn_cap_bps = mint_burn_cap_bps;
    global_state.stability_fee_bps = stability_fee_bps;
    global_state.vhr_threshold = vhr_threshold;
    global_state.circuit_breaker_active = false;
    global_state.proposal_counter = 0; // FIX #1: Initialize counter
    global_state.circuit_breaker_requested_at = 0; // FIX #7: Initialize timelock
    global_state.last_update_slot = clock.slot; // FIX #9: Initialize slot
    global_state.bump = ctx.bumps.global_state;
    
    // Initialize ILI oracle
    ili_oracle.authority = ctx.accounts.authority.key();
    ili_oracle.current_ili = 0;
    ili_oracle.last_update = 0;
    ili_oracle.update_interval = DEFAULT_ILI_UPDATE_INTERVAL;
    ili_oracle.snapshot_count = 0;
    ili_oracle.last_update_slot = clock.slot; // FIX #9: Initialize slot
    ili_oracle.bump = ctx.bumps.ili_oracle;
    
    msg!("ARS Protocol initialized");
    msg!("Authority: {}", global_state.authority);
    msg!("Epoch duration: {} seconds", epoch_duration);
    msg!("Mint/burn cap: {} bps", mint_burn_cap_bps);
    msg!("VHR threshold: {} bps", vhr_threshold);
    
    Ok(())
}

// FIX #10: Add instruction to set reserve vault with validation
#[derive(Accounts)]
pub struct SetReserveVault<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        constraint = reserve_vault.owner == anchor_spl::token::ID @ ICBError::InvalidReserveVault,
        constraint = reserve_vault.mint == icu_mint.key() @ ICBError::InvalidICUMint
    )]
    pub reserve_vault: Account<'info, TokenAccount>,
    
    pub icu_mint: Account<'info, Mint>,
    
    #[account(
        constraint = global_state.authority == authority.key() @ ICBError::Unauthorized
    )]
    pub authority: Signer<'info>,
}

pub fn set_reserve_vault(ctx: Context<SetReserveVault>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    
    // FIX #10: Ensure vault can only be set once
    require!(
        global_state.reserve_vault == Pubkey::default(),
        ICBError::InvalidReserveVault
    );
    
    global_state.reserve_vault = ctx.accounts.reserve_vault.key();
    global_state.icu_mint = ctx.accounts.icu_mint.key();
    
    msg!("Reserve vault set: {}", ctx.accounts.reserve_vault.key());
    msg!("ARU mint set: {}", ctx.accounts.icu_mint.key());
    
    Ok(())
}
