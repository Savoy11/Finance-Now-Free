// ─── Build-time distribution flag ─────────────────────────────────────────────
// Finance Now ships as two distributions from one codebase (docs/DISTRIBUTION-SPLIT.md):
//
//   'web'      — the free edition, exclusive to the website. Premium features are
//                removed from the build entirely: no page route, no server handler,
//                no client module in the bundle.
//   'desktop'  — the full paid product.
//
// This is a BUILD-time flag, not a runtime permission. Nothing a visitor can do
// in the browser changes it, because in a web build the premium code was never
// compiled in — there is nothing to unlock.
//
// ⚠ Written as a direct, literal reference to process.env.NEXT_PUBLIC_FN_DISTRIBUTION.
// Next.js inlines NEXT_PUBLIC_* variables by exact textual substitution at build
// time, so this collapses to a string literal in the client bundle and the
// minifier can then dead-code-eliminate every `PREMIUM_BUILD` branch. Reading it
// through a destructured `process.env`, a computed key, or a helper that takes the
// name as an argument all defeat that substitution — the branch would survive and
// premium code would ship to the browser. Keep the reference literal.
export type Distribution = 'web' | 'desktop'

const RAW = process.env.NEXT_PUBLIC_FN_DISTRIBUTION

// Fails CLOSED. Anything that is not exactly 'desktop' — unset, misspelled, empty
// — yields the free web build. A forgotten env var on a deploy then ships the free
// edition, which is a missing feature; the opposite default would silently publish
// the paid product to the open web, which is unrecoverable.
export const DISTRIBUTION: Distribution = RAW === 'desktop' ? 'desktop' : 'web'

/** True only in the full desktop build. Guard every premium surface on this. */
export const PREMIUM_BUILD = DISTRIBUTION === 'desktop'

/**
 * One flag serves both server and client on purpose.
 *
 * A separate server-only variable (FN_DISTRIBUTION) would allow the two halves to
 * disagree — a server that believes it is 'desktop' happily serving data to a web
 * client whose UI was compiled out. That mismatch is precisely the hole this
 * mechanism exists to close, so there is deliberately only one input.
 */
