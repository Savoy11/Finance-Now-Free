// ─── Premium feature manifest ─────────────────────────────────────────────────
// The single source of truth for the free/premium split between Finance Now's two
// distributions. Design and rationale: docs/DISTRIBUTION-SPLIT.md.
//
// ⚠ STATUS: the tier assignments below are a PROPOSAL awaiting owner sign-off.
// The mechanism around them is complete and split-agnostic — changing what is sold
// is a one-file edit here, not a code change anywhere else.
//
// Plain ESM on purpose. Both `next.config.mjs` (which performs the build-time
// exclusion) and the TypeScript app (which filters nav and guards handlers) import
// this exact file, so the two can never disagree. A second hand-maintained list is
// exactly how a premium route survives a build it was supposed to be cut from.
//
// ── Every entry must declare BOTH halves of its feature ──
//   pageRoutes — URLs a reader can navigate to
//   dataRoutes — server handlers that feed it
//
// Removing only `pageRoutes` is not protection. A deployed /live-data handler can
// be curled directly whether or not any UI links to it, so a feature whose data
// route survives the cut is still fully available to anyone who opens devtools
// once. Both lists, always.
//
// ── Why this set, and not more ──
// Every feature proposed as premium below has a SERVER-SIDE half — an LLM call, a
// credentialed fetch, a scoring pass, or user data in Postgres. That is not a
// coincidence, it is the selection rule: build-time exclusion can only protect
// what the browser cannot recompute for itself.
//
// Features that are pure client-side math over public data — the TA indicator
// engine, `computeFeeDrag`, the Compare correlation math, `portfolioBuilder`'s
// allocation engine — are deliberately NOT on this list even where they are
// valuable. Gating them would be theatre: the arithmetic runs in the reader's own
// browser, so "premium" would mean nothing more than an if-statement someone can
// read. If one of them should genuinely be sold, the fix is to move the
// computation behind a server route first, then add it here. Do not shortcut that.

/**
 * @typedef {object} PremiumFeature
 * @property {string}   id          Stable identifier — used in URLs and telemetry.
 * @property {string}   module      Owning module id from lib/modules/registry.
 * @property {string}   label       Human name, shown on the upsell surface.
 * @property {string[]} pageRoutes  Page routes removed from the web build.
 * @property {string[]} dataRoutes  Server handlers removed from the web build.
 * @property {string[]} navHrefs    Sidebar hrefs to drop (usually ⊆ pageRoutes).
 * @property {string}   rationale   Why this is sellable AND protectable.
 */

/** @type {PremiumFeature[]} */
export const PREMIUM_FEATURES = [
  {
    id: 'ai-suite',
    module: 'core',
    label: 'AI Research & Daily Brief',
    pageRoutes: ['/brief', '/research', '/agent-config'],
    navHrefs: ['/brief', '/research', '/agent-config'],
    dataRoutes: ['/api/agents'],
    rationale:
      'Every call costs metered LLM spend against our key, and the whole surface is ' +
      'server-side by construction — the browser only ever sees the answer. The ' +
      'clearest premium tier in the app: highest willingness to pay, highest ' +
      'marginal cost to serve, and nothing to leak client-side.',
  },
  {
    id: 'pump-report',
    module: 'crypto',
    label: 'Pump Report',
    pageRoutes: [],
    navHrefs: [],
    dataRoutes: ['/live-data/pump-report'],
    rationale:
      'Its own agent loop with web search — same metered-LLM argument as the AI ' +
      'suite. Reached as a tab inside /wallets rather than its own route, so it has ' +
      'no pageRoutes of its own; the tab is dropped with the Wallets feature below.',
  },
  {
    id: 'video-analysis',
    module: 'core',
    label: 'AI Video Analysis',
    pageRoutes: [],
    navHrefs: [],
    dataRoutes: ['/live-data/video-analyze'],
    rationale:
      'The LLM half of /videos. Video search and the feed grid stay free — they are ' +
      'keyless RSS and a genuine traffic driver; only the paid analysis step is cut.',
  },
  {
    id: 'portfolio-builder',
    module: 'builder',
    label: 'Portfolio Builder',
    pageRoutes: ['/portfolio-builder'],
    navHrefs: ['/portfolio-builder'],
    dataRoutes: ['/api/user/builder-plans'],
    rationale:
      'Already specified as a separately licensed module with its own SKU ' +
      '(docs/ROADMAP.md, "Portfolio Builder"). ⚠ Caveat: the allocation engine in ' +
      'lib/data/portfolioBuilder.ts is pure client-side TS today, so excluding it ' +
      'from the web build removes the feature but does not by itself protect the ' +
      'method. Moving buildPortfolio()/reviewPlan() behind a server route is ' +
      'follow-up work before this is genuinely defensible.',
  },
  {
    id: 'budget',
    module: 'budget',
    label: 'Budget & Transactions',
    pageRoutes: ['/budget'],
    navHrefs: ['/budget', '/budget/transactions'],
    dataRoutes: ['/api/user/budget'],
    rationale:
      'Personal-finance pillar: every byte is user data in Postgres behind ' +
      '/api/user/budget, so the split is clean and enforceable. Also the natural ' +
      'anchor of a paid personal-finance tier rather than a public web utility.',
  },
  {
    id: 'wallets',
    module: 'crypto',
    label: 'Wallets & Exchange Connections',
    pageRoutes: ['/wallets'],
    navHrefs: ['/wallets'],
    dataRoutes: ['/live-data/wallet'],
    rationale:
      'Holds exchange API credentials in a server-side secret store and reads ' +
      'on-chain balances on the user\'s behalf. Credential custody is a liability ' +
      'that does not belong on an anonymous free website at all, independent of ' +
      'monetisation.',
  },
  {
    id: 'coin-discovery',
    module: 'crypto',
    label: 'Coin Discovery',
    pageRoutes: ['/coin-discovery'],
    navHrefs: ['/coin-discovery'],
    dataRoutes: ['/live-data/coin-discovery'],
    rationale:
      'A server-side scoring pass over live market data — the ranking model is the ' +
      'product, and it never reaches the browser. The plain Coin Registry stays ' +
      'free, so the free edition still browses every coin; only the scored ' +
      'candidate screen is sold.',
  },
  {
    id: 'staking-discovery',
    module: 'crypto',
    label: 'Staking Discovery',
    pageRoutes: ['/staking-discovery'],
    navHrefs: ['/staking-discovery'],
    dataRoutes: ['/live-data/staking-discovery'],
    rationale:
      'Same argument as Coin Discovery: server-side scoring is the sellable part. ' +
      '⚠ The Staking Opportunities page (/staking) stays FREE deliberately — it is ' +
      'the affiliate-revenue surface named in docs/ROADMAP.md, and that revenue ' +
      'only exists if the free web edition can reach it.',
  },
  {
    id: 'equity-outliers',
    module: 'equities',
    label: 'AI Outlier Scan',
    pageRoutes: [],
    navHrefs: [],
    dataRoutes: ['/live-data/stock-outliers'],
    rationale:
      'Sector-relative z-score screening computed server-side over the full stock ' +
      'universe, and the data route behind the Equity Screener agent. The Stock ' +
      'Registry itself stays free; the scan panel on it is cut.',
  },
  {
    id: 'equity-backtests',
    module: 'equities',
    label: 'Strategy Backtests',
    pageRoutes: ['/equities/backtests'],
    navHrefs: ['/equities/backtests'],
    dataRoutes: [],
    rationale:
      '⚠ Weakest protection case on this list, and flagged as such: the strategy ' +
      'simulation runs client-side over /live-data/security-ohlcv, which stays free ' +
      'for charting. Excluding the page removes the feature from the web edition, ' +
      'but a determined reader could reimplement it against the public OHLCV route. ' +
      'Listed because it is a coherent paid feature, NOT because it is defensible ' +
      'as-is — moving the simulation server-side is the same follow-up as Portfolio ' +
      'Builder. Drop it from this list if the split should only contain things the ' +
      'mechanism can genuinely hold.',
  },
  {
    id: 'fund-look-through',
    module: 'funds',
    label: 'Fund Look-Through & Holdings Overlap',
    pageRoutes: [],
    navHrefs: [],
    dataRoutes: ['/live-data/fund-holdings', '/live-data/fund-holdings-history'],
    rationale:
      'Full N-PORT holdings retrieval and the quarter-over-quarter diff are server ' +
      'work against SEC EDGAR, feeding the Portfolios look-through tab and the ' +
      'Compare overlap section. Both host pages stay free and simply lose those ' +
      'panels, so the free edition degrades gracefully instead of losing a page.',
  },
]

/** Every premium page route, flattened. */
export const PREMIUM_PAGE_ROUTES = PREMIUM_FEATURES.flatMap((f) => f.pageRoutes)

/** Every premium server handler prefix, flattened. */
export const PREMIUM_DATA_ROUTES = PREMIUM_FEATURES.flatMap((f) => f.dataRoutes)

/** Every sidebar href that must not render in a free build. */
export const PREMIUM_NAV_HREFS = PREMIUM_FEATURES.flatMap((f) => f.navHrefs)

/**
 * True when `pathname` is owned by a premium feature.
 * Matches the route itself and anything beneath it, so '/budget' covers
 * '/budget/transactions' and '/api/agents' covers '/api/agents/chat'.
 */
export function isPremiumPath(pathname, routes) {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}
