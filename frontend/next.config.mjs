import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PREMIUM_PAGE_ROUTES, PREMIUM_COMPONENTS } from './src/lib/modules/premiumManifest.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))

// ─── Distribution gate ────────────────────────────────────────────────────────
// Mirrors src/lib/distribution.ts and fails closed the same way: only the exact
// string 'desktop' produces the full paid build, so a deploy that forgets the
// variable ships the free web edition rather than publishing the paid product.
//
// Read from the non-public name as a fallback so a desktop build can set either;
// NEXT_PUBLIC_FN_DISTRIBUTION is the one the app reads and the one that gets
// inlined into the client bundle, so it is what the app half keys on.
const PREMIUM_BUILD =
  (process.env.NEXT_PUBLIC_FN_DISTRIBUTION ?? process.env.FN_DISTRIBUTION) === 'desktop'

// Premium page routes are redirected away in a free build. Paired with the
// premiumOnly() guard on the server handlers (lib/server/premiumGuard.ts) and the
// nav filtering in lib/modules/registry.ts, that leaves a free build with no link
// to a premium page, no page at the URL, and no handler behind it.
//
// Redirect rather than 404 because these URLs are already in the wild — the
// upsell page explains what the desktop edition adds, which is more useful to a
// reader following an old link than a dead end, and costs nothing in protection:
// the page component is not reachable either way.
const premiumRedirects = PREMIUM_BUILD
  ? []
  : PREMIUM_PAGE_ROUTES.flatMap((route) => [
      { source: route, destination: '/upgrade', permanent: false },
      { source: `${route}/:path*`, destination: '/upgrade', permanent: false },
    ])

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Linting runs as its own step (`npm run lint` → eslint, and a dedicated CI
  // job), NOT during the build. Decided on Next 14, whose built-in build lint
  // drove the ESLint 8 API and errored against ESLint 9:
  //   ⨯ ESLint: Invalid Options: - Unknown options: useEslintrc, extensions
  // It printed that while still exiting 0, i.e. the build *looked* linted and
  // wasn't. Turning it off makes the truth explicit instead. Kept off on
  // Next 15 deliberately — build-lint is deprecated in 15 and removed in 16,
  // and the dedicated lint step is the one CI actually gates on. See
  // eslint.config.mjs.
  eslint: { ignoreDuringBuilds: true },
  images: {
    domains: ['assets.coingecko.com', 'cryptologos.cc', 'raw.githubusercontent.com'],
    formats: ['image/avif', 'image/webp'],
  },
  webpack: (config, { webpack }) => {
    // ── Compile premium pages out of the free web build ──
    //
    // Redirecting a premium URL stops a reader reaching the feature, and the
    // middleware 404 stops its data being fetched — but on its own that still
    // COMPILES the premium page and ships its JavaScript to the browser, where
    // anyone can read it in devtools. Requirement is that premium code is not in
    // the web deployment at all, so the page entry itself is swapped here.
    //
    // Replacing just each `page.tsx` (rather than every module in the folder) is
    // deliberate: the stub has to satisfy only one import shape — a default
    // export — instead of every named export the folder happens to use, which
    // makes the substitution total rather than best-effort. With the entry gone,
    // the page's private component tree is imported by nothing and webpack drops
    // it. Components shared with a free page still ship, correctly, because a
    // free page still needs them.
    if (!PREMIUM_BUILD && PREMIUM_PAGE_ROUTES.length > 0) {
      const dirs = PREMIUM_PAGE_ROUTES
        .map((r) => r.replace(/^\//, '').replace(/\//g, '[\\\\/]'))
        .join('|')
      // Matches the route's own page.tsx and any nested one beneath it, so
      // /budget covers /budget/transactions without listing it separately.
      const premiumPages = new RegExp(
        `app[\\\\/]\\(dashboard\\)[\\\\/](?:${dirs})(?:[\\\\/].*)?[\\\\/]page\\.tsx$`
      )
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          premiumPages,
          path.resolve(HERE, 'src/lib/premiumStub.tsx')
        )
      )
    }

    // ── Premium components inside otherwise-free pages ──
    // A feature with no route of its own (the Backtest tab on the free Technical
    // Analysis page) can't be redirected or 404'd, so its module is swapped for a
    // stub with the same exports. The host page compiles unchanged and resolves to
    // the stub, which imports no engine — so the engine, imported by nothing else,
    // is dropped rather than shipped inside a page the web build still serves.
    if (!PREMIUM_BUILD) {
      for (const c of PREMIUM_COMPONENTS) {
        // Anchored to the resolved absolute path so the match cannot collide with
        // a same-named module elsewhere in the tree or in node_modules.
        const target = path.resolve(HERE, 'src', `${c.module}.tsx`)
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(
            new RegExp(`^${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
            path.resolve(HERE, 'src', `${c.stub}.tsx`)
          )
        )
      }
    }
    return config
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        // Proxies leftover /api/* traffic to the legacy backend.
        //
        // `/api/auth/` is excluded because Auth.js owns it, and `/api/user/`
        // because the DB-backed user-data routes (builder plans, portfolios…)
        // live there. This rewrite runs in the default `afterFiles` phase,
        // which resolves *after* concrete file routes but *before* dynamic
        // ones — so /api/auth/signup (a real file) reached its handler while
        // /api/auth/csrf and /api/auth/callback/* (served by the [...nextauth]
        // catch-all) were silently proxied to the dormant backend and 500'd.
        // The same trap catches any dynamic segment: /api/user/builder-plans/
        // [id] would proxy too. First-party routes with dynamic params MUST
        // live under an excluded prefix — add new prefixes here, not routes
        // outside /api/user/.
        source: '/api/:path((?!auth/|user/).*)',
        destination: `${apiUrl}/api/:path`,
      },
    ]
  },
  async redirects() {
    return [
      // Free web build only — premium routes land on the upsell page. Empty in a
      // desktop build. Listed first so a premium route can never be shadowed by a
      // later entry.
      ...premiumRedirects,
      // Global page de-routed pending a post-production rework (see T5 triage:
      // docs/assessments/T5-utility-triage.md). The page and its
      // /live-data/cbdc-data route are intentionally LEFT IN PLACE — this only
      // removes user access. Delete this entry to re-enable the page.
      { source: '/global-adoption', destination: '/headlines', permanent: false },
      // Risk Case Studies removed (2026-07): static educational replay with no
      // clear user value — page deleted, deep links land on Headlines.
      { source: '/backtests', destination: '/headlines', permanent: false },
      // Reserve Transparency Monitor folded into the Coins page (2026-07-29).
      // It duplicated /assets' "Reserve Monitor" tab — same route, same table,
      // same detail panel — while being the only copy that carried the
      // provenance disclosure and the peg-mechanism fix. One surface now, with
      // those corrections, in components/analytics/reserves.
      //
      // Unlike the two redirects above this preserves the destination content:
      // ?tab=reserves opens the same monitor the old URL showed, so bookmarks
      // still work rather than dumping the reader on an unrelated page.
      { source: '/reserves', destination: '/assets?tab=reserves', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
}

export default nextConfig
