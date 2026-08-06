import { DraftNotice, ConfigValue } from '@/components/ui/LegalNotices'
import { legalPage } from '@/lib/legal'

export const metadata = {
  title: 'Terms of Service — Finance Now',
  description: 'The terms you accept by using the Finance Now free web edition.',
}

const H = 'text-base font-semibold text-text-primary mt-8'
const P = 'mt-2 text-sm text-text-secondary leading-relaxed'
const DRAFT = <span className="text-amber-300">⚠ Draft — needs legal review.</span>

export default function TermsPage() {
  const page = legalPage('terms')!
  return (
    <>
      <h1 className="text-2xl font-semibold text-text-primary">Terms of service</h1>
      <p className="mt-2 text-sm text-text-muted">The terms you accept by using this site.</p>

      <div className="mt-5">{!page.reviewed && <DraftNotice title="terms of service" />}</div>

      {/* Factual — describes how the service actually works. */}
      <h2 className={H}>What the service is</h2>
      <p className={P}>
        Finance Now&rsquo;s free web edition is a market-research tool that displays third-party
        financial data and figures computed from it. It is provided free of charge, without an
        account, and with no guarantee of availability. A paid desktop edition with additional
        features exists separately; these terms cover this website only.
      </p>

      <h2 className={H}>Not advice</h2>
      <p className={P}>
        Nothing on this site is financial, investment, tax, or legal advice, and using it creates no
        advisory or fiduciary relationship. The{' '}
        <a href="/legal/disclaimer" className="text-accent-blue hover:underline">disclaimer</a> forms
        part of these terms and you should read it in full.
      </p>

      <h2 className={H}>Acceptable use</h2>
      <p className={P}>
        Use the site for your own research. Do not attempt to disrupt it, circumvent its rate limits
        or access controls, scrape it at a volume that degrades it for others, or redistribute
        third-party data obtained through it in breach of the originating provider&rsquo;s terms
        (see <a href="/legal/attribution" className="text-accent-blue hover:underline">attribution</a>).
      </p>

      {/* Draft — legal positions for counsel. */}
      <h2 className={H}>No warranty</h2>
      <p className={P}>
        {DRAFT} The service is provided &ldquo;as is&rdquo;, without warranties of any kind, and we
        do not warrant that data is accurate, complete, timely, or continuously available. Counsel
        to supply the operative wording and confirm which disclaimers are enforceable in each
        jurisdiction the site is offered in.
      </p>

      <h2 className={H}>Limitation of liability</h2>
      <p className={P}>
        {DRAFT} Intended position: no liability for trading or investment losses, or for indirect or
        consequential loss, arising from use of or reliance on the site. Scope, carve-outs, and any
        cap need counsel — consumer-protection law in several jurisdictions limits how far this can
        go.
      </p>

      <h2 className={H}>Intellectual property</h2>
      <p className={P}>
        {DRAFT} The site&rsquo;s software, design, and derived figures are ours; third-party data
        remains its owner&rsquo;s. Counsel to set out the licence granted to visitors and the
        restrictions on reuse.
      </p>

      <h2 className={H}>Availability and changes</h2>
      <p className={P}>
        {DRAFT} We may change, suspend, or discontinue any part of the free edition at any time
        without notice. Counsel to confirm notice obligations, if any.
      </p>

      <h2 className={H}>Eligibility and jurisdiction</h2>
      <p className={P}>
        {DRAFT} Governing law: <ConfigValue field="jurisdiction" />. Counsel to advise on which
        jurisdictions the site should be offered in at all — crypto promotion rules differ sharply,
        and geo-blocking may be cheaper than compliance (see the business checklist). Also to
        confirm any minimum-age term.
      </p>

      <h2 className={H}>Changes to these terms</h2>
      <p className={P}>
        {DRAFT} How changes are notified and when they take effect.
      </p>

      <h2 className={H}>Contact</h2>
      <p className={P}>
        These terms are offered by <ConfigValue field="entityName" />. Questions:{' '}
        <ConfigValue field="contactEmail" />.
      </p>
    </>
  )
}
