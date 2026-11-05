import { useNavigate } from 'react-router'
import { cents, daysUntil, fullDate, money, monthYear, percent, usdt } from '@/core/format'
import type { IconName } from '@/core/icons'
import type { Frequency, MovementType, SavingsMovement, SavingsPlan, SavingsProduct } from '@/core/types'
import { Icon, Money, Progress, Tile, cx } from '@/ui'
import v from './save.module.css'

/* ───────── Labels and maths shared by the Save screens ───────── */

export const rateTypeLabel = (t: SavingsProduct['rate_type']) => (t === 'variable' ? 'Variable' : 'Fixed for term')

export const lockLabel = (months: number | null) => `${months ?? 0} month${months === 1 ? '' : 's'}`

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`

/** "10 USDT every Friday", "25 USDT on the 1st of each month" */
export function scheduleText(a: { amount: string; frequency: Frequency; day_of_week: number | null; day_of_month: number | null }): string {
  const amt = `${money(a.amount)} USDT`
  if (a.frequency === 'daily') return `${amt} every day`
  if (a.frequency === 'weekly') return `${amt} every ${WEEKDAYS[(a.day_of_week ?? 1) - 1]}`
  return `${amt} on the ${ordinal(a.day_of_month ?? 1)} of each month`
}

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  deposit: 'Added from wallet',
  auto_save: 'Auto-save',
  withdrawal: 'Withdrawal',
  early_withdrawal: 'Early withdrawal',
  lock_break: 'Lock broken early',
  maturity_payout: 'Paid out at maturity',
  circle_payout: 'Circle payout',
  interest: 'Interest',
}

export function movementIcon(m: SavingsMovement): { icon: IconName; tone: 'sig' | 'neutral' | 'flare' } {
  if (m.type === 'interest') return { icon: 'sparkle', tone: 'sig' }
  if (m.type === 'auto_save') return { icon: 'refresh', tone: 'sig' }
  if (m.type === 'circle_payout') return { icon: 'circles', tone: 'sig' }
  if (m.direction === 'in') return { icon: 'arrowDownLeft', tone: 'sig' }
  if (m.type === 'lock_break' || m.type === 'early_withdrawal') return { icon: 'arrowUpRight', tone: 'flare' }
  return { icon: 'arrowUpRight', tone: 'neutral' }
}

/** Simple interest on a balance held for `days`, in cents. */
export const simpleInterest = (principalCents: number, annualRatePercent: string | number, days: number) =>
  Math.max(0, Math.round((principalCents * parseFloat(String(annualRatePercent)) * Math.max(0, days)) / 100 / 365))

/** Share of a locked term already served, 0–1. */
export function lockElapsed(p: Pick<SavingsPlan, 'created_at' | 'matures_at'>, now = Date.now()): number {
  if (!p.matures_at) return 0
  const start = new Date(p.created_at).getTime()
  const end = new Date(p.matures_at).getTime()
  return end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 1
}

/** Share of the target saved, 0–1, worked out from the balance so it never lags behind a movement. */
export function goalProgress(p: Pick<SavingsPlan, 'progress_percent' | 'balance' | 'target_amount'>): number {
  const target = cents(p.target_amount)
  return target > 0 ? Math.min(1, cents(p.balance) / target) : parseFloat(p.progress_percent ?? '0') / 100
}

export function countdown(iso: string): string {
  const d = daysUntil(iso)
  if (d <= 0) return 'Due now'
  if (d === 1) return '1 day left'
  if (d < 60) return `${d} days left`
  return `${Math.round(d / 30.4)} months left`
}

/* ───────── Plan cards ───────── */

/** A goal plan as a card: name, balance against target, progress and rate. */
export function GoalCard({ plan, onClick, preview }: { plan: Pick<SavingsPlan, 'name' | 'balance' | 'target_amount' | 'progress_percent' | 'target_date' | 'interest'> & { auto_save?: SavingsPlan['auto_save'] }; onClick?: () => void; preview?: boolean }) {
  const Tag = onClick ? 'button' : 'div'
  const hasTarget = cents(plan.target_amount) > 0
  return (
    <Tag className={cx(v.goalCard, onClick && v.clickable, preview && v.previewCard)} onClick={onClick}>
      <div className={v.cardTop}>
        <Tile tone="sig" size={40}>
          <Icon name="target" size={18} />
        </Tile>
        <div className={v.cardTitleWrap}>
          <div className={v.cardTitle}>{plan.name || 'Your goal'}</div>
          <div className={v.cardSub}>
            Goal{plan.target_date ? ` · by ${monthYear(plan.target_date)}` : ''}
            {plan.auto_save?.status === 'active' && ' · Auto-save on'}
          </div>
        </div>
        <div className={v.cardValue}>
          <div className={v.cardAmount}>{money(plan.balance)}</div>
          <div className={v.cardOf}>{hasTarget ? `of ${money(plan.target_amount, { decimals: 0 })}` : 'USDT'}</div>
        </div>
      </div>
      {hasTarget && <Progress value={goalProgress(plan)} style={{ marginTop: 16 }} />}
      <div className={v.cardFoot}>
        <span>
          {percent(plan.interest.annual_rate_percent)} a year · {rateTypeLabel(plan.interest.rate_type).toLowerCase()}
        </span>
        {cents(plan.interest.earned) > 0 && <span className={v.earned}>+{money(plan.interest.earned)} earned</span>}
        {hasTarget && cents(plan.interest.earned) === 0 && <span>{Math.round(goalProgress(plan) * 100)}%</span>}
      </div>
    </Tag>
  )
}

/** A locked plan as an always-dark "ink" card with its maturity. */
export function LockedCard({ plan, onClick, preview, large }: { plan: Pick<SavingsPlan, 'name' | 'balance' | 'lock_months' | 'matures_at' | 'created_at' | 'interest'>; onClick?: () => void; preview?: boolean; large?: boolean }) {
  const Tag = onClick ? 'button' : 'div'
  const elapsed = lockElapsed(plan)
  return (
    <Tag className={cx(v.lockCard, onClick && v.clickable, preview && v.previewCard, large && v.lockLarge)} onClick={onClick}>
      <div className={v.lockHead}>
        <span className={v.lockEyebrow}>Locked · {lockLabel(plan.lock_months)}</span>
        <Icon name="lock" size={18} color="#7FB7FF" />
      </div>
      <div className={v.lockName}>{plan.name || 'Your locked plan'}</div>
      <div style={{ marginTop: 6 }}>
        <Money value={plan.balance} size={large ? 52 : 36} ccy="USDT" color="#ECEAE4" ccyColor="#8C9198" style={{ ['--faint' as string]: '#8C9198' }} />
      </div>
      <Progress value={elapsed} color="#7FB7FF" track="rgba(255,255,255,0.1)" height={6} style={{ marginTop: 16 }} />
      <div className={v.lockMetaRow}>
        <span className={v.lockMeta}>{plan.matures_at ? countdown(plan.matures_at) : '—'}</span>
        <span className={v.lockMeta} style={{ color: '#ECEAE4' }}>
          {plan.matures_at ? `Opens ${fullDate(plan.matures_at)}` : ''}
        </span>
      </div>
      <div className={v.lockStats}>
        <div className={v.lockStat}>
          <span className={v.lockMeta}>Interest so far</span>
          <span className={v.lockStatValue} style={{ color: '#C6F35E' }}>
            +{money(plan.interest.earned)}
          </span>
        </div>
        <div className={v.lockStat}>
          <span className={v.lockMeta}>Rate · fixed</span>
          <span className={v.lockStatValue}>{percent(plan.interest.annual_rate_percent)}</span>
        </div>
      </div>
    </Tag>
  )
}

/** Card for any plan, linking to its detail page. */
export function PlanCard({ plan }: { plan: SavingsPlan }) {
  const nav = useNavigate()
  const open = () => nav(`/save/${plan.id}`)
  return plan.type === 'locked' ? <LockedCard plan={plan} onClick={open} /> : <GoalCard plan={plan} onClick={open} />
}

/** Signed amount text for a movement, e.g. "+10.00" / "−20.00". */
export const movementAmount = (m: SavingsMovement) => `${m.direction === 'in' ? '+' : '−'}${usdt(cents(m.amount))}`
