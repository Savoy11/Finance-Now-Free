import Link from 'next/link'
import { LEGAL_PAGES, legalConfigComplete } from '@/lib/legal'

export const metadata = {
  title: 'Legal & Disclosures — Finance Now',
  description: 'Terms, privacy, disclaimers, and data-source attribution for Finance Now.',
}

export default function LegalIndexPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-text-primary">Legal &amp; disclosures</h1>
      <p className="mt-2 text-sm text-text-secondary leading-relaxed">
        The public documents for the free Finance Now web edition.
      </p>

      {!legalConfigComplete() && (
        <div className="mt-5 rounded-card border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-text-secondary">
          These documents are <span className="text-amber-300 font-medium">unfinished drafts</span>.
          The business identity and contact details they depend on have not been filled in yet, and
          nothing here has been reviewed by a lawyer.
        </div>
      )}

      <ul className="mt-6 space-y-2">
        {LEGAL_PAGES.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/legal/${p.slug}`}
              className="block rounded-card border border-border bg-bg-card px-4 py-3 hover:border-border-hover transition-colors"
            >
              <span className="text-sm font-medium text-text-primary">{p.title}</span>
              {!p.reviewed && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/30 bg-amber-500/10 text-amber-300">
                  draft
                </span>
              )}
              <span className="block mt-0.5 text-xs text-text-muted">{p.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
