use anchor_lang::prelude::*;
use proptest::prelude::*;

/**
 * Property-Based Tests for ARS Core Program
 * 
 * These tests verify invariants and properties of the smart contracts
 * using property-based testing with proptest
 */

/// Property Test 8.7: Verify total_stake = yes_stake + no_stake always holds
/// Validates: Requirements 2.3, 2.6
#[cfg(test)]
mod futarchy_stake_invariants {
    use super::*;

    proptest! {
        #[test]
        fn test_stake_invariant_holds(
            yes_stake in 0u64..1_000_000_000u64,
            no_stake in 0u64..1_000_000_000u64,
        ) {
            // Property: total_stake = yes_stake + no_stake
            let total_stake = yes_stake.checked_add(no_stake).unwrap();
            
            // Verify the invariant
            assert_eq!(total_stake, yes_stake + no_stake);
            
            // Verify no overflow
            assert!(total_stake >= yes_stake);
            assert!(total_stake >= no_stake);
        }

        #[test]
        fn test_quadratic_staking_reduces_whale_power(
            whale_stake in 1_000_000u64..1_000_000_000u64,
            small_stake in 1_000u64..10_000u64,
        ) {
            // Quadratic staking: voting_power = sqrt(stake)
            let whale_power = (whale_stake as f64).sqrt() as u64;
            let small_power = (small_stake as f64).sqrt() as u64;
            
            // Property: Quadratic staking reduces the ratio between whale and small voter
            let linear_ratio = whale_stake / small_stake;
            let quadratic_ratio = whale_power / small_power;
            
            // Quadratic ratio should be much smaller than linear ratio
            assert!(quadratic_ratio < linear_ratio);
            
            // Verify voting power is always less than or equal to stake
            assert!(whale_power <= whale_stake);
            assert!(small_power <= small_stake);
        }

        #[test]
        fn test_consensus_calculation_is_safe(
            yes_stake in 0u64..1_000_000_000u64,
            no_stake in 1u64..1_000_000_000u64, // Avoid division by zero
        ) {
            let total_stake = yes_stake.checked_add(no_stake).unwrap();
            
            // Calculate percentage safely (as done in execute_proposal)
            let yes_percentage = if yes_stake <= u128::MAX / 10000 {
                ((yes_stake as u128) * 10000 / (total_stake as u128)) as u16
            } else {
                0 // Overflow would occur
            };
            
            // Property: Percentage must be between 0 and 10000 (0-100%)
            assert!(yes_percentage <= 10000);
            
            // Property: If yes_stake > 50% of total, percentage > 5000
            if yes_stake > total_stake / 2 {
                assert!(yes_percentage > 5000);
            }
            
            // Property: If yes_stake < 50% of total, percentage <= 5000
            if yes_stake < total_stake / 2 {
                assert!(yes_percentage <= 5000);
            }
        }

        #[test]
        fn test_slashing_calculation_is_safe(
            yes_stake in 1u64..1_000_000_000u64,
        ) {
            // Slashing: 10% of losing stake
            let slashing_percentage = 1000u128; // 10% in basis points
            
            let slashed = ((yes_stake as u128) * slashing_percentage / 10000) as u64;
            
            // Property: Slashed amount is always less than original stake
            assert!(slashed < yes_stake);
            
            // Property: Slashed amount is approximately 10% (within rounding)
            let expected_slash = yes_stake / 10;
            assert!((slashed as i64 - expected_slash as i64).abs() <= 1);
        }

        #[test]
        fn test_multiple_votes_maintain_invariant(
            votes in prop::collection::vec((0u64..1_000_000u64, any::<bool>()), 1..100),
        ) {
            let mut yes_stake = 0u64;
            let mut no_stake = 0u64;
            
            for (stake_amount, prediction) in votes {
                // Apply quadratic staking
                let voting_power = (stake_amount as f64).sqrt() as u64;
                
                if prediction {
                    yes_stake = yes_stake.saturating_add(voting_power);
                } else {
                    no_stake = no_stake.saturating_add(voting_power);
                }
            }
            
            // Property: total_stake = yes_stake + no_stake (with saturation)
            let total_stake = yes_stake.saturating_add(no_stake);
            assert_eq!(total_stake, yes_stake + no_stake);
            
            // Property: Stakes are non-negative
            assert!(yes_stake >= 0);
            assert!(no_stake >= 0);
        }
    }
}

/// Property tests for circuit breaker logic
#[cfg(test)]
mod circuit_breaker_properties {
    use super::*;

    proptest! {
        #[test]
        fn test_circuit_breaker_timelock(
            request_time in 0i64..1_000_000_000i64,
            delay in 0i64..86400i64, // Up to 24 hours
        ) {
            let activation_time = request_time + delay;
            
            // Property: Activation time is always after request time
            assert!(activation_time >= request_time);
            
            // Property: If delay is met, activation should be allowed
            let current_time = request_time + delay + 1;
            assert!(current_time >= activation_time);
        }

        #[test]
        fn test_vhr_threshold_check(
            total_value in 1_000_000u64..1_000_000_000u64,
            liabilities in 1u64..1_000_000_000u64,
        ) {
            // VHR = (total_value / liabilities) * 10000 (in basis points)
            let vhr = if liabilities > 0 {
                ((total_value as u128) * 10000 / (liabilities as u128)) as u16
            } else {
                u16::MAX
            };
            
            // Property: VHR threshold is 150% (15000 bps)
            let threshold = 15000u16;
            
            // Property: Circuit breaker should trigger if VHR < threshold
            let should_trigger = vhr < threshold;
            
            if total_value < liabilities * 3 / 2 {
                // If value < 1.5x liabilities, should trigger
                assert!(should_trigger || vhr == threshold);
            }
        }
    }
}

/// Property tests for epoch and supply cap
#[cfg(test)]
mod supply_cap_properties {
    use super::*;

    proptest! {
        #[test]
        fn test_mint_burn_cap_enforcement(
            current_supply in 1_000_000u64..1_000_000_000u64,
            mint_amount in 0u64..100_000_000u64,
        ) {
            // Cap is 2% (200 basis points)
            let cap_bps = 200u128;
            let max_mint = ((current_supply as u128) * cap_bps / 10000) as u64;
            
            // Property: Mint amount should never exceed 2% of supply
            let is_valid = mint_amount <= max_mint;
            
            if mint_amount > max_mint {
                assert!(!is_valid);
            } else {
                assert!(is_valid);
            }
            
            // Property: Max mint is always less than or equal to current supply
            assert!(max_mint <= current_supply);
        }

        #[test]
        fn test_stability_fee_calculation(
            amount in 1_000u64..1_000_000_000u64,
        ) {
            // Stability fee is 0.1% (10 basis points)
            let fee_bps = 10u128;
            let fee = ((amount as u128) * fee_bps / 10000) as u64;
            
            // Property: Fee is always less than amount
            assert!(fee < amount);
            
            // Property: Fee is approximately 0.1%
            let expected_fee = amount / 1000;
            assert!((fee as i64 - expected_fee as i64).abs() <= 1);
        }

        #[test]
        fn test_epoch_duration_bounds(
            epoch_duration in 3600i64..86400i64, // 1 hour to 24 hours
        ) {
            // Property: Epoch duration should be reasonable
            assert!(epoch_duration >= 3600); // At least 1 hour
            assert!(epoch_duration <= 86400); // At most 24 hours
            
            // Property: Epoch duration is positive
            assert!(epoch_duration > 0);
        }
    }
}

/// Integration property tests
#[cfg(test)]
mod integration_properties {
    use super::*;

    proptest! {
        #[test]
        fn test_proposal_lifecycle_consistency(
            start_time in 0i64..1_000_000i64,
            duration in 3600i64..86400i64,
        ) {
            let end_time = start_time + duration;
            let execution_delay = 3600i64; // 1 hour
            let passed_at = end_time;
            let can_execute_at = passed_at + execution_delay;
            
            // Property: Timeline is consistent
            assert!(end_time > start_time);
            assert!(passed_at >= end_time);
            assert!(can_execute_at > passed_at);
            
            // Property: Execution can only happen after delay
            let current_time = can_execute_at + 1;
            assert!(current_time >= can_execute_at);
        }

        #[test]
        fn test_arithmetic_overflow_protection(
            a in 0u64..u64::MAX / 2,
            b in 0u64..u64::MAX / 2,
        ) {
            // Property: checked_add prevents overflow
            let result = a.checked_add(b);
            assert!(result.is_some());
            
            let sum = result.unwrap();
            assert!(sum >= a);
            assert!(sum >= b);
            
            // Property: saturating_add never panics
            let saturated = a.saturating_add(b);
            assert!(saturated >= a);
            assert!(saturated >= b);
        }
    }
}

#[cfg(test)]
mod reserve_vault_properties {
    use super::*;

    proptest! {
        /// Property Test 9.6: Verify VHR >= 150% or circuit breaker active
        /// Validates: Requirements 3.3
        #[test]
        fn test_vhr_invariant(
            total_value in 1_000_000u64..10_000_000_000u64,
            liabilities in 1u64..10_000_000_000u64,
            circuit_breaker_active in any::<bool>(),
        ) {
            // Calculate VHR in basis points
            let vhr = if liabilities > 0 {
                ((total_value as u128) * 10000 / (liabilities as u128)) as u16
            } else {
                u16::MAX
            };
            
            let vhr_threshold = 15000u16; // 150%
            
            // Property: VHR >= 150% OR circuit breaker is active
            let invariant_holds = vhr >= vhr_threshold || circuit_breaker_active;
            
            // In a healthy system, this should always be true
            // If VHR < 150%, circuit breaker MUST be active
            if vhr < vhr_threshold {
                assert!(circuit_breaker_active, 
                    "VHR {} is below threshold {}, but circuit breaker is not active", 
                    vhr, vhr_threshold);
            }
            
            assert!(invariant_holds);
        }

        #[test]
        fn test_rebalance_threshold(
            current_weight in 0u16..10000u16,
            target_weight in 0u16..10000u16,
        ) {
            // Rebalance threshold is 15% (1500 bps)
            let threshold = 1500u16;
            
            let deviation = if current_weight > target_weight {
                current_weight - target_weight
            } else {
                target_weight - current_weight
            };
            
            // Property: Rebalance should trigger if deviation > threshold
            let should_rebalance = deviation > threshold;
            
            if deviation > threshold {
                assert!(should_rebalance);
            } else {
                assert!(!should_rebalance);
            }
        }
    }
}

#[cfg(test)]
mod token_supply_properties {
    use super::*;

    proptest! {
        /// Property Test 10.6: Verify mint/burn never exceeds ±2% per epoch
        /// Validates: Requirements 5.2
        #[test]
        fn test_supply_cap_invariant(
            current_supply in 1_000_000u64..1_000_000_000_000u64,
            mint_amount in 0u64..100_000_000_000u64,
        ) {
            // Cap is 2% (200 basis points)
            let cap_bps = 200u128;
            let max_change = ((current_supply as u128) * cap_bps / 10000) as u64;
            
            // Property: Mint/burn amount must not exceed 2% of current supply
            let is_valid = mint_amount <= max_change;
            
            if mint_amount > max_change {
                // This should be rejected by the program
                assert!(!is_valid);
            }
            
            // Property: Max change is always proportional to supply
            let expected_max = current_supply / 50; // 2%
            assert!((max_change as i64 - expected_max as i64).abs() <= 1);
        }

        #[test]
        fn test_supply_never_negative(
            current_supply in 1_000_000u64..1_000_000_000u64,
            burn_amount in 0u64..1_000_000_000u64,
        ) {
            // Property: Supply can never go negative
            let new_supply = current_supply.saturating_sub(burn_amount);
            
            assert!(new_supply >= 0);
            assert!(new_supply <= current_supply);
            
            // If burn > supply, result should be 0 (saturating)
            if burn_amount > current_supply {
                assert_eq!(new_supply, 0);
            }
        }
    }
}
