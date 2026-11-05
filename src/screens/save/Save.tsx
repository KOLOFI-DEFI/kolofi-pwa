import { useState } from 'react'
import { useNavigate } from 'react-router'
import { fullDate, money, percent } from '@/core/format'
import { usePlans, useSavingsRates, useSavingsSummary } from '@/core/data'
import type { SavingsPlan, SavingsProduct } from '@/core/types'
import { Button, EmptyState, Eyebrow, Icon, Money, Screen, Skeleton, Tile, cx } from '@/ui'
import { PlanCard, lockLabel, rateTypeLabel } from './shared'
import v from './save.module.css'

export { NewPlan } from './NewPlan'
export { PlanDetail } from './PlanDetail'

/* ───────── 11 Save ─────────
   Phone: title + New plan, one summary card, plans stacked, current rates as tiles.
   Desktop: page header with actions, four stat cards, plans as a card grid beside a rates panel. */
export function Save() {
  const nav = useNavigate()
  const { data: summary } = useSavingsSummary()
  const { data: rates } = useSavingsRates()
  const { data: plans } = usePlans()
  const [showPast, setShowPast] = useState(false)

  const active = (plans ?? []).filter((p) => p.status === 'active')
  const past = (plans ?? []).filter((p) => p.status !== 'active')
  const topRate = rates?.products.reduce((best, p) => Math.max(best, parseFloat(p.annual_rate_percent)), 0)

  return (
    <Screen tabs width="wide">
      <header className={v.pageHead}>
        <div className={v.pageHeadText}>
          <h1 className={v.pageTitle}>Save</h1>
          <p className={v.pageSub}>Earn interest every day on goals and locked plans{topRate ? `, up to ${topRate}% a year` : ''}.</p>
        </div>
        <Button variant="outline" icon="plus" className={v.headBtnPhone} onClick={() => nav('/save/new')}>
          New plan
        </Button>
        <Button icon="plus" className={v.headBtnDesk} onClick={() => nav('/save/new')}>
          New plan
        </Button>
      </header>

      {/* ── Summary: one card on phones, a row of stat cards on wider screens ── */}
      {summary ? (
        <section className={v.summary}>
          <div className={v.summaryMain}>
            <Eyebrow>Total saved</Eyebrow>
            <div className={v.summaryAmount}>
              <Money value={summary.total} size={44} ccy="USDT" />
            </div>
            <div className={v.summaryMeta}>
              {summary.active_plans} active plan{summary.active_plans === 1 ? '' : 's'}
            </div>
          </div>
          <div className={v.summaryInterest}>
            <Eyebrow>Interest earned</Eyebrow>
            <div className={v.interestValue}>+{money(summary.interest_earned)}</div>
            <div className={v.summaryMeta}>Added to your plans daily</div>
          </div>
          <SplitItem tone="sig" label="In goals" value={summary.goal} />
          <SplitItem tone="chain" label="Locked" value={summary.locked} />
        </section>
      ) : (
        <Skeleton h={150} r={20} style={{ marginTop: 22 }} />
      )}

      <div className={v.layout}>
        {/* ── Plans ── */}
        <section className={v.plansArea}>
          <div className={v.sectionHead}>
            <h2>Your plans</h2>
            {active.length > 0 && <span className={v.count}>{active.length} active</span>}
          </div>
          {plans === undefined ? (
            <div className={v.planGrid}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} h={160} r={20} />
              ))}
            </div>
          ) : active.length === 0 ? (
            <div className={v.emptyCard}>
              <EmptyState icon="vault" title="No savings plans yet" action={<Button onClick={() => nav('/save/new')}>Start a plan</Button>}>
                Set a goal you can reach at your own pace, or lock money away for a higher fixed rate.
              </EmptyState>
            </div>
          ) : (
            <div className={v.planGrid}>
              {active.map((p) => (
                <PlanCard key={p.id} plan={p} />
              ))}
              <button className={v.newTile} onClick={() => nav('/save/new')}>
                <Tile size={44} radius={14}>
                  <Icon name="plus" size={20} />
                </Tile>
                <span className={v.newTileTitle}>New plan</span>
                <span className={v.newTileSub}>Goal or locked</span>
              </button>
            </div>
          )}

          {past.length > 0 && (
            <div className={v.past}>
              <button className={v.pastToggle} onClick={() => setShowPast((s) => !s)} aria-expanded={showPast}>
                <span>Matured and closed ({past.length})</span>
                <Icon name="chevronRight" size={16} className={cx(v.pastChev, showPast && v.pastChevOpen)} />
              </button>
              {showPast && (
                <div className={v.pastList}>
                  {past.map((p) => (
                    <PastRow key={p.id} plan={p} onClick={() => nav(`/save/${p.id}`)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Rates ── */}
        <aside className={v.ratesArea}>
          <div className={v.ratesPanel}>
            <div className={v.sectionHead}>
              <h2>Current rates</h2>
              <span className={v.count}>Per year</span>
            </div>
            {rates ? (
              <>
                <div className={v.rateGrid}>
                  {rates.products.map((r) => (
                    <RateTile key={`${r.type}-${r.lock_months}`} product={r} onClick={() => nav('/save/new', { state: { type: r.type, lockMonths: r.lock_months } })} />
                  ))}
                </div>
                <p className={v.terms}>{rates.terms}</p>
              </>
            ) : (
              <Skeleton h={180} />
            )}
          </div>
        </aside>
      </div>
    </Screen>
  )
}

function SplitItem({ tone, label, value }: { tone: 'sig' | 'chain'; label: string; value: string }) {
  return (
    <div className={v.splitItem}>
      <span className={v.splitDot} data-tone={tone} />
      <span className={v.splitLabel}>{label}</span>
      <span className={v.splitValue}>
        {money(value)}
        <span className={v.splitCcy}> USDT</span>
      </span>
    </div>
  )
}

function RateTile({ product, onClick }: { product: SavingsProduct; onClick: () => void }) {
  const locked = product.type === 'locked'
  return (
    <button className={cx(v.rateTile, locked && v.rateTileLocked)} onClick={onClick} aria-label={`Start a ${locked ? `${lockLabel(product.lock_months)} locked` : 'goal'} plan at ${percent(product.annual_rate_percent)} a year`}>
      <span className={v.rateName}>
        <Icon name={locked ? 'lock' : 'target'} size={14} />
        {locked ? lockLabel(product.lock_months) : 'Goal'}
      </span>
      <span className={v.rateValue}>{percent(product.annual_rate_percent)}</span>
      <span className={v.rateType}>{rateTypeLabel(product.rate_type)}</span>
    </button>
  )
}

function PastRow({ plan, onClick }: { plan: SavingsPlan; onClick: () => void }) {
  const when = plan.status === 'matured' ? plan.matured_at : plan.closed_at
  return (
    <button className={v.pastRow} onClick={onClick}>
      <Tile size={36} radius={10} tone={plan.type === 'locked' ? 'chain' : 'neutral'}>
        <Icon name={plan.type === 'locked' ? 'lock' : 'target'} size={16} />
      </Tile>
      <span className={v.pastMain}>
        <span className={v.pastName}>{plan.name}</span>
        <span className={v.pastSub}>
          {plan.status === 'matured' ? 'Matured' : 'Closed'}
          {when ? ` ${fullDate(when)}` : ''} · +{money(plan.interest.earned)} interest
        </span>
      </span>
      <span className={v.pastValue}>{money(plan.balance)}</span>
      <Icon name="chevronRight" size={16} className={v.chev} />
    </button>
  )
}
