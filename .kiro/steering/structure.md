# Project Structure

## Root Organization

```
ars-protocol/
├── programs/           # Solana smart contracts (Rust/Anchor)
├── backend/           # API server and services (TypeScript/Node.js)
├── frontend/          # React dashboard (TypeScript/React)
├── sdk/              # TypeScript SDK for ARS integration
├── scripts/          # Deployment and utility scripts
├── documentation/    # Technical documentation and guides
├── supabase/         # Database schema and migrations
├── .kiro/            # Kiro AI assistant configuration
└── .openclaw/        # OpenClaw agent framework configuration
```

## Smart Contracts (`/programs`)

Three Anchor programs with shared workspace:

```
programs/
├── ars-core/              # Main protocol logic (~1,200 LOC)
│   ├── src/
│   │   ├── lib.rs         # Program entry point
│   │   ├── state.rs       # Account structures (GlobalState, Proposal)
│   │   ├── errors.rs      # Custom error types
│   │   ├── constants.rs   # Protocol constants
│   │   ├── instructions/  # Instruction handlers
│   │   │   ├── initialize.rs
│   │   │   ├── update_ili.rs
│   │   │   ├── query_ili.rs
│   │   │   ├── create_proposal.rs
│   │   │   ├── vote_on_proposal.rs
│   │   │   ├── execute_proposal.rs
│   │   │   └── circuit_breaker.rs
│   │   ├── math/          # Mathematical operations
│   │   │   └── fixed_point.rs
│   │   └── utils/         # Utility functions
│   │       ├── reentrancy.rs
│   │       └── signature.rs
│   └── tests/
│       └── property_tests.rs  # Property-based tests
│
├── ars-reserve/           # Vault management (~900 LOC)
│   ├── src/
│   │   ├── lib.rs
│   │   ├── state.rs       # Vault account structure
│   │   ├── errors.rs
│   │   ├── instructions/
│   │   │   ├── initialize_vault.rs
│   │   │   ├── deposit.rs
│   │   │   ├── withdraw.rs
│   │   │   ├── update_vhr.rs
│   │   │   └── rebalance.rs
│   │   └── utils/
│   │       ├── cpi_helpers.rs
│   │       └── security.rs
│
└── ars-token/             # Token lifecycle (~1,100 LOC)
    ├── src/
    │   ├── lib.rs
    │   ├── state.rs       # Mint state, epoch tracking
    │   ├── errors.rs
    │   └── instructions/
    │       ├── initialize_mint.rs
    │       ├── mint_icu.rs
    │       ├── burn_icu.rs
    │       └── start_new_epoch.rs
```

## Backend (`/backend`)

Express API server with service-oriented architecture:

```
backend/
├── src/
│   ├── index.ts           # Main server entry point
│   ├── app.ts             # Express app configuration
│   ├── simple-server.ts   # Minimal server for testing
│   ├── seed-database.ts   # Database seeding script
│   │
│   ├── config/            # Configuration management
│   │   └── index.ts       # Environment variables, constants
│   │
│   ├── routes/            # API route handlers
│   │   ├── ili.ts         # ILI endpoints
│   │   ├── icr.ts         # ICR endpoints
│   │   ├── proposals.ts   # Governance endpoints
│   │   ├── reserve.ts     # Vault endpoints
│   │   └── health.ts      # Health check endpoints
│   │
│   ├── services/          # Business logic layer
│   │   ├── ili-calculator.ts        # ILI computation
│   │   ├── icr-calculator.ts        # ICR computation
│   │   ├── policy-executor.ts       # Proposal execution
│   │   ├── oracle-health-monitor.ts # Oracle monitoring
│   │   ├── websocket.ts             # WebSocket server
│   │   ├── supabase.ts              # Database client
│   │   ├── redis.ts                 # Cache client
│   │   ├── helius-client.ts         # Helius RPC
│   │   │
│   │   ├── oracles/                 # Oracle integrations
│   │   │   ├── oracle-aggregator.ts # Tri-source median
│   │   │   ├── pyth-client.ts
│   │   │   ├── switchboard-client.ts
│   │   │   └── birdeye-client.ts
│   │   │
│   │   ├── defi/                    # DeFi protocol clients
│   │   │   ├── kamino-client.ts
│   │   │   ├── meteora-client.ts
│   │   │   ├── jupiter-client.ts
│   │   │   └── magicblock-client.ts
│   │   │
│   │   ├── privacy/                 # Privacy features
│   │   │   ├── sipher-client.ts
│   │   │   └── stealth-address-manager.ts
│   │   │
│   │   ├── payment/                 # Payment integrations
│   │   │   └── x402-client.ts
│   │   │
│   │   ├── staking/                 # Staking services
│   │   │   ├── agent-staking.ts
│   │   │   └── helius-staking-client.ts
│   │   │
│   │   ├── revenue/                 # Revenue tracking
│   │   │   └── revenue-tracker.ts
│   │   │
│   │   ├── agent-swarm/             # Security agent swarm
│   │   │   ├── orchestrator.ts      # Agent coordination
│   │   │   ├── consciousness.ts     # Agent awareness
│   │   │   └── agents/
│   │   │       ├── security-agent.ts
│   │   │       ├── policy-agent.ts
│   │   │       └── trading-agent.ts
│   │   │
│   │   └── ai/                      # AI integrations
│   │       └── openrouter-client.ts
│   │
│   ├── cron/              # Scheduled jobs
│   │   └── index.ts       # ILI (5min), ICR (10min) updates
│   │
│   └── tests/             # Test suites
│       ├── api.test.ts
│       ├── api-integration.test.ts
│       ├── defi-integrations.test.ts
│       ├── oracle-aggregator.test.ts
│       └── ili-icr-properties.test.ts  # Property-based tests
│
└── dist/                  # Compiled JavaScript output
```

## Frontend (`/frontend`)

React SPA with component-based architecture:

```
frontend/
├── src/
│   ├── main.tsx           # Application entry point
│   ├── App.tsx            # Root component with routing
│   │
│   ├── components/        # React components
│   │   ├── Dashboard.tsx           # Main dashboard
│   │   ├── ILIHeartbeat.tsx        # Real-time ILI display
│   │   ├── ICRDisplay.tsx          # ICR visualization
│   │   ├── ProposalList.tsx        # Governance proposals
│   │   ├── ProposalDetail.tsx      # Proposal details
│   │   ├── PolicyTimeline.tsx      # Policy execution history
│   │   ├── ReserveChart.tsx        # Vault visualization
│   │   ├── VaultComposition.tsx    # Asset breakdown
│   │   ├── RebalanceHistory.tsx    # Rebalancing events
│   │   ├── OracleStatus.tsx        # Oracle health
│   │   ├── HistoricalCharts.tsx    # Time series data
│   │   ├── RevenueMetrics.tsx      # Revenue tracking
│   │   ├── StakingMetrics.tsx      # Staking stats
│   │   └── SDKDocumentation.tsx    # SDK docs
│   │
│   ├── hooks/             # Custom React hooks
│   │   ├── useAPI.ts      # API client hook
│   │   └── useWebSocket.ts # WebSocket connection
│   │
│   ├── providers/         # Context providers
│   │   ├── WalletProvider.tsx      # Solana wallet
│   │   └── SupabaseProvider.tsx    # Database client
│   │
│   └── assets/            # Static assets
│
└── public/                # Public static files
```

## SDK (`/sdk`)

TypeScript SDK for ARS integration:

```
sdk/
├── src/
│   ├── index.ts           # Main exports
│   ├── client.ts          # ARS client class
│   ├── types.ts           # TypeScript types
│   └── constants.ts       # SDK constants
└── README.md              # SDK documentation
```

## Documentation (`/documentation`)

Technical documentation and guides:

```
documentation/
├── AGENTIC_RESERVE_SYSTEM.md      # System overview
├── IMPLEMENTATION_STATUS.md        # Current status
├── QUICK_START.md                  # Getting started
├── REGISTRATION_GUIDE.md           # Hackathon registration
├── RAILWAY_DEPLOYMENT.md           # Deployment guide
├── SECURITY_AGENTS_DEPLOYMENT_GUIDE.md
├── SIPHER_INTEGRATION_PLAN.md
├── security/                       # Security documentation
│   ├── ARS-SA-2026-001.md         # Security advisory
│   └── ARS-SA-2026-001-IMPLEMENTATION.md
└── llms/                           # LLM context files
    ├── solana-llms.txt
    ├── kamino-llms.txt
    ├── meteora-llms.txt
    └── ...
```

## Database (`/supabase`)

PostgreSQL schema and migrations:

```
supabase/
├── init.sql               # Initial schema
├── kong.yml               # API gateway config
└── migrations/            # Database migrations
    ├── 001_add_revenue_and_staking.sql
    └── 002_create_all_tables.sql
```

## Scripts (`/scripts`)

Deployment and utility scripts:

```
scripts/
├── deploy-devnet.sh       # Deploy to devnet (bash)
├── deploy-devnet.ps1      # Deploy to devnet (PowerShell)
├── heartbeat.sh           # Health check script
├── heartbeat.ps1          # Health check (PowerShell)
├── autonomous-deploy.sh   # Automated deployment
├── security-pipeline.sh   # Security checks
└── register-agent.sh      # Agent registration
```

## Configuration Files

**Root Level**:
- `Anchor.toml`: Anchor framework configuration, program IDs
- `Cargo.toml`: Rust workspace configuration
- `package.json`: Node.js workspace configuration
- `docker-compose.yml`: Local services (Redis, Supabase)
- `railway.json`, `railway.toml`: Railway deployment config
- `ecosystem.config.js`: PM2 process manager config

**Kiro AI** (`.kiro/`):
- `specs/`: Feature specifications
- `steering/`: AI assistant guidance documents
- `hooks/`: Automated workflows

**OpenClaw** (`.openclaw/`):
- `config.json`: Agent framework configuration
- `swarm-config.json`: Multi-agent coordination
- `skills/`: Agent skill definitions

## Naming Conventions

**Smart Contracts**:
- Programs: `snake_case` (e.g., `ars_core`)
- Instructions: `snake_case` (e.g., `update_ili`)
- Accounts: `PascalCase` (e.g., `GlobalState`)

**TypeScript**:
- Files: `kebab-case` (e.g., `ili-calculator.ts`)
- Classes: `PascalCase` (e.g., `ILICalculator`)
- Functions: `camelCase` (e.g., `calculateILI`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_SUPPLY`)

**React Components**:
- Files: `PascalCase` (e.g., `Dashboard.tsx`)
- Components: `PascalCase` (e.g., `ILIHeartbeat`)
- Hooks: `camelCase` with `use` prefix (e.g., `useWebSocket`)
