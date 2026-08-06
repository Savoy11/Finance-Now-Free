import { NextResponse } from 'next/server'
import { CORS, options } from '../_cors'
import { isDataRouteAvailable } from '@/lib/modules/features'
import { PREMIUM_BUILD } from '@/lib/distribution'

export const dynamic = 'force-dynamic'
export { options as OPTIONS }

// Discovery document for the public v1 API.
//
// ENDPOINTS is the full product; what this build advertises is that list filtered
// through the premium manifest (lib/modules/premiumManifest.mjs), so discovery and
// the middleware that 404s a withheld route can never disagree. Middleware already
// makes a withheld endpoint unreachable — the point here is that a caller reading
// discovery is never told to call one in the first place. An API that advertises
// endpoints it answers 404 for is worse than a smaller API.
const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/prices',                   description: 'Live prices for one or more coins', params: ['coins (csv, default: all)'] },
  { method: 'GET', path: '/api/v1/exchanges',                description: 'List all supported exchanges with coins and networks', params: ['tier (1|2)'] },
  { method: 'GET', path: '/api/v1/network-fees',             description: 'Current gas/network fees for all 16 supported blockchains', params: [] },
  { method: 'GET', path: '/api/v1/transfer/routes',          description: 'Find cheapest transfer routes between two exchanges for a coin', params: ['from (required)', 'to (required)', 'coin (required)', 'amount (default: coin default)'] },
  { method: 'GET', path: '/api/v1/staking/opportunities',    description: 'Staking options for a coin with APY, lock-up, and a safetyScore (0–100, higher = safer)', params: ['coin', 'category (cefi|wallet|liquid)', 'min_safety (0-100 floor)', 'max_risk (1-10, deprecated)', 'yield_type', 'include_adjacent (default false — excludes lending & governance-token yield)'] },
  { method: 'GET', path: '/api/v1/news',                     description: 'Recent news articles for a coin with sentiment analysis', params: ['coin', 'limit (default: 20)', 'sentiment (positive|negative|neutral)', 'watchlist (comma-separated terms to widen coverage)'] },
  { method: 'GET', path: '/api/v1/securities/quotes',        description: 'Quotes for stocks, ETFs, mutual funds, and macro instruments (futures, FX pairs, yield indices) — Yahoo notation', params: ['symbols (csv, required, max 25 — e.g. AAPL,VOO,GC=F,^TNX)'] },
  { method: 'GET', path: '/api/v1/securities/history',       description: 'Daily close-price history for any quotable security or macro instrument', params: ['symbol (required)', 'range (1mo|3mo|6mo|1y|5y|max, default 1y)'] },
  { method: 'GET', path: '/api/v1/macro/yield-curve',        description: 'Official US Treasury daily par yield curve (13 maturities) with 2s10s / 3m10y spreads and shape', params: [] },
  { method: 'GET', path: '/api/v1/macro/fx-rates',           description: 'Daily ECB reference FX rates (USD base, ~30 currencies, official tier only)', params: ['symbols (csv filter, optional — e.g. EUR,JPY,GBP)'] },
]

const SERVED = ENDPOINTS.filter((e) => isDataRouteAvailable(e.path))

// Networks are only ever a parameter of the transfer / network-fee / exchange
// endpoints. Derived from what actually survived rather than hardcoded to the
// distribution, so this stays correct if the split changes again: listing 16
// network ids beside an endpoint list that can't take one describes an API
// surface that isn't there.
const SUPPORTED_NETWORKS = ['erc20','trc20','bep20','solana','polygon','arbitrum','base','optimism','avalanche','bitcoin','xrpl','litecoin','dogecoin','cardano','polkadot','cosmos']
const NETWORKS_RELEVANT = SERVED.some((e) =>
  ['/api/v1/transfer', '/api/v1/network-fees', '/api/v1/exchanges'].some((p) => e.path.startsWith(p))
)

export async function GET() {
  return NextResponse.json({
    name: 'Finance Now API',
    version: '1.0.0',
    description: PREMIUM_BUILD
      ? 'Finance Now — programmatic access to transfer fees, staking rates, network fees, news, and exchange data.'
      : 'Finance Now (free web edition) — programmatic access to coin prices, staking opportunities, crypto news, security and macro-instrument quotes, price history, the official Treasury yield curve, and ECB reference FX. Transfer-fee routing, exchange listings, and network fees are part of the desktop edition and are not served here.',
    edition: PREMIUM_BUILD ? 'desktop' : 'web-free',
    docs: '/api/v1/openapi.json',
    endpoints: SERVED,
    supported_coins: ['btc','eth','usdt','usdc','bnb','sol','dai','xrp','ltc','trx','doge','matic','avax','ada','dot','atom'],
    ...(NETWORKS_RELEVANT ? { supported_networks: SUPPORTED_NETWORKS } : {}),
  }, { headers: CORS })
}
