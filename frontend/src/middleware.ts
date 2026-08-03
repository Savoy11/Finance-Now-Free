import { NextResponse, type NextRequest } from 'next/server'
import { PREMIUM_BUILD } from '@/lib/distribution'
import { PREMIUM_DATA_ROUTES, isPremiumPath } from '@/lib/modules/premiumManifest.mjs'

/**
 * Two jobs, in order: enforce the distribution split, then log the public v1 API.
 *
 * ── 1. Distribution enforcement (docs/DISTRIBUTION-SPLIT.md) ──
 * In the free web build, every server handler belonging to a premium feature is
 * answered with 404 here, before it runs. This is the half of the mechanism that
 * actually holds a determined visitor: removing a page or a nav entry only shapes
 * the UI, but a deployed /live-data or /api handler can be called directly with
 * curl. PREMIUM_BUILD is a build-time constant, so no request, header, or cookie
 * can turn this off.
 *
 * Enforced centrally rather than by editing each of the ~34 premium route files,
 * because prefix ownership is the thing being enforced: /api/user/budget is
 * premium as a subtree, so a handler added under it next month is covered on the
 * day it lands instead of the day someone remembers to add a guard line. For a
 * one-off premium handler that sits inside an otherwise-free subtree, add
 * premiumOnly() from lib/server/premiumGuard.ts at the call site instead — that
 * case can't be expressed as a prefix.
 *
 * 404, not 403: a 403 confirms the endpoint exists and is merely withheld. In the
 * web distribution the honest answer is that this deployment has no such endpoint.
 *
 * ── 2. Request logging for the public `/api/v1/*` contract (R2 §5.3, decision E2) ──
 * Finance Now has no consumer telemetry on `/api/v1/`, so "no one is using it" is an
 * assumption, not a fact — and the staking endpoint's legacy `riskScore` /
 * `max_risk` fields cannot be safely removed until traffic data exists. This
 * emits one structured line per v1 request (method, path, query, a coarse client
 * fingerprint) so a future deprecation decision is grounded in evidence. It is
 * deliberately read-only: it never blocks, rewrites, or mutates the response.
 *
 * The line is JSON on a single line for easy ingestion. It intentionally does
 * NOT log request bodies, cookies, or full headers (no auth/PII leakage).
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // ── 1. Distribution gate ──
  // Runs before logging so a blocked premium call never reaches the v1 logger and
  // can't pad the traffic evidence with requests the build refuses to serve.
  if (!PREMIUM_BUILD && isPremiumPath(pathname, PREMIUM_DATA_ROUTES as string[])) {
    return new NextResponse(null, { status: 404 })
  }

  // ── 2. v1 logging ──
  // The matcher below is deliberately broader than /api/v1 so the gate above can
  // see /live-data and /api/user traffic, so re-narrow here: logging stays scoped
  // to the public contract it was built to measure.
  if (!pathname.startsWith('/api/v1')) return NextResponse.next()

  // Flag legacy-scale usage on the staking endpoint so the deprecation decision
  // can see whether anyone still relies on max_risk (the inverted-filter footgun).
  const usesLegacyRiskFilter =
    pathname.endsWith('/staking/opportunities') && req.nextUrl.searchParams.has('max_risk')

  try {
    console.log(
      JSON.stringify({
        tag: 'api-v1-request',
        method: req.method,
        path: pathname,
        query: search || undefined,
        ua: req.headers.get('user-agent') || undefined,
        referer: req.headers.get('referer') || undefined,
        legacyRiskFilter: usesLegacyRiskFilter || undefined,
      })
    )
  } catch {
    // Logging must never break a request.
  }

  return NextResponse.next()
}

export const config = {
  // Next requires statically-analyzable matcher literals, so these are spelled out
  // rather than derived from the premium manifest. They are intentionally coarse —
  // every server tree that can contain a premium handler — with the precise
  // prefix check done in code above against the manifest. Widening a matcher is
  // safe; the gate is what decides. Excludes Auth.js (/api/auth) so sign-in is
  // never intercepted.
  matcher: ['/api/v1/:path*', '/api/user/:path*', '/api/agents/:path*', '/live-data/:path*'],
}
