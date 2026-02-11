use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("9n6ZD9ghr4HyP3AVdQfPefhgn9o9CxYJRpG1x9uWuVZf");

pub mod state;
pub mod instructions;
pub mod errors;
pub mod utils;

use instructions::*;
use state::*;

#[program]
pub mod ars_reserve {
    use super::*;

    /// Initialize the reserve vault
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        rebalance_threshold_bps: u16,
    ) -> Result<()> {
        instructions::initialize_vault::handler(ctx, rebalance_threshold_bps)
    }

    /// Deposit assets into the vault
    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
    ) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    /// Withdraw assets from the vault
    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64,
    ) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    /// Calculate and update VHR
    pub fn update_vhr(
        ctx: Context<UpdateVHR>,
        total_value_usd: u64,
        liabilities_usd: u64,
    ) -> Result<()> {
        instructions::update_vhr::handler(ctx, total_value_usd, liabilities_usd)
    }

    /// Rebalance the vault
    pub fn rebalance(
        ctx: Context<Rebalance>,
    ) -> Result<()> {
        instructions::rebalance::handler(ctx)
    }
}
