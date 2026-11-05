import { ApiError } from '@/core/api/contract'
import { money, pad2, percent } from '@/core/format'
import type { CircleStatus, CollateralOption } from '@/core/types'
import { cx, type KV } from '@/ui'
import c from './circles.module.css'

/** Join refusals that the waitlist can still answer: the circle is full, the member is cooling down, or is gated by reputation. */
const GATE_CODES = ['CIRCLES_AT_CAPACITY', 'CIRCLES_COOLDOWN', 'REPUTATION_TOO_LOW', 'CIRCLES_BARRED'] as const
export function gateError(e: unknown): ApiError | null {
  return e instanceof ApiError && (GATE_CODES as readonly string[]).includes(e.code) ? e : null
}

export const statusText: Record<CircleStatus, string> = {
  forming: 'Filling',
  active: 'Running',
  completed: 'Completed',
  cancelled: 'Cancelled',
  unwound: 'Unwound',
}
export const StatusTag = ({ status }: { status: CircleStatus }) => (
  <span className={c.status} data-status={status}>
    {statusText[status]}
  </span>
)

export const slotNo = (n: number) => pad2(n)
export const cycleWord = (cycle: string) => (cycle === 'weekly' ? 'Weekly' : cycle === 'monthly' ? 'Monthly' : cycle === 'daily' ? 'Daily' : cycle)
export const levelPct = (bps: number) => `${bps / 100}%`
/** Levels to offer when the package is not known (invite codes, seat offers). */
export const COMMON_LEVELS = [5000, 4000, 3000]

/** Collateral levels as three-up option cards: percentage, amount locked, and the slots it unlocks. */
export function CollateralPicker({ options, value, onChange }: { options: CollateralOption[]; value: number | null; onChange: (bps: number) => void }) {
  return (
    <div className={c.levels} role="radiogroup" aria-label="Collateral level">
      {options.map((o) => {
        const on = o.collateral_bps === value
        return (
          <button key={o.collateral_bps} type="button" role="radio" aria-checked={on} className={cx(c.level, on && c.levelOn)} onClick={() => onChange(o.collateral_bps)}>
            <span className={c.levelPct}>{percent(o.collateral_percent)}</span>
            <span className={c.levelAmt}>{money(o.collateral, { decimals: 0 })} USDT</span>
            <span className={c.levelSlots}>Slots {o.slots_available_from.replace(' to ', '–')}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Slots 1…N: Kólófi's house seats first, then the slots this collateral level can be drawn into. */
export function SlotStrip({ members, house, earliest }: { members: number; house: number; earliest: number }) {
  return (
    <div>
      <div className={c.slotStrip} style={{ gridTemplateColumns: `repeat(${Math.min(members, 12)}, minmax(0, 1fr))` }}>
        {Array.from({ length: members }, (_, i) => {
          const n = i + 1
          const state = n <= house ? 'house' : n < earliest ? 'locked' : 'open'
          return (
            <span key={n} className={c.slotCell} data-state={state} aria-label={`Slot ${n}: ${state === 'house' ? 'Kólófi seat' : state === 'locked' ? 'needs more collateral' : 'can be drawn'}`}>
              {slotNo(n)}
              {state === 'house' && <small>KÓLÓFI</small>}
            </span>
          )
        })}
      </div>
      <div className={c.legend}>
        <span>
          <i data-state="house" /> Kólófi seat
        </span>
        <span>
          <i data-state="open" /> Can be drawn
        </span>
        <span>
          <i data-state="locked" /> Needs more collateral
        </span>
      </div>
    </div>
  )
}

/** The full cost of one collateral level, as KeyValues rows. */
export function breakdownRows(o: CollateralOption, cycle: string, graceHours?: number): KV[] {
  const per = cycle === 'weekly' ? 'week' : cycle === 'monthly' ? 'month' : 'cycle'
  const rows: KV[] = [
    { label: 'Collateral locked now', value: `${money(o.collateral)} USDT`, mono: true },
    { label: `Contribution each ${per}`, value: money(o.contribution), mono: true },
    { label: 'Contribution fee', value: money(o.contribution_fee), mono: true },
    { label: 'Reserve levy', value: money(o.reserve_levy), mono: true },
    { label: `You pay each ${per}`, value: `${money(o.per_cycle_total)} USDT`, mono: true, valueStyle: { fontWeight: 600 } },
    { label: 'Pot', value: money(o.pot), mono: true },
    { label: 'Payout fee', value: `−${money(o.payout_fee)}`, mono: true },
    { label: 'You collect on your turn', value: `${money(o.pot_after_fee)} USDT`, mono: true, accent: true },
  ]
  if (graceHours) rows.push({ label: 'Grace on a failed payment', value: `${graceHours} hours`, mono: true })
  return rows
}

/** Small mono label/value pair used in the dark summary card. */
export const InkRow = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className={cx(c.inkRow, strong && c.inkRowStrong)}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
)
