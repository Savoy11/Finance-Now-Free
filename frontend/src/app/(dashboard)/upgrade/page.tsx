import Link from 'next/link'
import { Lock, Sparkles, Wallet, BarChart3, SlidersHorizontal, Check, ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  PREMIUM_GROUP_LIST,
  premiumFeaturesInGroup,
  premiumFeatureForRoute,
} from '@/lib/modules/features'
import { BUILD_MODULES } from '@/lib/modules/registry'
import { PREMIUM_BUILD } from '@/lib/distribution'

// The free web edition's only conversion surface. next.config.mjs redirects every
// premium page route here, carrying `?from=<route>` so the page can lead with the
// feature the reader actually wanted instead of a generic list.
//
// Deliberately a server component with no data fetching and no premium imports:
// it exists in the build that does NOT have those features, so pulling in any of
// their code to describe them would put back exactly what the split removed. It
// renders labels and blurbs from the manifest — strings only, no feature logic.

export const metadata = {
  title: 'Finance Now Desktop',
  description: 'What the full Finance Now desktop edition adds to the free web version.',
}

// ─── OWNER: fill this in when the desktop edition has a price and a download ───
// Left unset on purpose. With no URL the page renders an honest "not yet
// available" line rather than a dead button or an invented price — a broken CTA
// costs more trust than a missing one. Setting `url` (and optionally
// `priceLabel`) turns the real call to action on; nothing else needs to change.
const DESKTOP_OFFER: { priceLabel: string | null; url: string | null } = {
  priceLabel: null,
  url: null,
}

const GROUP_ICONS: Record<string, LucideIcon> = {
  ai: Sparkles,
  money: Wallet,
  analysis: BarChart3,
  control: SlidersHorizontal,
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  // In a desktop build nothing redirects here, so this is only reachable by
  // typing the URL. Say so plainly rather than selling features it already has.
  if (PREMIUM_BUILD) {
    return (
      <div className="max-w-2xl mx-auto mt-20 rounded-card border border-border bg-bg-card p-8 text-center">
        <p className="text-sm text-text-primary">You&rsquo;re running the full desktop edition.</p>
        <p className="mt-1 text-xs text-text-muted">Every module is available in this build.</p>
      </div>
    )
  }

  const { from } = await searchParams
  const wanted = from ? premiumFeatureForRoute(from) : undefined

  // Derived from the registry rather than written out, so this list cannot drift
  // from what the build actually ships if the split changes again.
  const freeSections = BUILD_MODULES.flatMap((m) => m.navItems.map((i) => i.label))

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* ── Lead ── */}
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Lock size={18} className="text-amber-400" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {wanted ? `${wanted.label} is part of Finance Now Desktop` : 'Finance Now Desktop'}
          </h1>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            {wanted
              ? 'This site is the free web edition. It keeps the market data and research tools below — the desktop app adds this feature and the rest of the paid toolset.'
              : 'This site is the free web edition of Finance Now. The desktop app is the full product: everything here, plus AI research, personal-finance tracking, and the deeper analysis layers.'}
          </p>
        </div>
      </div>

      {/* ── What the desktop edition adds, by theme rather than as a feature dump ── */}
      <div className="mt-8 space-y-4">
        {PREMIUM_GROUP_LIST.map((group) => {
          const features = premiumFeaturesInGroup(group.id)
          if (features.length === 0) return null
          const Icon = GROUP_ICONS[group.id] ?? Sparkles
          return (
            <section key={group.id} className="rounded-card border border-border bg-bg-card p-5">
              <div className="flex items-center gap-2">
                <Icon size={15} className="text-accent-blue shrink-0" aria-hidden />
                <h2 className="text-sm font-semibold text-text-primary">{group.label}</h2>
              </div>
              <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">{group.blurb}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {features.map((f) => (
                  <li
                    key={f.id}
                    className={
                      'px-2 py-1 rounded text-[11px] border ' +
                      (f.id === wanted?.id
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-border bg-bg-elevated text-text-muted')
                    }
                  >
                    {f.label}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {/* ── Call to action ── */}
      <div className="mt-8 rounded-card border border-border bg-bg-elevated p-5 text-center">
        {DESKTOP_OFFER.url ? (
          <>
            <a
              href={DESKTOP_OFFER.url}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Get Finance Now Desktop
            </a>
            {DESKTOP_OFFER.priceLabel && (
              <p className="mt-2 text-xs text-text-muted">{DESKTOP_OFFER.priceLabel}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-text-secondary">
            The desktop edition isn&rsquo;t available to buy yet — pricing and downloads are coming.
          </p>
        )}
      </div>

      {/* ── Reassurance: name what they keep, so the page doesn't read as a wall ── */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-text-primary">Free on this site, and staying free</h2>
        <p className="mt-1 text-xs text-text-secondary leading-relaxed">
          No account, no API keys, no trial clock. Live market data across crypto, equities, macro
          and funds, with every number attributed to its source.
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {freeSections.map((label) => (
            <li
              key={label}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-border bg-bg-card text-text-muted"
            >
              <Check size={11} className="text-emerald-400 shrink-0" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-5">
        <Link
          href="/headlines"
          className="inline-flex items-center gap-1.5 text-xs text-accent-blue hover:underline"
        >
          <ArrowLeft size={13} aria-hidden /> Back to the free edition
        </Link>
        <p className="text-[11px] text-text-muted text-right">
          Finance Now is educational tooling, not investment advice.
        </p>
      </div>
    </div>
  )
}
