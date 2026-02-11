# Jupiter Ultra API Migration - Requirements

## Overview
The Jupiter Ultra API has been deprecated and is no longer publicly available. The current implementation has multiple methods that depend on this deprecated API, causing failures in swap operations, price impact calculations, and MEV protection features. This spec defines the migration from the deprecated Ultra API to the official Jupiter Swap API v6 and Jupiter SDK.

## Problem Statement
The `JupiterClient` class currently has:
1. Two deprecated methods (`getUltraOrder`, `executeUltraOrder`) that throw errors
2. Five additional methods that depend on the deprecated Ultra API internally
3. External dependencies in `mev-protection-service.ts` that call these broken methods
4. References to a non-existent `ultraClient` instance in several methods

This breaks critical functionality including:
- Swap quote generation
- Price impact calculation
- Route optimization
- Token search
- User holdings retrieval
- Liquidity checks
- MEV protection

## User Stories

### 1. As a developer, I need working swap quote functionality
**Acceptance Criteria:**
- 1.1: The system can fetch swap quotes using Jupiter Swap API v6
- 1.2: Quotes include input/output amounts, price impact, and route information
- 1.3: Quotes support configurable slippage tolerance
- 1.4: Quote requests complete within 5 seconds
- 1.5: Failed quote requests return meaningful error messages

### 2. As a developer, I need accurate price impact calculations
**Acceptance Criteria:**
- 2.1: Price impact is calculated from Jupiter Swap API quote data
- 2.2: Price impact percentage is accurate to 2 decimal places
- 2.3: Price impact calculation handles edge cases (low liquidity, large trades)
- 2.4: Price impact is cached appropriately to reduce API calls

### 3. As a developer, I need optimal route selection
**Acceptance Criteria:**
- 3.1: The system identifies the best swap route from Jupiter's routing engine
- 3.2: Route information includes all intermediate hops and DEXes used
- 3.3: Route selection considers both price and gas costs
- 3.4: Multiple route options are available when requested

### 4. As a developer, I need token search functionality
**Acceptance Criteria:**
- 4.1: Users can search for tokens by symbol or name
- 4.2: Search results include token metadata (address, decimals, logo)
- 4.3: Search is case-insensitive and supports partial matches
- 4.4: Search results are limited to verified tokens by default

### 5. As a developer, I need to check liquidity availability
**Acceptance Criteria:**
- 5.1: The system can verify if a token pair has sufficient liquidity
- 5.2: Liquidity checks return the number of available routes
- 5.3: Liquidity checks handle non-existent pairs gracefully
- 5.4: Liquidity information is cached for performance

### 6. As a system, I need backward compatibility during migration
**Acceptance Criteria:**
- 6.1: Existing method signatures remain unchanged where possible
- 6.2: Breaking changes are clearly documented
- 6.3: Migration path is provided for external consumers
- 6.4: Deprecated methods log warnings before throwing errors

### 7. As a developer, I need proper error handling
**Acceptance Criteria:**
- 7.1: API failures return structured error objects
- 7.2: Network timeouts are handled gracefully
- 7.3: Rate limiting errors trigger exponential backoff
- 7.4: All errors are logged with sufficient context

## Technical Constraints

### API Endpoints
- Jupiter Swap API v6: `https://quote-api.jup.ag/v6`
- Jupiter Token List: `https://token.jup.ag/all`
- Jupiter Price API v3: `https://api.jup.ag/price/v3` (already implemented)

### Dependencies
- Consider using `@jup-ag/api` SDK for type safety and better error handling
- Maintain existing axios-based implementation if SDK is too heavy
- Keep existing price caching mechanism (30-second TTL)

### Performance Requirements
- Quote requests: < 5 seconds
- Price lookups: < 2 seconds (with caching)
- Token search: < 3 seconds
- Batch operations should use parallel requests where possible

### Security Considerations
- Never expose private keys in API requests
- Validate all mint addresses before API calls
- Sanitize user input in search queries
- Implement rate limiting to prevent API abuse

## Out of Scope
- Implementing actual transaction execution (signing/broadcasting)
- Building a custom routing engine
- Historical swap data analysis
- Advanced MEV protection strategies beyond basic quote fetching

## Dependencies
- External service: `mev-protection-service.ts` must be updated after migration
- Configuration: Jupiter API URL is already in config
- No new environment variables required

## Success Metrics
- All deprecated method calls are replaced
- Zero runtime errors from Jupiter API calls
- MEV protection service functions correctly
- Test coverage > 80% for new implementations
- API response times meet performance requirements

## Migration Strategy
1. Implement new methods using Jupiter Swap API v6
2. Update dependent methods to use new implementations
3. Update external consumers (MEV protection service)
4. Add comprehensive tests
5. Remove or properly deprecate old methods
6. Update documentation

## References
- [Jupiter Swap API v6 Documentation](https://station.jup.ag/docs/apis/swap-api)
- [Jupiter SDK Documentation](https://github.com/jup-ag/jupiter-quote-api-node)
- [Jupiter Token List API](https://station.jup.ag/docs/token-list/token-list-api)
