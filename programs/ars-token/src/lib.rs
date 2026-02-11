use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};

declare_id!("93bqWFjr2NVyz1DhiwgFCYe938jeANKmk2TjUJ1Fk4My");

pub mod state;
pub mod instructions;
pub mod errors;

use instructions::*;
use state::*;

#[program]
pub mod ars_token {
    use super::*;

    /// Initialize the ARU token mint
    pub fn initialize_mint(
        ctx: Context<InitializeMint>,
        epoch_duration: i64,
        mint_burn_cap_bps: u16,
        stability_fee_bps: u16,
    ) -> Result<()> {
        instructions::initialize_mint::handler(ctx, epoch_duration, mint_burn_cap_bps, stability_fee_bps)
    }

    /// Mint ARU tokens
    pub fn mint_icu(
        ctx: Context<MintICU>,
        amount: u64,
        reasoning_hash: [u8; 32],
    ) -> Result<()> {
        instructions::mint_icu::handler(ctx, amount, reasoning_hash)
    }

    /// Burn ARU tokens
    pub fn burn_icu(
        ctx: Context<BurnICU>,
        amount: u64,
        reasoning_hash: [u8; 32],
    ) -> Result<()> {
        instructions::burn_icu::handler(ctx, amount, reasoning_hash)
    }

    /// Start new epoch
    pub fn start_new_epoch(ctx: Context<StartNewEpoch>) -> Result<()> {
        instructions::start_new_epoch::handler(ctx)
    }
}
