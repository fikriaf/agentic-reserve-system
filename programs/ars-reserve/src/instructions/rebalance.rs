use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ReserveError;
use crate::instructions::initialize_vault::VAULT_SEED;

#[derive(Accounts)]
pub struct Rebalance<'info> {
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ ReserveError::Unauthorized
    )]
    pub vault: Account<'info, ReserveVault>,
    
    pub authority: Signer<'info>,
    
    /// CHECK: Jupiter program for swap execution
    /// This will be validated during CPI call
    pub jupiter_program: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<Rebalance>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    // Check and acquire reentrancy lock
    require!(!vault.locked, ReserveError::ReentrancyDetected);
    vault.locked = true;
    
    let clock = Clock::get()?;
    
    // Validate authority owns the vault
    require!(
        vault.authority == ctx.accounts.authority.key(),
        ReserveError::Unauthorized
    );
    
    // Check minimum time between rebalances (prevent spam)
    let min_rebalance_interval = 3600; // 1 hour
    require!(
        clock.unix_timestamp >= vault.last_rebalance + min_rebalance_interval,
        ReserveError::RebalanceTooFrequent
    );
    
    vault.last_rebalance = clock.unix_timestamp;
    
    msg!("Vault rebalanced at: {}", clock.unix_timestamp);
    msg!("Current VHR: {} bps", vault.vhr);
    
    // TODO: Implement actual rebalancing logic with CPI to Jupiter
    // This would involve:
    // 1. Calculate current asset weights
    // 2. Compare with target weights (40% SOL, 30% USDC, 20% mSOL, 10% JitoSOL)
    // 3. Calculate required swaps with slippage protection
    // 4. Execute swaps via Jupiter CPI with invoke_signed
    // 5. Update vault composition
    // 6. Verify VHR remains above threshold
    
    // Release lock
    vault.locked = false;
    
    Ok(())
}
