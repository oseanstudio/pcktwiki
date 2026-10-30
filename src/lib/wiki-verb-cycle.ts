import { PCKT_WORDMARK_COLORS } from '@/lib/pckt-brand-color'

/** Four-letter verbs that cycle in the "Make a Wiki" CTA. */
export const WIKI_VERBS = [
  'Make',
  'Edit',
  'Fork',
  'Grow',
  'Plan',
  'Plot',
  'Love',
  'Wiki',
  'Star',
  'Seed',
  'Find',
  'Sync',
  'Tend',
  'Draw',
  'Read',
  'Link',



] as const

export function wikiVerbAt(step: number): string {
  return WIKI_VERBS[step % WIKI_VERBS.length]!
}

/** Advances through pckt wordmark colors (red → blue → green → yellow) each cycle step. */
export function wikiVerbColorAt(step: number): string {
  return PCKT_WORDMARK_COLORS[step % PCKT_WORDMARK_COLORS.length]!
}

/** Spring enter + tween exit — exit uses a fixed duration so AnimatePresence can finish reliably. */
export const wikiVerbEnter = { opacity: 0, y: -30 } as const
export const wikiVerbRest = { opacity: 1, y: 0 } as const
export const wikiVerbExit = { opacity: 0, y: -24 } as const

export const wikiVerbEnterTransition = {
  y: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 15,
  },
  opacity: {
    duration: 0.5,
  },
}

export const WIKI_VERB_EXIT_MS = 350

export const wikiVerbExitTransition = {
  duration: WIKI_VERB_EXIT_MS / 1000,
  ease: 'easeIn' as const,
}

export const wikiVerbExitState = {
  ...wikiVerbExit,
  transition: wikiVerbExitTransition,
}

/** Switch to static text if the animated verb is still invisible after a full cycle window. */
export const WIKI_VERB_FALLBACK_RECOVERY_MS = 1200

export const WIKI_VERB_CYCLE_MS = 2600
