// Stand-in for TierSwitch in the free web build (see PREMIUM_COMPONENTS in
// lib/modules/premiumManifest.mjs). The data-tier dropdown exists to choose
// between provider sets; the free edition runs on hard-coded sources, so the
// control would configure nothing. TopBar compiles unchanged and renders no
// dropdown; the desktop build resolves to the real module.
export function TierSwitch() {
  return null
}
