use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ReserveError;
use crate::instructions::initialize_vault::VAULT_SEED;

#[derive(Accounts)]
pub struct UpdateVHR<'info> {
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ ReserveError::Unauthorized
    )]
    pub vault: Account<'info, ReserveVault>,
    
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateVHR>,
    total_value_usd: u64,
    liabilities_usd: u64,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    vault.total_value_usd = total_value_usd;
    vault.liabilities_usd = liabilities_usd;
    
    // Calculate VHR = (reserves / liabilities) * 10000
    // VHR is in basis points (15000 = 150%)
    if liabilities_usd > 0 {
        let vhr = (total_value_usd as u128)
            .checked_mul(10000)
            .ok_or(ReserveError::ArithmeticOverflow)?
            .checked_div(liabilities_usd as u128)
            .ok_or(ReserveError::ArithmeticOverflow)? as u16;
        
        vault.vhr = vhr;
        
        msg!("VHR updated to: {} bps", vhr);
        msg!("Total value: ${}", total_value_usd);
        msg!("Liabilities: ${}", liabilities_usd);
        
        // Check if VHR is below threshold (150%)
        if vhr < 15000 {
            msg!("WARNING: VHR below 150% threshold!");
        }
    } else {
        vault.vhr = u16::MAX; // Infinite VHR when no liabilities
        msg!("VHR: Infinite (no liabilities)");
    }
    
    Ok(())
}
