# Kamino SDK Migration - Requirements

## Feature Overview

Migrate from the legacy `kamino-client-real.ts` implementation to the new `kamino-sdk-client.ts` implementation that uses the latest Kamino Finance SDK (v7.3.18) with improved API support and better error handling.

## Background

The current codebase has two Kamino client implementations:
- **Legacy**: `kamino-client-real.ts` - Uses older SDK patterns
- **New**: `kamino-sdk-client.ts` - Uses SDK v7.3.18 with Solana Kit RPC and improved slot-based APY calculations

The new implementation provides:
- Better RPC handling with Solana Kit
- Improved slot-based APY calculations
- Enhanced error messages
- Mainnet fallback for devnet environments (since Kamino is primarily on mainnet)
- More robust caching

## User Stories

### 1. As a developer, I want all services to use the new Kamino SDK client
**Acceptance Criteria:**
1. WHEN any service imports Kamino client, IT SHALL use `getKaminoSDKClient` from `kamino-sdk-client.ts`
2. WHEN the migration is complete, THE legacy `kamino-client-real.ts` SHALL be removed
3. WHEN services call Kamino methods, THEY SHALL receive real on-chain data with no mock fallbacks

### 2. As a system operator, I want consistent Kamino data across all services
**Acceptance Criteria:**
1. WHEN ILI calculator fetches Kamino data, IT SHALL use the new SDK client
2. WHEN ICR calculator fetches Kamino data, IT SHALL use the new SDK client
3. WHEN populate-real-data script runs, IT SHALL use the new SDK client
4. WHEN all services fetch data, THEY SHALL use the same caching mechanism (60s TTL)

### 3. As a developer, I want proper error handling for Kamino API failures
**Acceptance Criteria:**
1. WHEN Kamino SDK fails to load market, THE client SHALL throw descriptive error
2. WHEN RPC connection fails, THE error message SHALL indicate the connection issue
3. WHEN reserve data is unavailable, THE client SHALL return empty array (not crash)

### 4. As a system operator, I want to verify the migration is complete
**Acceptance Criteria:**
1. WHEN I search the codebase for `kamino-client-real`, NO imports SHALL be found
2. WHEN I search for `getKaminoClient`, NO references SHALL exist (replaced with `getKaminoSDKClient`)
3. WHEN I run tests, ALL Kamino-related tests SHALL pass with the new client

## Technical Requirements

### 1. Import Migration
**Requirements:**
1. THE system SHALL replace all imports of `kamino-client-real` with `kamino-sdk-client`
2. THE system SHALL replace all calls to `getKaminoClient()` with `getKaminoSDKClient()`
3. THE system SHALL update all type imports from `KaminoClientReal` to `KaminoSDKClient`

### 2. File Updates
**Requirements:**
1. THE following files SHALL be updated:
   - `backend/src/services/ili-calculator.ts`
   - `backend/src/services/icr-calculator.ts`
   - `backend/src/scripts/populate-real-data.ts` ✅ (already done)
   - `backend/test-real-apis.ts` (if it exists)
   - Any test files importing the old client

### 3. Cleanup
**Requirements:**
1. THE file `backend/src/services/defi/kamino-client-real.ts` SHALL be deleted after migration
2. THE file `backend/src/services/defi/kamino-client.ts` (mock version) SHALL be evaluated for deletion

### 4. Testing
**Requirements:**
1. THE system SHALL verify all Kamino SDK calls return real data
2. THE system SHALL test error handling for network failures
3. THE system SHALL verify caching works correctly

## Non-Functional Requirements

### Performance
1. Cache TTL SHALL remain at 60 seconds
2. RPC calls SHALL use 'confirmed' commitment level
3. Slot duration SHALL be set to 400ms for APY calculations

### Reliability
1. Error messages SHALL be descriptive and actionable
2. Network failures SHALL not crash the application
3. Mainnet RPC SHALL be used when devnet is configured (Kamino is on mainnet)

### Maintainability
1. Only one Kamino client implementation SHALL exist after migration
2. All services SHALL use the singleton pattern via `getKaminoSDKClient()`
3. Code comments SHALL indicate "REAL DATA - NO MOCK"

## Out of Scope

- Changing Kamino SDK version (staying on v7.3.18)
- Modifying Kamino API interfaces
- Adding new Kamino features
- Changing cache TTL or RPC settings
- Migrating to devnet (Kamino is mainnet-only)

## Success Criteria

1. ✅ All imports updated to use `kamino-sdk-client.ts`
2. ✅ Legacy `kamino-client-real.ts` file deleted
3. ✅ All tests passing with new client
4. ✅ No references to old client in codebase
5. ✅ ILI and ICR calculators working with new client
6. ✅ Populate scripts working with new client
