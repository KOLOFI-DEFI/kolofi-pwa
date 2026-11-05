import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { greeting, monthDay, ngn, shortAddress, usdt } from '@/core/format'
import type { Account, ChartRange } from '@/core/types'
import type { IconName } from '@/core/icons'
import { useAccounts, useBalance, useMe, useNextPayment, useNotifications } from '@/core/data'
import { Amount, Avatar, Card, Eyebrow, Icon, IconButton, ListRow, Row, Screen, SectionTitle, Skeleton, Stack, Tile, cx } from '@/ui'
import { LineChart } from '@/ui/charts'
import h from './home.module.css'

const RANGES: ChartRange[] = ['1W', '1M', '3M', '1Y', 'ALL']
const accountTile: Record<Account['kind'], { glyph: ReactNode; tone: 'neutral' | 'sig' | 'chain' }> = {
  deposit: { glyph: '$', tone: 'neutral' },
  savings: { glyph: <Icon name="target" size={18} />, tone: 'sig' },
  locked: { glyph: <Icon name="lock" size={17} />, tone: 'chain' },
}

export function Home() {
  const nav = useNavigate()
  const { data: me } = useMe()
  const { data: bal } = useBalance()
  const { data: accounts } = useAccounts()
  const { data: next } = useNextPayment()
  const { data: notes } = useNotifications()
  const [range, setRange] = useState<ChartRange>('1M')
  const unread = notes?.some((n) => !n.read)

  const actions: { label: string; icon: IconName; to: string; primary?: boolean }[] = [
    { label: 'Add', icon: 'plus', to: '/money/add', primary: true },
    { label: 'Withdraw', icon: 'arrowUpRight', to: '/money/withdraw' },
    { label: 'Save', icon: 'vault', to: '/save' },
    { label: 'Circles', icon: 'circles', to: '/circles' },
  ]

  return (
    <Screen tabs>
      <Row style={{ marginTop: 10 }}>
        <Avatar initials={me ? `${me.firstName[0]}${me.lastName[0]}` : ''} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, color: 'var(--body)' }}>
            {greeting()}, {me?.preferredName ?? ''}
          </div>
          <Row gap={6} style={{ marginTop: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--accent)' }} />
            <span className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>
              {me ? shortAddress(me.wallet.address) : '—'} <span style={{ color: 'var(--muted)' }}>·</span> {me?.wallet.network}
            </span>
          </Row>
        </div>
        <IconButton icon="bell" label="Notifications" badge={unread} onClick={() => nav('/notifications')} />
      </Row>

      <Eyebrow style={{ marginTop: 26 }}>Total balance</Eyebrow>
      {bal ? (
        <>
          <div style={{ marginTop: 6 }}>
            <Amount minor={bal.totalMinor} size={54} ccy="USDT" />
          </div>
          <Row gap={10} style={{ marginTop: 6 }}>
            <span style={{ fontSize: 14.5, color: 'var(--body)' }}>≈ {ngn(bal.ngnMinor)}</span>
            <span className={h.delta}>{usdt(bal.monthDeltaMinor, { sign: true })} this month</span>
          </Row>
          <div style={{ marginTop: 18 }}>
            <LineChart key={range} values={bal.history[range]} height={124} />
          </div>
        </>
      ) : (
        <Stack gap={10} style={{ marginTop: 8 }}>
          <Skeleton h={56} w={260} />
          <Skeleton h={20} w={200} />
          <Skeleton h={124} />
        </Stack>
      )}

      <div className={h.ranges} role="tablist" aria-label="Chart range">
        {RANGES.map((r) => (
          <button key={r} role="tab" aria-selected={r === range} className={cx(h.range, r === range && h.rangeOn)} onClick={() => setRange(r)}>
            {r}
          </button>
        ))}
      </div>

      <div className={h.actions}>
        {actions.map((a) => (
          <button key={a.label} className={cx(h.action, a.primary && h.actionPrimary)} onClick={() => nav(a.to)}>
            <Icon name={a.icon} size={22} />
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {next && (
        <div className={h.next}>
          <svg className={h.nextArc} viewBox="0 0 200 200" aria-hidden>
            <circle cx="100" cy="100" r="98" fill="none" stroke="currentColor" strokeDasharray="3 4" />
          </svg>
          <Row justify="space-between">
            <Eyebrow style={{ color: 'rgba(14,16,19,0.7)' }}>Next payment · {next.auto ? 'Auto' : 'Manual'}</Eyebrow>
            <Eyebrow style={{ color: 'rgba(14,16,19,0.7)' }}>In {next.inDays} days</Eyebrow>
          </Row>
          <Row justify="space-between" align="flex-end" style={{ marginTop: 10 }}>
            <div>
              <div className={h.nextAmount}>{usdt(next.amountMinor, { decimals: 0 })} USDT</div>
              <div style={{ fontSize: 14.5, marginTop: 2 }}>
                {next.circleName} · {monthDay(next.dueDate)}
              </div>
            </div>
            <button className={h.view} onClick={() => nav(`/circles/${next.circleId}`)}>
              View
            </button>
          </Row>
        </div>
      )}

      <SectionTitle right={<button className={h.seeAll} onClick={() => nav('/save')}>See all</button>}>Accounts</SectionTitle>
      <Stack gap={8}>
        {(accounts ?? []).map((acc) => (
          <Card key={acc.id} pad={false} onClick={() => nav(acc.kind === 'locked' ? '/save/locked' : '/save')}>
            <ListRow
              tile={<Tile tone={accountTile[acc.kind].tone}>{accountTile[acc.kind].glyph}</Tile>}
              title={acc.title}
              sub={acc.subtitle}
              value={usdt(acc.balanceMinor)}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        ))}
        {!accounts && [0, 1, 2].map((i) => <Skeleton key={i} h={68} r={18} />)}
      </Stack>
    </Screen>
  )
}
