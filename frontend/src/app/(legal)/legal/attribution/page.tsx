import { BUILD_DATA_SOURCES } from '@/lib/data/dataSources'
import { DraftNotice } from '@/components/ui/LegalNotices'
import { legalPage } from '@/lib/legal'

export const metadata = {
  title: 'Data Sources & Attribution — Finance Now',
  description: 'Every third-party source behind the numbers on this site.',
}

const H = 'text-base font-semibold text-text-primary mt-8'
const P = 'mt-2 text-sm text-text-secondary leading-relaxed'

const MODULE_LABEL: Record<string, string> = {
  shared: 'Cross-market',
  crypto: 'Crypto',
  equities: 'Equities',
  funds: 'ETFs & Funds',
  macro: 'Macro markets',
}

const AUTH_LABEL: Record<string, string> = {
  none: 'no key required',
  key: 'API key',
  paid: 'paid plan',
}

export default function AttributionPage() {
  const page = legalPage('attribution')!

  // Generated from the same registry the app itself renders provenance from, and
  // filtered to what THIS build serves — so the public attribution list cannot
  // drift from reality, and cannot credit a source behind a feature the free
  // edition does not ship.
  const byModule = new Map<string, typeof BUILD_DATA_SOURCES>()
  for (const entry of BUILD_DATA_SOURCES) {
    const list = byModule.get(entry.module) ?? []
    list.push(entry)
    byModule.set(entry.module, list)
  }

  // Distinct provider names, for the "who we rely on" summary.
  const providers = new Map<string, { name: string; url?: string }>()
  for (const e of BUILD_DATA_SOURCES) {
    for (const pr of e.providers) if (!providers.has(pr.name)) providers.set(pr.name, pr)
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-text-primary">Data sources &amp; attribution</h1>
      <p className="mt-2 text-sm text-text-muted">
        Every third-party source behind the numbers on this site.
      </p>

      <div className="mt-5">{!page.reviewed && <DraftNotice title="attribution page" />}</div>

      <p className={P}>
        This list is generated from the application&rsquo;s own source registry and filtered to the
        features this edition actually serves, so it describes what this deployment really calls
        rather than a list maintained by hand alongside it. {providers.size} distinct providers back{' '}
        {BUILD_DATA_SOURCES.length} data surfaces.
      </p>
      <p className={P}>
        Data is retrieved through this site&rsquo;s own server, not from your browser, except where
        noted in the <a href="/legal/privacy" className="text-accent-blue hover:underline">Privacy
        Policy</a>. Each provider&rsquo;s data remains subject to that provider&rsquo;s own terms.
        Figures this application computes itself are marked as derived where they appear and are not
        attributed to any provider — see the{' '}
        <a href="/legal/disclaimer" className="text-accent-blue hover:underline">disclaimer</a>.
      </p>

      <h2 className={H}>Providers</h2>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {[...providers.values()].map((pr) => (
          <li key={pr.name} className="px-2 py-1 rounded text-[11px] border border-border bg-bg-card text-text-secondary">
            {pr.url ? (
              <a href={pr.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent-blue">
                {pr.name}
              </a>
            ) : (
              pr.name
            )}
          </li>
        ))}
      </ul>

      <h2 className={H}>By surface</h2>
      {[...byModule.entries()].map(([moduleId, entries]) => (
        <section key={moduleId} className="mt-5">
          <h3 className="text-sm font-medium text-text-primary">
            {MODULE_LABEL[moduleId] ?? moduleId}
          </h3>
          <ul className="mt-2 space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="rounded-card border border-border bg-bg-card px-4 py-3">
                <p className="text-xs font-medium text-text-primary">{e.surface}</p>
                <p className="mt-1 text-[11px] text-text-muted leading-relaxed">
                  {e.providers.map((pr, i) => (
                    <span key={pr.name}>
                      {i > 0 && ' · '}
                      {pr.url ? (
                        <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-accent-blue/80 hover:text-accent-blue">
                          {pr.name}
                        </a>
                      ) : (
                        pr.name
                      )}
                      <span className="text-text-muted/70"> ({AUTH_LABEL[pr.auth] ?? pr.auth})</span>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h2 className={H}>Licence-specific attribution</h2>
      <p className={P}>
        Some sources carry licence terms that require attribution in a particular form. Where this
        site uses such a source, the required notice belongs here.
      </p>
      <ul className="mt-2 text-sm text-text-secondary leading-relaxed list-disc pl-5 space-y-1">
        <li>
          <span className="text-text-primary">US SEC EDGAR</span> — public-domain US government
          filings data, accessed through the SEC&rsquo;s published interfaces.
        </li>
        <li>
          <span className="text-text-primary">US Treasury (treasury.gov)</span> — public-domain US
          government data.
        </li>
        <li>
          <span className="text-text-primary">European Central Bank reference rates</span> —
          published by the ECB and retrieved via frankfurter.dev.
        </li>
        <li>
          <span className="text-text-primary">Wikipedia</span> — text summaries are available under
          CC BY-SA; where a summary is shown, the source article is linked.
        </li>
      </ul>
      <p className="mt-3 text-xs text-text-muted leading-relaxed">
        ⚠ Owner: this list is written by hand and must be checked against each provider&rsquo;s
        current terms before publication — attribution wording, redistribution limits, and whether
        a given plan permits public display all differ per provider and are the part of this page a
        generator cannot verify.
      </p>
    </>
  )
}
