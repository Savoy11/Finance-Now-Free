import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ─── Free web build: localStorage-only watchlists ────────────────────────────
// vitest runs with NEXT_PUBLIC_FN_DISTRIBUTION unset, so PREMIUM_BUILD is false
// and the store takes its LOCAL_ONLY paths — this file exercises exactly the
// backend the website ships.
//
// The thing worth guarding is that the free edition NEVER calls the API: with no
// auth wall those routes either 503 or (worse, if FN_ALLOW_LOCAL_USER were set)
// hand every anonymous visitor the same shared account. So fetch is stubbed to
// throw rather than mocked to succeed — any call fails the test loudly instead
// of quietly passing on a fake response.

// Stubbing `window` (below) makes react-hot-toast's CSS-in-JS layer initialise
// and reach for `document`, which this node-environment suite has no reason to
// provide — the store's persistence is the subject, not its toasts. Mocked
// rather than pulling in jsdom for one import.
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const KEY_LOCAL = 'fn:watchlists:local'
const KEY_ACTIVE = 'fn:watchlist-active'
const LEGACY_V2_KEY = 'caep:watchlists:v2'

function memoryStorage(): Storage {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length },
  } as Storage
}

/** Fresh module registry per test — the store holds state at module scope. */
async function loadStore() {
  vi.resetModules()
  return import('../useWatchlistStore')
}

beforeEach(() => {
  const storage = memoryStorage()
  vi.stubGlobal('localStorage', storage)
  // The store's storage helpers bail on `typeof window === 'undefined'` so they
  // no-op during SSR. These tests run in vitest's node environment, where that
  // guard would silently skip every write — so give them a window to see.
  vi.stubGlobal('window', { localStorage: storage })
  let n = 0
  vi.stubGlobal('crypto', { randomUUID: () => `id-${++n}` } as Crypto)
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('the free web build must not call the watchlist API') }))
})

afterEach(() => { vi.unstubAllGlobals() })

describe('watchlist store — free web build', () => {
  it('seeds the starter list on a first visit and persists it', async () => {
    const { hydrateWatchlists, useWatchlistStore } = await loadStore()
    await hydrateWatchlists()

    const { lists, hydrated, syncError } = useWatchlistStore.getState()
    expect(hydrated).toBe(true)
    // No server means no failure to report — the page must not show its
    // "could not be loaded" banner on a perfectly healthy free build.
    expect(syncError).toBeNull()
    expect(lists).toHaveLength(1)
    expect(lists[0].keys).toContain('bitcoin')

    expect(JSON.parse(localStorage.getItem(KEY_LOCAL)!)).toHaveLength(1)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('restores what the browser saved instead of reseeding', async () => {
    localStorage.setItem(KEY_LOCAL, JSON.stringify([{ id: 'a', name: 'Mine', keys: ['ethereum'] }]))
    const { hydrateWatchlists, useWatchlistStore } = await loadStore()
    await hydrateWatchlists()

    const { lists } = useWatchlistStore.getState()
    expect(lists).toEqual([{ id: 'a', name: 'Mine', keys: ['ethereum'] }])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('imports legacy browser lists once, then retires the key', async () => {
    localStorage.setItem(LEGACY_V2_KEY, JSON.stringify({ lists: [{ name: 'Old', keys: ['bitcoin'] }] }))
    const { hydrateWatchlists, useWatchlistStore } = await loadStore()
    await hydrateWatchlists()

    expect(useWatchlistStore.getState().lists[0].name).toBe('Old')
    // Renamed rather than deleted, and gone from its original key, so a second
    // hydration can't re-import it.
    expect(localStorage.getItem(LEGACY_V2_KEY)).toBeNull()
    expect(localStorage.getItem(`${LEGACY_V2_KEY}:imported`)).not.toBeNull()
  })

  it('persists creates, key edits, and deletes across a reload', async () => {
    const first = await loadStore()
    await first.hydrateWatchlists()
    const id = first.useWatchlistStore.getState().createList('Tech')
    first.useWatchlistStore.getState().addKey(id, 'sec:MSFT')
    first.useWatchlistStore.getState().addKey(id, 'sec:NVDA')
    first.useWatchlistStore.getState().removeKey(id, 'sec:MSFT')

    // Re-import: a fresh module registry reading the same storage is what a
    // page reload actually does.
    const second = await loadStore()
    await second.hydrateWatchlists()
    const reloaded = second.useWatchlistStore.getState().lists.find((l) => l.name === 'Tech')
    expect(reloaded?.keys).toEqual(['sec:NVDA'])

    second.useWatchlistStore.getState().deleteList(reloaded!.id)
    const third = await loadStore()
    await third.hydrateWatchlists()
    expect(third.useWatchlistStore.getState().lists.some((l) => l.name === 'Tech')).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps the active list id across a reload', async () => {
    const first = await loadStore()
    await first.hydrateWatchlists()
    const id = first.useWatchlistStore.getState().createList('Watching')
    expect(JSON.parse(localStorage.getItem(KEY_ACTIVE)!)).toBe(id)

    const second = await loadStore()
    await second.hydrateWatchlists()
    expect(second.useWatchlistStore.getState().activeId).toBe(id)
  })

  it('recovers from a corrupted blob rather than throwing', async () => {
    // User-editable storage: a malformed value must not take the page down.
    localStorage.setItem(KEY_LOCAL, '{ not json')
    const { hydrateWatchlists, useWatchlistStore } = await loadStore()
    await hydrateWatchlists()
    expect(useWatchlistStore.getState().lists.length).toBeGreaterThan(0)
    expect(useWatchlistStore.getState().syncError).toBeNull()
  })

  it('drops malformed entries but keeps the valid ones', async () => {
    localStorage.setItem(KEY_LOCAL, JSON.stringify([
      { id: 'ok', name: 'Good', keys: ['bitcoin', 42] },
      { id: 5, name: 'bad id' },
      null,
    ]))
    const { hydrateWatchlists, useWatchlistStore } = await loadStore()
    await hydrateWatchlists()
    const { lists } = useWatchlistStore.getState()
    expect(lists).toEqual([{ id: 'ok', name: 'Good', keys: ['bitcoin'] }])
  })
})
