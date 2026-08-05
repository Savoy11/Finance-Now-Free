// ─── Legal / disclosure documents ─────────────────────────────────────────────
// Scaffolding for the public documents required before the free site goes live
// (docs/BUSINESS-CHECKLIST.md §3). The pages live under /legal/* and are linked
// from the footer of every page.
//
// ⚠ NOTHING HERE IS LEGAL ADVICE, and the drafts are not a substitute for a
// lawyer. What is written is split deliberately:
//
//   - Sections describing how THIS SOFTWARE behaves (what it stores, what it
//     sends, what it does not collect) are written as fact, because they were
//     verified against the code — see the audit notes in the privacy page.
//   - Sections that state legal positions (warranty, liability, governing law,
//     statutory rights) are DRAFT placeholders for counsel to replace.
//
// A page renders a visible "draft — not yet reviewed" banner until its entry
// here is marked reviewed, so an unfinished document cannot quietly look final.

/**
 * OWNER: fill this in. Every field is rendered on the public pages, so leaving
 * a value null makes the gap visible rather than letting a placeholder ship
 * looking like a real answer.
 */
export const LEGAL_CONFIG: {
  /** Registered business name, once the entity exists (BUSINESS-CHECKLIST §1). */
  entityName: string | null
  /** Contact address for support, complaints, and privacy requests. */
  contactEmail: string | null
  /** Governing-law jurisdiction, e.g. "the State of X, USA". */
  jurisdiction: string | null
  /** ISO date these documents last took effect. Null until first published. */
  effectiveDate: string | null
  /** Public site origin, for canonical links. */
  siteUrl: string | null
} = {
  entityName: null,
  contactEmail: null,
  jurisdiction: null,
  effectiveDate: null,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
}

export interface LegalPage {
  slug: string
  title: string
  /** One line for the index and the footer's title attribute. */
  summary: string
  /**
   * False until a lawyer has read it. Drives the draft banner — flipping this
   * is the deliberate act of saying "this document is now the real one".
   */
  reviewed: boolean
}

/**
 * The document set from BUSINESS-CHECKLIST §3, in the order the index lists them.
 * The footer renders from this, so adding a document here puts it everywhere.
 */
export const LEGAL_PAGES: LegalPage[] = [
  {
    slug: 'disclaimer',
    title: 'Not Investment Advice',
    summary: 'What Finance Now is and is not, and the limits of everything it shows you.',
    reviewed: false,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary: 'What this site stores, what it sends, and what it does not collect.',
    reviewed: false,
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    summary: 'The terms you accept by using this site.',
    reviewed: false,
  },
  {
    slug: 'how-we-make-money',
    title: 'How We Make Money',
    summary: 'Our revenue model, and any paid placement or affiliate arrangement.',
    reviewed: false,
  },
  {
    slug: 'attribution',
    title: 'Data Sources & Attribution',
    summary: 'Every third-party source behind the numbers on this site.',
    reviewed: false,
  },
  {
    slug: 'contact',
    title: 'Contact & Complaints',
    summary: 'How to reach us, including for privacy requests and corrections.',
    reviewed: false,
  },
]

export function legalPage(slug: string): LegalPage | undefined {
  return LEGAL_PAGES.find((p) => p.slug === slug)
}

/** True once the owner has filled in the identity fields the documents depend on. */
export function legalConfigComplete(): boolean {
  return Boolean(LEGAL_CONFIG.entityName && LEGAL_CONFIG.contactEmail && LEGAL_CONFIG.jurisdiction)
}
