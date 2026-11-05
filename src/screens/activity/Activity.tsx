import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { cents, dateTime, money, pad2, shortAddress, usdt } from '@/core/format'
import type { ActivityEntry, Statement } from '@/core/types'
import type { IconName } from '@/core/icons'
import { useActivity, useStatement } from '@/core/data'
import { Button, Chips, EmptyState, FilterChips, Icon, Modal, Notice, Panel, Screen, Skeleton, TextField, Tile, cx, errorText, useIsDesktop } from '@/ui'
import { PageHead } from '../wallet/parts'
import a from './activity.module.css'

type Filter = 'all' | 'in' | 'out'

/** Local calendar date as the API's Y-m-d. */
const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const fromYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}
const longDay = (s: string) => fromYmd(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const clockTime = (iso: string) => {
  const d = new Date(iso)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function dayLabel(key: string) {
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (key === ymd(today)) return 'Today'
  if (key === ymd(yesterday)) return 'Yesterday'
  const d = fromYmd(key)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) })
}

const entryIcon = (e: ActivityEntry): IconName =>
  e.type.includes('circle')
    ? 'circles'
    : e.type.includes('savings')
      ? 'vault'
      : e.type.includes('withdrawal')
        ? 'arrowUpRight'
        : e.type.includes('deposit')
          ? 'arrowDownLeft'
          : e.type.includes('interest')
            ? 'sparkle'
            : 'activity'

const kindLabel = (kind: string) => kind.replace(/_/g, ' ')

/** What the entry points at: a plan name, a circle, a transaction hash or a record id. */
function referenceText(e: ActivityEntry): string {
  const r = e.reference
  if (!r) return '—'
  if (r.plan) return r.plan
  if (r.circle) return r.circle
  if (r.tx_hash) return shortAddress(r.tx_hash, 8, 6)
  if (r.id) return shortAddress(r.id, 6, 4)
  return kindLabel(r.kind)
}
/** Label for the reference column: what kind of value is shown under it. */
function referenceKind(e: ActivityEntry): string {
  const r = e.reference
  if (!r) return ''
  if (r.plan) return 'Savings plan'
  if (r.circle) return 'Circle'
  if (r.tx_hash) return 'Tx hash'
  return 'Reference'
}
const isMonoReference = (e: ActivityEntry) => !!e.reference && !e.reference.plan && !e.reference.circle && !!(e.reference.tx_hash || e.reference.id)
const withdrawalLink = (e: ActivityEntry) => (e.reference?.kind === 'crypto_withdrawal' && e.reference.id ? `/wallet/withdrawals/${e.reference.id}` : null)

/* ═════════ Activity ═════════ */
export function Activity() {
  const nav = useNavigate()
  const isTable = useIsDesktop(768)
  const isDesktop = useIsDesktop(1100)
  const { items, hasNextPage, fetchNextPage, isFetchingNextPage, error } = useActivity()
  const [filter, setFilter] = useState<Filter>('all')
  const [statementOpen, setStatementOpen] = useState(false)

  const rows = useMemo(() => (items ?? []).filter((e) => filter === 'all' || e.direction === filter), [items, filter])
  const groups = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>()
    rows.forEach((e) => {
      const key = ymd(new Date(e.created_at))
      map.set(key, [...(map.get(key) ?? []), e])
    })
    return [...map.entries()]
  }, [rows])

  return (
    <Screen tabs width="wide">
      <PageHead
        title="Activity"
        eyebrow="Wallet history · USDT"
        back="/home"
        actions={
          isDesktop ? undefined : (
            <Button variant="outline" icon="download" onClick={() => setStatementOpen(true)}>
              Statement
            </Button>
          )
        }
        phoneRight={
          <button type="button" className={a.iconBtn} aria-label="Get a statement" onClick={() => setStatementOpen(true)}>
            <Icon name="download" size={20} />
          </button>
        }
      />

      <div className={a.layout}>
        <section className={a.main}>
          <div className={a.toolbar}>
            <FilterChips
              options={[
                { value: 'all', label: 'All' },
                { value: 'in', label: 'Money in' },
                { value: 'out', label: 'Money out' },
              ]}
              value={filter}
              onChange={setFilter}
            />
            {items && (
              <span className={a.count}>
                {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                {hasNextPage ? ' so far' : ''}
              </span>
            )}
          </div>

          {error && <Notice tone="flare">{errorText(error)}</Notice>}

          {items === undefined && !error && (
            <div className={a.card}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ padding: '12px 0' }}>
                  <Skeleton h={40} />
                </div>
              ))}
            </div>
          )}

          {items && rows.length === 0 && (
            <div className={a.card}>
              <EmptyState icon="activity" title={filter === 'all' ? 'Nothing here yet' : `No money ${filter} yet`} action={<Button variant="outline" onClick={() => nav('/wallet/add')}>Add money</Button>}>
                Deposits, withdrawals, savings and circle payments show up here.
              </EmptyState>
            </div>
          )}

          {rows.length > 0 &&
            (isTable ? (
              <div className={a.card}>
                <div className={a.tHead} aria-hidden>
                  <span>Activity</span>
                  <span>Reference</span>
                  <span>Date &amp; time</span>
                  <span>Amount</span>
                  <span>Balance</span>
                </div>
                {rows.map((e) => (
                  <EntryRow key={e.id} e={e} table />
                ))}
              </div>
            ) : (
              groups.map(([key, list]) => (
                <div key={key} className={a.group}>
                  <div className={a.dayHead}>{dayLabel(key)}</div>
                  <div className={a.card}>
                    {list.map((e) => (
                      <EntryRow key={e.id} e={e} />
                    ))}
                  </div>
                </div>
              ))
            ))}

          {hasNextPage && (
            <div className={a.more}>
              <Button variant="ghost" loading={isFetchingNextPage} onClick={() => void fetchNextPage()}>
                Load older activity
              </Button>
            </div>
          )}
        </section>

        {isDesktop && (
          <aside className={a.side}>
            <Panel title="Statement" action={<span className={a.hint}>Lagos time</span>}>
              <StatementBuilder />
            </Panel>
          </aside>
        )}
      </div>

      {!isDesktop && (
        <Modal open={statementOpen} onClose={() => setStatementOpen(false)} title="Statement" sub="Opening and closing balances, totals and every entry for a date range." wide>
          <StatementBuilder />
        </Modal>
      )}
    </Screen>
  )
}

function EntryRow({ e, table }: { e: ActivityEntry; table?: boolean }) {
  const nav = useNavigate()
  const link = withdrawalLink(e)
  const sign = e.direction === 'in' ? '+' : '−'
  const content = (
    <>
      <span className={a.rowMain}>
        <Tile size={38} radius={11} tone={e.direction === 'in' ? 'sig' : 'neutral'}>
          <Icon name={entryIcon(e)} size={17} />
        </Tile>
        <span className={a.rowText}>
          <span className={a.rowTitle}>{e.label}</span>
          {!table && <span className={a.rowSub}>{`${referenceText(e)} · ${clockTime(e.created_at)}`}</span>}
        </span>
      </span>
      {table && (
        <span className={a.ref}>
          {e.reference && <span className={a.refKind}>{referenceKind(e)}</span>}
          <span className={cx(a.refValue, isMonoReference(e) && a.mono)}>{referenceText(e)}</span>
        </span>
      )}
      {table && <span className={a.date}>{dateTime(e.created_at)}</span>}
      <span className={a.amountCell}>
        <span className={cx(a.amount, e.direction === 'in' && a.in)}>
          {sign}
          {money(e.amount)}
        </span>
        {!table && <span className={a.balSmall}>{money(e.balance_after)}</span>}
      </span>
      {table && <span className={a.bal}>{money(e.balance_after)}</span>}
    </>
  )
  return link ? (
    <button type="button" className={cx(a.row, a.rowLink)} onClick={() => nav(link)}>
      {content}
    </button>
  ) : (
    <div className={a.row}>{content}</div>
  )
}

/* ═════════ Statement ═════════ */
type Range = { from: string; to: string }
type Preset = 'month' | 'last30' | 'lastMonth' | 'year'

function presetRange(p: Preset): Range {
  const now = new Date()
  const today = ymd(now)
  if (p === 'month') return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }
  if (p === 'last30') return { from: ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), to: today }
  if (p === 'lastMonth') return { from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)) }
  return { from: ymd(new Date(now.getFullYear(), 0, 1)), to: today }
}

function rangeError({ from, to }: Range): string | null {
  if (!from || !to) return 'Pick both dates.'
  if (from > to) return 'The start date must be before the end date.'
  if (to > ymd(new Date())) return 'The end date can’t be in the future.'
  if ((fromYmd(to).getTime() - fromYmd(from).getTime()) / 86_400_000 > 366) return 'A statement can cover at most 366 days.'
  return null
}

function StatementBuilder() {
  const [preset, setPreset] = useState<Preset | 'custom'>('month')
  const [range, setRange] = useState<Range>(() => presetRange('month'))
  const [applied, setApplied] = useState<Range | null>(null)
  const problem = rangeError(range)
  const q = useStatement(applied?.from ?? '', applied?.to ?? '', !!applied)
  const stale = !!applied && (applied.from !== range.from || applied.to !== range.to)

  const pick = (p: Preset | 'custom') => {
    setPreset(p)
    if (p !== 'custom') setRange(presetRange(p))
  }
  const edit = (patch: Partial<Range>) => {
    setPreset('custom')
    setRange((r) => ({ ...r, ...patch }))
  }

  return (
    <div className={a.statement}>
      <div className={a.presets}>
      <Chips
        options={[
          { value: 'month', label: 'This month' },
          { value: 'last30', label: '30 days' },
          { value: 'lastMonth', label: 'Last month' },
          { value: 'year', label: 'This year' },
        ]}
        value={preset}
        onChange={pick}
      />
      </div>
      <div className={a.dates}>
        <TextField label="From" type="date" sans value={range.from} max={range.to} onChange={(e) => edit({ from: e.target.value })} />
        <TextField label="To" type="date" sans value={range.to} min={range.from} max={ymd(new Date())} onChange={(e) => edit({ to: e.target.value })} />
      </div>
      {problem && <div className={a.error}>{problem}</div>}
      <Button variant={applied && !stale ? 'outline' : 'primary'} disabled={!!problem} loading={q.isFetching} onClick={() => (stale || !applied ? setApplied(range) : void q.refetch())}>
        {applied && !stale ? 'Refresh statement' : 'Get statement'}
      </Button>

      {q.error && <Notice tone="flare">{errorText(q.error)}</Notice>}
      {q.data && !stale && <StatementResult st={q.data} />}
    </div>
  )
}

function StatementResult({ st }: { st: Statement }) {
  const print = () => {
    document.body.dataset.print = 'statement'
    const done = () => {
      delete document.body.dataset.print
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }
  const net = cents(st.total_in) - cents(st.total_out)
  return (
    <div className={a.result}>
      <div className={a.period}>
        {longDay(st.from)} – {longDay(st.to)}
      </div>
      <div className={a.sums}>
        <div>
          <span>Opening balance</span>
          <b>{money(st.opening_balance)}</b>
        </div>
        <div>
          <span>Money in</span>
          <b className={a.in}>+{money(st.total_in)}</b>
        </div>
        <div>
          <span>Money out</span>
          <b>−{money(st.total_out)}</b>
        </div>
        <div>
          <span>Net</span>
          <b>{usdt(net, { sign: true })}</b>
        </div>
      </div>
      <div className={a.closing}>
        <span>Closing balance</span>
        <b>
          {money(st.closing_balance)} <small>USDT</small>
        </b>
      </div>
      <p className={a.note}>
        {st.entries.length} {st.entries.length === 1 ? 'entry' : 'entries'} · times in {st.timezone.replace('_', ' ')} · wallet available balance
      </p>
      <Button icon="download" onClick={print}>
        Print or save as PDF
      </Button>
      <PrintDocument st={st} />
    </div>
  )
}

/** A plain document that is the only thing printed while a statement print is running. */
function PrintDocument({ st }: { st: Statement }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => setHost(document.body), [])
  if (!host) return null
  return createPortal(
    <div className={a.printDoc}>
      <header className={a.pHead}>
        <div>
          <div className={a.pBrand}>Kólófi</div>
          <div className={a.pTitle}>Wallet statement · USDT</div>
        </div>
        <div className={a.pMeta}>
          <div>{st.member.name}</div>
          <div>
            {longDay(st.from)} – {longDay(st.to)}
          </div>
          <div>Times in {st.timezone}</div>
        </div>
      </header>
      <table className={a.pSum}>
        <tbody>
          <tr>
            <th>Opening balance</th>
            <th>Money in</th>
            <th>Money out</th>
            <th>Closing balance</th>
          </tr>
          <tr>
            <td>{money(st.opening_balance)}</td>
            <td>+{money(st.total_in)}</td>
            <td>−{money(st.total_out)}</td>
            <td>{money(st.closing_balance)}</td>
          </tr>
        </tbody>
      </table>
      <table className={a.pTable}>
        <thead>
          <tr>
            <th>Date &amp; time</th>
            <th>Activity</th>
            <th>Reference</th>
            <th>Amount (USDT)</th>
            <th>Balance after</th>
          </tr>
        </thead>
        <tbody>
          {st.entries.map((e) => (
            <tr key={e.id}>
              <td>{dateTime(e.created_at)}</td>
              <td>{e.label}</td>
              <td>{e.reference?.tx_hash ?? e.reference?.plan ?? e.reference?.circle ?? e.reference?.id ?? '—'}</td>
              <td>
                {e.direction === 'in' ? '+' : '−'}
                {money(e.amount)}
              </td>
              <td>{money(e.balance_after)}</td>
            </tr>
          ))}
          {st.entries.length === 0 && (
            <tr>
              <td colSpan={5}>No activity in this period.</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className={a.pFoot}>Generated {dateTime(new Date().toISOString())}.</p>
    </div>,
    host,
  )
}
