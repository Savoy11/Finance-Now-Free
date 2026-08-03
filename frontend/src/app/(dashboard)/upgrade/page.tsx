import { Lock, Monitor } from 'lucide-react'
import { PREMIUM_CATALOG } from '@/lib/modules/features'
import { PREMIUM_BUILD } from '@/lib/distribution'

// Landing page for premium routes in the free web edition. next.config.mjs
// redirects every premium page route here (see `premiumRedirects` there).
//
// Deliberately a server component with no data fetching and no premium imports:
// it exists in the build that does NOT have those features, so pulling in any of
// their code to describe them would put back exactly what the split removed. It
// renders labels from the manifest — strings only, no feature logic.

export const metadata = {
  title: 'Finance Now Desktop',
  description: 'Features available in the full Finance Now desktop edition.',
}

export default function UpgradePage() {
  // In a desktop build nothing redirects here, so this is only reachable by
  // typing the URL. Say so plainly rather than advertising features it already has.
  if (PREMIUM_BUILD) {
    return (
      <div className="max-w-2xl mx-auto mt-20 rounded-card border border-border bg-bg-card p-8 text-center">
        <p className="text-sm text-text-primary">You&rsquo;re running the full desktop edition.</p>
        <p className="mt-1 text-xs text-text-muted">Every module is available in this build.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Lock size={18} className="text-amber-400" aria-hidden />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Available in Finance Now Desktop</h1>
          <p className="text-xs text-text-muted mt-0.5">
            This page is part of the desktop edition and isn&rsquo;t included in the free web version.
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm text-text-secondary leading-relaxed">
        Everything else on this site is free and stays free — market data, news, registries for
        coins, stocks, funds and macro instruments, charting, comparison tools, watchlists and the
        transfer-fee and staking calculators. The desktop edition adds the AI and personal-finance
        tooling below.
      </p>

      <ul className="mt-6 space-y-2">
        {PREMIUM_CATALOG.map((feature) => (
          <li
            key={feature.id}
            className="flex items-center gap-3 rounded-card border border-border bg-bg-card px-4 py-3"
          >
            <Monitor size={15} className="text-text-muted shrink-0" aria-hidden />
            <span className="text-sm text-text-primary">{feature.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-text-muted leading-relaxed">
        Finance Now is educational tooling, not investment advice.
      </p>
    </div>
  )
}
