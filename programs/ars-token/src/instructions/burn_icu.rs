use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Burn};
use crate::state::*;
use crate::errors::TokenError;
use crate::instructions::initialize_mint::TOKEN_STATE_SEED;

#[derive(Accounts)]
pub struct BurnICU<'info> {
    #[account(
        mut,
        seeds = [TOKEN_STATE_SEED],
        bump = token_state.bump,
        constraint = token_state.authority == authority.key() @ TokenError::Unauthorized,
        constraint = !token_state.circuit_breaker_active @ TokenError::CircuitBreakerActive
    )]
    pub token_state: Account<'info, TokenState>,
    
    #[account(
        mut,
        constraint = mint.key() == token_state.mint @ TokenError::Unauthorized
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub burn_from: Account<'info, TokenAccount>,
    
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<BurnICU>,
    amount: u64,
    reasoning_hash: [u8; 32],
) -> Result<()> {
    require!(amount > 0, TokenError::InvalidAmount);
    
    let token_state = &mut ctx.accounts.token_state;
    
    // Check if we need to start a new epoch
    let clock = Clock::get()?;
    if clock.unix_timestamp >= token_state.epoch_start_time + token_state.epoch_duration {
        // New epoch - reset counters
        token_state.current_epoch += 1;
        token_state.epoch_start_time = clock.unix_timestamp;
        token_state.epoch_minted = 0;
        token_state.epoch_burned = 0;
        token_state.total_supply_at_epoch_start = ctx.accounts.mint.supply;
    }
    
    // Calculate burn cap for this epoch (±2% of supply at epoch start)
    let burn_cap = (token_state.total_supply_at_epoch_start as u128)
        .checked_mul(token_state.mint_burn_cap_bps as u128)
        .ok_or(TokenError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TokenError::ArithmeticOverflow)? as u64;
    
    // Check if burning this amount would exceed cap
    let new_burned = token_state.epoch_burned
        .checked_add(amount)
        .ok_or(TokenError::ArithmeticOverflow)?;
    
    require!(new_burned <= burn_cap, TokenError::BurnCapExceeded);
    
    // Burn tokens
    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.burn_from.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::burn(cpi_ctx, amount)?;
    
    // Update state
    token_state.epoch_burned = new_burned;
    
    // Emit event
    emit!(MintBurnEvent {
        event_type: "burn".to_string(),
        amount,
        reasoning_hash,
        timestamp: clock.unix_timestamp,
        epoch: token_state.current_epoch,
    });
    
    msg!("Burned {} ARU tokens", amount);
    msg!("Epoch: {}", token_state.current_epoch);
    msg!("Epoch burned: {} / {}", new_burned, burn_cap);
    
    Ok(())
}
