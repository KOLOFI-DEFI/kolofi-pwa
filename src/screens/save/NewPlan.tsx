import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ApiError } from '@/core/api/contract'
import { cents, fullDate, money, parseAmount, percent, usdt } from '@/core/format'
import { useCreatePlan, useSavingsRates, useWallets } from '@/core/data'
import type { PlanType } from '@/core/types'
import { Button, FieldLabel, Header, Icon, KeyValues, Notice, Screen, Skeleton, TextField, Toggle, cx, errorText, useToast } from '@/ui'
import { GoalCard, LockedCard, lockLabel, rateTypeLabel, simpleInterest } from './shared'
import v from './save.module.css'

const LOCK_TERMS = [3, 6, 12] as const

const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const addMonths = (months: number, from = new Date()) => {
  const d = new Date(from)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d
}
const daysFromNow = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000))

/* ───────── 12 New plan ─────────
   Phone: one column with a sticky projection + Create button.
   Desktop: form on the left, a sticky live preview (card, rate, projected interest, Create) on the right. */
export function NewPlan() {
  const nav = useNavigate()
  const toast = useToast()
  const preset = (useLocation().state ?? {}) as { type?: PlanType; lockMonths?: number | null }
  const { data: rates } = useSavingsRates()
  const { data: wallets } = useWallets()
  const create = useCreatePlan()

  const [type, setType] = useState<PlanType>(preset.type ?? 'goal')
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState(isoDay(addMonths(6)))
  const [lockMonths, setLockMonths] = useState<number>(preset.lockMonths ?? 6)
  const [autoRenew, setAutoRenew] = useState(false)
  const [deposit, setDeposit] = useState('')
  const [touched, setTouched] = useState(false)

  const available = wallets?.balances.find((b) => b.asset === 'usdt')?.available ?? '0'
  const product = rates?.products.find((p) => p.type === type && (type === 'goal' || p.lock_months === lockMonths))
  const rate = product?.annual_rate_percent ?? '0'

  const depositDec = deposit.trim() ? parseAmount(deposit) : null
  const targetDec = target.trim() ? parseAmount(target) : null
  const depositCents = cents(depositDec)
  const tomorrow = isoDay(new Date(Date.now() + 86_400_000))
  const maturesAt = addMonths(lockMonths).toISOString()

  const fieldError = (f: string) => (create.error instanceof ApiError ? create.error.field(f) : undefined)
  const errors = {
    name: !name.trim() ? 'Give your plan a name.' : name.length > 100 ? 'Keep the name under 100 characters.' : fieldError('name'),
    target: target.trim() && !targetDec ? 'Enter an amount like 1200 or 1200.50.' : fieldError('target_amount'),
    targetDate: type === 'goal' && (!targetDate || targetDate < tomorrow) ? 'Pick a date after today.' : fieldError('target_date'),
    deposit:
      deposit.trim() && !depositDec
        ? 'Enter an amount like 50 or 50.25.'
        : depositDec && depositCents < 100
          ? 'The smallest deposit is 1 USDT.'
          : depositCents > cents(available)
            ? `You have ${money(available)} USDT available.`
            : fieldError('initial_deposit'),
  }
  const valid = !errors.name && !errors.target && !errors.targetDate && !errors.deposit && !!product

  /** Interest estimate on what goes in today (or the target, or 100 USDT when nothing is entered yet). */
  const projection = useMemo(() => {
    const days = type === 'goal' ? daysFromNow(targetDate) : daysFromNow(maturesAt)
    const basisCents = depositCents > 0 ? depositCents : type === 'goal' && cents(targetDec) > 0 ? cents(targetDec) : 10_000
    const basisLabel = depositCents > 0 ? 'your first deposit' : type === 'goal' && cents(targetDec) > 0 ? 'your target, if saved today' : 'every 100 USDT'
    return { days, basisCents, basisLabel, interest: simpleInterest(basisCents, rate, days) }
  }, [type, targetDate, maturesAt, depositCents, targetDec, rate])

  const submit = async () => {
    setTouched(true)
    if (!valid) return
    try {
      const plan = await create.mutateAsync({
        type,
        name: name.trim(),
        ...(type === 'goal' ? { target_amount: targetDec, target_date: targetDate } : { lock_months: lockMonths, auto_renew: autoRenew }),
        ...(depositDec ? { initial_deposit: depositDec } : {}),
      })
      toast(`${plan.name} is ready`)
      nav(`/save/${plan.id}`, { replace: true })
    } catch {
      /* shown below the form */
    }
  }

  const previewPlan = {
    name: name.trim(),
    balance: depositDec ?? '0',
    target_amount: targetDec,
    progress_percent: targetDec ? String(Math.min(100, (depositCents / cents(targetDec)) * 100)) : null,
    target_date: targetDate || null,
    lock_months: lockMonths,
    matures_at: maturesAt,
    created_at: new Date().toISOString(),
    interest: { annual_rate_percent: rate, rate_type: product?.rate_type ?? 'variable', earned: '0', accrued_through: null },
  }

  const show = (e: string | undefined) => (touched ? e : undefined)
  const projectionText = `≈ +${usdt(projection.interest)} USDT`
  const projectionWhen = type === 'goal' ? (targetDate ? `by ${fullDate(targetDate)}` : '') : `after ${lockLabel(lockMonths)}`

  return (
    <Screen tabs width="wide" header={<Header title="New plan" />}>
      <div className={v.newLayout}>
        {/* ── Form ── */}
        <div className={v.form}>
          <div>
            <FieldLabel>Plan type</FieldLabel>
            <div className={v.typeGrid} role="radiogroup" aria-label="Plan type">
              <TypeOption
                selected={type === 'goal'}
                onClick={() => setType('goal')}
                icon="target"
                title="Goal"
                rate={rates?.products.find((p) => p.type === 'goal')}
                sub="Flexible. Add or take out any time; a small fee applies before your target date."
              />
              <TypeOption
                selected={type === 'locked'}
                onClick={() => setType('locked')}
                icon="lock"
                title="Locked"
                rate={rates?.products.filter((p) => p.type === 'locked').at(-1)}
                ratePrefix="up to "
                sub="Higher rate, fixed for the term. Breaking the lock early costs a fee."
              />
            </div>
          </div>

          <TextField label="Name" sans placeholder={type === 'goal' ? 'e.g. Rent, New laptop' : 'e.g. School fees'} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} error={show(errors.name)} />

          {type === 'goal' ? (
            <div className={v.twoFields}>
              <TextField
                label="Target amount (optional)"
                inputMode="decimal"
                placeholder="1,200"
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/[^\d.,]/g, ''))}
                hint="USDT"
                error={show(errors.target)}
              />
              <TextField label="Target date" type="date" sans min={tomorrow} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} error={show(errors.targetDate)} />
            </div>
          ) : (
            <div>
              <FieldLabel>Lock for</FieldLabel>
              <div className={v.lockOptions} role="radiogroup" aria-label="Lock term">
                {LOCK_TERMS.map((m) => {
                  const p = rates?.products.find((r) => r.type === 'locked' && r.lock_months === m)
                  return (
                    <button key={m} role="radio" aria-checked={m === lockMonths} className={cx(v.lockOpt, m === lockMonths && v.lockOptOn)} onClick={() => setLockMonths(m)}>
                      <span className={v.lockOptTitle}>{m} mo</span>
                      <span className={v.lockOptRate}>{p ? `${percent(p.annual_rate_percent)} a year` : '—'}</span>
                    </button>
                  )
                })}
              </div>
              <div className={v.toggleRow}>
                <div>
                  <div className={v.toggleTitle}>Renew automatically</div>
                  <div className={v.toggleSub}>At maturity, start a new {lockLabel(lockMonths)} term at that day’s rate instead of paying out.</div>
                </div>
                <Toggle on={autoRenew} onChange={setAutoRenew} label="Renew automatically" />
              </div>
            </div>
          )}

          <div>
            <TextField
              label="First deposit from wallet (optional)"
              inputMode="decimal"
              placeholder="0.00"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value.replace(/[^\d.,]/g, ''))}
              hint={
                <button type="button" className={v.maxBtn} onClick={() => setDeposit(String(cents(available) / 100))} disabled={cents(available) === 0}>
                  Max
                </button>
              }
              error={show(errors.deposit)}
            />
            <div className={v.availableLine}>
              <Icon name="wallet" size={14} />
              {wallets ? `${money(available)} USDT available in your wallet` : 'Checking your wallet…'}
            </div>
          </div>

          <Notice icon="info" tone="neutral">
            {type === 'goal'
              ? 'Taking money out before your target date costs a small early-withdrawal fee. You always see the exact fee before you confirm.'
              : `Your money stays locked until ${fullDate(maturesAt)}. Taking it out sooner costs a lock-break fee; you see the exact amount before you confirm.`}
          </Notice>

          {create.error && !(create.error instanceof ApiError && Object.keys(create.error.fields ?? {}).length) && (
            <Notice tone="flare" icon="info">
              {errorText(create.error)}
            </Notice>
          )}
        </div>

        {/* ── Live preview (desktop) ── */}
        <aside className={v.preview}>
          <div className={v.previewHead}>Preview</div>
          {type === 'goal' ? <GoalCard plan={previewPlan} preview /> : <LockedCard plan={previewPlan} preview />}
          {product ? (
            <KeyValues
              style={{ marginTop: 14 }}
              rows={[
                { label: 'Rate', value: `${percent(product.annual_rate_percent)} a year`, mono: true },
                { label: 'Rate type', value: rateTypeLabel(product.rate_type) },
                { label: type === 'goal' ? 'Target date' : 'Matures', value: type === 'goal' ? (targetDate ? fullDate(targetDate) : '—') : fullDate(maturesAt) },
                { label: `Interest on ${projection.basisLabel}`, value: `+${usdt(projection.interest)}`, mono: true, accent: true },
              ]}
            />
          ) : (
            <Skeleton h={170} style={{ marginTop: 14 }} />
          )}
          <p className={v.previewNote}>Estimate using simple interest at today’s rate over {projection.days} days.{type === 'goal' ? ' Goal rates can change.' : ''}</p>
          <Button className={v.previewBtn} disabled={touched && !valid} loading={create.isPending} onClick={submit}>
            Create plan
          </Button>
        </aside>
      </div>

      {/* ── Sticky footer (phone and tablet) ── */}
      <div className={v.stickyBar}>
        <div className={v.projection}>
          <span>
            Interest {projectionWhen}
            <small> on {projection.basisLabel}</small>
          </span>
          <b>{product ? projectionText : '—'}</b>
        </div>
        <Button disabled={touched && !valid} loading={create.isPending} onClick={submit}>
          {type === 'goal' ? 'Create goal' : `Lock for ${lockMonths} months`}
        </Button>
      </div>
    </Screen>
  )
}

function TypeOption({
  selected, onClick, icon, title, sub, rate, ratePrefix = '',
}: { selected: boolean; onClick: () => void; icon: 'target' | 'lock'; title: string; sub: string; rate?: { annual_rate_percent: string }; ratePrefix?: string }) {
  return (
    <button role="radio" aria-checked={selected} className={cx(v.typeOpt, selected && v.typeOptOn)} onClick={onClick}>
      <span className={v.typeTop}>
        <span className={v.typeIcon} data-kind={icon}>
          <Icon name={icon} size={17} />
        </span>
        <span className={v.typeRate}>{rate ? `${ratePrefix}${percent(rate.annual_rate_percent)}` : ''}</span>
      </span>
      <span className={v.typeTitle}>{title}</span>
      <span className={v.typeSub}>{sub}</span>
    </button>
  )
}
