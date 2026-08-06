'use client'

import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { INSTRUMENT_BY_KEY } from '@/lib/data/instruments'
import { COINGECKO_IDS } from '@/lib/api/live/coingeckoIds'
import type { WatchlistsResponse } from '@/app/api/user/watchlists/route'
import { migrateStorageKey } from '@/lib/utils/storageMigration'

// One-time key migration for the Finance Now rename — runs before any read below.
migrateStorageKey('caep:watchlist-active', 'fn:watchlist-active')


// ─── Watchlist store — two persistence backends ──────────────────────────────
//
// ⚠ WHICH BACKEND RUNS IS A BUILD-TIME DECISION (docs/DISTRIBUTION-SPLIT.md):
//
//   desktop build  → Postgres via /api/user/watchlists (everything below)
//   free web build → localStorage only (LOCAL_ONLY paths)
//
// The free web edition has no auth wall and no sign-up, so /api/user/* has no
// user to own a row: with FN_ALLOW_LOCAL_USER unset in production those routes
// 503, and setting it true would hand every anonymous visitor ONE SHARED
// account — every reader editing the same watchlist. Owner decision (2026-08-04)
// is therefore local-only on the web: a visitor's list lives in their browser,
// survives reloads, and never leaves the device.
//
// LOCAL_ONLY is decided at build time (see its definition for why it reads the
// env var directly instead of importing PREMIUM_BUILD): on a build with the
// variable set, the server branches are eliminated and the bundle carries no
// /api/user/watchlists call at all, so the web build cannot even accidentally
// depend on a database.
//
// The store's INTERFACE is identical either way (same actions, same `hydrated`
// and `syncError` fields), so every consumer — the page, useWatchlistBias, the
// Daily Brief, useAssets — is untouched by the choice.
//
// Original DB-backed notes follow. Same optimistic pattern as
// usePortfolioStore: mutations update local state at once and sync in the
// background; a failed sync toasts and re-hydrates so the UI converges back
// to the server's truth.
//
// Ids are client-generated UUIDs, accepted by the API on create — the row
// inserted optimistically IS the row the server creates.
//
// localStorage remains in two roles only:
//  - 'caep:watchlists:v2' (and the older v1 single-list key) are LEGACY,
//    imported once then renamed.
//  - the active-list id stays local — it's a UI preference, not data.

export interface WatchList {
  id: string
  name: string
  keys: string[] // instrument keys (cgId or sec:SYMBOL)
}

interface WatchlistStore {
  lists:      WatchList[]
  activeId:   string | null
  /** True once the first server answer (or failure) has arrived. */
  hydrated:   boolean
  /** Set when the server can't be reached — page shows an honest banner. */
  syncError:  string | null
  createList: (name: string) => string
  deleteList: (id: string) => void
  addKey:     (listId: string, key: string) => void
  removeKey:  (listId: string, key: string) => void
  setActive:  (id: string | null) => void
}

const LEGACY_V2_KEY = 'caep:watchlists:v2'
const LEGACY_V1_KEY = 'caep:watchlist:v1'
const KEY_ACTIVE = 'fn:watchlist-active'

/** Free web build persists here instead of Postgres. */
const KEY_LOCAL = 'fn:watchlists:local'

/**
 * True in the free web build.
 *
 * ⚠ Reads process.env.NEXT_PUBLIC_FN_DISTRIBUTION *directly* rather than
 * importing PREMIUM_BUILD, and that is deliberate — but read the caveat, the
 * two forms differ only in what SHIPS, never in what RUNS.
 *
 * Next inlines a NEXT_PUBLIC_* var by textual substitution into each module that
 * names it, so when the variable is SET this collapses to `'web' !== 'desktop'`
 * and the minifier drops the whole server branch. Measured on a
 * `NEXT_PUBLIC_FN_DISTRIBUTION=web` build: the /api/user/watchlists call strings
 * disappear from the client bundle entirely.
 *
 * Two things defeat that elimination, and neither is a correctness problem:
 *  - **The variable being unset.** Next only inlines vars actually present at
 *    build time, so unset leaves a runtime property access with nothing to fold.
 *    The value is still falsy → still local-only. (This is why the deploy should
 *    set it to 'web' explicitly even though unset already fails closed.)
 *  - **Importing PREMIUM_BUILD instead.** It does not fold across the module
 *    boundary; it survives as a runtime conditional.
 *
 * So: prefer this form wherever the dead code must physically not ship; either
 * form is fine where behaviour is all that matters. Same fail-closed rule as
 * lib/distribution.ts — anything but exactly 'desktop' means the free build.
 */
const LOCAL_ONLY = process.env.NEXT_PUBLIC_FN_DISTRIBUTION !== 'desktop'

function loadLocal(): WatchList[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY_LOCAL)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    // Shape-checked on read: this is user-editable storage, and a malformed
    // blob must not take the page down. Anything unrecognisable is dropped.
    return parsed.flatMap((l: unknown) => {
      if (!l || typeof l !== 'object') return []
      const { id, name, keys } = l as Partial<WatchList>
      if (typeof id !== 'string' || typeof name !== 'string') return []
      return [{ id, name, keys: Array.isArray(keys) ? keys.filter((k): k is string => typeof k === 'string') : [] }]
    })
  } catch { return null }
}

function saveLocal(lists: WatchList[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY_LOCAL, JSON.stringify(lists)) }
  catch { toast.error('Watchlist not saved — browser storage is full') }
}

function loadActive(): string | null {
  if (typeof window === 'undefined') return null
  try { const r = localStorage.getItem(KEY_ACTIVE); return r ? JSON.parse(r) : null } catch { return null }
}
function saveActive(v: string | null) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY_ACTIVE, JSON.stringify(v)) } catch { /* quota */ }
}

async function api(path: string, init?: RequestInit): Promise<WatchlistsResponse> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
  return json
}

function putList(list: WatchList) {
  api(`/api/user/watchlists/${list.id}`, { method: 'PUT', body: JSON.stringify(list) })
    .catch((e: Error) => {
      toast.error(`Watchlist not saved: ${e.message}`)
      void hydrateWatchlists(true)
    })
}

/**
 * Write the change through to whichever backend this build uses.
 * `all` is the full post-mutation list set (localStorage stores the whole blob);
 * `changed` is the single list the server needs (undefined for deletes).
 */
function persist(all: WatchList[], changed: WatchList | undefined) {
  if (LOCAL_ONLY) { saveLocal(all); return }
  if (changed) putList(changed)
}

export const useWatchlistStore = create<WatchlistStore>((set, get) => ({
  lists:     [],
  activeId:  loadActive(),
  hydrated:  false,
  syncError: null,

  createList: (name) => {
    const id = crypto.randomUUID()
    const list: WatchList = { id, name, keys: [] }
    const lists = [...get().lists, list]
    set({ lists, activeId: id })
    saveActive(id)
    if (LOCAL_ONLY) {
      saveLocal(lists)
      return id
    }
    api('/api/user/watchlists', { method: 'POST', body: JSON.stringify(list) })
      .catch((e: Error) => {
        toast.error(`Watchlist not saved: ${e.message}`)
        set({ lists: get().lists.filter((l) => l.id !== id) })
      })
    return id
  },

  deleteList: (id) => {
    const next = get().lists.filter((l) => l.id !== id)
    const activeId = get().activeId === id ? (next[0]?.id ?? null) : get().activeId
    set({ lists: next, activeId })
    saveActive(activeId)
    if (LOCAL_ONLY) {
      saveLocal(next)
      return
    }
    api(`/api/user/watchlists/${id}`, { method: 'DELETE' })
      .catch((e: Error) => {
        toast.error(`Delete not saved: ${e.message}`)
        void hydrateWatchlists(true)
      })
  },

  addKey: (listId, key) => {
    const lists = get().lists.map((l) =>
      l.id === listId && !l.keys.includes(key) ? { ...l, keys: [...l.keys, key] } : l)
    set({ lists })
    persist(lists, lists.find((l) => l.id === listId))
  },

  removeKey: (listId, key) => {
    const lists = get().lists.map((l) =>
      l.id === listId ? { ...l, keys: l.keys.filter((k) => k !== key) } : l)
    set({ lists })
    persist(lists, lists.find((l) => l.id === listId))
  },

  setActive: (id) => {
    saveActive(id)
    set({ activeId: id })
  },
}))

// ─── Hydration + one-time legacy import ──────────────────────────────────────

let hydrating: Promise<void> | null = null

/**
 * Read whatever this browser saved before persistence landed: the v2
 * multi-list blob, or failing that the v1 single crypto list (registry asset
 * ids → CoinGecko keys — the same migration the page used to run inline).
 */
function readLegacy(): Array<{ name: string; keys: string[] }> {
  try {
    const v2 = JSON.parse(localStorage.getItem(LEGACY_V2_KEY) ?? 'null') as
      { lists?: Array<{ name?: string; keys?: string[] }> } | null
    if (v2?.lists?.length) {
      return v2.lists.map((l) => ({
        name: typeof l.name === 'string' && l.name ? l.name : 'My Watchlist',
        keys: (l.keys ?? []).filter((k): k is string => typeof k === 'string'),
      }))
    }
  } catch { /* fall through */ }
  try {
    const v1 = JSON.parse(localStorage.getItem(LEGACY_V1_KEY) ?? 'null')
    if (Array.isArray(v1) && v1.length > 0) {
      const keys = (v1 as string[])
        .map((id) => COINGECKO_IDS[id])
        .filter((k): k is string => !!k && !!INSTRUMENT_BY_KEY[k])
      return [{ name: 'My Watchlist', keys }]
    }
  } catch { /* ignore */ }
  return []
}

function retireLegacyKeys() {
  for (const key of [LEGACY_V2_KEY, LEGACY_V1_KEY]) {
    const val = localStorage.getItem(key)
    if (val != null) {
      localStorage.setItem(`${key}:imported`, val)
      localStorage.removeItem(key)
    }
  }
}

/** First-ever visit with nothing to import gets the same starter list the page always seeded. */
const STARTER: { name: string; keys: string[] } = {
  name: 'My Watchlist',
  keys: ['bitcoin', 'ethereum', 'sec:VOO', 'sec:AAPL'],
}

/**
 * Load watchlists from whichever backend this build uses — the server, or
 * localStorage in the free web build (see the header note; the local path
 * returns early and is documented at its own branch). Call from any consumer's
 * mount effect — concurrent calls share one request; force=true re-fetches
 * (used to converge after a failed mutation).
 *
 * On first hydration, lists saved to this browser before persistence landed
 * are imported once (server assigns fresh UUIDs — legacy ids weren't UUIDs),
 * then the keys are renamed so the import can never repeat. The import runs
 * even when the account already has lists — each browser's legacy lists are
 * merged in additively, since another device (or the seeded starter) having
 * written first must not silently discard this browser's saved lists. A truly
 * empty account with nothing to import gets the starter list. Neither happens
 * when the server is unreachable — seeding on error would fork the data.
 */
export function hydrateWatchlists(force = false): Promise<void> {
  const store = useWatchlistStore
  if (hydrating) return hydrating
  if (store.getState().hydrated && !force) return Promise.resolve()

  hydrating = (async () => {
    // ── Free web build: localStorage is the whole story ──
    // Same precedence as the server path — saved lists, else a one-time legacy
    // import, else the starter — so a returning visitor sees what they left and
    // a first-time one sees a populated list rather than an empty page. There is
    // no failure mode to report, so syncError stays null and the page shows no
    // "could not be loaded" banner.
    if (LOCAL_ONLY) {
      try {
        let lists = loadLocal()
        if (!lists || lists.length === 0) {
          const legacy = readLegacy()
          const seed = legacy.length > 0 ? legacy : [STARTER]
          lists = seed.map((l) => ({ id: crypto.randomUUID(), name: l.name, keys: l.keys }))
          saveLocal(lists)
          if (legacy.length > 0) {
            retireLegacyKeys()
            toast.success(`Imported ${legacy.length} watchlist${legacy.length > 1 ? 's' : ''} saved in this browser`)
          }
        }
        const activeId = lists.some((l) => l.id === store.getState().activeId)
          ? store.getState().activeId
          : (lists[0]?.id ?? null)
        store.setState({ lists, activeId, hydrated: true, syncError: null })
      } finally {
        hydrating = null
      }
      return
    }

    try {
      let { watchlists } = await api('/api/user/watchlists')
      const legacy = readLegacy()
      if (legacy.length > 0) {
        ;({ watchlists } = await api('/api/user/watchlists', {
          method: 'POST',
          body: JSON.stringify({ watchlists: legacy }),
        }))
        retireLegacyKeys()
        toast.success(`Imported ${legacy.length} watchlist${legacy.length > 1 ? 's' : ''} saved in this browser`)
      } else if ((watchlists?.length ?? 0) === 0) {
        ;({ watchlists } = await api('/api/user/watchlists', {
          method: 'POST',
          body: JSON.stringify({ watchlists: [STARTER] }),
        }))
      }
      const lists = watchlists ?? []
      const activeId = lists.some((l) => l.id === store.getState().activeId)
        ? store.getState().activeId
        : (lists[0]?.id ?? null)
      store.setState({ lists, activeId, hydrated: true, syncError: null })
    } catch (e) {
      store.setState({ hydrated: true, syncError: e instanceof Error ? e.message : 'Watchlists unavailable' })
    } finally {
      hydrating = null
    }
  })()
  return hydrating
}
