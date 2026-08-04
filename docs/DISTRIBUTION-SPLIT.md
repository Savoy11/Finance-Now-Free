# Distribution Split — Free Web Edition vs Desktop

> How Finance Now ships as two products from one codebase: a **free edition exclusive to the
> website**, and the full **desktop** product.
>
> **Status (2026-08-03):** the mechanism is built, tested and verified in both directions.
> The *tier assignments* are a **proposal awaiting owner sign-off** — see
> [Proposed split](#proposed-split). Changing what is sold is a one-file edit.

---

## The requirement

> "I want to remove certain features from each module and flag them as premium."
> "I don't want people to have the ability to hack the web code to make the premium features
> accessible."

Two things follow from the second sentence, and they set the whole design:

1. The split is **per-feature within a module**, not per-module. Every module still appears on
   the website; specific features inside it are withheld.
2. Hiding UI is not enough. A premium feature must not be **present** in the web deployment.

---

## Why this is not the entitlement system

The app already has entitlement machinery, and it is the wrong tool here. Worth stating plainly so
nobody wires it up later thinking it closes this gap:

| | What exists today | Why it can't hold |
|---|---|---|
| `useEntitlementStore` | localStorage, everything enabled by default | It's a user *preference*. Any visitor flips it in devtools. |
| `ModuleGate` | Client-side check on that store | Renders a lock notice. The code and data behind it still shipped. |
| `entitlements` table | Correct shape, in Postgres | **Nothing reads or writes it.** Reserved for Phase 6 billing. |

A client-side check on a public website is a suggestion. Server-side entitlements would be real,
but they require auth + billing (ROADMAP Phase 6) and are the answer to a *different* question —
selling tiers **within** the web app. For "this edition simply does not include that feature," a
build-time split is both smaller and strictly stronger: there is no permission to escalate,
because the feature was never compiled in.

The entitlement store stays as-is for its existing job — letting a user hide modules they don't
care about.

---

## The mechanism

One build-time flag, one manifest, four enforcement points.

```
NEXT_PUBLIC_FN_DISTRIBUTION = web | desktop      (default: web — fails closed)
```

**Fails closed on purpose.** Anything that isn't exactly `desktop` yields the free build. A
forgotten env var on a deploy then ships the free edition — a missing feature, recoverable. The
opposite default would silently publish the paid product to the open web, which is not.

### Single source of truth

`src/lib/modules/premiumManifest.mjs` — plain ESM so that **both** `next.config.mjs` (which does
the build exclusion) and the TypeScript app (which filters nav and gates handlers) import the same
file. A second hand-maintained list is exactly how a premium route survives a build it was meant
to be cut from.

Every entry declares **both halves** of its feature — `pageRoutes` *and* `dataRoutes`. Removing
only the page is not protection: a deployed `/live-data` handler can be curled whether or not any
UI links to it.

### Four enforcement points

| # | Layer | File | What it stops |
|---|-------|------|---------------|
| 1 | **Build** | `next.config.mjs` → `webpack()` | Swaps each premium `page.tsx` for a stub, so the page and its private component tree are **never compiled**. This is what makes the code genuinely absent. |
| 2 | **Routing** | `next.config.mjs` → `redirects()` | Premium URLs → `/upgrade`. |
| 3 | **Server** | `src/middleware.ts` | 404s every premium data route, before the handler runs. **This is the layer that actually holds** — no request, header, or cookie can turn a build-time constant off. |
| 4 | **Nav** | `src/lib/modules/registry.ts` → `BUILD_MODULES` | Premium sidebar entries don't render, and no empty module header is left behind. |
| 5 | **Component** | `next.config.mjs` → `PREMIUM_COMPONENTS` | Swaps a premium component *inside a free page* for a stub with the same exports, so its engine is imported by nothing and drops out. |

### Point 5: features that own no route

Not every premium feature has a URL. The Backtest tab lives inside the free Technical Analysis
page — nothing to redirect, no handler to 404, and the sellable part (the strategy engine) would
otherwise be compiled straight into a page the web build still serves.

Such a component **must live in its own module**. Left inline, the best available guard is a dead
`if (PREMIUM_BUILD)` branch whose top-level `import` of the engine survives unless the minifier
chooses to drop it — protection resting on an optimisation rather than a guarantee. A module the
page no longer resolves to cannot ship whatever it imported. `BacktestPanel` was extracted from
`technical-analysis/page.tsx` for exactly this reason.

`src/lib/server/premiumGuard.ts` (`premiumOnly()`) covers the case middleware can't express: a
one-off premium handler sitting inside an otherwise-free subtree.

### Verified

Built and probed in both directions on 2026-08-03:

- **Web build** — premium pages compile to a ~380 B stub (`/portfolio-builder` 20 kB → 380 B,
  `/portfolios` and `/staking-discovery` likewise); premium data routes return **404**
  (`api/user/portfolios`, `live-data/portfolio-{prices,history}`, `api/user/builder-plans`,
  `staking-discovery`, `stock-outliers`, `fund-holdings`, `api/agents/chat`, `api/user/budget/*`,
  `wallet/btc`); premium pages **307 → `/upgrade`**; free routes and pages **200**, with
  `/coin-discovery` restored to its full 9.76 kB.
- **Desktop build** — every premium page restored to full size (`/portfolio-builder` back to
  20 kB, `/wallets` 8.49 kB, `/brief` 7.44 kB).
- **Backtesting, checked by string rather than by file size** — the strongest evidence available.
  Grepping the built client chunks for the engine's own strategy names (`Donchian breakout`,
  `Golden / death cross`, `RSI dip in uptrend`) returns **0 hits in the web build and 1 each in
  the desktop build**. `/technical-analysis` drops 27.2 kB → 19.9 kB with the tab removed;
  `/equities/backtests` 6.91 kB → 380 B.
- 552 tests pass, type-check clean, lint 0 errors. 24 tests cover fail-closed defaulting, prefix
  matching (`/budget` must not swallow `/budgets`), manifest/registry agreement, each owner
  decision above, the data-source catalogue filtering, and — for premium components — that both
  paths resolve to real files and the stub carries every export the real module does.

> One note when re-running this probe off the owner's machine: `/live-data/coin-discovery`
> answers **503** with its own body (`CoinGecko … HTTP 403`), because CoinGecko blocks datacenter
> IPs — the IP-dependency `CLAUDE.md` warns about. That is the handler *running*, which is what
> free means. A withheld route returns an empty 404 with no body; read the body, not the status.

---

## The selection rule — read before changing the split

**Only features with a server-side half are proposed as premium.** That is not a coincidence; it
is the rule:

> Build-time exclusion can only protect what the browser cannot recompute for itself.

Features that are pure client-side math over public data — the TA indicator engine,
`computeFeeDrag`, the Compare correlation math — are deliberately **not** premium even where
they're valuable. Gating them would be theatre: the arithmetic runs in the reader's own browser,
so "premium" would mean nothing more than an if-statement someone can read. To sell one, move the
computation behind a server route **first**, then add it to the manifest.

Two entries in the proposal are flagged as not yet meeting this bar, deliberately and visibly:

- **Portfolio Builder** — `buildPortfolio()` / `reviewPlan()` are pure client-side TS. Excluding
  them removes the feature from the web edition but does not protect the method. Moving the engine
  server-side is follow-up work.
- **Strategy Backtests** — the simulation runs client-side over `/live-data/security-ohlcv`, which
  stays free for charting. A determined reader could reimplement it against the public route.
  Listed because it's a coherent paid feature, *not* because it's defensible as-is.

One further honesty note: if the desktop app is Electron, its bundle contains this JavaScript too.
The split makes premium code absent **from the web**; it does not obfuscate the desktop build.

---

## Proposed split

**Thesis:** free = browse, read, compare, and the high-intent affiliate surfaces → traffic and
affiliate revenue. Premium = AI, personal finance, and server-side scoring → subscription revenue.

### Premium — desktop only (11 features)

| Feature | Module | Withheld |
|---|---|---|
| AI Research & Daily Brief | core | `/brief`, `/research`, `/agent-config`, `/api/agents/*` |
| Pump Report | crypto | `/live-data/pump-report/*` |
| AI Video Analysis | core | `/live-data/video-analyze` |
| **Portfolios & Holdings** | core | `/portfolios`, `/api/user/portfolios`, `/live-data/portfolio-{prices,history}` |
| **Portfolio Builder** | builder | `/portfolio-builder`, `/api/user/builder-plans` |
| Budget & Transactions | budget | `/budget/*`, `/api/user/budget/*` |
| Wallets & Exchange Connections | crypto | `/wallets`, `/live-data/wallet/*` |
| **Staking Discovery** | crypto | `/staking-discovery`, `/live-data/staking-discovery` |
| AI Outlier Scan | equities | `/live-data/stock-outliers` |
| **Strategy Backtests** | equities | `/equities/backtests` **and** the Backtest tab on `/technical-analysis` |
| Fund Look-Through & Overlap | funds | `/live-data/fund-holdings{,-history}` |

**Owner decisions, 2026-08-03** (revising the first draft):

- **The whole portfolio pillar is desktop-only** — both `/portfolios` and `/portfolio-builder`.
  Their pricing routes go with them; nothing else calls `/live-data/portfolio-*`, which exists to
  price a saved portfolio a web reader cannot have.
- **Coin Discovery stays free**, and its `/live-data/coin-discovery` route stays open with it —
  withholding the data of a free feature would just break the page.
- **Staking Discovery is desktop-only.** Staking Opportunities (`/staking`) is unaffected.
- **Backtesting is desktop-only — both surfaces.** It was never only the
  `/equities/backtests` page: the free crypto Technical Analysis page carried a **Backtest tab**
  running the same kind of simulation. Cutting the page alone would have left it running on the
  web and the removal half-done. Technical Analysis itself stays free — Chart, Patterns and
  Scanner are untouched, and only the strategy simulation is withheld.
- **The Watchlist stays free**, confirmed against the open question raised last round.

Nothing is deleted from the codebase. Every entry above is a **web-build exclusion**; the desktop
build is unchanged and still contains all of it.

### Free — everything else

Headlines · Coins registry + detail + Reserve Monitor · Crypto News · Social · **Transfer Fees** ·
**Staking Opportunities** · **Coin Discovery** · Risk Scores · Crypto TA · Stock Registry + detail ·
Market News · Stock Social · Equity TA · Calendar · all of Macro (commodities, currencies +
converter, bonds & rates + yield curve, macro news, macro TA) · Fund Registry + detail · Watchlist ·
Compare · Videos (search + feed) · Data Sources · Integrations.

The **Data Sources** page is filtered to match (`BUILD_DATA_SOURCES`). It's free, and its whole job
is an accurate account of where numbers come from — listing "Portfolio prices · Live" for a surface
the build cannot serve would make it a liar. A surface is also dropped when one of its folded-in
`covers` routes is withheld, so nothing claims coverage it no longer has.

**Transfer Fees and Staking Opportunities stay free deliberately.** They are the affiliate-revenue
surfaces named in `docs/ROADMAP.md`, and that revenue only exists if the free web edition can reach
them. A test asserts this so a future split has to remove it on purpose.

Note the free edition keeps a page wherever possible and loses only the premium *panel* —
Portfolios keeps everything but look-through; the Stock Registry keeps everything but the scan.

### Open questions for the owner

Settled 2026-08-03: the portfolio pillar (both tools), Coin Discovery, Staking Discovery,
backtesting (both surfaces), and the Watchlist staying free — see the decisions above. Still open:

1. **Videos** — currently loses only the AI analysis step; search and the feed stay free. Right
   line, or should the whole surface go?
2. **Upsell copy** — `/upgrade` lists premium feature names and says they're in the desktop
   edition. Needs real positioning and a link once pricing exists.
3. **Server-side follow-up.** Portfolio Builder's allocation engine and both backtest simulations
   are client-side math. The web build no longer contains them, but the *method* is only protected
   once the computation moves behind a route. Worth scheduling if these become headline paid
   features rather than bundle filler.

---

## Changing the split

Edit `PREMIUM_FEATURES` in `src/lib/modules/premiumManifest.mjs`. Nothing else needs to change —
nav filtering, redirects, build exclusion, middleware and the upsell page all derive from it. Then
run `npm test` (the integrity tests catch typo'd hrefs, unknown modules, and features that withhold
nothing) and rebuild.

To build the full product: `NEXT_PUBLIC_FN_DISTRIBUTION=desktop npm run build`.
