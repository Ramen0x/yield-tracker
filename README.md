# Yield Token Tracker

**Trust, but verify.** Track real APY of yield-bearing tokens via hourly on-chain price snapshots.

🌐 **Live Dashboard:** https://yield-tracker.vercel.app

## Why?

Advertised APYs can be misleading. This tracker calculates **realized APR** from actual share price changes, not protocol estimates.

## ✨ Features

### Core Tracking
- ⏰ **Hourly on-chain snapshots** - Direct price queries via ethers.js
- 📊 **7 time ranges** - APR calculated for 6h, 12h, 24h, 3d, 7d, 14d, 30d
- 📈 **Historical charts** - Visualize share price trends over time
- 🎯 **Advertised vs Realized** - Compare protocol claims against actual performance

### Dashboard Enhancements
- 🎨 **Protocol branding** - Custom logos and gradients for each protocol
- 📉 **Dual-axis charts** - Price + APR on same chart with independent scales
- ⏱️ **Time range selector** - Filter charts by 24h, 7d, 30d, or all data
- 💹 **Price change indicators** - Real-time % change with directional arrows
- 📊 **Delta metrics** - Shows over/under performance vs advertised rates

### Data Export
- 📥 **Export All Data** - Single-click CSV export of all tokens
- 📁 **Per-token export** - Individual CSV files with full history
- 📋 **Rich data format** - Includes all APR timeframes, advertised rates, deltas

### Code Quality
- 🛡️ **Error boundaries** - Graceful error handling throughout
- ⚡ **Loading states** - Skeleton screens and smooth transitions
- 📦 **Empty state handling** - Clear messaging when no data available
- 🚀 **Performance optimized** - Efficient rendering and chart updates

## 🎯 Tracked Tokens

| Token | Protocol | Chain | Status |
|-------|----------|-------|--------|
| syrupUSDC | Maple Finance | Ethereum | ✅ Active |
| syrupUSDT | Maple Finance | Ethereum | ✅ Active |
| sUSDe | Ethena | Ethereum | 🔄 Pending |
| wstUSDR | Tangible | Ethereum | 🔄 Pending |
| RLP | Radiant Capital | Arbitrum | 🔄 Pending |
| srusde | Restnaked | Ethereum | 🔄 Pending |
| jrusde | Restnaked | Ethereum | 🔄 Pending |

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Indexer Commands
```bash
# Take a snapshot
node indexer.js snapshot

# Query recent snapshots
node indexer.js query syrupUSDC 24

# Export to CSV
node indexer.js export syrupUSDC
```

### Local Development
```bash
# Serve locally
npx http-server -p 3000

# Open browser
open http://localhost:3000
```

## 📊 Dashboard Features

### Time Range Filtering
Click the time range buttons (24h, 7d, 30d, all) to filter chart data. Perfect for analyzing:
- Short-term volatility (24h)
- Weekly trends (7d)
- Monthly performance (30d)
- Historical overview (all)

### Dual-Axis Charts
Toggle between single-axis (price only) and dual-axis (price + APR) modes:
- **Single**: Focus on price movements
- **Dual**: Correlate price changes with APR trends

### Advertised APY Comparison
Each token card shows:
- Advertised APY (from protocol)
- Realized APR (from on-chain data)
- Delta (difference between advertised and realized)

Color-coded deltas:
- 🟢 Green: Realized > Advertised
- 🔴 Red: Realized < Advertised
- ⚪ Gray: Neutral

### CSV Export
Export options:
1. **Export All Data** - Top-right button exports all tokens
2. **Per-token Export** - Button on each token card

CSV includes:
- Timestamps (ISO format)
- Prices at each snapshot
- All APR timeframes (6h, 12h, 24h, 3d, 7d, 14d, 30d)
- Advertised APY
- Delta (realized - advertised)

## 🔧 Configuration

### Advertised APY Rates
Edit `advertised-apy.json` to update protocol-advertised rates:

```json
{
  "rates": {
    "syrupUSDC": {
      "apy": 10.5,
      "source": "Maple Finance",
      "url": "https://maple.finance"
    }
  }
}
```

### Adding New Tokens
1. Add token to `tokens.json`
2. Add advertised rate to `advertised-apy.json`
3. Update indexer to support new token type if needed

## 🤖 Automation

### GitHub Actions
Hourly snapshots run automatically via `.github/workflows/indexer.yml`:
- Fetches latest prices
- Calculates APR across all timeframes
- Commits updated data
- Triggers Vercel deployment

### Vercel Deployment
Dashboard auto-deploys on every push to main branch.

## 📁 Project Structure

```
yield-tracker/
├── index.html              # Dashboard UI
├── indexer.js             # Snapshot indexer
├── tokens.json            # Token configuration
├── advertised-apy.json    # Advertised APY rates
├── data/
│   └── snapshots.json     # Historical snapshot data
├── .github/
│   └── workflows/
│       └── indexer.yml    # Hourly automation
└── README.md
```

## 🎨 Design

### Color Scheme
- Base: Dark mode (gray-900/800)
- Accents: Indigo/purple gradients
- Positive values: Green
- Negative values: Red
- Protocol-specific gradients for branding

### Responsive Design
- Mobile: Single column layout
- Tablet: 2-column APR metrics
- Desktop: Side-by-side chart + metrics
- Max width: 1800px

## 📊 Data Flow

1. **Indexer** queries on-chain prices hourly
2. **Snapshots** saved to `data/snapshots.json`
3. **APR calculated** for all timeframes
4. **GitHub commits** trigger Vercel deployment
5. **Dashboard** auto-refreshes every 5 minutes

## 🔍 Technical Details

### APR Calculation
```
APR = ((price_now / price_then) - 1) * (365 * 24 / hours_elapsed) * 100
```

### Supported Token Types
- **ERC-4626**: Standard vault tokens (e.g., Maple Syrup)
- **Custom**: Protocol-specific implementations (future support)

### Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Optimized

## 📈 Roadmap

- [ ] More tokens (Ethena sUSDe, Radiant RLP, etc.)
- [ ] Historical APR trend analysis
- [ ] Alert system for APR deviations
- [ ] TVL tracking
- [ ] Multiple chain support
- [ ] API endpoint for data access

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Submit a PR with clear description

## 📄 License

MIT

## 🙏 Credits

Built for accurate, transparent DeFi yield tracking.

---

**Dashboard:** https://yield-tracker.vercel.app  
**Repo:** https://github.com/Ramen0x/yield-tracker
