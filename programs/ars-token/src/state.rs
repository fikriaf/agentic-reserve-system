use anchor_lang::prelude::*;

/// Token state for ARU
#[account]
pub struct TokenState {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub epoch_duration: i64,
    pub mint_burn_cap_bps: u16,     // 200 = 2%
    pub stability_fee_bps: u16,     // 10 = 0.1%
    pub current_epoch: u64,
    pub epoch_start_time: i64,
    pub epoch_minted: u64,
    pub epoch_burned: u64,
    pub total_supply_at_epoch_start: u64,
    pub circuit_breaker_active: bool,
    pub bump: u8,
}

impl TokenState {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // mint
        8 +  // epoch_duration
        2 +  // mint_burn_cap_bps
        2 +  // stability_fee_bps
        8 +  // current_epoch
        8 +  // epoch_start_time
        8 +  // epoch_minted
        8 +  // epoch_burned
        8 +  // total_supply_at_epoch_start
        1 +  // circuit_breaker_active
        1;   // bump
}

/// Mint/burn event for logging
#[event]
pub struct MintBurnEvent {
    pub event_type: String,
    pub amount: u64,
    pub reasoning_hash: [u8; 32],
    pub timestamp: i64,
    pub epoch: u64,
}
