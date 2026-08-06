// Stand-in for BacktestPanel in the free web build.
//
// next.config.mjs swaps the real module for this one (see `premiumComponents` in
// lib/modules/premiumManifest.mjs). The strategy engine in lib/utils/backtest.ts
// is imported by the real panel and nothing else on the page, so replacing the
// module here leaves the engine unreachable and webpack drops it — the point of
// the exercise, since the simulation math is the sellable part.
//
// The export name and props must match the real module exactly; the importing
// page destructures `BacktestPanel` by name and is compiled unchanged.
//
// In practice this renders nowhere: the Technical Analysis page hides the
// Backtest tab in a free build, so the tab cannot be selected. It exists so the
// substitution is total rather than depending on that check, and returns null
// rather than an upsell card because the tab it would appear in is gone — a
// notice here would be unreachable copy pretending to be a surface.
export function BacktestPanel(_props: { assetId: string; symbol: string }) {
  return null
}
