import { AlertTriangle, HelpCircle } from 'lucide-react'
import { LEGAL_CONFIG } from '@/lib/legal'

// Shared banners for the /legal/* documents.
//
// Both exist so an unfinished document cannot pass for a finished one. A draft
// policy that looks authoritative is worse than an obviously incomplete one:
// readers rely on it, and it is the kind of claim that becomes a liability the
// moment there are customers.

/** Shown on any document whose `reviewed` flag is still false. */
export function DraftNotice({ title }: { title: string }) {
  return (
    <div className="rounded-card border border-amber-500/30 bg-amber-500/5 p-4 not-prose">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" aria-hidden />
        <div className="text-xs text-text-secondary leading-relaxed">
          <p className="font-semibold text-amber-300">Draft — not yet reviewed by a lawyer</p>
          <p className="mt-1">
            This {title} is scaffolding. Sections describing how the software behaves were written
            from the code and are accurate; sections stating legal positions are placeholders and
            must be replaced before this site is treated as published.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders a value from LEGAL_CONFIG, or a visible gap if the owner hasn't set it.
 *
 * Deliberately loud rather than silent: an unset company name rendering as an
 * empty string would produce a document that reads as complete while naming
 * nobody, which is exactly the failure this is meant to prevent.
 */
export function ConfigValue({ field }: { field: keyof typeof LEGAL_CONFIG }) {
  const value = LEGAL_CONFIG[field]
  if (value) return <>{value}</>
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[0.9em] font-mono not-prose">
      <HelpCircle size={11} aria-hidden />
      {field} not set
    </span>
  )
}
