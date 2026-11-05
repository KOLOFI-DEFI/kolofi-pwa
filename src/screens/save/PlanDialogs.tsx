import { useState } from 'react'
import { ApiError } from '@/core/api/contract'
import { cents, fullDate, money, parseAmount } from '@/core/format'
import { useAutoSave, useClosePlan, useSaveInto, useSavingsWithdrawalQuote, useUpdatePlan, useWallets, useWithdrawFromPlan } from '@/core/data'
import type { Frequency, SavingsPlan, WithdrawalQuote } from '@/core/types'
import { Button, Chips, FieldLabel, KeyValues, Modal, Notice, Segmented, TextField, Toggle, cx, errorText, usePin, useToast } from '@/ui'
import { FREQUENCIES, MOVEMENT_LABEL, WEEKDAYS, lockLabel, scheduleText } from './shared'
import v from './detail.module.css'

interface DialogProps {
  plan: SavingsPlan
  open: boolean
  onClose: () => void
}

const cleanAmount = (s: string) => s.replace(/[^\d.,]/g, '')
const fieldErr = (e: unknown, f: string) => (e instanceof ApiError ? e.field(f) : undefined)

/* ───────── Add money (no PIN: money moves into savings) ───────── */
export function AddMoneyDialog({ plan, open, onClose }: DialogProps) {
  const toast = useToast()
  const { data: wallets } = useWallets()
  const save = useSaveInto(plan.id)
  const [amount, setAmount] = useState('')
  const available = wallets?.balances.find((b) => b.asset === 'usdt')?.available ?? '0'
  const dec = parseAmount(amount)
  const tooSmall = !!dec && cents(dec) < 100
  const tooMuch = !!dec && cents(dec) > cents(available)
  const close = () => {
    setAmount('')
    save.reset()
    onClose()
  }
  const submit = async () => {
    if (!dec || tooSmall || tooMuch) return
    try {
      await save.mutateAsync(dec)
      toast(`${money(dec)} USDT added to ${plan.name}`)
      close()
    } catch {
      /* shown in the dialog */
    }
  }
  const quick = [10, 50, 100].filter((n) => n * 100 <= cents(available))
  return (
    <Modal
      open={open}
      onClose={close}
      title={`Add to ${plan.name}`}
      sub="Moves money from your wallet’s available balance into this plan. No PIN needed."
      footer={
        <Button disabled={!dec || tooSmall || tooMuch} loading={save.isPending} onClick={submit}>
          {dec && !tooSmall && !tooMuch ? `Add ${money(dec)} USDT` : 'Add money'}
        </Button>
      }
    >
      <form
        className={v.dialogBody}
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <TextField
          label="Amount"
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(cleanAmount(e.target.value))}
          hint={
            <button type="button" className={v.maxBtn} onClick={() => setAmount(String(cents(available) / 100))}>
              Max
            </button>
          }
          error={tooSmall ? 'The smallest deposit is 1 USDT.' : tooMuch ? `You have ${money(available)} USDT available.` : fieldErr(save.error, 'amount')}
        />
        <div className={v.dialogMeta}>{money(available)} USDT available in your wallet</div>
        {quick.length > 0 && (
          <Chips options={quick.map((n) => ({ value: n, label: `${n} USDT` }))} value={dec ? parseFloat(dec) : -1} onChange={(n) => setAmount(String(n))} />
        )}
        {save.error && !fieldErr(save.error, 'amount') && <Notice tone="flare">{errorText(save.error)}</Notice>}
      </form>
    </Modal>
  )
}

/* ───────── Withdraw: quote first, then PIN ───────── */
export function WithdrawDialog({ plan, open, onClose }: DialogProps) {
  const toast = useToast()
  const askPin = usePin()
  const quoteMut = useSavingsWithdrawalQuote(plan.id)
  const withdraw = useWithdrawFromPlan(plan.id)
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<WithdrawalQuote | null>(null)
  const dec = parseAmount(amount)
  const tooMuch = !!dec && cents(dec) > cents(plan.balance)
  const close = () => {
    setAmount('')
    setQuote(null)
    quoteMut.reset()
    onClose()
  }
  const review = async () => {
    if (!dec || tooMuch) return
    try {
      setQuote(await quoteMut.mutateAsync(dec))
    } catch {
      /* shown in the dialog */
    }
  }
  const confirm = () => {
    if (!quote) return
    const q = quote
    close()
    askPin({
      title: `Withdraw from ${plan.name}`,
      sub: `${money(q.you_receive)} USDT goes to your wallet${cents(q.fee) > 0 ? ` after a ${money(q.fee)} USDT fee` : ''}. Enter your transaction PIN to confirm.`,
      confirmLabel: `Withdraw ${money(q.amount)} USDT`,
      run: async (pin) => {
        await withdraw.mutateAsync({ amount: q.amount, pin })
        toast(`${money(q.you_receive)} USDT moved to your wallet`)
      },
    })
  }

  const early = plan.early_fee_applies
  const warning =
    plan.type === 'locked'
      ? early && plan.matures_at
        ? `This plan is locked until ${fullDate(plan.matures_at)}. Taking money out now breaks the lock and costs a fee.`
        : null
      : early
        ? `Before your target date${plan.target_date ? ` (${fullDate(plan.target_date)})` : ''} an early-withdrawal fee applies.`
        : null

  return (
    <Modal
      open={open}
      onClose={close}
      title={quote ? 'Check the withdrawal' : `Withdraw from ${plan.name}`}
      sub={quote ? undefined : `Money goes back to your wallet. ${money(plan.balance)} USDT in this plan.`}
      footer={
        quote ? (
          <>
            <Button onClick={confirm}>Continue</Button>
            <Button variant="secondary" onClick={() => setQuote(null)}>
              Change amount
            </Button>
          </>
        ) : (
          <Button disabled={!dec || tooMuch} loading={quoteMut.isPending} onClick={review}>
            See what you’ll get
          </Button>
        )
      }
    >
      {quote ? (
        <div className={v.dialogBody}>
          <KeyValues
            rows={[
              { label: 'Withdraw', value: `${money(quote.amount)} USDT`, mono: true },
              { label: cents(quote.fee) > 0 ? `${MOVEMENT_LABEL[quote.type] ?? 'Fee'} fee` : 'Fee', value: cents(quote.fee) > 0 ? `−${money(quote.fee)} USDT` : 'Free', mono: true, valueStyle: cents(quote.fee) > 0 ? { color: 'var(--flare)' } : undefined },
              { label: 'You receive', value: `${money(quote.you_receive)} USDT`, mono: true, accent: true },
            ]}
          />
          {cents(quote.fee) > 0 && warning && <Notice tone="flare" icon="info">{warning}</Notice>}
        </div>
      ) : (
        <form
          className={v.dialogBody}
          onSubmit={(e) => {
            e.preventDefault()
            void review()
          }}
        >
          <TextField
            label="Amount"
            inputMode="decimal"
            autoFocus
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(cleanAmount(e.target.value))}
            hint={
              <button type="button" className={v.maxBtn} onClick={() => setAmount(String(cents(plan.balance) / 100))}>
                All
              </button>
            }
            error={tooMuch ? `This plan holds ${money(plan.balance)} USDT.` : fieldErr(quoteMut.error, 'amount')}
          />
          {warning && <Notice icon="info">{warning}</Notice>}
          {quoteMut.error && !fieldErr(quoteMut.error, 'amount') && <Notice tone="flare">{errorText(quoteMut.error)}</Notice>}
        </form>
      )}
    </Modal>
  )
}

/* ───────── Auto-save set / edit ───────── */
export function AutoSaveDialog({ plan, open, onClose }: DialogProps) {
  const toast = useToast()
  const { set } = useAutoSave(plan.id)
  const current = plan.auto_save && plan.auto_save.status !== 'cancelled' ? plan.auto_save : null
  const [amount, setAmount] = useState(current ? String(parseFloat(current.amount)) : '')
  const [frequency, setFrequency] = useState<Frequency>(current?.frequency ?? 'weekly')
  const [dayOfWeek, setDayOfWeek] = useState(current?.day_of_week ?? 5)
  const [dayOfMonth, setDayOfMonth] = useState(current?.day_of_month ?? 1)
  const dec = parseAmount(amount)
  const tooSmall = !!dec && cents(dec) < 100
  const close = () => {
    set.reset()
    onClose()
  }
  const submit = async () => {
    if (!dec || tooSmall) return
    try {
      await set.mutateAsync({
        amount: dec,
        frequency,
        day_of_week: frequency === 'weekly' ? dayOfWeek : null,
        day_of_month: frequency === 'monthly' ? dayOfMonth : null,
      })
      toast(current ? 'Auto-save updated' : 'Auto-save is on')
      close()
    } catch {
      /* shown in the dialog */
    }
  }
  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title={current ? 'Edit auto-save' : 'Set up auto-save'}
      sub="We move this amount from your wallet into the plan at 08:00 Lagos time. If your wallet is short three runs in a row, auto-save pauses itself."
      footer={
        <Button disabled={!dec || tooSmall} loading={set.isPending} onClick={submit}>
          {dec && !tooSmall ? `Save ${scheduleText({ amount: dec, frequency, day_of_week: dayOfWeek, day_of_month: dayOfMonth })}` : 'Save auto-save'}
        </Button>
      }
    >
      <div className={v.dialogBody}>
        <TextField
          label="Amount each time"
          inputMode="decimal"
          autoFocus
          placeholder="10"
          value={amount}
          onChange={(e) => setAmount(cleanAmount(e.target.value))}
          hint="USDT"
          error={tooSmall ? 'The smallest auto-save is 1 USDT.' : fieldErr(set.error, 'amount')}
        />
        <div>
          <FieldLabel>How often</FieldLabel>
          <Segmented options={FREQUENCIES} value={frequency} onChange={setFrequency} />
        </div>
        {frequency === 'weekly' && (
          <div>
            <FieldLabel>On</FieldLabel>
            <div className={v.weekdays} role="radiogroup" aria-label="Day of the week">
              {WEEKDAYS.map((d, i) => (
                <button key={d} role="radio" aria-checked={dayOfWeek === i + 1} aria-label={d} className={cx(v.dayBtn, dayOfWeek === i + 1 && v.dayOn)} onClick={() => setDayOfWeek(i + 1)}>
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}
        {frequency === 'monthly' && (
          <div>
            <FieldLabel>Day of the month</FieldLabel>
            <div className={v.monthDays} role="radiogroup" aria-label="Day of the month">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <button key={d} role="radio" aria-checked={dayOfMonth === d} className={cx(v.dayBtn, dayOfMonth === d && v.dayOn)} onClick={() => setDayOfMonth(d)}>
                  {d}
                </button>
              ))}
            </div>
            <div className={v.dialogMeta}>Days 1 to 28, so every month has a run.</div>
          </div>
        )}
        {set.error && !fieldErr(set.error, 'amount') && <Notice tone="flare">{errorText(set.error)}</Notice>}
      </div>
    </Modal>
  )
}

/* ───────── Edit name / target ───────── */
export function EditPlanDialog({ plan, open, onClose }: DialogProps) {
  const toast = useToast()
  const update = useUpdatePlan(plan.id)
  const [name, setName] = useState(plan.name)
  const [target, setTarget] = useState(plan.target_amount ? String(parseFloat(plan.target_amount)) : '')
  const [targetDate, setTargetDate] = useState(plan.target_date ?? '')
  const [autoRenew, setAutoRenew] = useState(!!plan.auto_renew)
  const targetDec = target.trim() ? parseAmount(target) : null
  const badTarget = !!target.trim() && !targetDec
  const earlierDate = plan.type === 'goal' && !!plan.target_date && targetDate < plan.target_date
  const close = () => {
    update.reset()
    onClose()
  }
  const submit = async () => {
    if (!name.trim() || badTarget || earlierDate) return
    const patch: Parameters<typeof update.mutateAsync>[0] = {}
    if (name.trim() !== plan.name) patch.name = name.trim()
    if (plan.type === 'goal') {
      if (cents(targetDec) !== cents(plan.target_amount)) patch.target_amount = targetDec
      if (targetDate && targetDate !== plan.target_date) patch.target_date = targetDate
    } else if (autoRenew !== !!plan.auto_renew) patch.auto_renew = autoRenew
    if (Object.keys(patch).length === 0) return close()
    try {
      await update.mutateAsync(patch)
      toast('Plan updated')
      close()
    } catch {
      /* shown in the dialog */
    }
  }
  return (
    <Modal
      open={open}
      onClose={close}
      title="Edit plan"
      footer={
        <Button disabled={!name.trim() || badTarget || earlierDate} loading={update.isPending} onClick={submit}>
          Save changes
        </Button>
      }
    >
      <div className={v.dialogBody}>
        <TextField label="Name" sans maxLength={100} value={name} onChange={(e) => setName(e.target.value)} error={!name.trim() ? 'Give your plan a name.' : fieldErr(update.error, 'name')} />
        {plan.type === 'goal' ? (
          <>
            <TextField label="Target amount" inputMode="decimal" placeholder="No target" value={target} onChange={(e) => setTarget(cleanAmount(e.target.value))} hint="USDT" error={badTarget ? 'Enter an amount like 1200.' : fieldErr(update.error, 'target_amount')} />
            <TextField
              label="Target date"
              type="date"
              sans
              min={plan.target_date ?? undefined}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              error={earlierDate ? 'A target date can only move later.' : fieldErr(update.error, 'target_date')}
            />
          </>
        ) : (
          <div className={v.toggleRow}>
            <div>
              <div className={v.toggleTitle}>Renew automatically</div>
              <div className={v.toggleSub}>Start a new {lockLabel(plan.lock_months)} term at maturity instead of paying out.</div>
            </div>
            <Toggle on={autoRenew} onChange={setAutoRenew} label="Renew automatically" />
          </div>
        )}
        {update.error && !(update.error instanceof ApiError && Object.keys(update.error.fields).length) && <Notice tone="flare">{errorText(update.error)}</Notice>}
      </div>
    </Modal>
  )
}

/* ───────── Close an empty plan ───────── */
export function ClosePlanDialog({ plan, open, onClose, onClosed }: DialogProps & { onClosed: () => void }) {
  const toast = useToast()
  const closeMut = useClosePlan(plan.id)
  const dismiss = () => {
    closeMut.reset()
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={dismiss}
      title={`Close ${plan.name}?`}
      sub="The plan is empty. Closing it stops any auto-save and moves it to your past plans. This can’t be undone."
      footer={
        <>
          <Button
            loading={closeMut.isPending}
            onClick={async () => {
              try {
                await closeMut.mutateAsync()
                toast(`${plan.name} closed`)
                dismiss()
                onClosed()
              } catch {
                /* shown below */
              }
            }}
          >
            Close plan
          </Button>
          <Button variant="secondary" onClick={dismiss}>
            Keep it
          </Button>
        </>
      }
    >
      {closeMut.error && <Notice tone="flare">{errorText(closeMut.error)}</Notice>}
    </Modal>
  )
}
