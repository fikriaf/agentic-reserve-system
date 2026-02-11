use anchor_lang::prelude::*;
use crate::errors::ReserveError;

/// Slippage protection configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct SlippageConfig {
    /// Maximum allowed slippage in basis points (e.g., 50 = 0.5%)
    pub max_slippage_bps: u16,
    /// Minimum output amount (calculated from input and slippage)
    pub min_output_amount: u64,
}

impl SlippageConfig {
    /// Create new slippage config with default 0.5% slippage
    pub fn new(input_amount: u64, expected_rate: u64) -> Self {
        let max_slippage_bps = 50; // 0.5%
        let expected_output = (input_amount as u128 * expected_rate as u128) / 1_000_000;
        let min_output = expected_output * (10000 - max_slippage_bps as u128) / 10000;
        
        Self {
            max_slippage_bps,
            min_output_amount: min_output as u64,
        }
    }
    
    /// Validate actual output meets slippage requirements
    pub fn validate_output(&self, actual_output: u64) -> Result<()> {
        require!(
            actual_output >= self.min_output_amount,
            ReserveError::SlippageExceeded
        );
        Ok(())
    }
}

/// Jupiter swap parameters
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JupiterSwapParams {
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub amount: u64,
    pub slippage_config: SlippageConfig,
}

/// Validate CPI accounts before invocation
/// This is critical for security - always validate accounts before CPI
pub fn validate_cpi_accounts(
    program_id: &Pubkey,
    expected_program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> Result<()> {
    // Validate program ID
    require!(
        program_id == expected_program_id,
        ReserveError::InvalidAccountOwner
    );
    
    // Validate all accounts are not closed
    for account in accounts {
        require!(
            account.lamports() > 0,
            ReserveError::InvalidAmount
        );
    }
    
    Ok(())
}

/// Calculate optimal swap route for rebalancing
/// Returns (from_mint, to_mint, amount) for each required swap
pub fn calculate_rebalance_swaps(
    current_weights: &[(Pubkey, u16)], // (mint, weight_bps)
    target_weights: &[(Pubkey, u16)],
    total_value: u64,
) -> Vec<(Pubkey, Pubkey, u64)> {
    let mut swaps = Vec::new();
    
    // Calculate required changes for each asset
    for (mint, target_weight) in target_weights {
        let current_weight = current_weights
            .iter()
            .find(|(m, _)| m == mint)
            .map(|(_, w)| *w)
            .unwrap_or(0);
        
        let target_value = (total_value as u128 * *target_weight as u128) / 10000;
        let current_value = (total_value as u128 * current_weight as u128) / 10000;
        
        if target_value > current_value {
            // Need to buy this asset
            let amount_needed = (target_value - current_value) as u64;
            // Find asset to sell (simplified - would use more sophisticated logic)
            if let Some((from_mint, _)) = current_weights.iter().find(|(m, w)| {
                let cv = (total_value as u128 * *w as u128) / 10000;
                let tv = target_weights.iter()
                    .find(|(tm, _)| tm == m)
                    .map(|(_, tw)| (total_value as u128 * *tw as u128) / 10000)
                    .unwrap_or(0);
                cv > tv
            }) {
                swaps.push((*from_mint, *mint, amount_needed));
            }
        }
    }
    
    swaps
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_slippage_config() {
        let config = SlippageConfig::new(1_000_000, 1_000_000); // 1:1 rate
        assert_eq!(config.max_slippage_bps, 50);
        assert_eq!(config.min_output_amount, 995_000); // 0.5% slippage
        
        // Should pass with exact amount
        assert!(config.validate_output(1_000_000).is_ok());
        
        // Should pass with min amount
        assert!(config.validate_output(995_000).is_ok());
        
        // Should fail below min
        assert!(config.validate_output(994_999).is_err());
    }
}
