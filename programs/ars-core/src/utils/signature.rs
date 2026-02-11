/**
 * Secure Ed25519 Signature Verification
 * 
 * Security Advisory: ARS-SA-2026-001
 * Implements proper Ed25519 signature verification to prevent agent impersonation
 */

use anchor_lang::prelude::*;
use anchor_lang::solana_program::ed25519_program;
use anchor_lang::solana_program::sysvar::instructions as sysvar_instructions;
use crate::errors::ICBError;

/// Validates Ed25519 signature from previous instruction
/// 
/// This function ensures that:
/// 1. The previous instruction is an Ed25519 signature verification
/// 2. The public key in the signature matches the expected agent
/// 3. The message matches the expected content
/// 
/// # Arguments
/// * `instructions_sysvar` - The instructions sysvar account
/// * `expected_pubkey` - The public key of the expected agent
/// * `expected_message` - The message that should have been signed
/// 
/// # Returns
/// * `Result<()>` - Ok if validation passes, Error otherwise
pub fn validate_ed25519_signature(
    instructions_sysvar: &AccountInfo,
    expected_pubkey: &Pubkey,
    expected_message: &[u8],
) -> Result<()> {
    // Load current instruction index
    let current_index = sysvar_instructions::load_current_index_checked(instructions_sysvar)?;
    
    // Ensure there is a previous instruction
    require!(current_index > 0, ICBError::MissingSignatureVerification);
    
    // Load the previous instruction (should be Ed25519 signature verification)
    let prev_index = current_index.saturating_sub(1);
    let prev_ix = sysvar_instructions::load_instruction_at_checked(
        prev_index as usize,
        instructions_sysvar,
    )?;
    
    // Verify that the previous instruction is Ed25519 signature verification
    require!(
        prev_ix.program_id == ed25519_program::ID,
        ICBError::InvalidSignatureProgram
    );
    
    // Parse Ed25519 instruction data
    // Format: [num_signatures: u16][padding: u16][signature: 64 bytes][pubkey: 32 bytes][message: variable]
    require!(
        prev_ix.data.len() >= 100,
        ICBError::SignatureVerificationFailed
    );
    
    // Extract number of signatures (should be 1)
    let num_signatures = u16::from_le_bytes([prev_ix.data[0], prev_ix.data[1]]);
    require!(
        num_signatures == 1,
        ICBError::SignatureVerificationFailed
    );
    
    // Extract signature (bytes 4-67, after num_signatures and padding)
    let _signature = &prev_ix.data[4..68];
    
    // Extract public key (bytes 68-99)
    let pubkey_bytes = &prev_ix.data[68..100];
    
    // Verify public key matches expected
    require!(
        pubkey_bytes == expected_pubkey.as_ref(),
        ICBError::AgentMismatch
    );
    
    // Extract message (bytes 100+)
    let message_bytes = &prev_ix.data[100..];
    
    // Verify message matches expected
    require!(
        message_bytes == expected_message,
        ICBError::SignatureVerificationFailed
    );
    
    msg!("✓ Ed25519 signature verified for agent: {:?}", expected_pubkey);
    Ok(())
}

/// Create message for agent signature
/// Includes nonce to prevent replay attacks
pub fn create_agent_message(
    agent_pubkey: &Pubkey,
    nonce: u64,
    action: &str,
    proposal_id: Option<u64>,
) -> Vec<u8> {
    let mut message = Vec::new();
    
    // Add agent pubkey
    message.extend_from_slice(agent_pubkey.as_ref());
    
    // Add nonce (8 bytes)
    message.extend_from_slice(&nonce.to_le_bytes());
    
    // Add action string
    message.extend_from_slice(action.as_bytes());
    
    // Add proposal ID if present
    if let Some(id) = proposal_id {
        message.extend_from_slice(&id.to_le_bytes());
    }
    
    message
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_create_agent_message() {
        let agent = Pubkey::new_unique();
        let nonce = 42u64;
        let action = "vote";
        let proposal_id = Some(123u64);
        
        let message = create_agent_message(&agent, nonce, action, proposal_id);
        
        // Verify message structure
        assert_eq!(message.len(), 32 + 8 + 4 + 8); // pubkey + nonce + "vote" + proposal_id
        assert_eq!(&message[0..32], agent.as_ref());
        assert_eq!(&message[32..40], &nonce.to_le_bytes());
        assert_eq!(&message[40..44], b"vote");
        assert_eq!(&message[44..52], &proposal_id.unwrap().to_le_bytes());
    }
    
    #[test]
    fn test_create_agent_message_without_proposal() {
        let agent = Pubkey::new_unique();
        let nonce = 42u64;
        let action = "register";
        
        let message = create_agent_message(&agent, nonce, action, None);
        
        // Verify message structure
        assert_eq!(message.len(), 32 + 8 + 8); // pubkey + nonce + "register"
        assert_eq!(&message[0..32], agent.as_ref());
        assert_eq!(&message[32..40], &nonce.to_le_bytes());
        assert_eq!(&message[40..48], b"register");
    }
}
