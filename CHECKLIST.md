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
- [ ] **Finish the legal documents.** The scaffolding is built and linked (see done log); what
      remains is the part software cannot do:
      1. Fill in `LEGAL_CONFIG` in `frontend/src/lib/legal.ts` — entity name, contact email,
         jurisdiction, effective date. Until then the pages render visible "not set" gaps.
      2. Have a lawyer review all six, then flip `reviewed: true` per document in `LEGAL_PAGES`
         to remove its draft banner. A test currently asserts every document is unreviewed —
         delete that assertion as you go, deliberately.
      3. Sections explicitly marked ⚠ need counsel: warranty, liability, IP, governing law and
         eligibility (terms); statutory rights and change-notification (privacy); complaints
         escalation (contact); per-provider licence wording (attribution).
      4. Name the host and its log-retention period in the privacy policy once the deployment
         target is decided — that paragraph is incomplete without it.

## P1 — before/shortly after launch

- [ ] **Fill in the desktop offer on `/upgrade`.** The page is written and shipped; it just has
      no product to point at yet. Set `DESKTOP_OFFER` at the top of
      `frontend/src/app/(dashboard)/upgrade/page.tsx` — a `url` turns the real call-to-action
      button on, and an optional `priceLabel` renders under it. Until then the page says the
      desktop edition isn't buyable yet, which is true. Nothing else needs changing.
- [ ] **`/api/auth/session` returns 500 on the web build.** Found while auditing data flows for
      the privacy policy. `SessionProvider` is mounted in `providers.tsx` and the dashboard layout
      calls `useSession()`, so every page load fires a request to an endpoint that 500s because
      `AUTH_SECRET` is unset. Nothing breaks — `useSession()` just reports unauthenticated and the
      free edition has no login — but it is a failing request per page load and 500s in the logs.
      Either set `AUTH_SECRET` on the deploy or drop `SessionProvider` from the web build.
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

- [x] **2026-08-05 — Legal/disclosure scaffolding built and linked.** All six documents
      BUSINESS-CHECKLIST §3 requires now exist at `/legal/*` with their own layout, an index, and
      a `SiteFooter` linking them from every page (plus the one-line "not investment advice"
      stated inline, since that is the version most readers ever see).
      Written in two deliberately separate registers: **sections describing how the software
      behaves are fact**, verified against the code — no analytics package of any kind, no cookies
      set on a normal page load, watchlists in `localStorage` only, all market data fetched
      server-side, `/api/v1` request logging (method/path/query/UA/referer), and the one
      third-party call the browser *does* make (CoinGecko's image CDN for coin logos on Coin
      Discovery, which sees visitor IPs). **Sections stating legal positions are marked ⚠ DRAFT**
      for counsel.
      The attribution page is generated from `BUILD_DATA_SOURCES`, so it lists exactly the sources
      this build serves and cannot drift — or credit a provider behind a withheld feature.
      Nothing can pass for finished by accident: every document renders a "not yet reviewed by a
      lawyer" banner until its `reviewed` flag is flipped, and unset `LEGAL_CONFIG` fields render
      a visible "not set" chip rather than an empty string. 11 tests cover the document set, the
      footer mount, the draft banners, and — most importantly — that no `/legal` route can ever be
      swept into the premium manifest and withheld from the public site that needs it.
- [x] **2026-08-05 — Videos decision: the whole surface is desktop-only.** Owner call, revising
      the earlier "only AI analysis is premium" line. Investigation found that line was not
      viable regardless: `/live-data/video-search` needs a YouTube Data API key *and* caps itself
      at **80 searches per day globally**, a one-desktop-user budget (YouTube's free tier is
      ~100 searches/day at 100 quota units each), so on a public site the 81st visitor onward
      gets a 429 — "free" would have meant "broken for most". The feed grid alone is genuinely
      keyless and does scale; it goes because a grid of third-party YouTube links was judged not
      to earn its place beside the existing news surfaces, not because it couldn't be served.
      `/videos` plus all three `/live-data/video*` routes are now withheld; the manifest entry
      widened from `video-analysis` to `videos`. Verified: all three routes 404, `/videos` 307s
      to `/upgrade?from=/videos` where the upsell names it, no nav entry, and the desktop build
      restores the page at full size (8.8 kB vs a 394 B stub).
- [x] **2026-08-05 — `/upgrade` rewritten as real positioning.** Was a flat list of 16 feature
      names under a lock icon — a feature dump, not a pitch. Now: a personalised headline (the
      redirect carries `?from=<route>`, so a reader sent from `/budget` is told *Budget &
      Transactions is part of Finance Now Desktop* and that feature is highlighted in its group),
      the paid set grouped into four value themes rather than sixteen bullets, a "free on this
      site, and staying free" section derived from `BUILD_MODULES` so it cannot drift, and a
      disclaimer. Groups live in the manifest (`PREMIUM_GROUPS`), so a newly withheld feature
      cannot silently miss the upsell — 6 tests pin grouping, exhaustiveness, and `?from=`
      resolution including nested paths and unknown values. Fixed a stale claim while here: the
      old copy told readers the transfer-fee calculator was free, which stopped being true on
      2026-08-04. Verified the user-controllable `?from=` value is never reflected into the page.
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
