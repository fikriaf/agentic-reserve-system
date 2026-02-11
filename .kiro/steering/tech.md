# Technology Stack

## Build System

**Anchor Framework**: v0.30.1 (Solana smart contract framework)
**Rust**: 1.75+ (smart contracts)
**Node.js**: 18+ (backend services)
**TypeScript**: 5.0+ (backend and frontend)

## Smart Contracts (Solana/Rust)

**Framework**: Anchor 0.30.1
**Programs**:
- `ars-core`: Main protocol logic
- `ars-reserve`: Vault management
- `ars-token`: Token lifecycle

**Dependencies**:
- `anchor-lang`: 0.30.1 (with `init-if-needed` feature)
- `anchor-spl`: 0.30.1 (SPL token integration)
- `proptest`: 1.4 (property-based testing)
- `solana-program-test`: 1.18 (testing framework)

**Build Configuration**:
- Release profile: overflow checks enabled, LTO fat, single codegen unit
- Workspace resolver: v2

## Backend (TypeScript/Node.js)

**Runtime**: Node.js 18+
**Framework**: Express 4.18
**Language**: TypeScript 5.0 (CommonJS modules, ES2020 target)

**Core Dependencies**:
- `@solana/web3.js`: 1.95.0 (Solana client)
- `@solana/spl-token`: 0.1.8 (token operations)
- `@supabase/supabase-js`: 2.39.0 (database)
- `express`: 4.18.2 (API server)
- `ws`: 8.16.0 (WebSocket server)
- `redis`: 4.6.11 (caching)
- `axios`: 1.13.4 (HTTP client)
- `node-cron`: 3.0.3 (scheduled jobs)

**DeFi Integrations**:
- `@pythnetwork/hermes-client`: 2.1.0 (Pyth oracle)
- `@switchboard-xyz/on-demand`: 3.3.1 (Switchboard oracle)
- `helius-sdk`: 2.1.0 (Helius RPC)

**Security & Validation**:
- `express-rate-limit`: 7.1.5 (API rate limiting)
- `express-validator`: 7.0.1 (input validation)

**Testing**:
- `vitest`: 4.0.18 (test runner)
- `fast-check`: 4.5.3 (property-based testing)
- `supertest`: 6.3.4 (API testing)

## Frontend (React/TypeScript)

**Framework**: React 19.2.0
**Build Tool**: Vite 7.2.4
**Language**: TypeScript 5.9.3 (ES modules)

**Core Dependencies**:
- `react`: 19.2.0
- `react-dom`: 19.2.0
- `react-router-dom`: 7.13.0 (routing)
- `zustand`: 5.0.11 (state management)

**Solana Integration**:
- `@solana/web3.js`: 1.98.4
- `@solana/wallet-adapter-react`: 0.15.39
- `@solana/wallet-adapter-react-ui`: 0.9.39
- `@solana/wallet-adapter-wallets`: 0.19.33

**Styling**:
- `tailwindcss`: 4.1.18
- `@tailwindcss/forms`: 0.5.11
- `@tailwindcss/typography`: 0.5.19

## Infrastructure

**Database**: Supabase (PostgreSQL)
**Cache**: Redis 4.6+
**Container**: Docker (for local development)
**Deployment**: Railway (production)

## Common Commands

### Smart Contracts

```bash
# Build all programs
anchor build

# Test programs (includes property-based tests)
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet

# List program IDs
anchor keys list

# Clean build artifacts
anchor clean
```

### Backend

```bash
# Install dependencies
npm install --workspace=backend

# Development mode (with hot reload)
npm run backend:dev

# Simple server (minimal setup)
npm run dev:simple --workspace=backend

# Seed database
npm run seed --workspace=backend

# Build
npm run backend:build

# Production start
npm run backend:start

# Run tests
npm run backend:test

# Watch mode tests
npm run test:watch --workspace=backend
```

### Frontend

```bash
# Install dependencies
npm install --workspace=frontend

# Development server
npm run frontend:dev

# Build for production
npm run frontend:build

# Preview production build
npm run frontend:preview
```

### Workspace (Root)

```bash
# Install all dependencies
npm run install:all

# Build everything
npm run build

# Test everything
npm run test

# Run both backend and frontend in dev mode
npm run dev

# Format code
npm run format

# Check formatting
npm run lint
```

### Docker (Local Services)

```bash
# Start Redis and Supabase
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

## Testing Strategy

**Smart Contracts**:
- Property-based tests with `proptest` (15 tests covering futarchy invariants, circuit breakers, supply caps)
- Unit tests for individual instructions
- Integration tests with `solana-program-test`

**Backend**:
- Unit tests with `vitest`
- Property-based tests with `fast-check` for ILI/ICR calculations
- API integration tests with `supertest`
- DeFi integration tests

**Frontend**:
- Component tests with `vitest`
- E2E tests (planned)

## Code Quality

**TypeScript**: Strict mode enabled
**Rust**: Overflow checks enabled in release builds
**Formatting**: Prettier for TypeScript/JavaScript
**Linting**: ESLint for frontend

## Environment Variables

**Backend** (`.env`):
- `SUPABASE_URL`, `SUPABASE_KEY`: Database connection
- `REDIS_URL`: Cache connection
- `HELIUS_API_KEY`: RPC provider
- `PYTH_API_KEY`, `BIRDEYE_API_KEY`: Oracle APIs
- `PORT`: API server port (default: 4000)

**Frontend** (`.env`):
- `VITE_API_URL`: Backend API URL
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: Database connection
- `VITE_SOLANA_RPC_URL`: Solana RPC endpoint
