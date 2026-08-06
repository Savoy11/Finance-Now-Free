'use client'

import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'

// ─── Distribution-aware session hook ─────────────────────────────────────────
// The free web edition has no sign-in: no account, no user database, and the
// watchlist persists to localStorage. Auth.js was still mounted there anyway,
// which meant `SessionProvider` polled `/api/auth/session` on every page load
// and got a 500, because `AUTH_SECRET` is unset on a build with no auth. Nothing
// broke — `useSession()` reports unauthenticated and the app carries on — but it
// was a failing request per page load and a 500 in the logs for an endpoint the
// edition has no use for.
//
// Every consumer of the session goes through this hook so the provider can be
// left unmounted on the web. That indirection is load-bearing: next-auth's
// `useSession()` does not degrade outside a `<SessionProvider>`, it breaks, and
// it breaks differently per environment — in development it throws an explicit
// "`useSession` must be wrapped in a <SessionProvider />"; in a production build
// that check is compiled out (it is behind `NODE_ENV !== 'production'`) and the
// hook simply returns `undefined`, which then throws a TypeError at the call
// site the moment it is destructured. Dropping the provider without this wrapper
// would therefore crash the sidebar and the dashboard layout, and the
// production failure would be the more confusing of the two.
//
// ⚠ Read literally, not via lib/distribution's PREMIUM_BUILD. Next inlines
// NEXT_PUBLIC_* by textual substitution, so this folds to a constant when the
// variable is set at build time and the minifier can drop the unused branch —
// see the note on PREMIUM_BUILD in lib/distribution.ts. Behaviour is correct
// either way; only the dead-code elimination depends on it.
const AUTH_AVAILABLE = process.env.NEXT_PUBLIC_FN_DISTRIBUTION === 'desktop'

export interface AuthSession {
  data: Session | null
  status: 'authenticated' | 'unauthenticated' | 'loading'
}

/** Stand-in for a build with no auth. Never 'loading' — there is nothing to wait for. */
function useNoSession(): AuthSession {
  return { data: null, status: 'unauthenticated' }
}

/**
 * The session, or a permanently-unauthenticated stand-in on a build without auth.
 *
 * The implementation is chosen once at module load rather than per render, so
 * this is never a conditional hook call and React's hook order stays stable.
 */
export const useAuthSession = (AUTH_AVAILABLE ? useSession : useNoSession) as () => AuthSession

/** Whether this build mounts Auth.js at all. Used by <Providers>. */
export const AUTH_ENABLED = AUTH_AVAILABLE
