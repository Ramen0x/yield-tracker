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
    } else {
      // For custom types, we need specific logic per protocol
      // For now, return null for TBD addresses
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
    return { apr24h: null, apr7d: null, apr30d: null };
  }

  const now = Date.now();
  const snaps = tokenData.snapshots;

  function findSnapshot(hoursAgo) {
    const targetTime = now - (hoursAgo * 60 * 60 * 1000);
    return snaps.find(s => s.timestamp <= targetTime);
  }

  const snap24h = findSnapshot(24);
  const snap7d = findSnapshot(24 * 7);
  const snap30d = findSnapshot(24 * 30);

  function calcAPR(oldPrice, hours) {
    if (!oldPrice) return null;
    const change = (currentPrice - oldPrice) / oldPrice;
    const annualized = change * (365 * 24 / hours);
    return annualized * 100; // as percentage
  }

  return {
    apr24h: snap24h ? calcAPR(snap24h.price, 24) : null,
    apr7d: snap7d ? calcAPR(snap7d.price, 24 * 7) : null,
    apr30d: snap30d ? calcAPR(snap30d.price, 24 * 30) : null
  };
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
      apr24h: apr.apr24h,
      apr7d: apr.apr7d,
      apr30d: apr.apr30d
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
