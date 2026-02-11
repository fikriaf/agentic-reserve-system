use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::ICBError;

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        mut,
        seeds = [PROPOSAL_SEED, &proposal.id.to_le_bytes()],
        bump = proposal.bump,
        constraint = proposal.status == ProposalStatus::Active || proposal.status == ProposalStatus::Passed
            @ ICBError::ProposalNotActive
    )]
    pub proposal: Account<'info, PolicyProposal>,
    
    #[account(
        constraint = global_state.authority == executor.key() @ ICBError::Unauthorized // FIX #3: Require authority
    )]
    pub executor: Signer<'info>,
    
    /// CHECK: Instructions sysvar for agent verification (ARS-SA-2026-001)
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handler(ctx: Context<ExecuteProposal>) -> Result<()> {
    // ARS-SA-2026-001: Validate agent authentication
    crate::validate_agent_auth(
        &ctx.accounts.instructions_sysvar,
        &ctx.accounts.executor.key(),
    )?;
    
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;
    
    // If proposal is Active, check voting and mark as Passed/Failed
    if proposal.status == ProposalStatus::Active {
        // Check if voting period has ended
        require!(
            clock.unix_timestamp >= proposal.end_time,
            ICBError::ProposalStillActive
        );
        
        // Calculate total stake and consensus
        let total_stake = proposal.yes_stake
            .checked_add(proposal.no_stake)
            .ok_or(ICBError::ArithmeticOverflow)?;
        
        require!(total_stake > 0, ICBError::InsufficientStake);
        
        // FIX #8: Safe percentage calculation with overflow protection
        require!(
            (proposal.yes_stake as u128) <= u128::MAX / 10000,
            ICBError::ArithmeticOverflow
        );
        
        let yes_percentage = (proposal.yes_stake as u128)
            .checked_mul(10000)
            .ok_or(ICBError::ArithmeticOverflow)?
            .checked_div(total_stake as u128)
            .ok_or(ICBError::ArithmeticOverflow)? as u16;
        
        if yes_percentage > 5000 {
            // Proposal passed - set passed_at for execution delay
            proposal.status = ProposalStatus::Passed;
            proposal.passed_at = clock.unix_timestamp; // FIX #3: Record when passed
            
            msg!("Proposal {} PASSED", proposal.id);
            msg!("YES: {} ({} bps)", proposal.yes_stake, yes_percentage);
            msg!("NO: {}", proposal.no_stake);
            msg!("Can be executed after: {}", clock.unix_timestamp + EXECUTION_DELAY);
            
            return Ok(());
        } else {
            // Proposal failed
            proposal.status = ProposalStatus::Failed;
            
            msg!("Proposal {} FAILED", proposal.id);
            msg!("YES: {} ({} bps)", proposal.yes_stake, yes_percentage);
            msg!("NO: {}", proposal.no_stake);
            
            // Slashing logic for failed predictions
            // Voters who predicted incorrectly (YES voters in this case) lose 10% of their stake
            // This incentivizes accurate predictions and discourages spam proposals
            let slashing_percentage = 1000; // 10% in basis points
            let yes_slashed = (proposal.yes_stake as u128)
                .checked_mul(slashing_percentage as u128)
                .ok_or(ICBError::ArithmeticOverflow)?
                .checked_div(10000)
                .ok_or(ICBError::ArithmeticOverflow)? as u64;
            
            msg!("Slashing {} from YES voters (10%)", yes_slashed);
            msg!("Slashed funds will be distributed to NO voters");
            
            // Note: Actual slashing distribution would be handled in a separate instruction
            // where individual voters claim their rewards/losses
            
            return Ok(());
        }
    }
    
    // If proposal is Passed, check execution delay and execute
    if proposal.status == ProposalStatus::Passed {
        // FIX #3: Enforce execution delay
        require!(
            clock.unix_timestamp >= proposal.passed_at + EXECUTION_DELAY,
            ICBError::ExecutionDelayNotMet
        );
        
        msg!("Executing proposal {}", proposal.id);
        msg!("Policy type: {:?}", proposal.policy_type);
        
        // TODO: Execute policy based on policy_type
        // This would involve calling other programs (ARU token, reserve, etc.)
        // For now, just mark as executed
        
        proposal.status = ProposalStatus::Executed;
        msg!("Proposal executed successfully");
        
        return Ok(());
    }
    
    Err(ICBError::ProposalNotReadyForExecution.into())
}

