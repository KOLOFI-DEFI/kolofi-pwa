import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { cents, cycleNoun, daysUntil, greeting, initials, money, ngn, shortDate, timeAgo, usdt } from '@/core/format'
import type { ActivityEntry, Circle } from '@/core/types'
import type { IconName } from '@/core/icons'
import { useActivity, useMarketRates, useMe, useMyCircles, usePlans, useSavingsSummary, useUnreadCount, useWallets } from '@/core/data'
import { Amount, Avatar, Button, EmptyState, Eyebrow, Icon, IconButton, Progress, Screen, Skeleton, Tile, cx } from '@/ui'
import { LineChart } from '@/ui/charts'
import h from './home.module.css'

/** The next contribution across the member's running circles. */
function nextPayment(circles: Circle[] | undefined) {
  const running = (circles ?? []).filter((c) => c.status === 'active' && c.my_seat?.type === 'real' && c.starts_at)
  const next = running.map((c) => {
    const due = new Date(c.starts_at!)
    if (c.cycle === 'weekly') due.setUTCDate(due.getUTCDate() + (c.current_cycle - 1) * 7)
    else due.setUTCMonth(due.getUTCMonth() + c.current_cycle - 1)
    return { circle: c, due: due.toISOString() }
  })
  return next.sort((a, b) => a.due.localeCompare(b.due))[0] ?? null
}

export const activityIcon = (e: ActivityEntry): IconName =>
  e.type.includes('circle') ? 'circles' : e.type.includes('savings') ? 'vault' : e.type.includes('withdrawal') ? 'arrowUpRight' : e.type.includes('deposit') ? 'arrowDownLeft' : 'activity'

export function Home() {
  const nav = useNavigate()
  const { data: me } = useMe()
  const { data: wallets } = useWallets()
  const { data: summary } = useSavingsSummary()
  const { data: plans } = usePlans()
  const { data: circles } = useMyCircles()
  const { data: rates } = useMarketRates()
  const { data: unread } = useUnreadCount()
  const { items: activity } = useActivity()

  const usdtBal = wallets?.balances.find((b) => b.asset === 'usdt')
  const openCircles = (circles ?? []).filter((c) => c.my_seat && ['forming', 'active'].includes(c.status))
  const collateral = openCircles.reduce((sum, c) => sum + cents(c.my_seat!.collateral_locked), 0)
  const walletCents = cents(usdtBal?.available) + cents(usdtBal?.held)
  const savingsCents = cents(usdtBal?.in_savings)
  const total = walletCents + savingsCents + collateral
  const ngnTotal = rates ? Math.round((total / 100) * parseFloat(rates.ngn_per_usd) * 100) : null
  const next = nextPayment(circles)
  const history = useMemo(() => (activity ?? []).slice(0, 30).map((a) => parseFloat(a.balance_after)).reverse(), [activity])
  const loading = !wallets

  const actions: { label: string; icon: IconName; to: string; primary?: boolean }[] = [
    { label: 'Add', icon: 'plus', to: '/wallet/add', primary: true },
    { label: 'Withdraw', icon: 'arrowUpRight', to: '/wallet/withdraw' },
    { label: 'Save', icon: 'vault', to: '/save' },
    { label: 'Circles', icon: 'circles', to: '/circles' },
  ]

  const accounts: { key: string; title: string; sub: string; value: number; icon: ReactNode; tone: 'neutral' | 'sig' | 'chain'; to: string }[] = [
    { key: 'wallet', title: 'Wallet', sub: 'Available to spend', value: walletCents, icon: '$', tone: 'neutral', to: '/wallet' },
    {
      key: 'savings',
      title: 'Savings',
      sub: summary && summary.active_plans > 0 ? `${summary.active_plans} plan${summary.active_plans === 1 ? '' : 's'} · +${money(summary.interest_earned)} interest` : 'Goals and locked plans',
      value: savingsCents,
      icon: <Icon name="target" size={18} />,
      tone: 'sig',
      to: '/save',
    },
    { key: 'circles', title: 'Circle collateral', sub: `${openCircles.length} circle${openCircles.length === 1 ? '' : 's'}`, value: collateral, icon: <Icon name="lock" size={17} />, tone: 'chain', to: '/circles' },
  ]

  return (
    <Screen tabs width="wide">
      {/* ── Greeting ── */}
      <header className={h.top}>
        <span className={h.avatar}>
          <Avatar initials={me ? initials(me.first_name, me.last_name) : ''} size={44} />
        </span>
        <div className={h.hello}>
          <div className={h.helloSub}>{greeting()},</div>
          <div className={h.helloName}>{me?.first_name ?? ''}</div>
        </div>
        <div className={h.topActions}>
          <IconButton icon="bell" label="Notifications" badge={!!unread} onClick={() => nav('/notifications')} />
          <Button variant="outline" icon="arrowUpRight" className={h.deskBtn} onClick={() => nav('/wallet/withdraw')}>
            Withdraw
          </Button>
          <Button icon="plus" className={h.deskBtn} onClick={() => nav('/wallet/add')}>
            Add money
          </Button>
        </div>
      </header>

      <div className={h.grid}>
        {/* ── Balance ── */}
        <section className={h.balance}>
          <Eyebrow>Total balance</Eyebrow>
          {loading ? (
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              <Skeleton h={56} w={260} />
              <Skeleton h={18} w={180} />
            </div>
          ) : (
            <>
              <div className={h.balanceAmount}>
                <Amount minor={total} size={54} ccy="USDT" />
              </div>
              <div className={h.balanceSub}>
                {ngnTotal !== null && <span>≈ {ngn(ngnTotal)}</span>}
                {summary && cents(summary.interest_earned) > 0 && <span className={h.delta}>+{money(summary.interest_earned)} interest earned</span>}
              </div>
            </>
          )}
          <div className={h.split}>
            {accounts.map((a) => (
              <div key={a.key} className={h.splitItem}>
                <span className={h.splitDot} data-tone={a.tone} />
                <span className={h.splitLabel}>{a.title}</span>
                <span className={h.splitValue}>{usdt(a.value)}</span>
              </div>
            ))}
          </div>
          {history.length > 1 && (
            <div className={h.chart}>
              <LineChart values={history} height={120} />
              <div className={h.chartCaption}>Wallet balance over your last {history.length} movements</div>
            </div>
          )}
        </section>

        {/* ── Quick actions (phone and tablet) ── */}
        <div className={h.actions}>
          {actions.map((a) => (
            <button key={a.label} className={cx(h.action, a.primary && h.actionPrimary)} onClick={() => nav(a.to)}>
              <Icon name={a.icon} size={22} />
              <span>{a.label}</span>
            </button>
          ))}
        </div>

        {/* ── Next payment ── */}
        <section className={h.nextWrap}>
          {next ? (
            <div className={h.next}>
              <svg className={h.nextArc} viewBox="0 0 200 200" aria-hidden>
                <circle cx="100" cy="100" r="98" fill="none" stroke="currentColor" strokeDasharray="3 4" />
              </svg>
              <div className={h.nextHead}>
                <Eyebrow style={{ color: 'rgba(14,16,19,0.7)' }}>Next contribution · Auto</Eyebrow>
                <Eyebrow style={{ color: 'rgba(14,16,19,0.7)' }}>{daysUntil(next.due) > 0 ? `In ${daysUntil(next.due)} days` : 'Due now'}</Eyebrow>
              </div>
              <div className={h.nextBody}>
                <div>
                  <div className={h.nextAmount}>{money(next.circle.per_cycle_total, { decimals: 0 })} USDT</div>
                  <div className={h.nextMeta}>
                    {next.circle.package} · {shortDate(next.due)}
                  </div>
                </div>
                <button className={h.view} onClick={() => nav(`/circles/${next.circle.id}`)}>
                  View
                </button>
              </div>
              <p className={h.nextNote}>
                Keep it in your wallet and it’s taken on the day. You’re in seat {next.circle.my_seat?.slot} of {next.circle.members}.
              </p>
            </div>
          ) : (
            <div className={cx(h.next, h.nextEmpty)}>
              <Eyebrow style={{ color: 'rgba(14,16,19,0.7)' }}>Kólófi Circles</Eyebrow>
              <div className={h.nextAmount} style={{ fontSize: 26, lineHeight: '30px', marginTop: 10 }}>
                Join an ajo where nobody runs with the pot.
              </div>
              <button className={h.view} style={{ marginTop: 18, alignSelf: 'flex-start' }} onClick={() => nav('/circles')}>
                Browse circles
              </button>
            </div>
          )}
        </section>

        {/* ── Accounts ── */}
        <section className={h.accounts}>
          <div className={h.sectionHead}>
            <h2>Accounts</h2>
          </div>
          <div className={h.accountList}>
            {accounts.map((a) => (
              <button key={a.key} className={h.account} onClick={() => nav(a.to)}>
                <Tile tone={a.tone}>{a.icon}</Tile>
                <div className={h.accountText}>
                  <div className={h.accountTitle}>{a.title}</div>
                  <div className={h.accountSub}>{a.sub}</div>
                </div>
                <div className={h.accountValue}>
                  {loading ? <Skeleton h={22} w={90} /> : usdt(a.value)}
                  <span className={h.ccy}>USDT</span>
                </div>
                <Icon name="chevronRight" size={16} className={h.chev} />
              </button>
            ))}
          </div>
        </section>

        {/* ── Recent activity: list on phones, table on desktop ── */}
        <section className={h.activity}>
          <div className={h.sectionHead}>
            <h2>Recent activity</h2>
            <button className={h.seeAll} onClick={() => nav('/activity')}>
              See all
            </button>
          </div>
          <div className={h.table}>
            <div className={h.tableHead} aria-hidden>
              <span>Activity</span>
              <span>Date</span>
              <span>Balance after</span>
              <span>Amount</span>
            </div>
            {activity === undefined &&
              [0, 1, 2, 3].map((i) => (
                <div key={i} style={{ padding: '12px 0' }}>
                  <Skeleton h={40} />
                </div>
              ))}
            {activity?.length === 0 && (
              <EmptyState icon="activity" title="Nothing here yet" action={<Button variant="outline" onClick={() => nav('/wallet/add')}>Add money</Button>}>
                Deposits, savings and circle payments show up here.
              </EmptyState>
            )}
            {activity?.slice(0, 6).map((e) => (
              <div key={e.id} className={h.tableRow}>
                <span className={h.txMain}>
                  <Tile size={38} radius={11} tone={e.direction === 'in' ? 'sig' : 'neutral'}>
                    <Icon name={activityIcon(e)} size={17} />
                  </Tile>
                  <span style={{ minWidth: 0 }}>
                    <span className={h.txTitle}>{e.label}</span>
                    <span className={h.txSub}>{e.reference?.plan ?? e.reference?.circle ?? timeAgo(e.created_at)}</span>
                  </span>
                </span>
                <span className={h.txDate}>{shortDate(e.created_at)}</span>
                <span className={h.txBal}>{money(e.balance_after)}</span>
                <span className={cx(h.txAmount, e.direction === 'in' && h.txIn)}>
                  {e.direction === 'in' ? '+' : '−'}
                  {money(e.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Side column (desktop): circles and savings at a glance ── */}
        <aside className={h.side}>
          <section className={h.card}>
            <div className={h.sectionHead}>
              <h2>Your circles</h2>
              <button className={h.seeAll} onClick={() => nav('/circles')}>
                Manage
              </button>
            </div>
            {(circles ?? []).slice(0, 3).map((c) => (
              <button key={c.id} className={h.mini} onClick={() => nav(`/circles/${c.id}`)}>
                <span className={h.miniTop}>
                  <span className={h.miniTitle}>{c.package}</span>
                  <span className={h.status} data-status={c.status}>
                    {c.status}
                  </span>
                </span>
                <span className={h.miniMeta}>
                  {c.status === 'active' ? `Cycle ${c.current_cycle} of ${c.members} · seat ${c.my_seat?.slot}` : `Filling · ${money(c.pot, { decimals: 0 })} USDT pot each ${cycleNoun(c.cycle)}`}
                </span>
                {c.status === 'active' && <Progress value={c.current_cycle / c.members} height={5} />}
              </button>
            ))}
            {circles?.length === 0 && <p className={h.muted}>You’re not in a circle yet.</p>}
          </section>

          <section className={h.card}>
            <div className={h.sectionHead}>
              <h2>Savings plans</h2>
              <button className={h.seeAll} onClick={() => nav('/save/new')}>
                New plan
              </button>
            </div>
            {(plans ?? [])
              .filter((p) => p.status === 'active')
              .slice(0, 3)
              .map((p) => (
                <button key={p.id} className={h.mini} onClick={() => nav(`/save/${p.id}`)}>
                  <span className={h.miniTop}>
                    <span className={h.miniTitle}>{p.name}</span>
                    <span className={h.miniValue}>{money(p.balance)}</span>
                  </span>
                  <span className={h.miniMeta}>
                    {p.type === 'locked'
                      ? `Locked ${p.lock_months} months · ${parseFloat(p.interest.annual_rate_percent)}% a year`
                      : `${parseFloat(p.progress_percent ?? '0')}% of ${money(p.target_amount, { decimals: 0 })} · ${parseFloat(p.interest.annual_rate_percent)}% a year`}
                  </span>
                  {p.type === 'goal' && <Progress value={parseFloat(p.progress_percent ?? '0') / 100} height={5} />}
                </button>
              ))}
            {plans?.length === 0 && <p className={h.muted}>Start a goal and earn interest every day.</p>}
          </section>
        </aside>
      </div>
    </Screen>
  )
}
