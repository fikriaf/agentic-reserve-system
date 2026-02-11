use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::ReserveError;
use crate::instructions::initialize_vault::VAULT_SEED;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ ReserveError::Unauthorized
    )]
    pub vault: Account<'info, ReserveVault>,
    
    #[account(
        mut,
        constraint = vault_token_account.owner == vault.key() @ ReserveError::InvalidAccountOwner
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    require!(amount > 0, ReserveError::InvalidAmount);
    require!(
        ctx.accounts.vault_token_account.amount >= amount,
        ReserveError::InsufficientVaultBalance
    );
    
    let vault = &mut ctx.accounts.vault;
    
    // Check and acquire reentrancy lock
    require!(!vault.locked, ReserveError::ReentrancyDetected);
    vault.locked = true;
    
    // Check VHR after withdrawal would still be above threshold
    let new_total_value = vault.total_value_usd
        .checked_sub(amount)
        .ok_or(ReserveError::ArithmeticUnderflow)?;
    
    // Calculate new VHR (simplified)
    let new_vhr = if vault.liabilities_usd > 0 {
        ((new_total_value as u128 * 10000) / vault.liabilities_usd as u128) as u16
    } else {
        10000 // 100% if no liabilities
    };
    
    require!(
        new_vhr >= vault.rebalance_threshold_bps,
        ReserveError::VHRBelowThreshold
    );
    
    // Transfer tokens from vault to recipient using PDA signer
    let bump = vault.bump;
    let seeds = &[VAULT_SEED, &[bump]];
    let signer = &[&seeds[..]];
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: vault.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    token::transfer(cpi_ctx, amount)?;
    
    // Update vault state
    vault.total_value_usd = new_total_value;
    vault.vhr = new_vhr;
    
    msg!("Withdrawn {} tokens from vault", amount);
    msg!("New vault total value: {} USD", new_total_value);
    msg!("New VHR: {} bps", new_vhr);
    
    // Release lock
    vault.locked = false;
    
    Ok(())
}
