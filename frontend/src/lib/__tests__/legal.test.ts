import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { LEGAL_PAGES, LEGAL_CONFIG, legalPage, legalConfigComplete } from '@/lib/legal'
import { PREMIUM_PAGE_ROUTES, PREMIUM_DATA_ROUTES, isPremiumPath } from '@/lib/modules/premiumManifest.mjs'

const SRC = path.resolve(__dirname, '../..')

// The disclosure documents are a compliance requirement, not a feature
// (docs/BUSINESS-CHECKLIST.md §3). The failure modes worth catching are all
// silent: a listed document with no page behind it, a footer link that 404s, or
// — worst — a legal page swept up by the premium split and withheld from the
// public site that legally needs it.

describe('legal document set', () => {
  it('has a real page file for every listed document', () => {
    // The footer and index render from LEGAL_PAGES, so an entry without a page
    // is a 404 linked from every page on the site.
    for (const p of LEGAL_PAGES) {
      const file = path.join(SRC, 'app/(legal)/legal', p.slug, 'page.tsx')
      expect(existsSync(file), `no page for legal document "${p.slug}"`).toBe(true)
    }
  })

  it('covers every document BUSINESS-CHECKLIST §3 requires', () => {
    // Named explicitly: the checklist lists these six, and dropping one should
    // be a deliberate act with a failing test in the way.
    const slugs = LEGAL_PAGES.map((p) => p.slug)
    for (const required of ['terms', 'privacy', 'disclaimer', 'how-we-make-money', 'attribution', 'contact']) {
      expect(slugs, `missing required document "${required}"`).toContain(required)
    }
  })

  it('gives every document a unique slug, title and summary', () => {
    const slugs = LEGAL_PAGES.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const p of LEGAL_PAGES) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/)
      expect(p.title.length, `"${p.slug}" has no title`).toBeGreaterThan(0)
      expect(p.summary.length, `"${p.slug}" has no summary`).toBeGreaterThan(0)
    }
  })

  it('resolves a known slug and rejects an unknown one', () => {
    expect(legalPage('privacy')?.title).toBe('Privacy Policy')
    expect(legalPage('nope')).toBeUndefined()
  })
})

describe('legal pages are never withheld from the web', () => {
  it('keeps every /legal route out of the premium manifest', () => {
    // A jurisdiction requires these documents to be reachable on the public
    // site. Withholding one would be a compliance failure that looks exactly
    // like a working build, so it is asserted rather than assumed.
    expect(isPremiumPath('/legal', PREMIUM_PAGE_ROUTES as string[])).toBe(false)
    for (const p of LEGAL_PAGES) {
      expect(
        isPremiumPath(`/legal/${p.slug}`, PREMIUM_PAGE_ROUTES as string[]),
        `/legal/${p.slug} is withheld from the free web edition`
      ).toBe(false)
    }
  })

  it('does not withhold the data behind the attribution page', () => {
    // The attribution page is generated from the source registry; it renders
    // from BUILD_DATA_SOURCES and needs no data route of its own, but the
    // registry module must not be behind a premium path either.
    expect(isPremiumPath('/legal/attribution', PREMIUM_DATA_ROUTES as string[])).toBe(false)
  })
})

describe('draft safety', () => {
  it('starts every document unreviewed', () => {
    // `reviewed` is what removes the "not yet reviewed by a lawyer" banner.
    // It must be flipped deliberately, per document, by someone who has had it
    // reviewed — never as a side effect of editing the file.
    for (const p of LEGAL_PAGES) {
      expect(p.reviewed, `"${p.slug}" claims review; was it actually reviewed?`).toBe(false)
    }
  })

  it('leaves the owner-supplied identity fields unset until filled in', () => {
    // legalConfigComplete() gates the index's "unfinished drafts" warning. If
    // this ever fails, the fields were filled in — delete this test then, and
    // make sure the documents were reviewed too.
    expect(legalConfigComplete()).toBe(false)
    expect(LEGAL_CONFIG.entityName).toBeNull()
    expect(LEGAL_CONFIG.contactEmail).toBeNull()
  })

  it('renders a draft banner on every unreviewed document', () => {
    // Source-text check: a document that forgets the banner reads as final.
    for (const p of LEGAL_PAGES) {
      const src = readFileSync(path.join(SRC, 'app/(legal)/legal', p.slug, 'page.tsx'), 'utf8')
      expect(src, `"${p.slug}" does not render a DraftNotice`).toContain('DraftNotice')
    }
  })
})

describe('footer placement', () => {
  it('renders the disclosure links from LEGAL_PAGES', () => {
    const src = readFileSync(path.join(SRC, 'components/layout/SiteFooter.tsx'), 'utf8')
    expect(src).toContain('LEGAL_PAGES')
    // The one-line disclaimer is stated inline, not merely linked — it is the
    // only version most readers will ever see.
    expect(src).toContain('financial, investment, or legal advice')
  })

  it('mounts the footer in the dashboard shell', () => {
    const src = readFileSync(path.join(SRC, 'app/(dashboard)/layout.tsx'), 'utf8')
    expect(src).toContain('<SiteFooter />')
  })
})
