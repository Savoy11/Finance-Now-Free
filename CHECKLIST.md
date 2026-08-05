# Free Web Edition — Running Checklist

The living action-item list for this repo (the free website). Ordered by priority: **P0** blocks
launch, **P1** should land before or shortly after launch, **P2** is improvement work. Update
statuses in place; move finished items to the Done log with a date rather than deleting them, so
decisions stay traceable. Product decisions and their rationale live in
[`docs/DISTRIBUTION-SPLIT.md`](docs/DISTRIBUTION-SPLIT.md) — this file tracks *work*, that file
records *why*.

Scope reminder: this repo only affects the free web edition. The desktop product lives in its own
repository and is untouched by anything here.

---

## P0 — blocks launch

- [ ] **Owner review of the full free/premium split on a running build.** Every cut so far is
      decided and implemented, but nobody has clicked through the free edition end-to-end. Walk
      every nav entry, confirm nothing renders a dead panel, empty column, or link into a
      premium route. (The automated sweep is done and verified against served HTML — see the
      done log — but it can only catch what it knows to grep for.)
- [ ] **Deployment target + pipeline.** Where the free site actually runs (Vercel / VPS / other),
      and `FN_ADMIN_TOKEN` set so the admin-guarded routes stay locked on a public host.
      **Set `NEXT_PUBLIC_FN_DISTRIBUTION=web` explicitly.** Leaving it unset still produces the
      free edition — the flag fails closed and every premium route/page/component exclusion works
      regardless — but Next only inlines `NEXT_PUBLIC_*` vars that are actually present, so unset
      means the in-module guards ship their dead branch instead of being minified away. Measured:
      with it set, the watchlist's `/api/user/watchlists` calls vanish from the bundle; unset,
      they remain as unreachable code.
- [ ] **Legal floor for a public site.** Terms of Service, Privacy Policy, "not investment
      advice" page, and data-source attribution page, linked from the footer. The requirements
      list already exists in `docs/BUSINESS-CHECKLIST.md` §3 — this item is rendering them on the
      site.

## P1 — before/shortly after launch

- [ ] **`/upgrade` positioning copy.** The page currently lists premium feature names. It needs
      real copy about Finance Now Desktop, pricing (when it exists), and a download/purchase
      link. It is the only conversion surface the free edition has.
- [ ] **Videos decision.** Currently only the AI-analysis step is premium; search and the feed
      stay free. Confirm that line or cut the whole surface.
- [ ] **Re-run `npm run audit` from a residential IP** before trusting any "provider is down"
      conclusion reached in cloud sessions (CoinGecko, Reddit, Binance all block datacenter IPs).

## P2 — improvement work

- [ ] **Move sellable client-side engines behind server routes.** Portfolio Builder's allocation
      engine and both backtest simulations are pure client-side TS. The web build no longer ships
      them, but the *method* is only protected once the computation is server-side. Matters if
      these become headline paid features.
- [ ] **Hard-code the news/source copy for the web.** With source configuration cut, surfaces that
      explain "which providers are active" could speak in fixed terms on the web instead of
      reflecting the (now invisible) provider registry.
- [ ] **Affiliate links on Staking Opportunities.** Now the sole affiliate surface of the free
      edition. The integrity rules and implementation notes are written in `docs/ROADMAP.md`
      ("Affiliate links") — implementing them is the revenue-side follow-up to this split.
- [ ] **SEO/meta pass.** Landing metadata, per-page titles/descriptions, OG images for the free
      surfaces — the free edition's whole job is being found.
- [ ] **Public-deployment hardening.** Rate limiting on `/live-data/*` and `/api/v1/*`; currently
      the only public-host protections are the admin guard and upstream provider limits.

---

## Done log

- [x] **2026-08-05 — `/api/v1` discovery and OpenAPI spec trimmed to free-edition truth.** Both
      documents now derive from the premium manifest, so they cannot drift from what middleware
      serves. Web: 7 endpoints (was 10), spec down to 7 paths / 5 tags / 9 schemas; discovery
      gains an `edition` field and drops `supported_networks`, which only ever described the
      withheld transfer/exchange/network-fee endpoints. Pruning is transitive and verified
      internally consistent — `CurveSnapshot` is referenced by no path, only by
      `YieldCurveResponse`, and a single-pass filter would have dropped it and left a spec with
      an unresolved `$ref`; the served document has none. Orphaned tags go too, since Swagger UI
      renders them as empty sections. Desktop still serves all 10 paths / 7 tags / 12 schemas.
      3 tests pin the endpoint classification, including that `/api/v1/transfer/routes` is caught
      by the `/api/v1/transfer` parent prefix and that `/api/v1/staking` stays free even though
      `/live-data/staking-discovery` doesn't.
      ⚠ Follow-up noted, not done: the `mcp-server/` tools `find_transfer_routes`,
      `list_exchanges` and `get_network_fees` call those withheld endpoints. That server ships
      with the desktop product and points at a local instance by default, so nothing is broken
      today — but pointed at the public site those three tools would 404.
- [x] **2026-08-04 — Swept copy and links pointing at removed surfaces.** Verified by fetching
      every free page from a running web build and grepping the served HTML: zero references to
      `/settings`, `/data-sources`, "Integrations", "Pump Report", "Risk History" or "Analyze
      with AI" across 15 pages, with the desktop build keeping all of it. Beyond copy, the sweep
      caught **three premium features still mounted on free pages** — the coin-detail Pump Report
      and Risk History tabs, and the Stock Registry's AI Outlier Scan panel — each of which would
      have opened onto a 404'd route, plus the equity-detail "Analyze with AI" button linking
      into premium `/research`.
- [x] **2026-08-04 — Fixed a real break the sweep exposed: `/live-data/portfolio-prices`.**
      Despite the name it is the generic CoinGecko spot-price endpoint, and three FREE surfaces
      call it (Watchlist, market-overview popout, price-alert monitor). Withholding it with the
      portfolio pillar silently broke crypto pricing on the free Watchlist while stocks kept
      working. Now free again; `/live-data/portfolio-history` stays withheld. The original
      consumer search missed it because the `grep -v "live-data/portfolio"` filter meant to skip
      the route's own files also excluded every caller using the full path — judge a route by its
      callers, not its name. Pinned by test.
- [x] **2026-08-04 — Fixed `BUILD_DATA_SOURCES` silently keeping composite-route rows.** Entries
      whose `route` is prose ("/a + /b", "/a (drift monitoring)") never matched the manifest, so
      they survived the filter. Now every path token in the string must be served.
- [x] **2026-08-04 — Watchlist is localStorage-only on the web** (owner decision, closing the
      auth-story P0). The store keeps one interface and switches backend at build time: Postgres
      on desktop, `localStorage` on the web. No sign-up, no shared-account hazard, and no
      database dependency — a visitor's lists live in their browser and never leave the device.
      Legacy-key import and starter seeding behave as before. 7 tests cover persistence across
      reloads, legacy import, corrupt-blob recovery, and that the free build never calls the API.
      Found and documented while verifying: an imported `PREMIUM_BUILD` is not minified away
      (it hides code, it does not remove it) — only page/component substitution and a direct
      inlined env read do that. None of the premium enforcement depended on the difference.
- [x] **2026-08-04 — Socials, Transfer Fees, Risk Scores, and source configuration cut from the
      web.** Both social pages/routes; the transfer-fee toolset including its three `/api/v1`
      endpoints and `/live-data/network-fees`; the risk-scores page/route with the Coins table
      and coin detail hiding their score surfaces via `PREMIUM_BUILD` guards; `/settings`,
      `/data-sources`, the TopBar TierSwitch, and the Assistant chat widget. Data sources are now
      hard-coded on the web. (`/live-data/config` GET deliberately stays — feed-status banner;
      POST is admin-guarded.)
- [x] **2026-08-04 — README rewritten around the free web edition; this checklist created.**
- [x] **2026-08-04 — Repo isolation verified.** Single remote (`Savoy11/Finance-Now-Free`), no
      submodules, no cross-repo scripts; News-Charts untouched; the desktop product's repo is
      unreferenced and unaffected.
- [x] **2026-08-03 — Backtesting cut from the web (both surfaces).** `/equities/backtests` page
      plus the crypto TA Backtest tab via the new `PREMIUM_COMPONENTS` module-substitution
      mechanism; engine strings verified absent from built chunks.
- [x] **2026-08-03 — Portfolio pillar (Portfolios + Portfolio Builder) and Staking Discovery cut;
      Coin Discovery kept free; Watchlist confirmed free.** Data Sources catalog page filtered to
      what the build serves.
- [x] **2026-08-03 — Distribution-split mechanism built and verified.** Build-time flag
      (fail-closed), premium manifest as single source of truth, page stubbing, middleware 404s,
      nav filtering, `/upgrade` page, 27-test suite; verified in both build directions.
