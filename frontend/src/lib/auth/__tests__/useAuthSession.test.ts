import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { useAuthSession, AUTH_ENABLED } from '../useAuthSession'

const SRC = path.resolve(__dirname, '../../..')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8')

// The free web edition has no sign-in, so Auth.js is not mounted there. The
// failure mode this guards is a crash, not a degradation: outside a
// <SessionProvider>, next-auth's useSession() throws in development and returns
// `undefined` in production (the guard is behind NODE_ENV), which throws a
// TypeError as soon as the caller destructures it. Either way a component that
// imports it directly breaks the web build — the one build nobody runs locally
// — while working fine on desktop.

describe('useAuthSession', () => {
  it('reports unauthenticated on a build without auth', () => {
    // vitest runs with NEXT_PUBLIC_FN_DISTRIBUTION unset, i.e. the web edition.
    // The bound implementation is then a plain function with no hooks, so it is
    // callable directly here.
    expect(AUTH_ENABLED).toBe(false)
    expect(useAuthSession()).toEqual({ data: null, status: 'unauthenticated' })
  })

  it('never reports loading when auth is absent', () => {
    // 'loading' means "a session may yet arrive". Nothing is being fetched on a
    // build with no auth, so anything waiting on it would wait forever.
    expect(useAuthSession().status).not.toBe('loading')
  })
})

describe('no component reaches past the wrapper', () => {
  it('routes every session read through useAuthSession', () => {
    // A direct `useSession` import is the regression that reintroduces the
    // crash. signIn/signOut are fine — they need no provider — and
    // providers.tsx legitimately imports SessionProvider to mount it.
    const offenders: string[] = []
    for (const rel of [
      'components/layout/Sidebar.tsx',
      'app/(dashboard)/layout.tsx',
    ]) {
      if (read(rel).includes('useSession')) offenders.push(rel)
    }
    expect(offenders, `these import useSession directly: ${offenders.join(', ')}`).toEqual([])
  })

  it('mounts SessionProvider only when auth is enabled', () => {
    const src = read('app/providers.tsx')
    expect(src).toContain('AUTH_ENABLED')
    expect(src).toContain('AUTH_ENABLED ? <SessionProvider>')
  })
})
