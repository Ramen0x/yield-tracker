#!/usr/bin/env node
/**
 * Yield Token Price Indexer
 * Tracks share prices of yield-bearing tokens to calculate real APY
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');

// Config
const RPC_ETHEREUM = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com';
const RPC_ARBITRUM = process.env.ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const RPC_AVALANCHE = process.env.AVAX_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc';
const RPC_PLASMA = process.env.PLASMA_RPC_URL || 'https://rpc.plasma.to';
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
  arbitrum: new ethers.JsonRpcProvider(RPC_ARBITRUM),
  avalanche: new ethers.JsonRpcProvider(RPC_AVALANCHE),
  plasma: new ethers.JsonRpcProvider(RPC_PLASMA)
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

async function uploadToBlob(data) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('  ⚠️  No BLOB_READ_WRITE_TOKEN, skipping blob upload');
    return null;
  }
  
  const blob = await put('snapshots.json', JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

async function getSharePrice(token) {
  const provider = providers[token.chain];
  if (!provider) throw new Error(`No provider for chain: ${token.chain}`);

  try {
    if (token.type === 'erc4626') {
      const contract = new ethers.Contract(token.address, ERC4626_ABI, provider);
      const oneShare = ethers.parseUnits('1', token.decimals);
      const assets = await contract.convertToAssets(oneShare);
      // Use underlyingDecimals if vault decimals differ from underlying
      const assetDecimals = token.underlyingDecimals || token.decimals;
      return Number(assets) / (10 ** assetDecimals);
    } else if (token.type === 'balancer_lp') {
      // For Balancer LP tokens, we'll just track the token price itself
      // Price = 1 LP token value in USD (would need oracle for proper valuation)
      // For now, track as 1:1 ratio - will show relative changes over time
      console.log(`  ⚠️  ${token.symbol}: Balancer LP - tracking relative price only`);
      return 1.0;
    } else if (token.type === 'chainlink_nav') {
      // Chainlink NAV oracle - returns NAV per share
      const CHAINLINK_ABI = [
        'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
        'function decimals() view returns (uint8)'
      ];
      const oracle = new ethers.Contract(token.oracleAddress, CHAINLINK_ABI, provider);
      const [, answer, , ,] = await oracle.latestRoundData();
      const oracleDecimals = Number(await oracle.decimals());
      return Number(answer) / (10 ** oracleDecimals);
    } else if (token.type === 'pyth_nav') {
      // Pyth NAV oracle - fetch from Hermes API
      const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${token.pythPriceId}`);
      const data = await response.json();
      if (data.parsed && data.parsed[0]) {
        const priceData = data.parsed[0].price;
        const price = Number(priceData.price);
        const expo = priceData.expo;
        return price * Math.pow(10, expo);
      }
      throw new Error('No Pyth price data');
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
    '1h': 1,
    '3h': 3,
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

  function findSnapshotWithAge(hoursAgo) {
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
    if (closest) {
      const actualHours = (now - closest.timestamp) / (60 * 60 * 1000);
      return { snap: closest, actualHours };
    }
    return null;
  }

  function calcAPR(oldPrice, hours) {
    if (!oldPrice || hours < 0.1) return null;
    const change = (currentPrice - oldPrice) / oldPrice;
    const annualized = change * (365 * 24 / hours);
    return annualized * 100; // as percentage
  }

  const aprs = {};
  for (const [label, hours] of Object.entries(timeRanges)) {
    const result = findSnapshotWithAge(hours);
    if (result && result.actualHours >= hours * 0.8) {
      // Only show if we have at least 80% of the required time range
      aprs[`apr_${label}`] = calcAPR(result.snap.price, result.actualHours);
    } else {
      // No extrapolation - just null if insufficient data
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
  
  // Upload to Vercel Blob for live site
  const blobUrl = await uploadToBlob(data);
  if (blobUrl) {
    console.log(`☁️  Uploaded to ${blobUrl}`);
  }
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
