import { useState } from 'react'
import { useNavigate } from 'react-router'
import { money, shortDate, timeAgo } from '@/core/format'
import type { SeatTransfer, Takeover } from '@/core/types'
import { useMarketActions, useTakeovers, useTransfers, useWaitlist, useWaitlistActions } from '@/core/data'
import { Button, EmptyState, Header, Modal, Screen, Segmented, Skeleton, cx, errorText, usePin, useToast } from '@/ui'
import { COMMON_LEVELS, levelPct, slotNo } from './shared'
import c from './circles.module.css'

type Tab = 'waitlist' | 'takeovers' | 'transfers'

const transferStatus: Record<SeatTransfer['status'], string> = { pending: 'Pending', completed: 'Completed', declined: 'Declined', cancelled: 'Withdrawn', expired: 'Expired' }

/* ───────── Seat market: waitlist, takeovers, seat offers ───────── */
export function Market() {
  const nav = useNavigate()
  const { data: waitlist } = useWaitlist()
  const { data: takeovers } = useTakeovers()
  const { data: transfers } = useTransfers()
  const waiting = (waitlist ?? []).filter((w) => w.status === 'waiting').length
  const pendingOffers = (transfers ?? []).filter((t) => t.status === 'pending').length
  const [tab, setTab] = useState<Tab>(pendingOffers > 0 ? 'transfers' : 'waitlist')

  return (
    <Screen tabs width="wide" header={<Header back={() => nav('/circles')} title="Seat market" />}>
      <p className={c.help} style={{ marginTop: 0, maxWidth: 720 }}>
        When a member leaves a running circle, their seat goes up for takeover. Join a package’s waitlist to be offered these seats; you pay the contributions already due plus your collateral, and step into that slot.
      </p>

      <div className={c.statRow}>
        <button className={cx(c.statCard, tab === 'waitlist' && c.statOn)} onClick={() => setTab('waitlist')}>
          <span className={c.factLabel}>Waiting for a seat</span>
          <b>{waitlist ? waiting : '—'}</b>
          <small>package{waiting === 1 ? '' : 's'}</small>
        </button>
        <button className={cx(c.statCard, tab === 'takeovers' && c.statOn)} onClick={() => setTab('takeovers')}>
          <span className={c.factLabel}>Seats for sale</span>
          <b>{takeovers ? takeovers.length : '—'}</b>
          <small>you can buy now</small>
        </button>
        <button className={cx(c.statCard, tab === 'transfers' && c.statOn)} onClick={() => setTab('transfers')}>
          <span className={c.factLabel}>Seat offers</span>
          <b>{transfers ? pendingOffers : '—'}</b>
          <small>pending</small>
        </button>
      </div>

      <div className={c.phoneTabs}>
      <Segmented<Tab>
        options={[
          { value: 'waitlist', label: waiting ? `Waitlist · ${waiting}` : 'Waitlist' },
          { value: 'takeovers', label: takeovers?.length ? `For sale · ${takeovers.length}` : 'For sale' },
          { value: 'transfers', label: pendingOffers ? `Offers · ${pendingOffers}` : 'Offers' },
        ]}
        value={tab}
        onChange={setTab}
      />
      </div>

      <div style={{ marginTop: 18 }}>
        {tab === 'waitlist' && <WaitlistTab />}
        {tab === 'takeovers' && <TakeoversTab items={takeovers} hasWaitlist={waiting > 0} />}
        {tab === 'transfers' && <TransfersTab items={transfers} />}
      </div>
    </Screen>
  )
}

function WaitlistTab() {
  const nav = useNavigate()
  const toast = useToast()
  const { data } = useWaitlist()
  const { leave } = useWaitlistActions()
  if (!data) return <Skeleton h={120} r={18} />
  if (data.length === 0) {
    return (
      <div className={c.emptyCard}>
        <EmptyState icon="clock" title="You’re not on a waitlist" action={<Button variant="outline" onClick={() => nav('/circles')}>Browse packages</Button>}>
          Join a waitlist from a package when its circles are full. No money moves until you buy a seat.
        </EmptyState>
      </div>
    )
  }
  return (
    <div className={c.table}>
      <div className={cx(c.tr, c.th, c.waitCols)} aria-hidden>
        <span>Package</span>
        <span>Collateral</span>
        <span>Joined</span>
        <span>Status</span>
        <span />
      </div>
      {data.map((w) => (
        <div key={w.id} className={cx(c.tr, c.waitCols)}>
          <span className={c.tdMain}>
            <b>{w.package}</b>
            <small className={c.phoneOnly}>
              {levelPct(w.collateral_bps)} collateral · joined {timeAgo(w.joined_at)}
            </small>
          </span>
          <span className={cx(c.tdDesk, c.mono)}>{levelPct(w.collateral_bps)}</span>
          <span className={c.tdDesk}>{shortDate(w.joined_at)}</span>
          <span>
            <span className={c.cycleTag} data-status={w.status === 'waiting' ? 'collecting' : w.status === 'fulfilled' ? 'paid_out' : 'cancelled'}>
              {w.status === 'waiting' ? 'Waiting' : w.status === 'fulfilled' ? 'Seated' : 'Left'}
            </span>
          </span>
          <span className={c.tdAct}>
            {w.status === 'waiting' && (
              <Button
                variant="ghost"
                className={c.smallBtn}
                loading={leave.isPending && leave.variables === w.package_id}
                onClick={async () => {
                  try {
                    await leave.mutateAsync(w.package_id)
                    toast('Left the waitlist')
                  } catch (e) {
                    toast(errorText(e))
                  }
                }}
              >
                Leave
              </Button>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

function TakeoversTab({ items, hasWaitlist }: { items?: Takeover[]; hasWaitlist: boolean }) {
  const nav = useNavigate()
  const pin = usePin()
  const toast = useToast()
  const { buy } = useMarketActions()
  if (!items) return <Skeleton h={120} r={18} />
  if (items.length === 0) {
    return (
      <div className={c.emptyCard}>
        <EmptyState icon="swap" title="No seats for sale" action={!hasWaitlist && <Button variant="outline" onClick={() => nav('/circles')}>Join a waitlist</Button>}>
          {hasWaitlist ? 'You’re on a waitlist. Seats for your packages appear here as soon as a member leaves.' : 'Seats for sale show here once you’re on a package’s waitlist.'}
        </EmptyState>
      </div>
    )
  }
  const purchase = (t: Takeover) =>
    pin({
      title: `Buy slot ${slotNo(t.slot)}`,
      sub: `${money(t.total_to_pay)} USDT is taken from your wallet: ${money(t.catch_up)} catch-up and ${money(t.collateral)} collateral.`,
      confirmLabel: `Pay ${money(t.total_to_pay)} USDT`,
      run: async (p) => {
        await buy.mutateAsync({ seatId: t.seat_id, pin: p })
        toast(`Slot ${slotNo(t.slot)} is yours`)
        nav(`/circles/${t.circle_id}`)
      },
    })
  return (
    <div className={c.table}>
      <div className={cx(c.tr, c.th, c.takeCols)} aria-hidden>
        <span>Circle</span>
        <span>Slot</span>
        <span>Cycle</span>
        <span>Catch-up</span>
        <span>Collateral</span>
        <span>Total</span>
        <span />
      </div>
      {items.map((t) => (
        <div key={t.seat_id} className={cx(c.tr, c.takeCols)}>
          <span className={c.tdMain}>
            <b>{t.package}</b>
            <small className={c.phoneOnly}>
              Slot {slotNo(t.slot)} · cycle {t.current_cycle} of {t.members} · {money(t.pot, { decimals: 0 })} USDT pot
            </small>
            <small className={c.phoneOnly}>
              {money(t.catch_up)} catch-up + {money(t.collateral)} collateral
            </small>
          </span>
          <span className={cx(c.tdDesk, c.mono)}>{slotNo(t.slot)}</span>
          <span className={c.tdDesk}>
            {t.current_cycle} of {t.members}
          </span>
          <span className={cx(c.tdDesk, c.mono)}>{money(t.catch_up)}</span>
          <span className={cx(c.tdDesk, c.mono)}>{money(t.collateral)}</span>
          <span className={cx(c.mono, c.tdTotal)}>{money(t.total_to_pay)}</span>
          <span className={c.tdAct}>
            <Button className={c.smallBtn} onClick={() => purchase(t)}>
              Buy seat
            </Button>
          </span>
        </div>
      ))}
    </div>
  )
}

function TransfersTab({ items }: { items?: SeatTransfer[] }) {
  const toast = useToast()
  const { close } = useMarketActions()
  const [accepting, setAccepting] = useState<SeatTransfer | null>(null)
  if (!items) return <Skeleton h={120} r={18} />
  if (items.length === 0) {
    return (
      <div className={c.emptyCard}>
        <EmptyState icon="swap" title="No seat offers">
          Offers you send from a circle, and offers other members send you, show here. They expire after 48 hours.
        </EmptyState>
      </div>
    )
  }
  const shut = async (t: SeatTransfer) => {
    try {
      await close.mutateAsync(t.id)
      toast(t.role === 'buyer' ? 'Offer declined' : 'Offer withdrawn')
    } catch (e) {
      toast(errorText(e))
    }
  }
  return (
    <>
      <div className={c.table}>
        <div className={cx(c.tr, c.th, c.offerCols)} aria-hidden>
          <span>Offer</span>
          <span>Slot</span>
          <span>Catch-up</span>
          <span>Collateral</span>
          <span>Fee</span>
          <span>Status</span>
          <span />
        </div>
        {items.map((t) => {
          const pending = t.status === 'pending'
          const who = t.counterparty ?? 'a member'
          return (
            <div key={t.id} className={cx(c.tr, c.offerCols)}>
              <span className={c.tdMain}>
                <b>{t.kind === 'waitlist' ? `Takeover ${t.role === 'buyer' ? 'bought' : 'sold'}` : t.role === 'buyer' ? `From ${who}` : `To ${who}`}</b>
                <small>
                  {pending && t.expires_at ? `Expires ${shortDate(t.expires_at)}` : t.completed_at ? `Completed ${shortDate(t.completed_at)}` : transferStatus[t.status]}
                  {t.role === 'seller' && t.seller_refund && ` · you get ${money(t.seller_refund)} back`}
                </small>
                <small className={c.phoneOnly}>
                  Slot {slotNo(t.slot)}
                  {t.catch_up && ` · ${money(t.catch_up)} catch-up`}
                  {t.collateral && ` + ${money(t.collateral)} collateral`}
                </small>
              </span>
              <span className={cx(c.tdDesk, c.mono)}>{slotNo(t.slot)}</span>
              <span className={cx(c.tdDesk, c.mono)}>{t.catch_up ? money(t.catch_up) : '—'}</span>
              <span className={cx(c.tdDesk, c.mono)}>{t.collateral ? money(t.collateral) : 'Your choice'}</span>
              <span className={cx(c.tdDesk, c.mono)}>{t.fee ? money(t.fee) : '—'}</span>
              <span>
                <span className={c.cycleTag} data-status={pending ? 'collecting' : t.status === 'completed' ? 'paid_out' : 'cancelled'}>
                  {transferStatus[t.status]}
                </span>
              </span>
              <span className={c.tdAct}>
                {pending && t.role === 'buyer' && (
                  <>
                    <Button variant="ghost" className={c.smallBtn} loading={close.isPending && close.variables === t.id} onClick={() => shut(t)}>
                      Decline
                    </Button>
                    <Button className={c.smallBtn} onClick={() => setAccepting(t)}>
                      Accept
                    </Button>
                  </>
                )}
                {pending && t.role === 'seller' && (
                  <Button variant="ghost" className={c.smallBtn} loading={close.isPending && close.variables === t.id} onClick={() => shut(t)}>
                    Withdraw
                  </Button>
                )}
              </span>
            </div>
          )
        })}
      </div>
      <AcceptDialog transfer={accepting} onClose={() => setAccepting(null)} />
    </>
  )
}

function AcceptDialog({ transfer: t, onClose }: { transfer: SeatTransfer | null; onClose: () => void }) {
  const nav = useNavigate()
  const pin = usePin()
  const toast = useToast()
  const { accept } = useMarketActions()
  const [bps, setBps] = useState(COMMON_LEVELS[0]!)

  const go = () => {
    if (!t) return
    const offer = t
    onClose()
    pin({
      title: `Take over slot ${slotNo(offer.slot)}`,
      sub: `You pay ${offer.catch_up ? `${money(offer.catch_up)} USDT catch-up` : 'the contributions already due'} plus ${levelPct(bps)} collateral from your wallet.`,
      confirmLabel: 'Accept offer',
      run: async (p) => {
        await accept.mutateAsync({ id: offer.id, bps, pin: p })
        toast(`Slot ${slotNo(offer.slot)} is yours`)
        nav(`/circles/${offer.circle_id}`)
      },
    })
  }

  return (
    <Modal
      open={!!t}
      onClose={onClose}
      title="Accept seat offer"
      sub={t ? `${t.counterparty ?? 'A member'} is offering you slot ${slotNo(t.slot)}. You pay the contributions already due and lock your own collateral.` : undefined}
      footer={<Button onClick={go}>Continue</Button>}
    >
      <div className={c.stepHead} style={{ marginTop: 0 }}>
        <h2>Your collateral level</h2>
        <span>Must be offered by the package</span>
      </div>
      <div className={c.levels} role="radiogroup" aria-label="Collateral level">
        {COMMON_LEVELS.map((l) => (
          <button key={l} type="button" role="radio" aria-checked={l === bps} className={cx(c.level, l === bps && c.levelOn)} onClick={() => setBps(l)}>
            <span className={c.levelPct}>{levelPct(l)}</span>
            <span className={c.levelSlots}>of the pot</span>
          </button>
        ))}
      </div>
      {t && (
        <div className={c.offerSum}>
          <span>Catch-up</span>
          <b>{t.catch_up ? `${money(t.catch_up)} USDT` : '—'}</b>
          <span>Fee</span>
          <b>{t.fee ? `${money(t.fee)} USDT` : '—'}</b>
          <span>Expires</span>
          <b>{t.expires_at ? shortDate(t.expires_at) : '—'}</b>
        </div>
      )}
    </Modal>
  )
}
