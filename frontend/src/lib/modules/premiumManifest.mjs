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
 * @property {string}   group       Which PREMIUM_GROUPS bucket the upsell page files it under.
 * @property {string[]} pageRoutes  Page routes removed from the web build.
 * @property {string[]} dataRoutes  Server handlers removed from the web build.
 * @property {string[]} navHrefs    Sidebar hrefs to drop (usually ⊆ pageRoutes).
 * @property {string}   rationale   Why this is sellable AND protectable.
 */

/** @type {PremiumFeature[]} */
export const PREMIUM_FEATURES = [
  {
    id: 'ai-suite',
    group: 'ai',
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
    group: 'ai',
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
    group: 'ai',
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
    group: 'money',
    module: 'builder',
    label: 'Portfolio Builder',
    pageRoutes: ['/portfolio-builder'],
    navHrefs: ['/portfolio-builder'],
    dataRoutes: ['/api/user/builder-plans'],
    rationale:
      'Already specified as a separately licensed module with its own SKU ' +
      '(docs/ROADMAP.md, "Portfolio Builder"), and desktop-only alongside ' +
      'Portfolios above per the 2026-08-03 decision to keep the whole portfolio ' +
      'pillar off the web. ⚠ Caveat: the allocation engine in ' +
      'lib/data/portfolioBuilder.ts is pure client-side TS today, so excluding it ' +
      'from the web build removes the feature but does not by itself protect the ' +
      'method. Moving buildPortfolio()/reviewPlan() behind a server route is ' +
      'follow-up work before this is genuinely defensible.',
  },
  {
    id: 'portfolios',
    group: 'money',
    module: 'core',
    label: 'Portfolios & Holdings',
    pageRoutes: ['/portfolios'],
    navHrefs: ['/portfolios'],
    dataRoutes: [
      '/api/user/portfolios',
      '/live-data/portfolio-history',
      // ⚠ /live-data/portfolio-prices is deliberately NOT here. Despite the
      // name it is the generic CoinGecko spot-price endpoint, and three FREE
      // surfaces call it through lib/api/instrumentPrices.ts: the Watchlist,
      // the market-overview popout, and the price-alert monitor. Withholding it
      // silently broke crypto pricing on the free Watchlist while stocks (on
      // /live-data/security-quotes) kept working — caught 2026-08-04. Judge a
      // route by its callers, not its name. /live-data/portfolio-history really
      // is portfolios-only and stays withheld.
    ],
    rationale:
      'Owner decision (2026-08-03): the portfolio pillar — this and Portfolio ' +
      'Builder below — is desktop-only. Holdings, cost basis and P&L are user data ' +
      'in Postgres behind /api/user/portfolios, so the cut is clean, and the ' +
      'history route goes with it since only the portfolios page charts a saved ' +
      'portfolio over time.',
  },
  {
    id: 'budget',
    group: 'money',
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
    group: 'money',
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
  // Coin Discovery was proposed premium in the first draft and is deliberately
  // NOT here: owner decision (2026-08-03) is that it stays free on the web. Its
  // /live-data/coin-discovery route stays open with it — withholding the data of
  // a free feature would just break it.
  {
    id: 'crypto-social',
    group: 'analysis',
    module: 'crypto',
    label: 'Crypto Social Sentiment',
    pageRoutes: ['/social'],
    navHrefs: ['/social'],
    dataRoutes: ['/live-data/social'],
    rationale:
      'Owner decision (2026-08-04): social sentiment is desktop-only, both markets. ' +
      'The aggregation runs server-side, so the cut is clean.',
  },
  {
    id: 'stock-social',
    group: 'analysis',
    module: 'equities',
    label: 'Stock Social Sentiment',
    pageRoutes: ['/equities/social'],
    navHrefs: ['/equities/social'],
    dataRoutes: ['/live-data/stock-social'],
    rationale:
      'The equities half of the same 2026-08-04 decision: Reddit/StockTwits ' +
      'blending is server-side (lib/server/socialBlend.ts) and goes with the page.',
  },
  {
    id: 'transfer-fees',
    group: 'analysis',
    module: 'crypto',
    label: 'Transfer Fee Calculator',
    pageRoutes: ['/transfer-fees'],
    navHrefs: ['/transfer-fees'],
    dataRoutes: [
      '/live-data/network-fees',
      '/api/v1/network-fees',
      '/api/v1/transfer',
      '/api/v1/exchanges',
    ],
    rationale:
      'Owner decision (2026-08-04), REVERSING the earlier "affiliate surfaces stay ' +
      'free" position for this page (docs/ROADMAP.md named it the highest-intent ' +
      'affiliate surface; the test asserting it stayed free was deleted deliberately, ' +
      'as that test\'s own comment demanded). The whole toolset goes together: the ' +
      'page, live gas fees (/live-data/network-fees), and the three /api/v1 ' +
      'endpoints that expose the same fee table and route-finder programmatically — ' +
      'cutting the page while the API still answered would remove the UI, not the ' +
      'feature. The fee table itself (lib/data/transferFees.ts) drops out of the ' +
      'client bundle with the page stub. Staking Opportunities remains the free ' +
      'affiliate surface.',
  },
  {
    id: 'risk-scores',
    group: 'analysis',
    module: 'crypto',
    label: 'Safety Scores & Risk Analysis',
    pageRoutes: ['/risk-scores'],
    navHrefs: [],
    dataRoutes: ['/live-data/risk-scores'],
    rationale:
      'Owner decision (2026-08-04). The composite scoring engine (lib/risk) runs ' +
      'server-side — exactly the sellable-and-protectable shape. No navHrefs: the ' +
      'leaderboard page has no sidebar entry (reached from coin detail). The free ' +
      'surfaces that displayed the scores degrade with it: the Coins table hides ' +
      'its Safety Score / Risk Band columns and the coin detail page hides its ' +
      'score gauge and risk panel (both gated on PREMIUM_BUILD in the components), ' +
      'rather than rendering permanent N/A columns for a feature this build does ' +
      'not have.',
  },
  {
    id: 'data-source-config',
    group: 'control',
    module: 'core',
    label: 'Data Source & Integration Controls',
    pageRoutes: ['/settings', '/data-sources'],
    navHrefs: ['/settings', '/data-sources'],
    dataRoutes: [],
    rationale:
      'Owner decision (2026-08-04): the free web edition runs on hard-coded data ' +
      'sources — no provider picking, no API-key entry, no custom feeds, no data ' +
      'tier switching. Cuts the Integrations page, the Data Sources catalog page, ' +
      'and the TopBar TierSwitch (via PREMIUM_COMPONENTS). /live-data/config is ' +
      'deliberately NOT in dataRoutes: its GET powers the feed-status banner on ' +
      'every free page, and its POST (writing provider config) is already behind ' +
      'guardSensitiveRoute/FN_ADMIN_TOKEN — the choosing UI is gone, the status ' +
      'read stays. Suite Module toggles lived on /settings too, so a free build ' +
      'always runs with every included module enabled.',
  },
  {
    id: 'staking-discovery',
    group: 'analysis',
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
    group: 'ai',
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
    id: 'backtests',
    group: 'analysis',
    module: 'equities',
    label: 'Strategy Backtests',
    pageRoutes: ['/equities/backtests'],
    navHrefs: ['/equities/backtests'],
    dataRoutes: [],
    rationale:
      'Owner decision (2026-08-03): backtesting is desktop-only. TWO surfaces, not ' +
      'one — the /equities/backtests page and the Backtest tab on the free crypto ' +
      'Technical Analysis page. The tab is handled through PREMIUM_COMPONENTS below, ' +
      'since it has no route of its own; cutting only the page would have left the ' +
      'crypto simulation running on the web and the removal half-done. Both engines ' +
      '(lib/utils/equityBacktest.ts and lib/utils/backtest.ts) become unreachable ' +
      'and drop out of the bundle. ⚠ Standing caveat: both simulations are ' +
      'client-side over /live-data/{security-,}ohlcv, which stays free for charting, ' +
      'so the code is absent but the method could be reimplemented. Moving the ' +
      'simulation server-side is the same follow-up as Portfolio Builder. Technical ' +
      'Analysis itself stays free — only the strategy simulation is withheld.',
  },
  {
    id: 'fund-look-through',
    group: 'analysis',
    module: 'funds',
    label: 'Fund Look-Through & Holdings Overlap',
    pageRoutes: [],
    navHrefs: [],
    dataRoutes: ['/live-data/fund-holdings', '/live-data/fund-holdings-history'],
    rationale:
      'Full N-PORT holdings retrieval and the quarter-over-quarter diff are server ' +
      'work against SEC EDGAR, feeding the Portfolios look-through tab and the ' +
      'Compare overlap section. Portfolios is now desktop-only in its own right, so ' +
      'on the web this cut lands on Compare alone: the page stays free and loses ' +
      'only its overlap panel, degrading rather than disappearing.',
  },
]

// ─── Upsell grouping ──────────────────────────────────────────────────────────
// The /upgrade page groups features by what they DO for a reader, not by which
// module owns them: sixteen bullet points is a feature dump, four themes is
// positioning. Ordered by how much of the paid product each theme represents.
//
// Lives here rather than in the page so a newly withheld feature cannot silently
// miss the upsell — a feature's `group` is validated against this list by test,
// the same way navHrefs and module ids are.

/**
 * @typedef {object} PremiumGroup
 * @property {string} id
 * @property {string} label   Section heading on /upgrade.
 * @property {string} blurb   One line on what this theme is for.
 */

/** @type {PremiumGroup[]} */
export const PREMIUM_GROUPS = [
  {
    id: 'ai',
    label: 'AI research',
    blurb: 'Agents that read the market for you — a morning brief built from your holdings, deep dives on any asset, and an assistant that knows the whole app.',
  },
  {
    id: 'money',
    label: 'Your actual money',
    blurb: 'Track what you own and plan what to buy: holdings with cost basis and P&L, a diversified portfolio built to your horizon, budgets, and on-chain balances.',
  },
  {
    id: 'analysis',
    label: 'Deeper analysis',
    blurb: 'The scoring and simulation layers — composite safety scores, strategy backtests, fund look-through, transfer-fee routing, and social sentiment.',
  },
  {
    id: 'control',
    label: 'Your own data sources',
    blurb: 'Bring your own API keys and feeds, reorder providers, and see exactly which source served every number.',
  },
]

/** Features belonging to a group, in manifest order. */
export function featuresInGroup(groupId) {
  return PREMIUM_FEATURES.filter((f) => f.group === groupId)
}

/** The feature that owns a page route, if any — used to personalise /upgrade. */
export function featureForPageRoute(pathname) {
  return PREMIUM_FEATURES.find((f) => isPremiumPath(pathname, f.pageRoutes))
}

// ─── Premium components inside otherwise-free pages ───────────────────────────
// Not every premium feature owns a route. The Backtest tab lives inside the free
// Technical Analysis page, so there is no URL to redirect and no handler to 404 —
// the sellable part is the strategy engine that would otherwise be compiled into
// a page the web build still serves.
//
// Each entry swaps `module` for `stub` at build time. The stub must export the
// same names with the same props: the importing page is compiled unchanged and
// simply resolves to a different file.
//
// This is why such a component must live in its own module rather than inline in
// the page. Inline, the best available guard is a dead `if (PREMIUM_BUILD)` branch
// whose top-level import of the engine survives unless the minifier chooses to
// drop it — protection resting on an optimisation, not on a guarantee. A module
// the page no longer resolves to cannot ship whatever it imported.

/**
 * @typedef {object} PremiumComponent
 * @property {string} id      Feature id this belongs to (see PREMIUM_FEATURES).
 * @property {string} module  Path from src/, without extension.
 * @property {string} stub    Replacement path from src/, without extension.
 */

/** @type {PremiumComponent[]} */
export const PREMIUM_COMPONENTS = [
  {
    id: 'backtests',
    module: 'components/analytics/BacktestPanel',
    stub: 'components/analytics/BacktestPanel.stub',
  },
  {
    // The floating Assistant chat is mounted in the dashboard layout on every
    // page; its /api/agents/chat backend is premium, so on the web it would be
    // a chat button that can only ever error.
    id: 'ai-suite',
    module: 'components/agents/AssistantWidget',
    stub: 'components/agents/AssistantWidget.stub',
  },
  {
    // The TopBar data-tier dropdown is the third "choose your sources" surface
    // beside the two cut pages; with sources hard-coded it configures nothing.
    id: 'data-source-config',
    module: 'components/ui/TierSwitch',
    stub: 'components/ui/TierSwitch.stub',
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
