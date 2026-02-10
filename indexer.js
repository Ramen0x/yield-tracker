#!/usr/bin/env node
/**
 * Yield Token Price Indexer
 * Tracks share prices of yield-bearing tokens to calculate real APY
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Config
const RPC_ETHEREUM = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com';
const RPC_ARBITRUM = process.env.ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const DATA_DIR = path.join(__dirname, 'data');
const SNAPSHOTS_FILE = path.join(DATA_DIR, 'snapshots.json');
const TOKENS_FILE = path.join(__dirname, 'tokens.json');

// ABIs
const ERC4626_ABI = [
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const BALANCER_VAULT_ABI = [
  'function getPoolTokens(bytes32 poolId) view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)'
];

// Providers
const providers = {
  ethereum: new ethers.JsonRpcProvider(RPC_ETHEREUM),
  arbitrum: new ethers.JsonRpcProvider(RPC_ARBITRUM)
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadTokens() {
  return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')).tokens;
}

function loadSnapshots() {
  if (!fs.existsSync(SNAPSHOTS_FILE)) {
    return {
      lastUpdate: null,
      tokens: {}
    };
  }
  return JSON.parse(fs.readFileSync(SNAPSHOTS_FILE, 'utf8'));
}

function saveSnapshots(data) {
  fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(data, null, 2));
}

async function getSharePrice(token) {
  const provider = providers[token.chain];
  if (!provider) throw new Error(`No provider for chain: ${token.chain}`);

  try {
    if (token.type === 'erc4626') {
      const contract = new ethers.Contract(token.address, ERC4626_ABI, provider);
      const oneShare = ethers.parseUnits('1', token.decimals);
      const assets = await contract.convertToAssets(oneShare);
      return Number(assets) / (10 ** token.decimals);
    } else if (token.type === 'balancer_lp') {
      // For Balancer LP tokens, we'll just track the token price itself
      // Price = 1 LP token value in USD (would need oracle for proper valuation)
      // For now, track as 1:1 ratio - will show relative changes over time
      console.log(`  ⚠️  ${token.symbol}: Balancer LP - tracking relative price only`);
      return 1.0;
    } else {
      // For custom types, we need specific logic per protocol
      if (token.address === 'TBD') return null;
      
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const totalSupply = await contract.totalSupply();
      // Custom calculation needed per protocol
      return null;
    }
  } catch (error) {
    console.error(`  ❌ ${token.symbol}: ${error.message}`);
    return null;
  }
}

async function calculateAPR(tokenId, currentPrice, snapshots) {
  const tokenData = snapshots.tokens[tokenId];
  if (!tokenData || !tokenData.snapshots || tokenData.snapshots.length === 0) {
    return {};
  }

  const now = Date.now();
  const snaps = tokenData.snapshots;

  // Time ranges in hours
  const timeRanges = {
    '6h': 6,
    '12h': 12,
    '24h': 24,
    '3d': 72,
    '7d': 168,
    '14d': 336,
    '30d': 720
  };

  // Get oldest snapshot for extrapolation
  const oldestSnap = snaps[0];
  const oldestHoursAgo = (now - oldestSnap.timestamp) / (60 * 60 * 1000);

  function findSnapshot(hoursAgo) {
    const targetTime = now - (hoursAgo * 60 * 60 * 1000);
    // Find the closest snapshot before or at target time
    let closest = null;
    for (const snap of snaps) {
      if (snap.timestamp <= targetTime) {
        if (!closest || Math.abs(snap.timestamp - targetTime) < Math.abs(closest.timestamp - targetTime)) {
          closest = snap;
        }
      }
    }
    return closest;
  }

  function calcAPR(oldPrice, hours) {
    if (!oldPrice) return null;
    const change = (currentPrice - oldPrice) / oldPrice;
    const annualized = change * (365 * 24 / hours);
    return annualized * 100; // as percentage
  }

  const aprs = {};
  for (const [label, hours] of Object.entries(timeRanges)) {
    const snap = findSnapshot(hours);
    if (snap) {
      aprs[`apr_${label}`] = calcAPR(snap.price, hours);
    } else if (oldestHoursAgo >= 0.5) {
      // Extrapolate from oldest available data (need at least 30 min of data)
      aprs[`apr_${label}`] = calcAPR(oldestSnap.price, oldestHoursAgo);
      aprs[`apr_${label}_extrapolated`] = true;
    } else {
      aprs[`apr_${label}`] = null;
    }
  }

  // Add actual data age for transparency
  aprs['data_hours'] = Math.round(oldestHoursAgo * 10) / 10;

  return aprs;
}

async function snapshot() {
  console.log(`📸 Taking snapshot at ${new Date().toISOString()}`);
  
  ensureDataDir();
  const tokens = loadTokens();
  const data = loadSnapshots();
  const timestamp = Date.now();

  for (const token of tokens) {
    if (token.address === 'TBD') {
      console.log(`  ⏭️  ${token.symbol}: Address TBD, skipping`);
      continue;
    }

    const price = await getSharePrice(token);
    if (price === null) continue;

    console.log(`  ✅ ${token.symbol}: ${price.toFixed(8)}`);

    if (!data.tokens[token.id]) {
      data.tokens[token.id] = {
        symbol: token.symbol,
        name: token.name,
        chain: token.chain,
        protocol: token.protocol,
        snapshots: []
      };
    }

    const apr = await calculateAPR(token.id, price, data);

    data.tokens[token.id].snapshots.push({
      timestamp,
      price,
      ...apr
    });

    // Keep last 90 days (2160 hourly snapshots)
    if (data.tokens[token.id].snapshots.length > 2160) {
      data.tokens[token.id].snapshots = data.tokens[token.id].snapshots.slice(-2160);
    }
  }

  data.lastUpdate = timestamp;
  saveSnapshots(data);
  console.log(`\n💾 Saved to ${SNAPSHOTS_FILE}`);
}

async function query(tokenId, hours = 24) {
  const data = loadSnapshots();
  const tokenData = data.tokens[tokenId];
  
  if (!tokenData) {
    console.log(`Token ${tokenId} not found`);
    return;
  }

  console.log(`\n📊 ${tokenData.name} (${tokenData.symbol})`);
  console.log(`Protocol: ${tokenData.protocol} | Chain: ${tokenData.chain}`);
  console.log(`\nLast ${hours}h snapshots:`);
  
  const now = Date.now();
  const cutoff = now - (hours * 60 * 60 * 1000);
  const recent = tokenData.snapshots.filter(s => s.timestamp >= cutoff);
  
  recent.forEach(snap => {
    const date = new Date(snap.timestamp).toISOString();
    const apr = snap.apr24h ? snap.apr24h.toFixed(2) + '%' : 'N/A';
    console.log(`  ${date} | Price: ${snap.price.toFixed(8)} | APR 24h: ${apr}`);
  });
}

async function exportCSV(tokenId) {
  const data = loadSnapshots();
  const tokenData = data.tokens[tokenId];
  
  if (!tokenData) {
    console.log(`Token ${tokenId} not found`);
    return;
  }

  const csvPath = path.join(DATA_DIR, `${tokenId}.csv`);
  const header = 'timestamp,date,price,apr_24h,apr_7d,apr_30d\n';
  const rows = tokenData.snapshots.map(s => {
    const date = new Date(s.timestamp).toISOString();
    return `${s.timestamp},${date},${s.price},${s.apr24h || ''},${s.apr7d || ''},${s.apr30d || ''}`;
  }).join('\n');

  fs.writeFileSync(csvPath, header + rows);
  console.log(`✅ Exported to ${csvPath}`);
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

(async () => {
  try {
    if (command === 'snapshot') {
      await snapshot();
    } else if (command === 'query') {
      const tokenId = arg || 'syrupUSDC';
      const hours = parseInt(process.argv[4]) || 24;
      await query(tokenId, hours);
    } else if (command === 'export') {
      const tokenId = arg || 'syrupUSDC';
      await exportCSV(tokenId);
    } else {
      console.log('Usage:');
      console.log('  node indexer.js snapshot');
      console.log('  node indexer.js query <tokenId> [hours]');
      console.log('  node indexer.js export <tokenId>');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
