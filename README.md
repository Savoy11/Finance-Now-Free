# Finance Now — Free Web Edition

**The free, website-exclusive edition of Finance Now, a multi-asset financial analytics suite.**

This repository builds the **free version of Finance Now for the web**. Its goal is simple:

> Give anyone a genuinely useful, no-signup, no-key-entry market research workspace — live crypto,
> equities, macro, and fund data with honest sourcing — while the full product (AI research agents,
> personal-finance tooling, portfolio construction, and advanced analytics) ships in the paid
> **Finance Now Desktop** edition.

The free edition is the top of the funnel: it drives traffic, carries the affiliate surfaces
(Staking Opportunities), and shows the product's data-honesty standards in public. It is not a
crippled demo — every included surface runs on live data end to end. Features that are not included
are **not in the deployment at all**: no hidden routes, no client-side locks to flip, nothing to
"unlock" in devtools. See [How the split works](#how-the-free-edition-is-enforced).

---

## Relationship to the original Finance Now

The full Finance Now (the desktop product) is developed in its **own separate repository** and is
**not affected by anything in this one**. This repo:

- has exactly one git remote (`Savoy11/Finance-Now-Free`) and pushes nowhere else;
- deletes nothing from the product — the split is a *build-time exclusion*, so a
  `NEXT_PUBLIC_FN_DISTRIBUTION=desktop` build of this codebase still contains every feature;
- shares no CI, submodules, or scripts with the original repo.

Work here changes the free website only.

---

## What the free edition includes

Everything below runs live, free, with **hard-coded data sources** — the reader never picks
providers, enters API keys, or configures feeds. What you see is what the site sources.

| Area | Free surfaces |
|---|---|
| **Core** | Headlines (landing feed), Watchlist (saved in your browser — no account needed), Compare (2–6 assets, correlation + overlap-aware), Videos (search + feed) |
| **Crypto** | Coin Registry + coin detail, Reserve Transparency Monitor, crypto news with sentiment, Staking Opportunities (55 providers), Coin Discovery, Technical Analysis (charts, 16+ indicators, patterns, scanner) |
| **Equities** | Stock Registry + stock detail (SEC filings, XBRL fundamentals), market news, equity TA, market calendar |
| **Macro** | Commodities, currencies + two-tier FX converter, bonds & rates with the official Treasury yield curve, macro news, macro TA over 45 instruments |
| **ETFs & Funds** | Fund registry (118 funds) + fund detail with Fee Drag Analyzer |

## What ships in Finance Now Desktop instead

AI research agents & Daily Brief · the Assistant chat · Pump Report · AI video analysis ·
Portfolios & holdings tracking · Portfolio Builder · Budget & transactions · Wallets & exchange
connections · Staking Discovery · AI stock outlier scan · strategy backtesting (equities page and
the crypto TA backtest tab) · fund look-through & holdings overlap · Safety Scores / composite risk
analysis · the Transfer Fee Calculator · social sentiment (crypto and stocks) · data-source and
integration controls.

Premium URLs on the website land on `/upgrade`, which lists what the desktop edition adds.

---

## How the free edition is enforced

The split is a **build-time distribution flag**, not a runtime permission — full design in
[`docs/DISTRIBUTION-SPLIT.md`](docs/DISTRIBUTION-SPLIT.md). In short:

1. **Pages** belonging to premium features are swapped for a stub at compile time — their
   JavaScript never enters the web bundle (verified by grepping built chunks for engine strings).
2. **Server routes** behind premium features return 404 from middleware — a build-time constant no
   request, header, or cookie can change.
3. **URLs** redirect to `/upgrade`; **nav entries** never render.
4. Premium components inside free pages (the backtest tab, the assistant chat, the tier switch)
   are replaced by empty stubs via module substitution.
5. The public `/api/v1` discovery document and OpenAPI spec are filtered to the endpoints this
   build actually serves, so a caller is never told to call a route that 404s.

The flag **fails closed**: any deploy that forgets `NEXT_PUBLIC_FN_DISTRIBUTION` produces the free
edition, never an accidental public release of the paid product.

The single source of truth for what is premium is
`frontend/src/lib/modules/premiumManifest.mjs`; the running action-item list for this repo is
[`CHECKLIST.md`](CHECKLIST.md).

---

## Running it

```bash
cd frontend
npm install
npm run dev            # free web edition on http://localhost:3000
```

No environment variables are required for the free edition — it runs keyless against public data
sources through its own server-side `/live-data/*` proxy routes (no keys in the browser, no mock
data path), and it needs **no database**: the Watchlist persists to `localStorage`, so there is no
sign-up and a visitor's lists never leave their device. Optional provider keys in
`frontend/.env.local` raise rate limits.

Deployments should set `NEXT_PUBLIC_FN_DISTRIBUTION=web` explicitly. Unset already yields the free
edition (the flag fails closed and every exclusion still applies), but setting it lets the
minifier strip the guarded desktop branches instead of shipping them as unreachable code.

To build the full product from this codebase (for verifying parity, not for deployment here):

```bash
NEXT_PUBLIC_FN_DISTRIBUTION=desktop npm run build
```

### Checks

```bash
npm run type-check     # TypeScript strict
npm test               # vitest (includes the distribution-split test suite)
npm run lint
npm run audit          # live-data audit — read REAL vs FALLBACK, not HTTP status
```

⚠ Data-availability results are IP-dependent (several providers block datacenter IPs) — run
`npm run audit` from a residential connection before trusting a "source is down" conclusion.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript strict, Tailwind CSS, Recharts + lightweight-charts, Zustand, TanStack Query v5 |
| Data | Server-side `/live-data/*` proxy routes over CoinGecko, DefiLlama, SEC EDGAR, treasury.gov, frankfurter.dev, mempool.space, Yahoo Finance, and keyless RSS feeds |
| Public API | REST `/api/v1` with OpenAPI spec (free-edition endpoints only) + MCP server (`mcp-server/`) |

---

## Data honesty principles

1. Every metric displays its source; derived figures are marked as Finance Now's own computation.
2. Estimates and reference values are labeled (`estimate`, `reference`) — never passed off as live.
3. Derived analytics without a trustworthy source display **N/A**, not simulated values.
4. Stale curated datasets carry dated low-confidence warnings.
5. Failed providers degrade honestly: explicit `ok:false` envelopes and provenance-labeled
   fallbacks, verified by the REAL-vs-FALLBACK audit harness.

---

## Disclaimer

Finance Now is an information and research tool. Nothing it displays or generates is financial,
investment, or legal advice. Verify all fees, rates, and reserve claims with primary sources
before transacting.
