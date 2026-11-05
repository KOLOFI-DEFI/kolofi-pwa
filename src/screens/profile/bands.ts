import type { ReputationBand } from '@/core/types'

/** Reputation bands, highest first. A score sits in the first band whose `min` it reaches. */
export const bands: { key: ReputationBand; label: string; min: number; short: string; text: string }[] = [
  { key: 'excellent', label: 'Excellent', min: 800, short: 'Every circle is open to you.', text: 'A long record of paying on time. Circles with the highest reputation requirements are open to you.' },
  { key: 'good', label: 'Good', min: 600, short: 'Most circles are open to you.', text: 'You pay reliably. Most circles, including ones that ask for 600 or more, are open to you.' },
  { key: 'building', label: 'Building', min: 400, short: 'Pay on time to open more circles.', text: 'Early days or a few slips. Pay on time and finish circles to climb.' },
  { key: 'at_risk', label: 'At risk', min: 0, short: 'Some circles may be closed to you.', text: 'Recent missed payments. Some circles may be closed to you until your score recovers.' },
]

export const bandOf = (score: number) => bands.find((b) => score >= b.min) ?? bands[bands.length - 1]!
