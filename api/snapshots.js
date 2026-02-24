/**
 * GET /api/snapshots?token=syrupUSDC
 * GET /api/snapshots?token=syrupUSDT
 * GET /api/snapshots               (returns all tokens)
 *
 * Returns live share price + pre-computed APR data from the yield-tracker blob.
 * Source: Vercel Blob updated hourly by the indexer.
 */

const BLOB_URL = 'https://axjvwtztf5syd3si.public.blob.vercel-storage.com/snapshots.json';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    const blobResp = await fetch(BLOB_URL + '?t=' + Date.now());
    if (!blobResp.ok) throw new Error(`Blob fetch failed: ${blobResp.status}`);
    const raw = await blobResp.json();

    const token = req.query?.token;

    if (token) {
      // Single token
      const tokenData = raw.tokens?.[token];
      if (!tokenData) {
        return res.status(404).json({ error: `Token not found: ${token}`, available: Object.keys(raw.tokens || {}) });
      }

      const snaps = tokenData.snapshots || [];
      const latest = snaps[snaps.length - 1];
      const cutoff = (latest?.timestamp ?? 0) - 7 * 24 * 3600_000;

      return res.status(200).json({
        token,
        symbol:       tokenData.symbol,
        name:         tokenData.name,
        chain:        tokenData.chain,
        protocol:     tokenData.protocol,
        lastUpdate:   raw.lastUpdate,
        snapshotCount: snaps.length,
        latest: latest ? {
          timestamp:  latest.timestamp,
          price:      latest.price,
          apr_1h:     latest.apr_1h  ?? null,
          apr_24h:    latest.apr_24h ?? null,
          apr_3d:     latest.apr_3d  ?? null,
          apr_7d:     latest.apr_7d  ?? null,
          apr_14d:    latest.apr_14d ?? null,
          apr_30d:    latest.apr_30d ?? null,
          data_hours: latest.data_hours ?? null,
        } : null,
        history: snaps
          .filter(s => s.timestamp >= cutoff)
          .map(s => ({ timestamp: s.timestamp, price: s.price, apr_1h: s.apr_1h ?? null })),
      });
    }

    // All tokens — return just the latest snapshot per token
    const summary = {};
    for (const [id, tokenData] of Object.entries(raw.tokens || {})) {
      const snaps = tokenData.snapshots || [];
      const latest = snaps[snaps.length - 1];
      summary[id] = {
        symbol:        tokenData.symbol,
        name:          tokenData.name,
        chain:         tokenData.chain,
        snapshotCount: snaps.length,
        latest: latest ? { timestamp: latest.timestamp, price: latest.price, apr_24h: latest.apr_24h ?? null, apr_7d: latest.apr_7d ?? null } : null,
      };
    }

    return res.status(200).json({ lastUpdate: raw.lastUpdate, tokens: summary });

  } catch (err) {
    console.error('snapshots API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
