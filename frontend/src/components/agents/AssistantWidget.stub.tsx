// Stand-in for AssistantWidget in the free web build (see PREMIUM_COMPONENTS in
// lib/modules/premiumManifest.mjs). The widget's /api/agents/chat backend is
// premium, so on the web the floating chat button could only ever error.
// Rendering nothing beats rendering a broken feature; the desktop build resolves
// to the real module unchanged.
export function AssistantWidget() {
  return null
}
