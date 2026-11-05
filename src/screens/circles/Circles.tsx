import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { countdown, fullDate, monthDay, monthYear, ngn, shortAddress, usdt } from '@/core/format'
import type { Circle, CircleBadge } from '@/core/types'
import {
  useBrowseCircles, useCircle, useJoinCircle, useJoinQuote, useMandate, useMe, useMissed, useMovePayout, useMyCircles,
  usePayMissed, usePayout, useTrust,
} from '@/core/data'
import {
  Amount, AvatarStack, Badge, Button, Card, Dot, Eyebrow, FilterChips, H1, Header, Hero, Icon, IconButton, KeyValues, Pill, Row,
  Screen, SectionTitle, Segmented, Skeleton, Stack, useToast, uiStyles as u, cx,
} from '@/ui'
import { CircleRing, RingLegend } from '@/ui/charts'
import c from './circles.module.css'

const badgeLabel: Record<CircleBadge, string> = { popular: 'Popular', first: 'First circle', weekly: 'Weekly', locked: 'Locked' }
const tint: Record<CircleBadge, string> = { popular: c.tintSig!, first: c.tintChain!, weekly: c.tintPeach!, locked: '' }
type Filter = 'all' | 'month' | 'week' | 'under100' | 'private'

function CircleCard({ circle, trust, onClick }: { circle: Circle; trust: number; onClick: () => void }) {
  const locked = circle.requiresTrust !== undefined && trust < circle.requiresTrust
  return (
    <motion.button
      layout
      whileTap={{ scale: 0.985 }}
      className={cx(c.circleCard, circle.badge && tint[circle.badge], locked && c.locked)}
      onClick={onClick}
      aria-disabled={locked}
    >
      <Row justify="space-between" align="flex-start">
        <div>
          <div className={c.circleName}>{circle.name}</div>
          <div className={c.meta}>
            {circle.size} PEOPLE · {usdt(circle.contributionMinor, { decimals: 0 })} USDT / {circle.period.toUpperCase()}
          </div>
        </div>
        {circle.badge && <Badge tone={circle.badge === 'popular' ? 'sig' : 'neutral'}>{badgeLabel[circle.badge]}</Badge>}
      </Row>
      <Row justify="space-between" align="flex-end" style={{ marginTop: 14 }}>
        <div>
          <div className={c.pot}>{usdt(circle.potMinor, { decimals: 0 })}</div>
          <div className={u.rowSub}>USDT pot · deposit from {circle.depositFromPct}%</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <AvatarStack items={circle.members} />
          <span className={c.meta} style={{ marginTop: 0 }}>
            {locked ? `NEEDS TRUST ${circle.requiresTrust}` : circle.spotsLeft === 0 ? 'FULL' : `${circle.spotsLeft} SPOT${circle.spotsLeft === 1 ? '' : 'S'} LEFT`}
          </span>
        </div>
      </Row>
    </motion.button>
  )
}

/* ───────── 14 Circles ───────── */
export function Circles() {
  const nav = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState<'mine' | 'join'>('join')
  const [filter, setFilter] = useState<Filter>('all')
  const { data: trust } = useTrust()
  const { data: mine } = useMyCircles()
  const query = filter === 'month' || filter === 'week' ? { period: filter } : filter === 'under100' ? { maxContributionMinor: 10000 } : undefined
  const { data: browse } = useBrowseCircles(query)
  const score = trust?.score ?? 0
  const list = filter === 'private' ? [] : browse

  return (
    <Screen tabs>
      <Row justify="space-between" style={{ marginTop: 14 }}>
        <H1>Circles</H1>
        <Pill onClick={() => nav('/trust')}>
          <Dot />
          TRUST {trust?.score ?? '…'}
        </Pill>
      </Row>
      <Segmented
        style={{ marginTop: 20 }}
        options={[
          { value: 'mine', label: `My circles · ${mine?.length ?? 0}` },
          { value: 'join', label: 'Join a circle' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'join' ? (
        <>
          <div style={{ marginTop: 16 }}>
            <FilterChips<Filter>
              options={[
                { value: 'all', label: 'All' },
                { value: 'month', label: 'Monthly' },
                { value: 'week', label: 'Weekly' },
                { value: 'under100', label: 'Under 100 USDT' },
                { value: 'private', label: 'Private' },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </div>
          <Stack gap={12} style={{ marginTop: 16 }}>
            {list?.map((ci) => (
              <CircleCard
                key={ci.id}
                circle={ci}
                trust={score}
                onClick={() => (ci.requiresTrust && score < ci.requiresTrust ? toast(`Reach trust ${ci.requiresTrust} to join`) : nav(`/circles/${ci.id}/join`))}
              />
            ))}
            {list && list.length === 0 && <p className={c.empty}>{filter === 'private' ? 'Private circles need an invite link from a friend.' : 'No circles match this filter yet.'}</p>}
            {!list && [0, 1, 2].map((i) => <Skeleton key={i} h={134} r={20} />)}
          </Stack>
        </>
      ) : (
        <Stack gap={12} style={{ marginTop: 16 }}>
          {mine?.map((ci) => <CircleCard key={ci.id} circle={{ ...ci, badge: undefined, spotsLeft: 0 }} trust={score} onClick={() => nav(`/circles/${ci.id}`)} />)}
        </Stack>
      )}
    </Screen>
  )
}

/* ───────── 15 Join circle: deposit & pick turn ───────── */
export function JoinCircle() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data: q } = useJoinQuote(id)
  const join = useJoinCircle()
  const [pct, setPct] = useState<number | null>(null)
  const [spot, setSpot] = useState<number | null>(null)

  const deposit = q?.deposits.find((d) => d.pct === (pct ?? q.deposits[q.deposits.length - 1]!.pct))
  const firstFree = (from: number) => q?.spots.find((s) => s.state === 'free' && s.n >= from)?.n ?? null
  useEffect(() => {
    if (q && pct === null) {
      const last = q.deposits[q.deposits.length - 1]!
      setPct(last.pct)
      setSpot(firstFree(last.fromSpot))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const chosen = q?.spots.find((s) => s.n === spot)
  const circle = q?.circle
  const monthly = circle ? Math.round(circle.contributionMinor * (1 + (q?.feePct ?? 0) / 100)) : 0
  const collect = circle ? Math.round(circle.potMinor * 0.995) : 0

  if (!q || !circle || !deposit) {
    return (
      <Screen header={<Header title="Join circle" />}>
        <Skeleton h={150} r={22} />
      </Screen>
    )
  }
  return (
    <Screen
      header={<Header title="Join circle" />}
      footer={
        <Button
          icon="lock"
          disabled={!spot}
          loading={join.isPending}
          onClick={async () => {
            await join.mutateAsync({ circleId: circle.id, depositPct: deposit.pct, spot: spot! })
            toast(`You joined ${circle.name}`)
            nav('/circles/yaba-tech', { replace: true })
          }}
        >
          Lock {usdt(deposit.amountMinor, { decimals: 0 })} USDT &amp; join
        </Button>
      }
    >
      <div className={c.inkCard}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>{circle.name}</div>
        <div className={c.meta} style={{ color: '#8C9198' }}>
          {circle.size} PEOPLE · {usdt(circle.contributionMinor, { decimals: 0 })} USDT / {circle.period.toUpperCase()} · STARTS {monthDay(circle.startsAt).toUpperCase()}
        </div>
        <div style={{ marginTop: 14 }}>
          <Amount minor={circle.potMinor} decimals={0} size={44} ccy="USDT POT" color="#ECEAE4" ccyColor="#8C9198" />
        </div>
      </div>

      <SectionTitle right={<span style={{ fontSize: 13, color: 'var(--muted)' }}>Bigger = earlier turn</span>}>Safety deposit</SectionTitle>
      <div className={c.threeUp}>
        {q.deposits.map((d) => (
          <button
            key={d.pct}
            className={cx(c.option, d.pct === deposit.pct && c.optionOn)}
            onClick={() => {
              setPct(d.pct)
              if (!spot || spot < d.fromSpot) setSpot(firstFree(d.fromSpot))
            }}
            aria-pressed={d.pct === deposit.pct}
          >
            <span className={c.optionTitle}>{d.pct}%</span>
            <span className="mono" style={{ fontSize: 10.5, letterSpacing: 0.6 }}>
              {usdt(d.amountMinor, { decimals: 0 })} · SPOT {String(d.fromSpot).padStart(2, '0')}+
            </span>
          </button>
        ))}
      </div>

      <SectionTitle right={chosen && <span className="mono" style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: 1 }}>SPOT {String(chosen.n).padStart(2, '0')} · {fullDate(chosen.date).toUpperCase()}</span>}>
        Pick your turn
      </SectionTitle>
      <div className={c.spots}>
        {q.spots.map((s) => {
          const disabled = s.state !== 'free' || s.n < deposit.fromSpot
          const mineSpot = s.n === spot
          return (
            <button
              key={s.n}
              disabled={disabled}
              onClick={() => setSpot(s.n)}
              className={cx(c.spot, s.state === 'kolofi' && c.spotKolofi, s.state === 'taken' && c.spotTaken, mineSpot && c.spotMine, s.state === 'free' && disabled && c.spotLocked)}
              aria-label={`Spot ${s.n} ${s.state}`}
            >
              <span className="mono" style={{ fontSize: 15 }}>{String(s.n).padStart(2, '0')}</span>
              {s.state === 'kolofi' && <small>KÓLÓFI</small>}
              {s.state === 'taken' && <small>TAKEN</small>}
              {mineSpot && <small>YOURS</small>}
            </button>
          )
        })}
      </div>
      <Row gap={18} style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
        <Row gap={6}>
          <span style={{ width: 10, height: 10, borderRadius: 5, border: '1.5px dashed var(--chain)' }} /> Kólófi spot
        </Row>
        <Row gap={6}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--line-strong)' }} /> Taken
        </Row>
        <Row gap={6}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--sig)' }} /> Yours
        </Row>
      </Row>

      <KeyValues
        style={{ marginTop: 22 }}
        rowHeight={49}
        rows={[
          { label: 'You lock today', value: `${usdt(deposit.amountMinor, { decimals: 0 })} USDT`, mono: true },
          { label: `Each ${circle.period} (incl. ${q.feePct}% fee)`, value: `${usdt(monthly)} USDT`, mono: true },
          { label: `You collect on ${chosen ? monthDay(chosen.date) : '—'}`, value: `${usdt(collect)} USDT`, mono: true, accent: true },
          { label: 'Deposit back', value: monthYear(q.depositBack), mono: true },
        ]}
      />
    </Screen>
  )
}

/* ───────── 16 Circle detail ───────── */
export function CircleDetailScreen() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { data: ci } = useCircle(id)
  const [menu, setMenu] = useState(false)

  return (
    <Screen
      header={
        <Header
          title={ci?.name ?? ' '}
          sub={ci && `${ci.status.toUpperCase()} · CYCLE ${ci.cycle}/${ci.size}`}
          right={
            <div style={{ position: 'relative' }}>
              <IconButton icon="more" label="More" onClick={() => setMenu((m) => !m)} />
              {menu && (
                <div className={c.menu} role="menu">
                  <button role="menuitem" onClick={() => nav(`/circles/${id}/payout`)}>Pot collected (demo)</button>
                  <button role="menuitem" onClick={() => nav(`/circles/${id}/missed`)}>Missed payment (demo)</button>
                  <button role="menuitem" onClick={() => setMenu(false)}>Invite a friend</button>
                </div>
              )}
            </div>
          }
        />
      }
    >
      {!ci ? (
        <Skeleton h={300} r={150} w={300} style={{ margin: '0 auto' }} />
      ) : (
        <>
          <CircleRing spots={ci.spots} size={330}>
            <div style={{ textAlign: 'center' }}>
              <Eyebrow>This cycle’s pot</Eyebrow>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: '40px', marginTop: 8 }}>{usdt(ci.currentPot.amountMinor, { decimals: 0 })}</div>
              <div style={{ fontSize: 13, color: 'var(--body)', marginTop: 4 }}>
                → {ci.currentPot.toLabel} · {monthDay(ci.currentPot.date)}
              </div>
            </div>
          </CircleRing>
          <div style={{ marginTop: 16 }}>
            <RingLegend />
          </div>

          <div className={c.turn}>
            <div>
              <Eyebrow style={{ color: 'rgba(14,16,19,0.7)' }}>Your turn · Spot {String(ci.myTurn.spot).padStart(2, '0')}</Eyebrow>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: '34px', marginTop: 6 }}>{fullDate(ci.myTurn.date)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 19 }}>{usdt(ci.myTurn.payoutMinor)}</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>USDT after fee</div>
            </div>
          </div>

          <div className={c.stats}>
            <Card className={c.stat}>
              <Eyebrow style={{ fontSize: 10 }}>You’ve paid in</Eyebrow>
              <div className={c.statValue}>{usdt(ci.paidInMinor)}</div>
              <div className={c.statSub}>
                {ci.paymentsMade} of {ci.size} payments
              </div>
            </Card>
            <Card className={c.stat}>
              <Eyebrow style={{ fontSize: 10 }}>Your deposit</Eyebrow>
              <div className={c.statValue}>{usdt(ci.depositMinor)}</div>
              <div className={c.statSub} style={{ color: 'var(--accent)' }}>Locked · comes back</div>
            </Card>
            <Card className={c.stat}>
              <Eyebrow style={{ fontSize: 10 }}>Backup money</Eyebrow>
              <div className={c.statValue}>{usdt(ci.backupMinor)}</div>
              <div className={c.statSub}>Covers missed payments</div>
            </Card>
            <Card className={c.stat}>
              <Eyebrow style={{ fontSize: 10 }}>Missed payouts</Eyebrow>
              <div className={c.statValue} style={{ color: 'var(--accent)' }}>{ci.missedPayouts}</div>
              <div className={c.statSub}>Since {monthDay(ci.missedSince)}</div>
            </Card>
          </div>

          <Card style={{ marginTop: 10, padding: '16px 18px', marginBottom: 12 }}>
            <Row justify="space-between">
              <Eyebrow style={{ fontSize: 10 }}>Vault contract</Eyebrow>
              <Row gap={6} style={{ fontSize: 13, color: 'var(--chain)' }}>
                <Dot color="var(--chain)" /> {ci.network}
              </Row>
            </Row>
            <Row justify="space-between" style={{ marginTop: 10 }}>
              <span className="mono" style={{ fontSize: 15 }}>{shortAddress(ci.vault, 10, 8)}</span>
              <a className={c.explorer} href={`https://basescan.org/address/${ci.vault}`} target="_blank" rel="noreferrer">
                Explorer <Icon name="arrowUpRight" size={13} stroke={2} />
              </a>
            </Row>
          </Card>
        </>
      )}
    </Screen>
  )
}

/* ───────── 17 Your turn: pot collected ───────── */
export function PayoutScreen() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data: p } = usePayout(id)
  const { data: me } = useMe()
  const move = useMovePayout()
  const done = async (to: 'savings' | 'wallet') => {
    await move.mutateAsync({ circleId: id, to })
    toast(to === 'savings' ? 'Moved to Savings' : 'Kept in your wallet')
    nav('/home', { replace: true })
  }
  return (
    <Screen
      hero="soft"
      header={<Header close={() => nav(-1)} />}
      footer={
        <>
          <Button glow loading={move.isPending && move.variables?.to === 'savings'} onClick={() => done('savings')}>
            Move to Savings
          </Button>
          <Button variant="secondary" onClick={() => done('wallet')}>
            Keep in Wallet
          </Button>
        </>
      }
    >
      <div className={c.glowWrap}>
        <motion.div className={c.glowCheck} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
          <Icon name="check" size={46} stroke={2.6} color="#0E1013" />
        </motion.div>
      </div>
      {p && (
        <>
          <Eyebrow accent style={{ textAlign: 'center' }}>
            {p.circleName} · Spot {String(p.spot).padStart(2, '0')}
          </Eyebrow>
          <Hero style={{ textAlign: 'center', marginTop: 12, fontSize: 34 }}>It’s your turn, {me?.preferredName ?? ''}</Hero>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <Amount minor={p.netMinor} size={62} ccy="USDT" mutedDecimals={false} />
          </div>
          <p style={{ textAlign: 'center', color: 'var(--body)', fontSize: 15, marginTop: 6 }}>Sent to your wallet · ≈ {ngn(p.ngnMinor)}</p>
          <KeyValues
            style={{ marginTop: 28 }}
            rows={[
              { label: 'Pot', value: usdt(p.potMinor), mono: true },
              { label: `Pot fee (${p.feePct}%)`, value: usdt(-p.feeMinor), mono: true },
              {
                label: 'Transaction',
                value: (
                  <a href={`https://basescan.org/tx/${p.tx}`} target="_blank" rel="noreferrer" style={{ color: 'var(--chain)', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    {shortAddress(p.tx, 6, 4)} <Icon name="external" size={13} color="var(--chain)" />
                  </a>
                ),
                mono: true,
              },
            ]}
          />
          <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: 14, lineHeight: '18px' }}>
            Keep paying {usdt(p.contributionMinor, { decimals: 0 })} USDT a month until {monthYear(p.paysUntil)}. Your {usdt(p.depositMinor, { decimals: 0 })} USDT deposit comes back after.
          </p>
        </>
      )}
    </Screen>
  )
}

/* ───────── 18 Missed payment ───────── */
export function MissedPaymentScreen() {
  const nav = useNavigate()
  const toast = useToast()
  const { data: m } = useMissed()
  const { data: trust } = useTrust()
  const { data: mandate } = useMandate()
  const pay = usePayMissed()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const left = useMemo(() => (m?.graceEndsAt ? new Date(m.graceEndsAt).getTime() - now : 0), [m, now])
  const doPay = async (from: 'wallet' | 'bank') => {
    if (!m) return
    await pay.mutateAsync({ id: m.id, from })
    toast('Payment sent. Your trust score is safe.')
    nav(-1)
  }
  return (
    <Screen
      header={<Header title="Payment Missed" />}
      footer={
        m && (
          <>
            <Button loading={pay.isPending && pay.variables?.from === 'wallet'} onClick={() => doPay('wallet')}>
              Pay {usdt(m.amountMinor, { decimals: 0 })} USDT Now
            </Button>
            <Button variant="secondary" onClick={() => doPay('bank')}>
              Pay From {mandate?.bankName ?? 'Bank'}
            </Button>
          </>
        )
      }
    >
      {m ? (
        <>
          <div className={c.graceCard}>
            <Eyebrow style={{ color: 'var(--flare)' }}>Grace time left</Eyebrow>
            <div className={c.countdown} aria-live="polite">{countdown(left)}</div>
            <p style={{ fontSize: 15, lineHeight: '23px', marginTop: 6 }}>
              Your <b>{usdt(m.amountMinor, { decimals: 0 })} USDT</b> payment for {m.circleName} didn’t go through on {monthDay(m.dueDate)}. Your bank said “{m.reason}”.
            </p>
          </div>
          <SectionTitle style={{ marginTop: 22 }}>What happens next</SectionTitle>
          <ol className={c.timeline}>
            {m.steps.map((s, i) => (
              <li key={s.title} className={cx(c.tStep, c[`t_${s.state}`])}>
                <span className={c.tMark}>{s.state === 'done' ? <Icon name="check" size={13} stroke={2.6} /> : i + 1}</span>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{s.title}</div>
                  <div className={u.rowSub}>{s.detail}</div>
                </div>
              </li>
            ))}
          </ol>
          <Card style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px', marginTop: 8 }}>
            <span className={c.trustChip}>{trust?.score ?? '…'}</span>
            <span style={{ fontSize: 13.5, color: 'var(--body)', lineHeight: '20px' }}>
              Pay within 48 hours and your trust score stays the same. If your deposit has to cover it, it drops by {m.trustPenalty}.
            </span>
          </Card>
        </>
      ) : (
        <Skeleton h={200} r={20} />
      )}
    </Screen>
  )
}
