import { DraftNotice } from '@/components/ui/LegalNotices'
import { legalPage } from '@/lib/legal'

export const metadata = {
  title: 'How We Make Money — Finance Now',
  description: 'Our revenue model, and any paid placement or affiliate arrangement.',
}

const H = 'text-base font-semibold text-text-primary mt-8'
const P = 'mt-2 text-sm text-text-secondary leading-relaxed'

export default function HowWeMakeMoneyPage() {
  const page = legalPage('how-we-make-money')!
  return (
    <>
      <h1 className="text-2xl font-semibold text-text-primary">How we make money</h1>
      <p className="mt-2 text-sm text-text-muted">
        Because you should know what, if anything, this site earns from what it shows you.
      </p>

      <div className="mt-5">{!page.reviewed && <DraftNotice title="disclosure" />}</div>

      <h2 className={H}>Today: nothing on this site</h2>
      <p className={P}>
        As of now the free web edition carries <span className="text-text-primary">no advertising,
        no sponsored placements, and no affiliate links</span>. Nothing you see here is ranked,
        ordered, filtered, or included because someone paid for it. We earn nothing from your use of
        this site.
      </p>

      <h2 className={H}>The intended model</h2>
      <p className={P}>
        This site is the free edition of a product whose paid version — Finance Now Desktop — is
        where revenue is meant to come from. The free edition exists to be useful in its own right
        and to show what the paid one does.
      </p>

      <h2 className={H}>If that changes: the rules we hold ourselves to</h2>
      <p className={P}>
        Affiliate links are planned for surfaces where we already send readers to a provider — the
        staking page most obviously. Before any such link appears, these rules apply, and they are
        published here so they can be held against us:
      </p>
      <ul className="mt-2 space-y-1.5 list-disc pl-5">
        <li className="text-sm text-text-secondary leading-relaxed">
          <span className="text-text-primary">Payment never affects ranking.</span> Scores, sorting,
          and filtering are computed without any knowledge of whether a provider pays us. The
          risk-scoring code cannot read the affiliate field — that is enforced in the software, not
          just promised here.
        </li>
        <li className="text-sm text-text-secondary leading-relaxed">
          <span className="text-text-primary">Warnings are never softened.</span> A provider that
          scores badly keeps its bad score and its warnings whether or not it pays us. A failed
          provider stays listed as a cautionary example.
        </li>
        <li className="text-sm text-text-secondary leading-relaxed">
          <span className="text-text-primary">Every paid link is marked where it appears</span> —
          visibly, next to the link, not only on this page.
        </li>
        <li className="text-sm text-text-secondary leading-relaxed">
          <span className="text-text-primary">Coverage bias is disclosed.</span> Referral programmes
          are common among exchanges and rare among decentralised protocols, so paid links would
          cluster in one category. Default ordering stays risk-based, never
          &ldquo;monetisable first&rdquo;.
        </li>
        <li className="text-sm text-text-secondary leading-relaxed">
          <span className="text-text-primary">A non-affiliate link always exists.</span> We keep the
          plain URL alongside any referral URL so the honest path is always available and auditable.
        </li>
      </ul>
      <p className="mt-3 text-xs text-text-muted leading-relaxed">
        ⚠ Owner: this page must be updated in the same change that introduces the first affiliate
        link — not after. Disclosure that lags the placement is the violation.
      </p>

      <h2 className={H}>What we never do</h2>
      <p className={P}>
        We do not sell or share your data, because we do not collect it — see the{' '}
        <a href="/legal/privacy" className="text-accent-blue hover:underline">privacy policy</a>. We
        do not accept payment to include, exclude, or favour an asset, fund, or provider in any
        ranking.
      </p>
    </>
  )
}
