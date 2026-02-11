use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ReserveError;

pub const VAULT_SEED: &[u8] = b"reserve_vault";

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = ReserveVault::LEN,
        seeds = [VAULT_SEED],
        bump
    )]
    pub vault: Account<'info, ReserveVault>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeVault>,
    rebalance_threshold_bps: u16,
) -> Result<()> {
    require!(
        rebalance_threshold_bps > 0 && rebalance_threshold_bps <= 10000,
        ReserveError::InvalidRebalanceThreshold
    );
    
    let vault = &mut ctx.accounts.vault;
    
    vault.authority = ctx.accounts.authority.key();
    vault.usdc_vault = Pubkey::default(); // Set when token accounts created
    vault.sol_vault = Pubkey::default();
    vault.msol_vault = Pubkey::default();
    vault.total_value_usd = 0;
    vault.liabilities_usd = 0;
    vault.vhr = 0;
    vault.last_rebalance = 0;
    vault.rebalance_threshold_bps = rebalance_threshold_bps;
    vault.bump = ctx.bumps.vault;
    
    msg!("Reserve vault initialized");
    msg!("Authority: {}", vault.authority);
    msg!("Rebalance threshold: {} bps", rebalance_threshold_bps);
    
    Ok(())
}
