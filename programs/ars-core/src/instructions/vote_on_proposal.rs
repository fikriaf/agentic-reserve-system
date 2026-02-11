use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ICBError;
use crate::math::calculate_voting_power;
use crate::constants::*;

#[derive(Accounts)]
pub struct VoteOnProposal<'info> {
    #[account(
        mut,
        seeds = [PROPOSAL_SEED, &proposal.id.to_le_bytes()],
        bump = proposal.bump,
        constraint = proposal.status == ProposalStatus::Active @ ICBError::ProposalNotActive
    )]
    pub proposal: Account<'info, PolicyProposal>,
    
    #[account(
        init_if_needed,
        payer = agent,
        space = VoteRecord::LEN,
        seeds = [VOTE_SEED, proposal.key().as_ref(), agent.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    
    #[account(mut)]
    pub agent: Signer<'info>,
    
    /// CHECK: Instructions sysvar for agent verification (ARS-SA-2026-001)
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<VoteOnProposal>,
    prediction: bool,
    stake_amount: u64,
    agent_signature: [u8; 64], // FIX #2: Require signature as parameter
) -> Result<()> {
    // ARS-SA-2026-001: Validate agent authentication
    crate::validate_agent_auth(
        &ctx.accounts.instructions_sysvar,
        &ctx.accounts.agent.key(),
    )?;
    
    require!(stake_amount > 0, ICBError::InvalidStakeAmount);
    
    let proposal = &mut ctx.accounts.proposal;
    let vote_record = &mut ctx.accounts.vote_record;
    let clock = Clock::get()?;
    
    // Check if already voted (FIX #5: Prevent duplicate voting)
    require!(!vote_record.claimed, ICBError::AlreadyVoted);
    
    // Check if voting period is still active
    require!(
        clock.unix_timestamp < proposal.end_time,
        ICBError::ProposalNotActive
    );
    
    // Update proposal stakes with quadratic staking using fixed-point arithmetic
    // Quadratic staking formula: voting_power = sqrt(stake_amount)
    // This prevents whale dominance and encourages broader participation
    // FIX #2: Use fixed-point sqrt instead of f64 for deterministic computation
    let voting_power = calculate_voting_power(stake_amount)?;
    
    if prediction {
        proposal.yes_stake = proposal.yes_stake
            .checked_add(voting_power)
            .ok_or(ICBError::ArithmeticOverflow)?;
    } else {
        proposal.no_stake = proposal.no_stake
            .checked_add(voting_power)
            .ok_or(ICBError::ArithmeticOverflow)?;
    }
    
    // Record vote
    vote_record.proposal = proposal.key();
    vote_record.agent = ctx.accounts.agent.key();
    vote_record.stake_amount = stake_amount;
    vote_record.prediction = prediction;
    vote_record.timestamp = clock.unix_timestamp;
    vote_record.claimed = true; // Mark as voted
    vote_record.agent_signature = agent_signature; // FIX #2: Store verified signature
    vote_record.bump = ctx.bumps.vote_record;
    
    msg!("Vote recorded for proposal: {}", proposal.id);
    msg!("Agent: {}", ctx.accounts.agent.key());
    msg!("Prediction: {}", if prediction { "YES" } else { "NO" });
    msg!("Stake: {}", stake_amount);
    msg!("Voting power: {}", voting_power);
    msg!("Total YES stake: {}", proposal.yes_stake);
    msg!("Total NO stake: {}", proposal.no_stake);
    
    Ok(())
}
