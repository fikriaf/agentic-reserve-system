use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct QueryILI<'info> {
    #[account(
        seeds = [ILI_ORACLE_SEED],
        bump = ili_oracle.bump
    )]
    pub ili_oracle: Account<'info, ILIOracle>,
}

pub fn handler(ctx: Context<QueryILI>) -> Result<u64> {
    let ili_oracle = &ctx.accounts.ili_oracle;
    
    msg!("Current ILI: {}", ili_oracle.current_ili);
    msg!("Last update: {}", ili_oracle.last_update);
    
    Ok(ili_oracle.current_ili)
}
