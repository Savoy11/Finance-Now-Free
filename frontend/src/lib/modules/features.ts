import type { ModuleId } from './registry'
import { PREMIUM_BUILD } from '@/lib/distribution'
import {
  PREMIUM_FEATURES,
  PREMIUM_PAGE_ROUTES,
  PREMIUM_DATA_ROUTES,
  PREMIUM_NAV_HREFS,
  isPremiumPath,
} from './premiumManifest.mjs'

// ─── Typed view over the premium manifest ─────────────────────────────────────
// The manifest itself is plain ESM so next.config.mjs can import it too (see the
// header comment there). This module is the app's typed door onto it — nothing in
// src/ should reach past this to the .mjs file, so the JSDoc shapes are asserted
// against real TypeScript in exactly one place.

export interface PremiumFeature {
  id: string
  module: ModuleId
  label: string
  pageRoutes: string[]
  dataRoutes: string[]
  navHrefs: string[]
  rationale: string
}

export const PREMIUM_CATALOG = PREMIUM_FEATURES as PremiumFeature[]

/** Premium features owned by a module — powers the upsell surface. */
export function premiumFeaturesFor(module: ModuleId): PremiumFeature[] {
  return PREMIUM_CATALOG.filter((f) => f.module === module)
}

/**
 * Whether a sidebar href should render in this build.
 *
 * Reads PREMIUM_BUILD, which is a build-time literal, so in a web build the
 * minifier folds this to a constant and the filtered nav entries never exist.
 */
export function isNavHrefAvailable(href: string): boolean {
  if (PREMIUM_BUILD) return true
  return !(PREMIUM_NAV_HREFS as string[]).includes(href)
}

/** Whether a page route is served by this build. */
export function isPageRouteAvailable(pathname: string): boolean {
  if (PREMIUM_BUILD) return true
  return !isPremiumPath(pathname, PREMIUM_PAGE_ROUTES as string[])
}

/** Whether a server handler is deployed by this build. */
export function isDataRouteAvailable(pathname: string): boolean {
  if (PREMIUM_BUILD) return true
  return !isPremiumPath(pathname, PREMIUM_DATA_ROUTES as string[])
}
