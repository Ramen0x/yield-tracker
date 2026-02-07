# Missing Contract Addresses

Need to find contract addresses for these tokens to enable tracking:

## Priority 1 - Common Yield Tokens

### sUSDe (Ethena)
- **Protocol:** Ethena (USDe staking)
- **Chain:** Ethereum
- **Search:** "sUSDe contract address ethereum etherscan"
- **Likely type:** ERC4626 vault

### wstUSDR (Tangible)
- **Protocol:** Tangible
- **Chain:** Ethereum  
- **Search:** "wstUSDR tangible contract address"
- **Likely type:** Wrapped staking token

### RLP (Radiant Capital)
- **Protocol:** Radiant Capital
- **Chain:** Arbitrum
- **Search:** "RLP radiant capital contract address arbitrum"
- **Likely type:** LP token

## Priority 2 - Restnaked Tokens

### srusde (Staked Restnaked USDe)
- **Protocol:** Restnaked
- **Chain:** Ethereum
- **Search:** "srusde restnaked contract"

### jrusde (Junior Restnaked USDe)  
- **Protocol:** Restnaked
- **Chain:** Ethereum
- **Search:** "jrusde restnaked contract"

## Priority 3 - Unknown

### stcUSD
- **Search needed:** "stcUSD contract address"
- **Chain:** Likely Ethereum

### wsrUSD
- **Search needed:** "wsrUSD contract address"
- **Chain:** Likely Ethereum

## How to Add

Once you find a contract address:

1. Verify on Etherscan/Arbiscan
2. Update `tokens.json`:
   ```json
   {
     "address": "0x...",
     "decimals": 18
   }
   ```
3. Run `node indexer.js snapshot` to test
4. Commit and push

## Resources

- Etherscan: https://etherscan.io
- Arbiscan: https://arbiscan.io
- DeFiLlama: https://defillama.com
- Coingecko: https://www.coingecko.com
