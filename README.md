# Yield Token Tracker

**Trust, but verify.** Track real APY of yield-bearing tokens via hourly on-chain price snapshots.

## Why?

Advertised APYs can be misleading. This tracker calculates **realized APR** from actual share price changes, not protocol estimates.

## Tracked Tokens

- **syrupUSDC** (Maple Finance)
- **syrupUSDT** (Maple Finance)
- **sUSDe** (Ethena) - pending
- **wstUSDR** (Tangible) - pending
- **RLP** (Radiant) - pending
- More coming...

## Features

- ⏰ Hourly price snapshots
- 📊 Realized APR (24h, 7d, 30d)
- 📈 Historical charts
- 📥 CSV export
- 🔍 Compare advertised vs actual

## Usage

```bash
# Take a snapshot
node indexer.js snapshot

# Query recent snapshots
node indexer.js query syrupUSDC 24

# Export to CSV
node indexer.js export syrupUSDC
```

## Automated Tracking

GitHub Actions runs hourly snapshots automatically. No manual intervention needed.

## Data

All snapshots stored in `data/snapshots.json` with full history (90 days rolling).
