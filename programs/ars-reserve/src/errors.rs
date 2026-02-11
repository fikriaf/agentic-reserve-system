use anchor_lang::prelude::*;

#[error_code]
pub enum ReserveError {
    #[msg("VHR below threshold")]
    VHRBelowThreshold,
    
    #[msg("Invalid rebalance threshold")]
    InvalidRebalanceThreshold,
    
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    
    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow,
    
    #[msg("Reentrancy detected")]
    ReentrancyDetected,
    
    #[msg("Rebalance attempted too frequently")]
    RebalanceTooFrequent,
    
    #[msg("Invalid account owner")]
    InvalidAccountOwner,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    
    #[msg("Invalid PDA derivation")]
    InvalidPDA,
}
