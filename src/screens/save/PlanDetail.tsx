import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { cents, dateTime, daysUntil, fullDate, money, percent, shortDate } from '@/core/format'
import { useAutoSave, useMovements, usePlan } from '@/core/data'
import type { SavingsPlan } from '@/core/types'
import { Badge, Button, EmptyState, Eyebrow, Header, Icon, IconButton, KeyValues, Money, Notice, Progress, Screen, Skeleton, Tile, Toggle, cx, errorText, useToast } from '@/ui'
import { AddMoneyDialog, AutoSaveDialog, ClosePlanDialog, EditPlanDialog, WithdrawDialog } from './PlanDialogs'
import { LockedCard, MOVEMENT_LABEL, countdown, goalProgress, lockLabel, movementAmount, movementIcon, rateTypeLabel, scheduleText } from './shared'
import v from './detail.module.css'

type Dialog = 'add' | 'withdraw' | 'autosave' | 'edit' | 'close' | null

/* ───────── Plan detail (board 13 for locked plans) ─────────
   Phone/tablet: board-style hero, facts, auto-save, movements; Add / Withdraw stick to the bottom.
   Desktop: main column (hero balance card, movements table) beside a side panel (facts, auto-save, actions). */
export function PlanDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { data: plan, error, isLoading } = usePlan(id)
  const [dialog, setDialog] = useState<Dialog>(null)
  const close = () => setDialog(null)

  if (isLoading || !plan) {
    return (
      <Screen tabs width="wide" header={<Header title="Savings plan" />}>
        {error ? (
          <EmptyState icon="vault" title="We couldn’t open this plan" action={<Button variant="outline" onClick={() => nav('/save')}>Back to Save</Button>}>
            {errorText(error)}
          </EmptyState>
        ) : (
          <div className={v.layout}>
            <Skeleton h={260} r={24} />
            <Skeleton h={260} r={24} />
          </div>
        )}
      </Screen>
    )
  }

  const active = plan.status === 'active'
  const empty = cents(plan.balance) === 0

  return (
    <Screen tabs width="wide" header={<Header title={plan.name} right={active ? <IconButton icon="more" label="Edit plan" onClick={() => setDialog('edit')} /> : undefined} />}>
      <div className={v.titleRow}>
        <Badge tone={plan.type === 'locked' ? 'outline' : 'sig'}>{plan.type === 'locked' ? `Locked · ${lockLabel(plan.lock_months)}` : 'Goal'}</Badge>
        {!active && <Badge>{plan.status}</Badge>}
        <span className={v.created}>Started {fullDate(plan.created_at)}</span>
      </div>

      <div className={v.layout}>
        <div className={v.main}>
          <div className={v.oHero}>{plan.type === 'locked' ? <LockedCard plan={plan} large /> : <GoalHero plan={plan} />}</div>

          {!active && (
            <div className={v.oNotice}>
            <Notice icon="info">
              {plan.status === 'matured'
                ? `This plan matured${plan.matured_at ? ` on ${fullDate(plan.matured_at)}` : ''} and the money was paid to your wallet.`
                : `You closed this plan${plan.closed_at ? ` on ${fullDate(plan.closed_at)}` : ''}.`}
            </Notice>
            </div>
          )}

          <Movements plan={plan} />
        </div>

        <aside className={v.side}>
          <section className={cx(v.panel, v.oInterest)}>
            <h2 className={v.panelTitle}>Interest</h2>
            <KeyValues
              rows={[
                { label: 'Rate', value: `${percent(plan.interest.annual_rate_percent)} a year`, mono: true },
                { label: 'Rate type', value: rateTypeLabel(plan.interest.rate_type) },
                { label: 'Earned so far', value: `+${money(plan.interest.earned)} USDT`, mono: true, accent: true },
                { label: 'Worked out through', value: plan.interest.accrued_through ? fullDate(plan.interest.accrued_through) : 'Starts tonight' },
                ...(plan.type === 'goal'
                  ? [
                      { label: 'Target', value: cents(plan.target_amount) > 0 ? `${money(plan.target_amount)} USDT` : 'No target', mono: true },
                      { label: 'Target date', value: plan.target_date ? fullDate(plan.target_date) : '—' },
                    ]
                  : [
                      { label: 'Matures', value: plan.matures_at ? fullDate(plan.matures_at) : '—' },
                      { label: 'At maturity', value: plan.auto_renew ? 'Renews for another term' : 'Pays out to wallet' },
                    ]),
              ]}
            />
            <p className={v.panelNote}>
              {plan.interest.rate_type === 'variable'
                ? 'Goal rates follow the current rate day by day.'
                : 'This plan keeps the rate it started with until its term ends.'}{' '}
              Interest is added each night on your lowest balance that day.
            </p>
          </section>

          {active && (
            <div className={v.oAuto}>
              <AutoSaveCard plan={plan} onEdit={() => setDialog('autosave')} />
            </div>
          )}

          {active && (
            <section className={cx(v.panel, v.oActions)}>
              <h2 className={cx(v.panelTitle, v.actionsTitle)}>Actions</h2>
              <div className={v.actions}>
                <Button icon="plus" className={v.deskAction} onClick={() => setDialog('add')}>
                  Add money
                </Button>
                <Button variant="outline" icon="arrowUpRight" className={v.deskAction} disabled={empty} onClick={() => setDialog('withdraw')}>
                  Withdraw
                </Button>
                <button className={v.actionRow} onClick={() => setDialog('edit')}>
                  <Icon name="key" size={17} />
                  <span>Edit {plan.type === 'goal' ? 'name and target' : 'name and renewal'}</span>
                  <Icon name="chevronRight" size={15} className={v.chev} />
                </button>
                <button className={cx(v.actionRow, !empty && v.actionDisabled)} onClick={() => empty && setDialog('close')} aria-disabled={!empty}>
                  <Icon name="close" size={17} />
                  <span>
                    Close plan
                    {!empty && <small>Withdraw everything first</small>}
                  </span>
                  <Icon name="chevronRight" size={15} className={v.chev} />
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>

      {active && (
        <div className={v.stickyBar}>
          <Button variant="secondary" icon="arrowUpRight" disabled={empty} onClick={() => setDialog('withdraw')}>
            Withdraw
          </Button>
          <Button icon="plus" onClick={() => setDialog('add')}>
            Add money
          </Button>
        </div>
      )}

      <AddMoneyDialog plan={plan} open={dialog === 'add'} onClose={close} />
      <WithdrawDialog plan={plan} open={dialog === 'withdraw'} onClose={close} />
      {dialog === 'autosave' && <AutoSaveDialog plan={plan} open onClose={close} />}
      {dialog === 'edit' && <EditPlanDialog plan={plan} open onClose={close} />}
      <ClosePlanDialog plan={plan} open={dialog === 'close'} onClose={close} onClosed={() => nav('/save', { replace: true })} />
    </Screen>
  )
}

/* ───────── Goal hero ───────── */
function GoalHero({ plan }: { plan: SavingsPlan }) {
  const hasTarget = cents(plan.target_amount) > 0
  const progress = goalProgress(plan)
  const left = plan.target_date ? daysUntil(plan.target_date) : null
  return (
    <section className={v.hero}>
      <div className={v.heroTop}>
        <Eyebrow>Balance</Eyebrow>
        <Tile tone="sig" size={40}>
          <Icon name="target" size={18} />
        </Tile>
      </div>
      <div className={v.heroAmount}>
        <Money value={plan.balance} size={52} ccy="USDT" />
      </div>
      {hasTarget && (
        <>
          <Progress value={progress} height={8} style={{ marginTop: 20 }} />
          <div className={v.heroMeta}>
            <span>
              <b>{Math.round(progress * 100)}%</b> of {money(plan.target_amount, { decimals: 0 })} USDT
            </span>
            <span>{money(String(Math.max(0, cents(plan.target_amount) - cents(plan.balance)) / 100))} to go</span>
          </div>
        </>
      )}
      <div className={v.heroStats}>
        <div className={v.heroStat}>
          <span className={v.heroStatLabel}>Target date</span>
          <span className={v.heroStatValue}>{plan.target_date ? fullDate(plan.target_date) : '—'}</span>
          {left !== null && <span className={v.heroStatSub}>{left > 0 ? countdown(plan.target_date!) : 'Reached'}</span>}
        </div>
        <div className={v.heroStat}>
          <span className={v.heroStatLabel}>Interest earned</span>
          <span className={cx(v.heroStatValue, v.accent)}>+{money(plan.interest.earned)}</span>
          <span className={v.heroStatSub}>{percent(plan.interest.annual_rate_percent)} a year · variable</span>
        </div>
        <div className={v.heroStat}>
          <span className={v.heroStatLabel}>Early fee</span>
          <span className={v.heroStatValue}>{plan.early_fee_applies ? 'Applies' : 'None'}</span>
          <span className={v.heroStatSub}>{plan.early_fee_applies ? 'Until your target date' : 'Withdraw for free'}</span>
        </div>
      </div>
    </section>
  )
}

/* ───────── Auto-save ───────── */
function AutoSaveCard({ plan, onEdit }: { plan: SavingsPlan; onEdit: () => void }) {
  const toast = useToast()
  const { pause, resume, cancel } = useAutoSave(plan.id)
  const a = plan.auto_save && plan.auto_save.status !== 'cancelled' ? plan.auto_save : null
  const busy = pause.isPending || resume.isPending || cancel.isPending
  const err = pause.error ?? resume.error ?? cancel.error

  if (!a) {
    return (
      <section className={cx(v.panel, v.autoOff)}>
        <div className={v.autoHead}>
          <Tile size={38} radius={11}>
            <Icon name="refresh" size={17} />
          </Tile>
          <div>
            <h2 className={v.panelTitle}>Auto-save</h2>
            <div className={v.autoSub}>Move a set amount from your wallet on a schedule.</div>
          </div>
        </div>
        <Button variant="outline" icon="plus" className={v.autoBtn} onClick={onEdit}>
          Set up auto-save
        </Button>
      </section>
    )
  }

  const on = a.status === 'active'
  return (
    <section className={cx(v.autoCard, !on && v.autoPaused)}>
      <div className={v.autoHead}>
        <span className={v.autoTile}>
          <Icon name="refresh" size={17} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={v.autoTitle}>{scheduleText(a)}</div>
          <div className={v.autoSub}>
            {on ? (a.next_run_at ? `Next ${dateTime(a.next_run_at)}` : 'Scheduled') : 'Paused'}
            {a.last_run_at ? ` · last ${shortDate(a.last_run_at)}` : ''}
          </div>
        </div>
        <Toggle
          ink
          on={on}
          label={on ? 'Pause auto-save' : 'Resume auto-save'}
          onChange={async (next) => {
            try {
              await (next ? resume : pause).mutateAsync()
              toast(next ? 'Auto-save resumed' : 'Auto-save paused')
            } catch {
              /* shown below */
            }
          }}
        />
      </div>
      {a.consecutive_failures > 0 && (
        <div className={v.autoWarn}>
          {a.consecutive_failures} missed run{a.consecutive_failures === 1 ? '' : 's'}
          {a.last_failure_reason ? `: ${a.last_failure_reason}` : ''}. Keep money in your wallet; it pauses after 3.
        </div>
      )}
      {err && <div className={v.autoWarn}>{errorText(err)}</div>}
      <div className={v.autoActions}>
        <button className={v.autoLink} onClick={onEdit} disabled={busy}>
          Edit schedule
        </button>
        <button
          className={v.autoLink}
          disabled={busy}
          onClick={async () => {
            try {
              await cancel.mutateAsync()
              toast('Auto-save cancelled')
            } catch {
              /* shown above */
            }
          }}
        >
          Cancel auto-save
        </button>
      </div>
    </section>
  )
}

/* ───────── Movements: list on phones, table on desktop ───────── */
function Movements({ plan }: { plan: SavingsPlan }) {
  const { items, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useMovements(plan.id)
  return (
    <section className={v.movements}>
      <div className={v.sectionHead}>
        <h2>History</h2>
      </div>
      <div className={v.table}>
        <div className={v.tableHead} aria-hidden>
          <span>Movement</span>
          <span>Date</span>
          <span>Fee</span>
          <span>Amount</span>
        </div>
        {isLoading &&
          [0, 1, 2].map((i) => (
            <div key={i} style={{ padding: '12px 0' }}>
              <Skeleton h={40} />
            </div>
          ))}
        {!isLoading && items?.length === 0 && (
          <EmptyState icon="activity" title="Nothing here yet">
            Deposits, auto-saves, interest and withdrawals for this plan show up here.
          </EmptyState>
        )}
        {items?.map((m) => {
          const { icon, tone } = movementIcon(m)
          return (
            <div key={m.id} className={v.tableRow}>
              <span className={v.txMain}>
                <Tile size={38} radius={19} tone={tone}>
                  <Icon name={icon} size={16} />
                </Tile>
                <span style={{ minWidth: 0 }}>
                  <span className={v.txTitle}>{MOVEMENT_LABEL[m.type] ?? m.type}</span>
                  <span className={v.txSub}>
                    {shortDate(m.created_at)}
                    {cents(m.fee) > 0 ? ` · ${money(m.fee)} fee` : ''}
                  </span>
                </span>
              </span>
              <span className={v.txDate}>{dateTime(m.created_at)}</span>
              <span className={v.txFee}>{cents(m.fee) > 0 ? `−${money(m.fee)}` : '—'}</span>
              <span className={cx(v.txAmount, m.direction === 'in' && v.txIn)}>{movementAmount(m)}</span>
            </div>
          )
        })}
      </div>
      {hasNextPage && (
        <Button variant="outline" className={v.more} loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
          Show more
        </Button>
      )}
    </section>
  )
}
