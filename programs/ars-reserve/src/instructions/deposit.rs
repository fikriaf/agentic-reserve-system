use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::ReserveError;
use crate::instructions::initialize_vault::VAULT_SEED;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump
    )]
    pub vault: Account<'info, ReserveVault>,
    
    #[account(
        mut,
        constraint = vault_token_account.owner == vault.key() @ ReserveError::InvalidAccountOwner
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = depositor_token_account.mint == vault_token_account.mint @ ReserveError::InvalidAmount
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,
    
    pub depositor: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, ReserveError::InvalidAmount);
    
    // Validate user has sufficient balance
    require!(
        ctx.accounts.depositor_token_account.amount >= amount,
        ReserveError::InsufficientVaultBalance
    );
    
    let vault = &mut ctx.accounts.vault;
    
    // Check and acquire reentrancy lock
    require!(!vault.locked, ReserveError::ReentrancyDetected);
    vault.locked = true;
    
    // Transfer tokens from depositor to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.depositor_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.depositor.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::transfer(cpi_ctx, amount)?;
    
    // Update vault total value (simplified - in production would use oracle prices)
    vault.total_value_usd = vault.total_value_usd
        .checked_add(amount)
        .ok_or(ReserveError::ArithmeticOverflow)?;
    
    msg!("Deposited {} tokens to vault", amount);
    msg!("New vault total value: {} USD", vault.total_value_usd);
    
    // Release lock
    vault.locked = false;
    
    Ok(())
}
