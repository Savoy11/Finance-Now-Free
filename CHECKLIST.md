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
      premium route. (The known link-shaped leftovers are listed as P1 polish below.)
- [ ] **Deployment target + pipeline.** Where the free site actually runs (Vercel / VPS / other),
      with `NEXT_PUBLIC_FN_DISTRIBUTION` deliberately unset so the fail-closed default does its
      job, and `FN_ADMIN_TOKEN` set so the admin-guarded routes stay locked on a public host.
- [ ] **Legal floor for a public site.** Terms of Service, Privacy Policy, "not investment
      advice" page, and data-source attribution page, linked from the footer. The requirements
      list already exists in `docs/BUSINESS-CHECKLIST.md` §3 — this item is rendering them on the
      site.
- [ ] **Decide the auth story for user data on the web.** Watchlists persist through
      `/api/user/watchlists` with the auth wall off — on a public deployment with
      `FN_ALLOW_LOCAL_USER` unset those routes 503, so the Watchlist (the free edition's only
      tracking feature) would not persist. Either enable sign-up, or make the watchlist
      localStorage-only on the web, or accept it as session-only. This is a product decision, not
      just configuration.

## P1 — before/shortly after launch

- [ ] **`/upgrade` positioning copy.** The page currently lists premium feature names. It needs
      real copy about Finance Now Desktop, pricing (when it exists), and a download/purchase
      link. It is the only conversion surface the free edition has.
- [ ] **Sweep copy that points at removed surfaces.** Known instances: the crypto News page's
      empty-state says "Add a news source in Integrations" (Integrations is premium now);
      ModuleGate's lock notice links to `/settings`; the popout "Avg Safety Score" stat renders
      N/A on the web. None break anything — they just reference doors that no longer exist.
- [ ] **Videos decision.** Currently only the AI-analysis step is premium; search and the feed
      stay free. Confirm that line or cut the whole surface.
- [ ] **Trim `/api/v1` discovery + OpenAPI spec to free-edition truth.** The discovery route and
      `openapi.json` still advertise `transfer/routes`, `exchanges`, and `network-fees`, which now
      404 on the web. The docs should describe the API a caller actually gets.
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
