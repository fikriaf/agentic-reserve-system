use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use crate::state::*;
use crate::instructions::initialize_mint::TOKEN_STATE_SEED;

#[derive(Accounts)]
pub struct StartNewEpoch<'info> {
    #[account(
        mut,
        seeds = [TOKEN_STATE_SEED],
        bump = token_state.bump
    )]
    pub token_state: Account<'info, TokenState>,
    
    pub mint: Account<'info, Mint>,
}

pub fn handler(ctx: Context<StartNewEpoch>) -> Result<()> {
    let token_state = &mut ctx.accounts.token_state;
    let clock = Clock::get()?;
    
    // Check if epoch has ended
    if clock.unix_timestamp >= token_state.epoch_start_time + token_state.epoch_duration {
        token_state.current_epoch += 1;
        token_state.epoch_start_time = clock.unix_timestamp;
        token_state.epoch_minted = 0;
        token_state.epoch_burned = 0;
        token_state.total_supply_at_epoch_start = ctx.accounts.mint.supply;
        
        msg!("New epoch started: {}", token_state.current_epoch);
        msg!("Supply at epoch start: {}", token_state.total_supply_at_epoch_start);
    } else {
        msg!("Epoch has not ended yet");
    }
    
    Ok(())
}
