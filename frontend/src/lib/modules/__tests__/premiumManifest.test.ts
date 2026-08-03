import { describe, it, expect } from 'vitest'
import {
  PREMIUM_FEATURES,
  PREMIUM_PAGE_ROUTES,
  PREMIUM_DATA_ROUTES,
  PREMIUM_NAV_HREFS,
  isPremiumPath,
} from '../premiumManifest.mjs'
import { MODULES, BUILD_MODULES } from '../registry'
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

describe('registry filtering in a free build', () => {
  it('drops every premium nav entry from the build registry', () => {
    const shipped = BUILD_MODULES.flatMap((m) => m.navItems.map((i) => i.href))
    for (const href of PREMIUM_NAV_HREFS) {
      expect(shipped, `premium href "${href}" still in the sidebar`).not.toContain(href)
    }
  })

  it('keeps the free surfaces that carry the traffic and affiliate revenue', () => {
    // Named explicitly rather than counted: /staking and /transfer-fees are the
    // affiliate surfaces in docs/ROADMAP.md, and that revenue only exists if the
    // free web edition can reach them. A future split that sells them should have
    // to delete this assertion deliberately.
    const shipped = BUILD_MODULES.flatMap((m) => m.navItems.map((i) => i.href))
    for (const href of ['/headlines', '/assets', '/staking', '/transfer-fees', '/watchlist', '/compare']) {
      expect(shipped, `free surface "${href}" was cut`).toContain(href)
    }
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
