import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  PREMIUM_FEATURES,
  PREMIUM_COMPONENTS,
  PREMIUM_PAGE_ROUTES,
  PREMIUM_DATA_ROUTES,
  PREMIUM_NAV_HREFS,
  isPremiumPath,
} from '../premiumManifest.mjs'
import { MODULES, BUILD_MODULES } from '../registry'
import { BUILD_DATA_SOURCES, DATA_SOURCES } from '@/lib/data/dataSources'
import { DISTRIBUTION, PREMIUM_BUILD } from '@/lib/distribution'

// The free/premium split is a security boundary, not a preference: a mistake here
// publishes a paid feature to the open web, or 404s a free one. These tests cover
// the failure modes that are silent — a typo'd href that protects nothing, a
// feature with no routes at all, a prefix that swallows its neighbour.

describe('distribution flag', () => {
  it('fails closed — an unset env var yields the free web build', () => {
    // vitest runs with NEXT_PUBLIC_FN_DISTRIBUTION unset, which is exactly the
    // "someone forgot the variable on deploy" case. It must not grant premium.
    expect(DISTRIBUTION).toBe('web')
    expect(PREMIUM_BUILD).toBe(false)
  })
})

describe('isPremiumPath', () => {
  it('matches the route itself and everything beneath it', () => {
    expect(isPremiumPath('/budget', ['/budget'])).toBe(true)
    expect(isPremiumPath('/budget/transactions', ['/budget'])).toBe(true)
    expect(isPremiumPath('/api/agents/chat', ['/api/agents'])).toBe(true)
  })

  it('does not match a sibling that merely shares a prefix', () => {
    // The bug this guards: startsWith('/budget') alone would swallow '/budgets'
    // and any future '/budget-calculator', 404ing free pages in the web build.
    expect(isPremiumPath('/budgets', ['/budget'])).toBe(false)
    expect(isPremiumPath('/budget-calculator', ['/budget'])).toBe(false)
  })

  it('treats fund-holdings and fund-holdings-history as distinct routes', () => {
    // Both are premium and both are listed, but neither is a subtree of the
    // other — so listing only the shorter one would leave the history route open.
    expect(isPremiumPath('/live-data/fund-holdings-history', ['/live-data/fund-holdings'])).toBe(false)
    expect(PREMIUM_DATA_ROUTES).toContain('/live-data/fund-holdings')
    expect(PREMIUM_DATA_ROUTES).toContain('/live-data/fund-holdings-history')
  })

  it('does not match on a bare empty prefix', () => {
    expect(isPremiumPath('/anything', [])).toBe(false)
  })
})

describe('premium manifest integrity', () => {
  it('gives every feature a stable, unique id', () => {
    const ids = PREMIUM_FEATURES.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/)
  })

  it('gives every feature at least one route to actually withhold', () => {
    // A feature with neither pageRoutes nor dataRoutes reads as protected on the
    // roadmap and is fully available in the shipped build — the exact silent
    // failure this manifest exists to prevent.
    for (const f of PREMIUM_FEATURES) {
      expect(
        f.pageRoutes.length + f.dataRoutes.length,
        `premium feature "${f.id}" withholds nothing`
      ).toBeGreaterThan(0)
    }
  })

  it('points every navHref at a real sidebar entry', () => {
    // A typo'd href filters nothing, so the nav entry survives into the free
    // build and links to a route the redirect does cut — a dead link on a page
    // we told the owner was removed.
    const realHrefs = new Set(MODULES.flatMap((m) => m.navItems.map((i) => i.href)))
    for (const href of PREMIUM_NAV_HREFS) {
      expect(realHrefs.has(href), `navHref "${href}" matches no sidebar entry`).toBe(true)
    }
  })

  it('names a real module on every feature', () => {
    // Set<string>, not Set<ModuleId>: the manifest is plain ESM so its `module`
    // field arrives as a string — comparing it against the typed ids is exactly
    // what this test is for, and narrowing the Set would assume the answer.
    const realModules = new Set<string>(MODULES.map((m) => m.id))
    for (const f of PREMIUM_FEATURES) {
      expect(realModules.has(f.module), `feature "${f.id}" names unknown module "${f.module}"`).toBe(true)
    }
  })

  it('writes every route as an absolute path', () => {
    for (const r of [...PREMIUM_PAGE_ROUTES, ...PREMIUM_DATA_ROUTES]) {
      expect(r.startsWith('/'), `route "${r}" is not absolute`).toBe(true)
      expect(r.endsWith('/'), `route "${r}" has a trailing slash`).toBe(false)
    }
  })
})

describe('premium components inside free pages', () => {
  // Manifest paths are relative to src/; this file sits in src/lib/modules/__tests__.
  const SRC = path.resolve(__dirname, '../../..')
  const read = (rel: string) => readFileSync(path.join(SRC, `${rel}.tsx`), 'utf8')
  const exportedNames = (src: string) =>
    [...src.matchAll(/^export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z0-9_$]+)/gm)]
      .map((m) => m[1])

  it('points every entry at a real module and a real stub', () => {
    // A typo in either path makes NormalModuleReplacementPlugin match nothing and
    // fail silently — the build succeeds and ships the premium component. Checked
    // against the filesystem because that is the only thing that catches it.
    for (const c of PREMIUM_COMPONENTS) {
      for (const key of ['module', 'stub'] as const) {
        const file = path.join(SRC, `${c[key]}.tsx`)
        expect(existsSync(file), `${c.id}: ${key} "${c[key]}" does not exist`).toBe(true)
      }
    }
  })

  it('gives the stub every export the module it replaces has', () => {
    // The host page is compiled unchanged and destructures by name, so a stub
    // missing an export breaks the free distribution only — the one build nobody
    // runs locally.
    //
    // Compared as source text rather than by importing the modules: these are
    // .tsx client components, so importing them here would drag JSX and React
    // into a node test to answer a question that is really about the files.
    for (const c of PREMIUM_COMPONENTS) {
      const stubExports = exportedNames(read(c.stub))
      for (const name of exportedNames(read(c.module))) {
        expect(stubExports, `${c.id}: stub is missing export "${name}"`).toContain(name)
      }
    }
  })

  it('ties every component to a declared premium feature', () => {
    const ids = new Set(PREMIUM_FEATURES.map((f) => f.id))
    for (const c of PREMIUM_COMPONENTS) {
      expect(ids.has(c.id), `component "${c.module}" names unknown feature "${c.id}"`).toBe(true)
    }
  })

  it('swaps out the assistant chat and the tier switch on the web', () => {
    // Both live inside free chrome (the dashboard layout and the TopBar), so
    // like the backtest tab they can only be withheld by module replacement.
    const modules = PREMIUM_COMPONENTS.map((c) => c.module)
    expect(modules).toContain('components/agents/AssistantWidget')
    expect(modules).toContain('components/ui/TierSwitch')
  })

  it('withholds the crypto backtest tab as well as the equities page', () => {
    // Backtesting had two surfaces and only one was a route. Cutting the page
    // alone would have left the crypto simulation running on the web.
    const shipped = BUILD_MODULES.flatMap((m) => m.navItems.map((i) => i.href))
    expect(shipped).not.toContain('/equities/backtests')
    expect(PREMIUM_COMPONENTS.map((c) => c.module)).toContain('components/analytics/BacktestPanel')
    // Technical Analysis itself stays free — only the simulation is withheld.
    expect(shipped).toContain('/technical-analysis')
  })
})

describe('data-source catalogue in a free build', () => {
  it('does not advertise feeds behind withheld features', () => {
    // The Data Sources page is free and its whole job is an accurate account of
    // where numbers come from. Listing "Portfolio prices · Live" for a surface
    // this build cannot serve makes it a liar.
    const ids = BUILD_DATA_SOURCES.map((e) => e.id)
    for (const id of ['portfolio-history', 'wallet', 'risk-scores']) {
      expect(ids, `withheld surface "${id}" still listed`).not.toContain(id)
    }
  })

  it('parses composite route strings when deciding what to list', () => {
    // Several entries name two routes ("/a + /b") or annotate one
    // ("/a (drift monitoring)"). Matching the whole string against the manifest
    // matched nothing and quietly kept the row — the 'builder' surface names a
    // withheld route this way and must not survive.
    const ids = BUILD_DATA_SOURCES.map((e) => e.id)
    const composite = DATA_SOURCES.filter((e) => (e.route ?? '').includes(' + '))
    expect(composite.length, 'no composite-route entries left to guard').toBeGreaterThan(0)
    for (const e of composite) {
      const paths = (e.route ?? '').split(/\s+/).filter((t) => t.startsWith('/'))
      const allServed = paths.every((pth) => !isPremiumPath(pth, PREMIUM_DATA_ROUTES as string[]))
      expect(ids.includes(e.id), `"${e.id}" listed:${ids.includes(e.id)} but served:${allServed}`).toBe(allServed)
    }
  })

  it('still lists the free surfaces', () => {
    const ids = BUILD_DATA_SOURCES.map((e) => e.id)
    for (const id of ['news', 'markets', 'coin-discovery']) {
      expect(ids, `free surface "${id}" was dropped from the catalogue`).toContain(id)
    }
  })

  it('drops a surface whose folded-in sibling route is withheld', () => {
    // 'videos' covers video-search AND video-analyze; video-analyze is premium.
    // A surface that keeps claiming full coverage while one of its routes is gone
    // is the subtler version of the same dishonesty.
    expect(BUILD_DATA_SOURCES.map((e) => e.id)).not.toContain('videos')
  })
})

describe('registry filtering in a free build', () => {
  it('drops every premium nav entry from the build registry', () => {
    const shipped = BUILD_MODULES.flatMap((m) => m.navItems.map((i) => i.href))
    for (const href of PREMIUM_NAV_HREFS) {
      expect(shipped, `premium href "${href}" still in the sidebar`).not.toContain(href)
    }
  })

  it('keeps the free surfaces that carry the traffic and affiliate revenue', () => {
    // Named explicitly rather than counted. /transfer-fees used to be asserted
    // here as an affiliate surface; the owner cut it on 2026-08-04 and the
    // assertion was deleted deliberately, exactly as this comment used to demand.
    // /staking is now the free affiliate surface.
    const shipped = BUILD_MODULES.flatMap((m) => m.navItems.map((i) => i.href))
    for (const href of ['/headlines', '/assets', '/staking', '/watchlist', '/compare']) {
      expect(shipped, `free surface "${href}" was cut`).toContain(href)
    }
  })

  it('holds socials, transfer fees, and source configuration back from the web', () => {
    // Owner decisions 2026-08-04. Transfer fees goes as a toolset: cutting the
    // page while /api/v1 still answered route-finding would remove the UI, not
    // the feature.
    const shipped = BUILD_MODULES.flatMap((m) => m.navItems.map((i) => i.href))
    for (const href of ['/social', '/equities/social', '/transfer-fees', '/settings', '/data-sources']) {
      expect(shipped, `"${href}" still in the sidebar`).not.toContain(href)
    }
    for (const r of [
      '/live-data/social',
      '/live-data/stock-social',
      '/live-data/network-fees',
      '/api/v1/network-fees',
      '/api/v1/transfer',
      '/api/v1/exchanges',
      '/live-data/risk-scores',
    ]) {
      expect(PREMIUM_DATA_ROUTES, `${r} still served on the web`).toContain(r)
    }
    // The one exception, on purpose: /live-data/config GET powers the feed-status
    // banner on free pages, and its POST is admin-guarded. See the manifest.
    expect(PREMIUM_DATA_ROUTES).not.toContain('/live-data/config')
  })

  it('cuts risk scores without cutting the free pages that showed them', () => {
    // The Coins registry and coin detail stay free and hide their score surfaces
    // via PREMIUM_BUILD guards — the pages themselves must not be swept up.
    expect(isPremiumPath('/assets', PREMIUM_PAGE_ROUTES as string[])).toBe(false)
    expect(isPremiumPath('/assets/usdc', PREMIUM_PAGE_ROUTES as string[])).toBe(false)
    expect(isPremiumPath('/risk-scores', PREMIUM_PAGE_ROUTES as string[])).toBe(true)
    // /api/v1/staking stays free (staking is free) even though its rows carry
    // risk scores — cutting it would break the free staking surface.
    expect(isPremiumPath('/api/v1/staking/opportunities', PREMIUM_DATA_ROUTES as string[])).toBe(false)
  })

  it('keeps Coin Discovery free, with its data route', () => {
    // Owner decision 2026-08-03, reversing the first draft. Asserted because the
    // page is worthless without /live-data/coin-discovery: cutting the route
    // while leaving the page is the mistake this pins down.
    const shipped = BUILD_MODULES.flatMap((m) => m.navItems.map((i) => i.href))
    expect(shipped).toContain('/coin-discovery')
    expect(PREMIUM_DATA_ROUTES).not.toContain('/live-data/coin-discovery')
  })

  it('holds the whole portfolio pillar back from the web', () => {
    // Owner decision 2026-08-03: Portfolios and Portfolio Builder are both
    // desktop-only. Their user-data and pricing routes go with them — a saved
    // portfolio a web reader cannot have has nothing to price.
    const shipped = BUILD_MODULES.flatMap((m) => m.navItems.map((i) => i.href))
    expect(shipped).not.toContain('/portfolios')
    expect(shipped).not.toContain('/portfolio-builder')
    for (const r of ['/api/user/portfolios', '/api/user/builder-plans', '/live-data/portfolio-history']) {
      expect(PREMIUM_DATA_ROUTES, `${r} still served on the web`).toContain(r)
    }
    // ⚠ /live-data/portfolio-prices must stay FREE despite the name: it is the
    // generic CoinGecko spot-price endpoint behind the free Watchlist, the
    // market-overview popout, and the price-alert monitor. Withholding it broke
    // crypto pricing on the free Watchlist (caught 2026-08-04) while stocks kept
    // working, which is exactly the kind of half-broken surface that is hard to
    // spot. Judge a route by its callers, not its name.
    expect(PREMIUM_DATA_ROUTES).not.toContain('/live-data/portfolio-prices')
    expect(isPremiumPath('/live-data/portfolio-prices', PREMIUM_DATA_ROUTES as string[])).toBe(false)
  })

  it('holds Staking Discovery back while leaving Staking Opportunities free', () => {
    const shipped = BUILD_MODULES.flatMap((m) => m.navItems.map((i) => i.href))
    expect(shipped).not.toContain('/staking-discovery')
    expect(PREMIUM_DATA_ROUTES).toContain('/live-data/staking-discovery')
    // The affiliate surface. Distinct route, must survive the prefix above.
    expect(shipped).toContain('/staking')
    expect(isPremiumPath('/live-data/staking-rates', PREMIUM_DATA_ROUTES as string[])).toBe(false)
  })

  it('never leaves an empty module section in the sidebar', () => {
    for (const m of BUILD_MODULES) {
      if (m.optional) expect(m.navItems.length, `module "${m.id}" renders an empty header`).toBeGreaterThan(0)
    }
  })

  it('leaves core navigable', () => {
    const core = BUILD_MODULES.find((m) => m.id === 'core')
    expect(core).toBeDefined()
    expect(core!.navItems.length).toBeGreaterThan(0)
  })
})
