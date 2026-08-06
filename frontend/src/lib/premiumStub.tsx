import { redirect } from 'next/navigation'

// Replacement module for premium page entries in the free web build.
//
// next.config.mjs swaps every premium `page.tsx` for this file via webpack's
// NormalModuleReplacementPlugin (see `webpack()` there). The real page component
// is then referenced by nothing, so neither it nor the component tree it alone
// imports is reachable from any entry point — webpack drops the lot instead of
// emitting a chunk. That is the difference between a premium feature that is
// merely unreachable and one that genuinely is not in the deployment.
//
// In normal use nobody reaches this: the redirects in next.config.mjs answer
// premium URLs before routing gets here. It redirects anyway rather than
// rendering copy of its own, so the two paths cannot drift into telling the
// reader different stories, and any routing gap fails toward the upsell page.
export default function PremiumPlaceholder(): never {
  redirect('/upgrade')
}
