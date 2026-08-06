import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

// This file sits at <repo>/frontend/src/lib/__tests__.
const REPO = path.resolve(__dirname, '../../../..')
const read = (rel: string) => readFileSync(path.join(REPO, rel), 'utf8')

// ─── Repository boundary ──────────────────────────────────────────────────────
// This repo is a COPY of the Finance Now codebase that builds the free web
// edition. The original is a separate repository and must never be touched from
// a session here.
//
// Prose alone does not hold that line — a stale pointer to the original's local
// checkout survived in CLAUDE.md (the file auto-loaded at the start of every
// session) for the whole of this project's life, telling every reader the
// working directory was a path in the original. These are the checks that make
// the boundary enforceable rather than merely stated.

describe('the repo does not reach into another repository', () => {
  it('has no git submodules', () => {
    // A submodule is the most direct way the original could end up vendored in
    // here and edited by accident.
    expect(existsSync(path.join(REPO, '.gitmodules')), '.gitmodules exists — a submodule was added').toBe(false)
  })

  it('pushes only to this repository', () => {
    // Read git's own config rather than trusting a doc. Skipped only if there is
    // no .git directory at all (e.g. an export), and loudly, so a silent pass
    // cannot be mistaken for a verified one.
    const cfg = path.join(REPO, '.git/config')
    if (!existsSync(cfg)) {
      console.warn('[repo-boundary] no .git/config — remote check not performed')
      return
    }
    const urls = [...readFileSync(cfg, 'utf8').matchAll(/^\s*url\s*=\s*(.+)$/gm)]
      .map((m) => m[1].trim())
      // `url.<base>.insteadOf` rewrite rules are config, not remotes.
      .filter((u) => u.includes('github.com/') && !u.endsWith('github.com/'))

    for (const u of urls) {
      expect(
        u.toLowerCase(),
        `remote "${u}" is not this repository — a session here must not push elsewhere`
      ).toContain('finance-now-free')
    }
  })

  it('never checks out another repository in CI', () => {
    // actions/checkout takes a `repository:` input; without it a workflow can
    // only check out itself. Any use of it here would be a cross-repo reach.
    const dir = path.join(REPO, '.github/workflows')
    if (!existsSync(dir)) return
    const { readdirSync } = require('node:fs') as typeof import('node:fs')
    for (const f of readdirSync(dir).filter((n) => /\.ya?ml$/.test(n))) {
      const src = readFileSync(path.join(dir, f), 'utf8')
      expect(src, `${f} checks out another repository`).not.toMatch(/^\s*repository:\s*\S/m)
    }
  })
})

describe('CLAUDE.md orients a session to THIS repo', () => {
  const claude = read('CLAUDE.md')

  it('carries no path into the original checkout', () => {
    // The exact drift this guards: CLAUDE.md used to state the working directory
    // as `C:\Users\...\Crypto-Stuff\frontend` — the ORIGINAL's local path — in
    // the file every session reads first.
    expect(claude, 'CLAUDE.md points at the original checkout').not.toMatch(/Crypto-Stuff/i)
    expect(claude, 'CLAUDE.md contains an absolute Windows path').not.toMatch(/[A-Z]:\\Users\\/)
  })

  it('states the scope rule', () => {
    // Deleting the rule should take a deliberate act with a failing test in the
    // way, not be a quiet casualty of an edit.
    expect(claude).toMatch(/Scope rule/i)
    expect(claude, 'the "never touch the original" rule is missing').toMatch(/[Nn]ever touch the original/)
  })

  it('names the premium manifest as the source of truth for the split', () => {
    // A session that does not know the split exists will "fix" a withheld
    // feature by re-adding it.
    expect(claude).toContain('premiumManifest.mjs')
    expect(claude).toMatch(/NEXT_PUBLIC_FN_DISTRIBUTION/)
  })

  it('warns that the feature inventory describes the full product', () => {
    // The inventory lists surfaces that are desktop-only on the web build. That
    // caveat is what stops it being read as a description of the free edition.
    expect(claude).toMatch(/Feature Inventory further down this file describes the FULL product/i)
  })
})
