# Yield Tracker Dashboard - Features

## ✨ Enhanced Design

### Protocol Branding
- **Dynamic protocol logos** with gradient backgrounds
- Color-coded protocol identification
- Hover animations on logos and cards
- Smooth transitions throughout the UI

### Color Scheme
- Dark mode optimized for DeFi dashboards
- Indigo/purple gradient accents matching professional DeFi UIs
- Protocol-specific gradient themes:
  - Maple Finance: Purple gradient (#667eea → #764ba2)
  - Radiant Capital: Pink gradient (#f093fb → #f5576c)
  - Ethena: Blue gradient (#4facfe → #00f2fe)
  - Tangible: Warm gradient (#fa709a → #fee140)
  - Restnaked: Cool gradient (#30cfd0 → #330867)

### Responsive Design
- Mobile-first approach
- Optimized breakpoints for all screen sizes
- Flexible grid layouts
- Collapsible elements on small screens

### Animations
- Fade-in animations for content loading
- Card hover effects with elevation
- Loading skeleton screens
- Smooth transitions on all interactive elements

## 🚀 Advanced Features

### Advertised APY Comparison
- **Configuration file**: `advertised-apy.json` for easy updates
- Real-time comparison: Advertised vs Realized APR
- Delta indicator showing over/under performance
- Color-coded deltas:
  - Green: Realized > Advertised
  - Red: Realized < Advertised
  - Gray: Neutral

### Price Change Indicators
- Real-time price change percentage on each card
- Directional arrows (↑↓→)
- Color-coded changes (green/red/gray)
- Calculated from latest vs previous snapshot

### CSV Export
- **Export All Data**: Single button to export all tokens at once
- **Per-Token Export**: Individual CSV export for each token
- Includes all APR timeframes, advertised rates, and deltas
- Timestamp in ISO format for easy analysis

## 📊 Chart Improvements

### Dual-Axis Chart
- Toggle between single and dual-axis modes
- Simultaneous view of Price + APR on same chart
- Independent Y-axes for proper scaling
- Distinct colors and line styles

### Time Range Selector
- **24h**: Last 24 hours of data
- **7d**: Last 7 days
- **30d**: Last 30 days
- **All**: Complete history
- Active state indication
- Smooth range transitions

### Enhanced Tooltips
- Rich context on hover
- Full timestamp display (UTC)
- All APR timeframes shown
- Better formatting and readability
- Dark theme optimized

### APR Trend Line
- Optional 30d APR overlay (in dual-axis mode)
- Dashed line style for differentiation
- Right Y-axis for APR values
- Span gaps for missing data

## 🛡️ Code Quality

### Error Boundaries
- Global error handler
- Component-level error catching
- User-friendly error messages
- Retry functionality
- Graceful degradation

### Loading States
- Skeleton screens during data fetch
- Chart loading indicators
- Smooth transitions to content
- No layout shift

### Empty State Handling
- Dedicated empty state UI
- Clear messaging when no data available
- Icon-based visual feedback
- Helpful guidance for users

### Performance Optimizations
- Chart instance caching
- Efficient re-rendering
- Time-based data filtering
- Canvas cleanup on chart updates
- Debounced resize handling
- Minimal DOM manipulation

## 📝 Configuration

### Advertised APY (`advertised-apy.json`)
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

Update this file to modify advertised rates without code changes.

### Token Configuration (`tokens.json`)
Defines tracked tokens with protocol info, chain, decimals, etc.

## 🎨 Customization

### Protocol Branding
Edit the `protocolBranding` object in `index.html`:
```javascript
const protocolBranding = {
  'Protocol Name': {
    gradient: 'custom-gradient-class',
    logo: 'P',
    color: '#hexcolor'
  }
}
```

### Custom CSS
All custom styles are inline in `<style>` tag:
- Loading animations
- Hover effects
- Gradient classes
- Delta indicators
- Time range buttons

## 🔄 Auto-Update
- Data refreshes every 5 minutes
- Automatic re-render on data changes
- Timestamp display shows last update
- Charts update without page reload

## 📱 Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px
- Large screens: Up to 1800px max-width

## 🎯 User Experience
- Intuitive navigation
- Clear data hierarchy
- Accessible color contrasts
- Keyboard navigation support
- Fast load times
- Smooth interactions
