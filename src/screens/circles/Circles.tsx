import { useNavigate } from 'react-router'
import { cycleNoun, money, percent, shortDate } from '@/core/format'
import type { Circle, CirclePackage } from '@/core/types'
import { useMyCircles, usePackages, useReputation } from '@/core/data'
import { Button, EmptyState, Icon, Progress, Screen, Skeleton, cx } from '@/ui'
import { StatusTag, cycleWord, slotNo } from './shared'
import c from './circles.module.css'

export { PackageJoin } from './PackageJoin'
export { JoinByCode } from './JoinByCode'
export { CircleDetail } from './CircleDetail'
export { Market } from './Market'

const steps = [
  { title: 'Pick a package', body: 'Seats, contribution and cycle are fixed. The pot is seats × contribution.' },
  { title: 'Lock collateral', body: 'A share of the pot, returned at the end. More collateral unlocks earlier slots.' },
  { title: 'Pay automatically', body: 'Each cycle your payment is taken from your wallet. A missed one is covered, then repaid from your pot.' },
  { title: 'Take the pot', body: 'Slots are drawn at random with a seed you can check. On your turn the pot is yours.' },
]

/* ───────── 14 Circles ───────── */
export function Circles() {
  const nav = useNavigate()
  const { data: mine } = useMyCircles()
  const { data: packages } = usePackages()
  const { data: rep } = useReputation()

  return (
    <Screen tabs width="wide">
      <header className={c.pageHead}>
        <div className={c.pageTitleWrap}>
          <h1 className={c.pageTitle}>Circles</h1>
          <p className={c.pageLead}>Ajo with a safety net: everyone pays in each cycle, one seat takes the pot, and nobody can run with it.</p>
        </div>
        <div className={c.headActions}>
          {rep && (
            <button className={c.repPill} onClick={() => nav('/reputation')} aria-label={`Reputation ${rep.score}`}>
              <span className={c.repDot} />
              REP {rep.score}
            </button>
          )}
          <Button variant="outline" icon="swap" className={c.deskBtn} onClick={() => nav('/circles/market')}>
            Seat market
          </Button>
          <Button icon="key" className={c.deskBtn} onClick={() => nav('/circles/join-code')}>
            Join with invite code
          </Button>
        </div>
      </header>

      {/* Phone entry points; on desktop these are header buttons. */}
      <div className={c.entryRow}>
        <button className={c.entry} onClick={() => nav('/circles/join-code')}>
          <Icon name="key" size={20} />
          <span>
            <b>Invite code</b>
            <small>Join a private circle</small>
          </span>
        </button>
        <button className={c.entry} onClick={() => nav('/circles/market')}>
          <Icon name="swap" size={20} />
          <span>
            <b>Seat market</b>
            <small>Waitlist and seats for sale</small>
          </span>
        </button>
      </div>

      <ol className={c.how}>
        {steps.map((s, i) => (
          <li key={s.title}>
            <span className={c.howNo}>{i + 1}</span>
            <div>
              <b>{s.title}</b>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* ── My circles ── */}
      <div className={c.sectionHead}>
        <h2>Your circles</h2>
        {mine && mine.length > 0 && <span className={c.count}>{mine.length}</span>}
      </div>
      {!mine && (
        <div className={c.myGrid}>
          {[0, 1].map((i) => (
            <Skeleton key={i} h={150} r={22} />
          ))}
        </div>
      )}
      {mine?.length === 0 && (
        <div className={c.emptyCard}>
          <EmptyState title="You’re not in a circle yet">Pick a package below. Your collateral is locked now and comes back at the end.</EmptyState>
        </div>
      )}
      {mine && mine.length > 0 && (
        <div className={c.myGrid}>
          {mine.map((ci) => (
            <MyCircleCard key={ci.id} circle={ci} onClick={() => nav(`/circles/${ci.id}`)} />
          ))}
        </div>
      )}

      {/* ── Packages: cards on phone, comparison table on desktop ── */}
      <div className={c.sectionHead}>
        <h2>Join a circle</h2>
        <span className={c.sectionNote}>Kólófi’s own seats take the earliest slots in every circle.</span>
      </div>
      <div className={c.pkgTable}>
        <div className={c.pkgHead} aria-hidden>
          <span>Package</span>
          <span>Seats</span>
          <span>You pay</span>
          <span>Pot</span>
          <span>Collateral options</span>
          <span />
        </div>
        {!packages && [0, 1, 2].map((i) => <Skeleton key={i} h={120} r={18} style={{ margin: '8px 0' }} />)}
        {packages?.map((p) => <PackageRow key={p.id} pkg={p} score={rep?.score} onJoin={() => nav(`/circles/packages/${p.id}`)} />)}
      </div>
    </Screen>
  )
}

function MyCircleCard({ circle: ci, onClick }: { circle: Circle; onClick: () => void }) {
  const seat = ci.my_seat
  const running = ci.status === 'active'
  return (
    <button className={cx(c.myCard, running && c.myCardLive, (ci.status === 'cancelled' || ci.status === 'unwound') && c.myCardDim)} onClick={onClick}>
      <div className={c.myTop}>
        <div style={{ minWidth: 0 }}>
          <div className={c.myName}>{ci.package}</div>
          <div className={c.meta}>
            {ci.members} SEATS · {cycleWord(ci.cycle).toUpperCase()}
            {ci.visibility === 'private' && ' · PRIVATE'}
          </div>
        </div>
        <StatusTag status={ci.status} />
      </div>
      <div className={c.myMid}>
        <div>
          <div className={c.myPot}>{money(ci.pot, { decimals: 0 })}</div>
          <div className={c.mySub}>
            USDT pot · {money(ci.per_cycle_total)} a {cycleNoun(ci.cycle)}
          </div>
        </div>
        {seat && (
          <div className={c.mySeat}>
            <span>Your slot</span>
            <b>{slotNo(seat.slot)}</b>
          </div>
        )}
      </div>
      {running ? (
        <div className={c.myFoot}>
          <Progress value={ci.current_cycle / ci.members} height={5} />
          <span>
            Cycle {ci.current_cycle} of {ci.members}
            {seat && seat.slot > ci.current_cycle && ` · your turn in ${seat.slot - ci.current_cycle}`}
            {seat && seat.slot === ci.current_cycle && ' · your turn now'}
          </span>
        </div>
      ) : (
        <div className={c.myFoot}>
          <span>
            {ci.status === 'forming' && `Filling · starts once full, deadline ${shortDate(ci.fill_deadline_at)}`}
            {ci.status === 'completed' && 'All pots paid. Collateral returned.'}
            {ci.status === 'cancelled' && 'Did not fill in time. Collateral returned.'}
            {ci.status === 'unwound' && 'Closed early and settled.'}
          </span>
        </div>
      )}
    </button>
  )
}

function PackageRow({ pkg: p, score, onJoin }: { pkg: CirclePackage; score?: number; onJoin: () => void }) {
  const gated = !!p.min_reputation && score !== undefined && score < p.min_reputation
  const per = p.options[0]?.per_cycle_total ?? p.contribution
  const pot = p.options[0]?.pot ?? String(parseFloat(p.contribution) * p.members)
  const earliest = Math.min(...p.options.map((o) => o.earliest_slot))
  return (
    <div className={cx(c.pkgRow, gated && c.pkgGated)}>
      <div className={c.pkgName}>
        <b>{p.name}</b>
        <span className={c.pkgMeta}>
          You pay {money(per)} a {cycleNoun(p.cycle)} · {p.grace_hours}h grace on a failed payment
        </span>
        <span className={c.pkgTags}>
          <span>{p.house_seats} Kólófi seats</span>
          {p.allow_private && <span>Private OK</span>}
          {p.min_reputation ? <span data-tone="chain">Rep {p.min_reputation}+</span> : null}
        </span>
      </div>
      <span className={c.pkgCell}>{p.members}</span>
      <span className={c.pkgCell}>
        {money(per)} <small>/ {cycleNoun(p.cycle)}</small>
      </span>
      <span className={c.pkgPot}>
        {money(pot, { decimals: 0 })}
        <small> USDT pot</small>
      </span>
      <span className={c.pkgOpts}>
        {p.options.map((o) => (
          <span key={o.collateral_bps} className={c.optChip}>
            {percent(o.collateral_percent)} · {money(o.collateral, { decimals: 0 })} · slot {o.earliest_slot}+
          </span>
        ))}
        {Number.isFinite(earliest) && <span className={c.pkgHint}>Earliest possible turn: slot {earliest}</span>}
      </span>
      <span className={c.pkgJoin}>
        {gated ? (
          <span className={c.gateNote}>Needs reputation {p.min_reputation}</span>
        ) : (
          <Button onClick={onJoin} className={c.joinBtn}>
            Join
          </Button>
        )}
      </span>
    </div>
  )
}
