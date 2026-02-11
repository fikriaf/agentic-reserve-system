// FIX #2: Fixed-Point Arithmetic for Quadratic Staking
use anchor_lang::prelude::*;
use crate::errors::ICBError;

/// Precision for fixed-point arithmetic (9 decimals, Solana native)
pub const PRECISION: u64 = 1_000_000_000;

/// Calculate square root using fixed-point arithmetic
/// Uses Babylonian method (Newton's method) for sqrt calculation
/// 
/// This replaces floating point sqrt to prevent precision loss and manipulation
pub fn sqrt_fixed(x: u64) -> Result<u64> {
    if x == 0 {
        return Ok(0);
    }
    
    if x == 1 {
        return Ok(1);
    }
    
    // For small numbers, use direct calculation
    if x < 4 {
        return Ok(1);
    }
    
    // Initial guess: x / 2
    let mut z = x / 2;
    let mut y = x;
    
    // Iterate until convergence (max 20 iterations for safety)
    for _ in 0..20 {
        if z >= y {
            break;
        }
        y = z;
        
        // Newton's method: z = (x/z + z) / 2
        let x_div_z = x.checked_div(z)
            .ok_or(ICBError::MathOverflow)?;
        
        z = x_div_z.checked_add(z)
            .ok_or(ICBError::MathOverflow)?
            .checked_div(2)
            .ok_or(ICBError::MathOverflow)?;
    }
    
    Ok(y)
}

/// Calculate voting power using quadratic staking
/// voting_power = sqrt(stake_amount)
/// 
/// This prevents whale dominance while rewarding larger stakes
pub fn calculate_voting_power(stake_amount: u64) -> Result<u64> {
    require!(stake_amount > 0, ICBError::InvalidStakeAmount);
    
    // Calculate sqrt using fixed-point arithmetic
    let voting_power = sqrt_fixed(stake_amount)?;
    
    // Ensure minimum voting power of 1
    Ok(voting_power.max(1))
}

/// Checked multiplication with overflow protection
pub fn checked_mul(a: u64, b: u64) -> Result<u64> {
    a.checked_mul(b)
        .ok_or(error!(ICBError::MathOverflow))
}

/// Checked addition with overflow protection
pub fn checked_add(a: u64, b: u64) -> Result<u64> {
    a.checked_add(b)
        .ok_or(error!(ICBError::MathOverflow))
}

/// Checked subtraction with underflow protection
pub fn checked_sub(a: u64, b: u64) -> Result<u64> {
    a.checked_sub(b)
        .ok_or(error!(ICBError::MathUnderflow))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_sqrt_perfect_squares() {
        assert_eq!(sqrt_fixed(0).unwrap(), 0);
        assert_eq!(sqrt_fixed(1).unwrap(), 1);
        assert_eq!(sqrt_fixed(4).unwrap(), 2);
        assert_eq!(sqrt_fixed(9).unwrap(), 3);
        assert_eq!(sqrt_fixed(16).unwrap(), 4);
        assert_eq!(sqrt_fixed(25).unwrap(), 5);
        assert_eq!(sqrt_fixed(100).unwrap(), 10);
        assert_eq!(sqrt_fixed(10000).unwrap(), 100);
        assert_eq!(sqrt_fixed(1000000).unwrap(), 1000);
    }
    
    #[test]
    fn test_sqrt_non_perfect_squares() {
        // sqrt(2) ≈ 1.414, should return 1
        let result = sqrt_fixed(2).unwrap();
        assert!(result >= 1 && result <= 2);
        
        // sqrt(10) ≈ 3.162, should return 3
        let result = sqrt_fixed(10).unwrap();
        assert!(result >= 3 && result <= 4);
        
        // sqrt(50) ≈ 7.071, should return 7
        let result = sqrt_fixed(50).unwrap();
        assert!(result >= 7 && result <= 8);
    }
    
    #[test]
    fn test_voting_power_calculation() {
        // Small stake
        assert_eq!(calculate_voting_power(1).unwrap(), 1);
        assert_eq!(calculate_voting_power(4).unwrap(), 2);
        
        // Medium stake
        assert_eq!(calculate_voting_power(100).unwrap(), 10);
        assert_eq!(calculate_voting_power(10000).unwrap(), 100);
        
        // Large stake
        assert_eq!(calculate_voting_power(1000000).unwrap(), 1000);
    }
    
    #[test]
    fn test_voting_power_fairness() {
        // Larger stake should have more voting power
        let vp1 = calculate_voting_power(100).unwrap();
        let vp2 = calculate_voting_power(400).unwrap();
        assert!(vp2 > vp1);
        
        // But not linearly (quadratic dampening)
        assert!(vp2 < vp1 * 4); // 4x stake doesn't give 4x power
    }
}
