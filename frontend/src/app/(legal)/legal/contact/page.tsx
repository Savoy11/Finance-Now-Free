import { DraftNotice, ConfigValue } from '@/components/ui/LegalNotices'
import { legalPage } from '@/lib/legal'

export const metadata = {
  title: 'Contact & Complaints — Finance Now',
  description: 'How to reach us, including for privacy requests and data corrections.',
}

const H = 'text-base font-semibold text-text-primary mt-8'
const P = 'mt-2 text-sm text-text-secondary leading-relaxed'

export default function ContactPage() {
  const page = legalPage('contact')!
  return (
    <>
      <h1 className="text-2xl font-semibold text-text-primary">Contact &amp; complaints</h1>
      <p className="mt-2 text-sm text-text-muted">
        A route to a person, for anything this site gets wrong.
      </p>

      <div className="mt-5">{!page.reviewed && <DraftNotice title="contact page" />}</div>

      <h2 className={H}>Get in touch</h2>
      <p className={P}>
        <ConfigValue field="contactEmail" /> reaches us for all of the below. We read it; we cannot
        promise a response time yet.
      </p>

      <h2 className={H}>Reporting a data error</h2>
      <p className={P}>
        If a number on this site looks wrong, tell us which page and which figure. Much of the data
        comes from third parties, so the fix is sometimes to correct how we display or label it and
        sometimes to report it upstream — but either way we would rather know. Errors in figures
        this site computes itself are ours to fix outright.
      </p>

      <h2 className={H}>Privacy requests</h2>
      <p className={P}>
        The free web edition holds no personal data about visitors — no account, no analytics, and
        watchlists stored only in your own browser (see the{' '}
        <a href="/legal/privacy" className="text-accent-blue hover:underline">privacy policy</a>).
        There is normally nothing for us to retrieve or delete, but privacy requests still come to
        the same address.
      </p>

      <h2 className={H}>Complaints</h2>
      <p className={P}>
        Complaints go to the same address. <span className="text-amber-300">⚠ Owner: if this site
        is offered in a jurisdiction that requires a formal complaints procedure, an escalation
        route, or an ombudsman referral, that process belongs here.</span>
      </p>

      <h2 className={H}>Who we are</h2>
      <p className={P}>
        This site is operated by <ConfigValue field="entityName" />, in{' '}
        <ConfigValue field="jurisdiction" />.
      </p>
    </>
  )
}
