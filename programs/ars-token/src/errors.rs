use anchor_lang::prelude::*;

#[error_code]
pub enum TokenError {
    #[msg("Circuit breaker is active")]
    CircuitBreakerActive,
    
    #[msg("Mint cap exceeded")]
    MintCapExceeded,
    
    #[msg("Burn cap exceeded")]
    BurnCapExceeded,
    
    #[msg("Invalid epoch duration")]
    InvalidEpochDuration,
    
    #[msg("Invalid mint/burn cap")]
    InvalidMintBurnCap,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    
    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow,
}
