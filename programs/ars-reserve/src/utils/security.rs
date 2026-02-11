/**
 * Security utilities for ARS Reserve
 * 
 * Implements reentrancy protection and other security measures
 */

use anchor_lang::prelude::*;
use crate::errors::ReserveError;
use crate::state::ReserveVault;

/// Reentrancy guard implementation
/// 
/// This struct provides RAII-style reentrancy protection.
/// The lock is automatically released when the guard goes out of scope.
pub struct ReentrancyGuard<'a> {
    locked: &'a mut bool,
}

impl<'a> ReentrancyGuard<'a> {
    /// Acquire reentrancy lock
    /// 
    /// # Arguments
    /// * `locked` - Mutable reference to the lock flag
    /// 
    /// # Returns
    /// * `Result<Self>` - Guard if lock acquired, error if already locked
    pub fn new(locked: &'a mut bool) -> Result<Self> {
        // Check if already locked
        require!(!*locked, ReserveError::ReentrancyDetected);
        
        // Acquire lock
        *locked = true;
        
        msg!("✓ Reentrancy lock acquired");
        
        Ok(Self { locked })
    }
}

impl<'a> Drop for ReentrancyGuard<'a> {
    /// Automatically release lock when guard goes out of scope
    /// This ensures lock is always released, even if function panics
    fn drop(&mut self) {
        *self.locked = false;
        msg!("✓ Reentrancy lock released");
    }
}

/// Macro for reentrancy-protected code blocks
/// 
/// Usage:
/// ```
/// with_reentrancy_guard!(vault, {
///     // Protected code here
///     do_something()?;
///     Ok(())
/// })?;
/// ```
#[macro_export]
macro_rules! with_reentrancy_guard {
    ($vault:expr, $code:block) => {{
        let _guard = $crate::utils::security::ReentrancyGuard::new($vault)?;
        $code
    }};
}

/// Validate PDA derivation
/// 
/// Ensures that a PDA was derived correctly to prevent account substitution attacks
pub fn validate_pda(
    expected_seeds: &[&[u8]],
    expected_program_id: &Pubkey,
    actual_address: &Pubkey,
    actual_bump: u8,
) -> Result<()> {
    let (derived_address, derived_bump) = Pubkey::find_program_address(
        expected_seeds,
        expected_program_id,
    );
    
    require!(
        derived_address == *actual_address,
        ReserveError::InvalidPDA
    );
    
    require!(
        derived_bump == actual_bump,
        ReserveError::InvalidPDA
    );
    
    Ok(())
}

/// Validate account owner
/// 
/// Ensures an account is owned by the expected program
pub fn validate_account_owner(
    account: &AccountInfo,
    expected_owner: &Pubkey,
) -> Result<()> {
    require!(
        account.owner == expected_owner,
        ReserveError::InvalidAccountOwner
    );
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    // Note: Full testing requires integration tests with actual accounts
    // These are unit tests for the logic
    
    #[test]
    fn test_reentrancy_guard_lifecycle() {
        // This test demonstrates the guard pattern
        // Actual testing requires integration tests
        
        // Guard should acquire lock on creation
        // Guard should release lock on drop
        // This is tested in integration tests
    }
}
