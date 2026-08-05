import { DraftNotice, ConfigValue } from '@/components/ui/LegalNotices'
import { legalPage } from '@/lib/legal'

export const metadata = {
  title: 'Privacy Policy — Finance Now',
  description: 'What this site stores, what it sends, and what it does not collect.',
}

const H = 'text-base font-semibold text-text-primary mt-8'
const P = 'mt-2 text-sm text-text-secondary leading-relaxed'
const LI = 'text-sm text-text-secondary leading-relaxed'

export default function PrivacyPage() {
  const page = legalPage('privacy')!
  return (
    <>
      <h1 className="text-2xl font-semibold text-text-primary">Privacy policy</h1>
      <p className="mt-2 text-sm text-text-muted">
        What this site stores, what it sends, and what it does not collect.
      </p>

      <div className="mt-5">{!page.reviewed && <DraftNotice title="privacy policy" />}</div>

      {/* ── Factual sections: verified against the code on 2026-08-05. If any of
          this changes, this page is wrong until it is updated — treat it as part
          of the feature, not as documentation that can lag. ── */}

      <h2 className={H}>There is no account</h2>
      <p className={P}>
        The free web edition has no sign-up, no login, and no user database. We do not ask for your
        name, email address, or any other identifying detail, and there is nothing for you to log
        into.
      </p>

      <h2 className={H}>What is stored, and where</h2>
      <p className={P}>
        Your watchlists and interface preferences are saved in your own browser&rsquo;s{' '}
        <span className="text-text-primary">local storage</span>. They stay on your device, are
        never transmitted to us, and are not readable by us. Clearing your browser storage deletes
        them permanently — we hold no copy and cannot restore them.
      </p>
      <p className={P}>Specifically, this site writes keys such as:</p>
      <ul className="mt-2 space-y-1 list-disc pl-5">
        <li className={LI}><code className="text-text-primary">fn:watchlists:local</code> — your saved watchlists</li>
        <li className={LI}><code className="text-text-primary">fn:nav-order</code>, <code className="text-text-primary">fn:nav-collapsed</code> — sidebar layout</li>
        <li className={LI}><code className="text-text-primary">fn:entitlements</code>, <code className="text-text-primary">fn:refresh</code>, <code className="text-text-primary">fn:tier</code> — display preferences</li>
      </ul>

      <h2 className={H}>Cookies</h2>
      <p className={P}>
        This site sets <span className="text-text-primary">no cookies</span> of its own on a normal
        page load — no analytics cookies, no advertising cookies, and no tracking pixels. Local
        storage, described above, is not a cookie and is not sent with requests.
      </p>

      <h2 className={H}>No analytics or advertising</h2>
      <p className={P}>
        There is no analytics package on this site. No Google Analytics, no tag manager, no
        product-analytics or session-recording tool, and no advertising network. We do not build a
        profile of you, and we have nothing to sell or share, because we do not collect it.
      </p>

      <h2 className={H}>Server logs</h2>
      <p className={P}>
        Requests to this site&rsquo;s public API (<code>/api/v1/*</code>) are logged with the
        request method and path, the query string, and the user-agent and referer headers your
        browser sends. These logs exist to understand which parts of the API are actually used
        before anything is changed or removed. Request bodies, cookies, and full headers are not
        logged.
      </p>
      <p className={P}>
        Beyond that, the hosting provider that serves this site will keep its own access logs,
        typically including IP addresses, as any web host does.{' '}
        <span className="text-amber-300">
          ⚠ Owner: name the host and its retention period here once the deployment target is
          decided — this paragraph is incomplete until then.
        </span>
      </p>

      <h2 className={H}>Third parties your browser contacts</h2>
      <p className={P}>
        Market data is fetched by <span className="text-text-primary">our server</span>, not by your
        browser, so data providers do not see your IP address or your activity. There is one
        exception we know of:
      </p>
      <ul className="mt-2 space-y-1 list-disc pl-5">
        <li className={LI}>
          <span className="text-text-primary">Coin logo images</span> on the Coin Discovery page are
          loaded directly from CoinGecko&rsquo;s image CDN by your browser. CoinGecko will therefore
          see your IP address, user-agent, and the referring page for those image requests. Their
          handling of that is governed by their own privacy policy.
        </li>
      </ul>

      <h2 className={H}>Children</h2>
      <p className={P}>
        This site is not directed at children, and we do not knowingly collect information from
        them. Since we collect no personal information from anyone, there is nothing to delete —
        but if you believe a child has provided information to us, contact us.
      </p>

      {/* ── Draft sections: legal positions, for counsel to replace. ── */}

      <h2 className={H}>Your rights</h2>
      <p className={P}>
        <span className="text-amber-300">⚠ Draft — needs legal review.</span> Depending on where you
        live, you may have rights to access, correct, delete, or port personal data held about you,
        and to object to certain processing. Because this site holds no personal data about
        visitors, most such requests have nothing to act on — but the applicable regimes (UK/EU
        GDPR, CCPA/CPRA, and others), the precise rights they grant, the response deadlines, and
        whether a data-protection representative or registration is required all need to be
        determined by a lawyer for the jurisdictions this site is actually offered in.
      </p>

      <h2 className={H}>Changes to this policy</h2>
      <p className={P}>
        <span className="text-amber-300">⚠ Draft — needs legal review.</span> How changes are
        notified and from when they take effect.
      </p>

      <h2 className={H}>Contact</h2>
      <p className={P}>
        Privacy questions and requests: <ConfigValue field="contactEmail" />. The data controller is{' '}
        <ConfigValue field="entityName" />.
      </p>
    </>
  )
}
