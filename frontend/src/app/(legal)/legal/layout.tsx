import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LEGAL_PAGES, LEGAL_CONFIG } from '@/lib/legal'

// Public-document shell. Deliberately outside the (dashboard) group: these pages
// are linked from the footer of every page and from outside the app, so they
// need to read as standalone documents rather than as another dashboard screen.

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/headlines" className="inline-flex items-center gap-1.5 text-xs text-accent-blue hover:underline">
            <ArrowLeft size={13} aria-hidden /> Finance Now
          </Link>
          <nav className="flex flex-wrap gap-x-3 gap-y-1 justify-end">
            {LEGAL_PAGES.map((p) => (
              <Link
                key={p.slug}
                href={`/legal/${p.slug}`}
                title={p.summary}
                className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
              >
                {p.title}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>

      <footer className="border-t border-border mt-10">
        <div className="max-w-3xl mx-auto px-4 py-6 text-[11px] text-text-muted">
          {LEGAL_CONFIG.effectiveDate
            ? `These documents took effect on ${LEGAL_CONFIG.effectiveDate}.`
            : 'These documents have no effective date yet — they are drafts.'}
        </div>
      </footer>
    </div>
  )
}
