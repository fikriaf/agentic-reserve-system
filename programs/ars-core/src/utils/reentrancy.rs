use anchor_lang::prelude::*;
use crate::errors::ICBError;

/// Reentrancy guard implementation for Solana programs
/// 
/// This module provides protection against reentrancy attacks by implementing
/// a lock mechanism that prevents recursive calls to protected functions.
/// 
/// Security Advisory: ARS-SA-2026-001 (High Priority Issue #3)
/// 
/// ## Usage Pattern
/// 
/// ```rust
/// // In your account structure
/// #[account]
/// pub struct Vault {
///     pub locked: bool,
///     // ... other fields
/// }
/// 
/// // In your instruction handler
/// pub fn handler(ctx: Context<YourInstruction>) -> Result<()> {
///     let vault = &mut ctx.accounts.vault;
///     
///     // Acquire lock before critical operations
///     acquire_lock(&mut vault.locked)?;
///     
///     // Perform critical operations (transfers, CPI calls, etc.)
///     // ...
///     
///     // Release lock after operations complete
///     release_lock(&mut vault.locked)?;
///     
///     Ok(())
/// }
/// ```
/// 
/// ## Security Properties
/// 
/// 1. **Mutual Exclusion**: Only one execution path can hold the lock at a time
/// 2. **Deadlock Prevention**: Locks are automatically released on error via Drop trait
/// 3. **Fail-Safe**: If lock acquisition fails, the entire transaction reverts
/// 4. **Atomic Operations**: Lock state changes are atomic within transaction boundaries

/// Acquires a reentrancy lock
/// 
/// # Arguments
/// * `locked` - Mutable reference to the lock flag
/// 
/// # Returns
/// * `Result<()>` - Ok if lock acquired, Error if already locked
/// 
/// # Errors
/// * `ICBError::ReentrancyDetected` - If the lock is already held
#[inline]
pub fn acquire_lock(locked: &mut bool) -> Result<()> {
    if *locked {
        msg!("Reentrancy detected: lock already held");
        return err!(ICBError::ReentrancyDetected);
    }
    
    *locked = true;
    msg!("Reentrancy lock acquired");
    Ok(())
}

/// Releases a reentrancy lock
/// 
/// # Arguments
/// * `locked` - Mutable reference to the lock flag
/// 
/// # Returns
/// * `Result<()>` - Always succeeds
#[inline]
pub fn release_lock(locked: &mut bool) -> Result<()> {
    *locked = false;
    msg!("Reentrancy lock released");
    Ok(())
}

/// RAII-style reentrancy guard that automatically releases lock on drop
/// 
/// This provides automatic lock release even if the function returns early
/// or encounters an error, preventing deadlocks.
/// 
/// # Example
/// 
/// ```rust
/// pub fn handler(ctx: Context<YourInstruction>) -> Result<()> {
///     let vault = &mut ctx.accounts.vault;
///     let _guard = ReentrancyGuard::new(&mut vault.locked)?;
///     
///     // Lock is automatically released when _guard goes out of scope
///     // even if an error occurs
///     
///     Ok(())
/// }
/// ```
pub struct ReentrancyGuard<'a> {
    locked: &'a mut bool,
}

impl<'a> ReentrancyGuard<'a> {
    /// Creates a new reentrancy guard and acquires the lock
    /// 
    /// # Arguments
    /// * `locked` - Mutable reference to the lock flag
    /// 
    /// # Returns
    /// * `Result<Self>` - Guard instance if lock acquired, Error otherwise
    pub fn new(locked: &'a mut bool) -> Result<Self> {
        acquire_lock(locked)?;
        Ok(Self { locked })
    }
}

impl<'a> Drop for ReentrancyGuard<'a> {
    /// Automatically releases the lock when the guard goes out of scope
    fn drop(&mut self) {
        *self.locked = false;
        msg!("Reentrancy lock auto-released via Drop");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_acquire_release_lock() {
        let mut locked = false;
        
        // Should acquire successfully
        assert!(acquire_lock(&mut locked).is_ok());
        assert!(locked);
        
        // Should fail on second acquire
        assert!(acquire_lock(&mut locked).is_err());
        
        // Should release successfully
        assert!(release_lock(&mut locked).is_ok());
        assert!(!locked);
    }
    
    #[test]
    fn test_reentrancy_guard_drop() {
        let mut locked = false;
        
        {
            let _guard = ReentrancyGuard::new(&mut locked);
            assert!(locked);
        } // Guard dropped here
        
        assert!(!locked); // Lock should be released
    }
}
