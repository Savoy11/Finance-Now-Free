import 'server-only'
import { NextResponse } from 'next/server'
import { PREMIUM_BUILD } from '@/lib/distribution'

// ─── Premium route guard ──────────────────────────────────────────────────────
// One line at the top of any handler that must not answer in the free web build:
//
//   export async function GET(req: NextRequest) {
//     const blocked = premiumOnly()
//     if (blocked) return blocked
//     …
//   }
//
// This is the half of the mechanism that actually holds. The build-time exclusion
// in next.config.mjs keeps premium *client* code out of the browser bundle, but a
// server handler is only safe if the server itself refuses — a visitor can call
// /live-data/… with curl no matter what the UI was compiled to show. PREMIUM_BUILD
// is a build-time constant on the server too, so there is no request, header, or
// cookie that can turn this off.
//
// Registration of which routes need it lives in lib/modules/premiumManifest.mjs;
// this function deliberately does not consult the manifest by path. Route handlers
// do not reliably know their own pathname, and a guard that silently no-ops when a
// lookup misses is worse than no guard — so the call site is explicit and a route
// is protected because someone wrote the line, not because a string matched.

/**
 * Returns a 404 response in the free web build, or `null` when the caller may
 * proceed. Callers must return the response when it is non-null.
 *
 * 404 rather than 403: a 403 confirms the endpoint exists and is merely withheld,
 * which is both an information leak and an invitation. In the web distribution the
 * honest answer is that this application has no such endpoint.
 */
export function premiumOnly(): NextResponse | null {
  if (PREMIUM_BUILD) return null
  return new NextResponse(null, { status: 404 })
}
