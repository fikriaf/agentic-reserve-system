use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use crate::state::*;
use crate::errors::TokenError;

pub const TOKEN_STATE_SEED: &[u8] = b"token_state";

#[derive(Accounts)]
pub struct InitializeMint<'info> {
    #[account(
        init,
        payer = authority,
        space = TokenState::LEN,
        seeds = [TOKEN_STATE_SEED],
        bump
    )]
    pub token_state: Account<'info, TokenState>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<InitializeMint>,
    epoch_duration: i64,
    mint_burn_cap_bps: u16,
    stability_fee_bps: u16,
) -> Result<()> {
    require!(epoch_duration > 0, TokenError::InvalidEpochDuration);
    require!(mint_burn_cap_bps <= 10000, TokenError::InvalidMintBurnCap);
    
    let token_state = &mut ctx.accounts.token_state;
    let clock = Clock::get()?;
    
    token_state.authority = ctx.accounts.authority.key();
    token_state.mint = ctx.accounts.mint.key();
    token_state.epoch_duration = epoch_duration;
    token_state.mint_burn_cap_bps = mint_burn_cap_bps;
    token_state.stability_fee_bps = stability_fee_bps;
    token_state.current_epoch = 0;
    token_state.epoch_start_time = clock.unix_timestamp;
    token_state.epoch_minted = 0;
    token_state.epoch_burned = 0;
    token_state.total_supply_at_epoch_start = ctx.accounts.mint.supply;
    token_state.circuit_breaker_active = false;
    token_state.bump = ctx.bumps.token_state;
    
    msg!("ARU token initialized");
    msg!("Mint: {}", token_state.mint);
    msg!("Epoch duration: {} seconds", epoch_duration);
    msg!("Mint/burn cap: {} bps", mint_burn_cap_bps);
    msg!("Stability fee: {} bps", stability_fee_bps);
    
    Ok(())
}
