# Requirements Document: HTTP 402 Payment Required Protocol

## Introduction

This document specifies the requirements for implementing a production-ready HTTP 402 Payment Required protocol client for the ARS backend API. The system enables micropayments for API access using USDC SPL tokens on Solana, allowing the ARS system to make authenticated requests to x402-enabled APIs with automatic payment handling, budget tracking, payment verification, and comprehensive error handling.

## Glossary

- **X402_Client**: The HTTP 402 protocol client service that handles payment-required API requests
- **Payment_Manager**: Component responsible for creating and executing USDC SPL token transfers on Solana
- **Budget_Tracker**: Component that monitors and enforces spending limits with persistence to Supabase
- **Payment_Verifier**: Component that verifies payment transactions on-chain
- **Payment_History**: Persistent record of all payment transactions stored in Supabase
- **USDC_SPL_Token**: USD Coin as a Solana Program Library token (mint address: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
- **Payment_Request**: HTTP 402 response containing payment details (amount, recipient, currency)
- **Payment_Proof**: Transaction signature and metadata proving payment completion
- **Budget_Cap**: Maximum spending limit enforced per wallet or API endpoint
- **Rate_Limiter**: Component that prevents excessive payment requests
- **Retry_Handler**: Component that manages failed transaction retries with exponential backoff
- **Payment_Analytics**: Aggregated metrics and reporting on payment operations
- **Auto_Approval_Mode**: Configuration where payments below threshold are automatically approved
- **Manual_Approval_Mode**: Configuration where all payments require explicit user confirmation
- **Supabase_Client**: Database client for persisting payment data
- **Redis_Client**: Cache client for temporary payment state and rate limiting

## Requirements

### Requirement 1: HTTP 402 Protocol Implementation

**User Story:** As a developer, I want the X402_Client to properly implement the HTTP 402 Payment Required protocol, so that the system can interact with x402-enabled APIs according to the standard.

#### Acceptance Criteria

1. WHEN the X402_Client receives an HTTP 402 response, THE X402_Client SHALL extract payment details from the X-Payment-Info header
2. WHEN payment details are extracted, THE X402_Client SHALL validate that all required fields are present (amount, currency, network, recipient)
3. WHEN a payment is completed, THE X402_Client SHALL retry the original request with X-Payment-Id and X-Payment-Signature headers
4. WHEN the X-Payment-Info header is missing from a 402 response, THE X402_Client SHALL return a descriptive error
5. THE X402_Client SHALL support the standard x402 header format as specified in the protocol documentation

### Requirement 2: USDC SPL Token Payments

**User Story:** As a system operator, I want all payments to use USDC SPL tokens instead of SOL, so that payments are made in a stable currency with proper token standards.

#### Acceptance Criteria

1. WHEN the Payment_Manager creates a payment transaction, THE Payment_Manager SHALL use the USDC SPL token mint address
2. WHEN transferring USDC, THE Payment_Manager SHALL use the SPL Token Program transfer instruction
3. WHEN a payment amount is specified, THE Payment_Manager SHALL handle USDC's 6 decimal precision correctly
4. WHEN the payer's USDC token account does not exist, THE Payment_Manager SHALL return a descriptive error
5. WHEN the payer has insufficient USDC balance, THE Payment_Manager SHALL return a descriptive error with the required and available amounts

### Requirement 3: Budget Tracking with Persistence

**User Story:** As a system administrator, I want payment budgets and spending to be persisted to Supabase, so that budget limits survive service restarts and can be audited.

#### Acceptance Criteria

1. WHEN a budget is set, THE Budget_Tracker SHALL persist the budget configuration to Supabase
2. WHEN a payment is made, THE Budget_Tracker SHALL update the spent amount in Supabase atomically
3. WHEN the X402_Client initializes, THE Budget_Tracker SHALL load existing budget data from Supabase
4. WHEN a payment would exceed the remaining budget, THE Budget_Tracker SHALL reject the payment before creating a transaction
5. WHEN budget data is updated, THE Budget_Tracker SHALL invalidate the Redis cache for that budget

### Requirement 4: Payment History and Analytics

**User Story:** As a system administrator, I want comprehensive payment history and analytics, so that I can monitor spending patterns and troubleshoot payment issues.

#### Acceptance Criteria

1. WHEN a payment is initiated, THE Payment_History SHALL record the payment with status 'pending' in Supabase
2. WHEN a payment is confirmed on-chain, THE Payment_History SHALL update the status to 'confirmed' with the transaction signature
3. WHEN a payment fails, THE Payment_History SHALL record the failure reason and status 'failed'
4. THE Payment_Analytics SHALL provide aggregated metrics including total spent, payment count, success rate, and average payment amount
5. THE Payment_Analytics SHALL support filtering by date range, status, and recipient address
6. THE Payment_History SHALL retain all payment records for audit purposes

### Requirement 5: On-Chain Payment Verification

**User Story:** As a security engineer, I want all payments to be verifiable on-chain, so that payment claims can be independently validated.

#### Acceptance Criteria

1. WHEN verifying a payment, THE Payment_Verifier SHALL query the Solana blockchain for the transaction signature
2. WHEN a transaction is found, THE Payment_Verifier SHALL validate that the recipient and amount match the payment request
3. WHEN a transaction has sufficient confirmations, THE Payment_Verifier SHALL mark the payment as verified
4. WHEN a transaction is not found, THE Payment_Verifier SHALL return verification status 'not_found'
5. THE Payment_Verifier SHALL support configurable confirmation thresholds (confirmed, finalized)

### Requirement 6: Security Features

**User Story:** As a security engineer, I want comprehensive security controls, so that the payment system is protected against abuse and unauthorized access.

#### Acceptance Criteria

1. WHEN a payment request is received, THE Rate_Limiter SHALL enforce maximum requests per time window per wallet
2. WHEN a budget cap is configured, THE Budget_Tracker SHALL enforce the cap across all payment requests
3. WHEN accessing payment operations, THE X402_Client SHALL validate API authorization tokens
4. WHEN a payment exceeds a configured threshold, THE X402_Client SHALL require manual approval before proceeding
5. THE X402_Client SHALL log all payment attempts with wallet address, amount, and timestamp for security auditing

### Requirement 7: Payment Failure Handling and Retries

**User Story:** As a developer, I want robust error handling and retry logic, so that transient failures don't result in lost payments or service disruptions.

#### Acceptance Criteria

1. WHEN a payment transaction fails due to network error, THE Retry_Handler SHALL retry with exponential backoff up to a maximum of 3 attempts
2. WHEN a payment fails due to insufficient balance, THE Retry_Handler SHALL not retry and SHALL return an immediate error
3. WHEN a payment fails due to invalid recipient address, THE Retry_Handler SHALL not retry and SHALL return an immediate error
4. WHEN all retry attempts are exhausted, THE Retry_Handler SHALL record the final failure in Payment_History
5. WHEN a transaction is submitted but confirmation times out, THE Retry_Handler SHALL verify the transaction status before retrying

### Requirement 8: Automatic and Manual Approval Modes

**User Story:** As a system operator, I want configurable payment approval modes, so that I can balance automation with control based on payment amounts.

#### Acceptance Criteria

1. WHEN Auto_Approval_Mode is enabled with a threshold, THE X402_Client SHALL automatically approve payments below the threshold
2. WHEN Manual_Approval_Mode is enabled, THE X402_Client SHALL require explicit approval for all payments
3. WHEN a payment requires manual approval, THE X402_Client SHALL provide payment details and wait for approval confirmation
4. WHEN manual approval times out, THE X402_Client SHALL cancel the payment and return an error
5. THE X402_Client SHALL persist approval mode configuration in Supabase

### Requirement 9: Multi-Environment Support

**User Story:** As a developer, I want the system to support both devnet and mainnet configurations, so that I can test without real payments and deploy to production.

#### Acceptance Criteria

1. WHEN configured for devnet, THE X402_Client SHALL use the devnet USDC mint address and devnet RPC endpoint
2. WHEN configured for mainnet, THE X402_Client SHALL use the mainnet USDC mint address and mainnet RPC endpoint
3. WHEN in devnet mode, THE X402_Client SHALL include a visual indicator in logs that payments are test transactions
4. THE X402_Client SHALL load network configuration from environment variables
5. THE X402_Client SHALL validate that the configured network matches the RPC endpoint network

### Requirement 10: Payment Metrics and Monitoring

**User Story:** As a DevOps engineer, I want comprehensive metrics and monitoring, so that I can track system health and payment performance.

#### Acceptance Criteria

1. THE X402_Client SHALL expose metrics for total payments, successful payments, failed payments, and retry counts
2. THE X402_Client SHALL track average payment confirmation time and expose it as a metric
3. THE X402_Client SHALL emit events for payment lifecycle stages (initiated, confirmed, failed)
4. WHEN payment error rates exceed a threshold, THE X402_Client SHALL log warnings
5. THE X402_Client SHALL integrate with existing Redis-based metrics collection

### Requirement 11: Integration with Existing Backend Architecture

**User Story:** As a backend developer, I want the X402_Client to integrate seamlessly with existing services, so that it follows established patterns and can be easily maintained.

#### Acceptance Criteria

1. THE X402_Client SHALL follow the singleton pattern used by other service clients (Jupiter, Kamino, etc.)
2. THE X402_Client SHALL use the existing Supabase_Client for database operations
3. THE X402_Client SHALL use the existing Redis_Client for caching and rate limiting
4. THE X402_Client SHALL use the existing Solana connection configuration from config
5. THE X402_Client SHALL follow the existing error handling patterns with typed Result objects
6. THE X402_Client SHALL be exported from the services directory with a getX402Client() factory function

### Requirement 12: Testing Without Real Payments

**User Story:** As a developer, I want to test payment flows without making real blockchain transactions, so that I can develop and test safely.

#### Acceptance Criteria

1. WHEN test mode is enabled, THE Payment_Manager SHALL simulate payment transactions without submitting to the blockchain
2. WHEN in test mode, THE Payment_Manager SHALL generate mock transaction signatures
3. WHEN in test mode, THE Payment_Verifier SHALL return successful verification for mock signatures
4. THE X402_Client SHALL support test mode configuration via environment variable
5. WHEN test mode is enabled, THE X402_Client SHALL log clearly that payments are simulated
