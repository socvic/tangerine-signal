# Micro Polls Voting Board

Standalone Stacks dapp implementing plan 02 (Micro Polls Voting Board).

## What is implemented

- Clarity contract `micro-polls` with:
  - Poll creation (2-4 options)
  - One vote per wallet per poll
  - Poll close after end height
  - Read-only functions for poll details, options, tallies, vote state, and nonce
- Contract tests covering MVP invariants (7 tests passing)
- React + TypeScript frontend with:
  - Wallet connect/disconnect
  - Create poll transaction flow
  - Vote transaction flow
  - Close poll transaction flow
  - Backendless on-chain reads via Stacks API

## Project structure

- `contracts/micro-polls.clar`
- `tests/micro-polls.test.ts`
- `frontend/`

## Run contract tests

```bash
cd tangerine-signal
npm install
npm test
```

## Run frontend

```bash
cd tangerine-signal/frontend
npm install
cp .env.example .env
npm run dev
```

## Build frontend

```bash
cd tangerine-signal/frontend
npm run build
```

## Environment variables

Set these in `frontend/.env`:

- `VITE_STACKS_NETWORK` - `mainnet` or `testnet`
- `VITE_STACKS_API_BASE` - Stacks API base URL
- `VITE_CONTRACT_ADDRESS` - deployed contract address
- `VITE_CONTRACT_NAME` - deployed contract name
