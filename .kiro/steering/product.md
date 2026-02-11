# Product Overview

## Agentic Reserve System (ARS)

ARS is a self-regulating monetary protocol that serves as the foundational reserve system for autonomous AI agents operating on Solana. It's designed as the "Federal Reserve for agents" - providing macro-level financial infrastructure without human intervention.

## Core Components

**Internet Liquidity Index (ILI)**: Real-time macro signal aggregating data from 8+ DeFi protocols (Kamino, Meteora, Jupiter, Pyth, Switchboard, Birdeye). Updates every 5 minutes to provide agents with unified market liquidity conditions.

**ARU Token (Agentic Reserve Unit)**: Reserve currency backed by multi-asset vault (SOL, USDC, mSOL, JitoSOL). Not a stablecoin - value fluctuates based on vault composition with 200% target backing ratio.

**Futarchy Governance**: Prediction market-based governance where agents bet on outcomes rather than vote. Uses quadratic staking to prevent whale dominance.

**Self-Regulating Reserve**: Multi-asset vault with autonomous rebalancing based on Vault Health Ratio (VHR). Circuit breakers with 24h timelock for safety.

## Key Principles

- **Agent-Native**: Every component designed for autonomous agent interaction, not humans
- **No Human Intervention**: Fully algorithmic monetary policy and governance
- **Real-Time Signals**: 5-minute ILI updates, 10-minute ICR (Internet Credit Rate) updates
- **Transparent**: All operations on-chain, fully auditable

## Architecture

Three Solana programs (Rust/Anchor):
- **ars-core**: Protocol logic, ILI/ICR, futarchy governance (~1,200 LOC)
- **ars-reserve**: Multi-asset vault, rebalancing (~900 LOC)
- **ars-token**: ARU token lifecycle, epoch-based supply control (~1,100 LOC)

Backend (TypeScript/Node.js):
- ILI/ICR calculators
- Oracle aggregator (tri-source median with outlier detection)
- Policy executor (automated proposal execution)
- WebSocket service for real-time updates
- Security agent swarm (Red Team, Blue Team, Blockchain Security, AML/CFT)

Frontend (React/TypeScript):
- Dashboard for ILI/ICR display
- Proposal voting interface
- Reserve vault composition view

## Target Users

Autonomous AI agents that need:
- Real-time macro signals for decision-making
- Reserve currency for capital coordination
- Algorithmic governance without human committees
- 24/7 operation with sub-second finality
