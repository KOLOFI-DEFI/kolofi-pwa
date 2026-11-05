import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { cents, cycleNoun, dateTime, money, percent, shortDate } from '@/core/format'
import type { Circle, CircleCycle, CycleStatus, SeatStatus, SeatType } from '@/core/types'
import { useCircle, useCircleActions, useDraw, useExitQuote, usePlans } from '@/core/data'
import {
  Button, EmptyState, Eyebrow, Header, Icon, KeyValues, Modal, Notice, Panel, RadioCard, Screen, Skeleton, TextButton, TextField, cx,
  errorText, usePin, useToast, type KV,
} from '@/ui'
import { CircleRing, RingLegend, ringSpots } from '@/ui/charts'
import { cycleWord, slotNo, statusText } from './shared'
import c from './circles.module.css'

const cycleStatus: Record<CycleStatus, string> = { scheduled: 'Upcoming', collecting: 'Collecting', shortfall: 'Covering a miss', paid_out: 'Paid out', cancelled: 'Cancelled' }
const seatStatus: Record<SeatStatus, string> = { open: 'Open', reserved: 'Reserved', active: 'Paying', paid_out: 'Collected', completed: 'Done', cancelled: 'Cancelled' }
const seatType: Record<SeatType, string> = { house: 'Kólófi', real: 'Member', takeover: 'For takeover' }

/* ───────── 16 Circle detail ───────── */
export function CircleDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { data: ci, isError, error } = useCircle(id)

  return (
    <Screen
      tabs
      width="wide"
      header={<Header back={() => nav('/circles')} title={ci?.package ?? ' '} sub={ci && `${statusText[ci.status].toUpperCase()}${ci.status === 'active' ? ` · CYCLE ${ci.current_cycle}/${ci.members}` : ''}`} />}
    >
      {isError ? (
        <EmptyState title="Circle not available">{errorText(error)}</EmptyState>
      ) : !ci ? (
        <div className={c.detail}>
          <div className={c.detailMain}>
            <Skeleton h={340} r={24} />
          </div>
          <div className={c.detailSide}>
            <Skeleton h={220} r={22} />
          </div>
        </div>
      ) : (
        <DetailBody circle={ci} />
      )}
    </Screen>
  )
}

function DetailBody({ circle: ci }: { circle: Circle }) {
  const seat = ci.my_seat
  const cycles = ci.cycles ?? []
  const current = cycles.find((x) => x.number === ci.current_cycle)
  const myCycle = seat ? cycles.find((x) => x.pays_slot === seat.slot) : undefined
  const covered = cycles.filter((x) => x.my_contribution === 'covered').length
  const owed = cents(seat?.owed_for_covered_payments)
  const filled = (ci.seats ?? []).filter((s) => s.member !== null).length

  return (
    <>
      <StateNotices circle={ci} />
      <div className={c.detail}>
        <div className={c.detailMain}>
          {/* Ring and the current cycle */}
          <section className={cx(c.ringPanel, c.oRing)}>
            <div className={c.ringWrap}>
              {ci.seats && ci.seats.length > 0 ? (
                <CircleRing spots={ringSpots(ci.seats, ci.status === 'active' ? ci.current_cycle : 0)} size={ci.members > 10 ? 340 : 310}>
                  <div style={{ textAlign: 'center' }}>
                    <Eyebrow>{ci.status === 'active' ? 'This cycle’s pot' : ci.status === 'forming' ? 'Pot each cycle' : 'Pot'}</Eyebrow>
                    <div className={c.ringPot}>{money(ci.pot, { decimals: 0 })}</div>
                    <div className={c.ringSub}>
                      {ci.status === 'active' && current ? `→ slot ${slotNo(current.pays_slot)} · ${shortDate(current.due_at)}` : ci.status === 'forming' ? `${filled} of ${ci.members} seats taken` : 'USDT'}
                    </div>
                  </div>
                </CircleRing>
              ) : (
                <div className={c.ringPot}>{money(ci.pot, { decimals: 0 })} USDT</div>
              )}
              <div style={{ marginTop: 14 }}>
                <RingLegend />
              </div>
            </div>
            <div className={c.ringFacts}>
              <Fact label="Pot after fee" value={`${money(ci.pot_after_fee)} USDT`} />
              <Fact label={`Each seat pays / ${cycleNoun(ci.cycle)}`} value={`${money(ci.per_cycle_total)} USDT`} sub={`${money(ci.contribution)} contribution + fee and reserve levy`} />
              {ci.status === 'active' && current ? (
                <Fact label={`Cycle ${current.number} of ${ci.members}`} value={cycleStatus[current.status]} sub={`${current.paid_count} paid · ${current.covered_count} covered · due ${shortDate(current.due_at)}`} />
              ) : ci.status === 'forming' ? (
                <Fact label="Fill deadline" value={shortDate(ci.fill_deadline_at)} sub="Starts the day after the last seat fills" />
              ) : (
                <Fact label="Started" value={ci.starts_at ? shortDate(ci.starts_at) : '—'} />
              )}
              <Fact label="Late fee" value={`${money(ci.late_fee)} USDT`} sub="If a payment lands in the grace window" />
            </div>
          </section>

          {/* Cycles: list on phone, table on desktop */}
          {cycles.length > 0 && (
            <section className={cx(c.block, c.oCycles)}>
              <div className={c.blockHead}>
                <h2>Cycles</h2>
                <span>{cycleWord(ci.cycle)} · paid automatically from your wallet</span>
              </div>
              <div className={c.table}>
                <div className={cx(c.tr, c.th, c.cyclesCols)} aria-hidden>
                  <span>Cycle</span>
                  <span>Due</span>
                  <span>Pays</span>
                  <span>Status</span>
                  <span>Paid</span>
                  <span>You</span>
                </div>
                {cycles.map((cy) => (
                  <CycleRow key={cy.number} cycle={cy} members={ci.members} mine={seat?.slot === cy.pays_slot} current={cy.number === ci.current_cycle && ci.status === 'active'} />
                ))}
              </div>
            </section>
          )}

          {/* Seats */}
          {ci.seats && ci.seats.length > 0 && (
            <section className={cx(c.block, c.oSeats)}>
              <div className={c.blockHead}>
                <h2>Seats</h2>
                <span>{ci.house_seats} Kólófi seats take the earliest slots</span>
              </div>
              <div className={c.seatGrid}>
                {ci.seats.map((s) => (
                  <div key={s.slot} className={cx(c.seat, s.is_me && c.seatMe)} data-type={s.type}>
                    <span className={c.seatNo}>{slotNo(s.slot)}</span>
                    <span className={c.seatWho}>{s.is_me ? 'You' : s.type === 'house' ? 'Kólófi seat' : (s.member ?? 'Open seat')}</span>
                    <span className={c.seatState}>
                      {seatType[s.type]} · {seatStatus[s.status]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <DrawProofPanel circle={ci} />
        </div>

        <aside className={c.detailSide}>
          {seat && !seat.exited_at && <TurnCard circle={ci} cycle={myCycle} />}
          {seat && (covered > 0 || owed > 0) && (
            <div className={cx(c.missCard, c.oTurn)}>
              <Eyebrow style={{ color: 'var(--flare)' }}>Missed payment covered</Eyebrow>
              <p>
                {covered > 0 ? `${covered} of your payments ${covered === 1 ? 'was' : 'were'} covered` : 'A payment was covered'} from your collateral, then by Kólófi.
                {owed > 0 && (
                  <>
                    {' '}
                    You owe <b>{money(seat.owed_for_covered_payments)} USDT</b>, repaid from your pot on your turn.
                  </>
                )}{' '}
                Top up your collateral so the next miss is covered too.
              </p>
            </div>
          )}
          {seat && <SeatPanel circle={ci} />}
          {ci.visibility === 'private' && ci.invite_code && <InviteCard circle={ci} />}
        </aside>
      </div>
    </>
  )
}

const Fact = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className={c.fact}>
    <span className={c.factLabel}>{label}</span>
    <span className={c.factValue}>{value}</span>
    {sub && <span className={c.factSub}>{sub}</span>}
  </div>
)

function CycleRow({ cycle: cy, members, mine, current }: { cycle: CircleCycle; members: number; mine: boolean; current: boolean }) {
  return (
    <div className={cx(c.tr, c.cyclesCols, current && c.trCurrent, mine && c.trMine)}>
      <span className={c.tdMain}>
        <b>Cycle {cy.number}</b>
        <small className={c.phoneOnly}>
          {shortDate(cy.due_at)} · pays slot {slotNo(cy.pays_slot)}
          {mine && ' (you)'}
        </small>
      </span>
      <span className={c.tdDesk}>{shortDate(cy.due_at)}</span>
      <span className={c.tdDesk}>
        Slot {slotNo(cy.pays_slot)}
        {mine && <em className={c.youTag}>You</em>}
      </span>
      <span>
        <span className={c.cycleTag} data-status={cy.status}>
          {cycleStatus[cy.status]}
        </span>
      </span>
      <span className={cx(c.tdDesk, c.mono)}>
        {cy.paid_count}/{members}
        {cy.covered_count > 0 && <span className={c.coveredNote}> · {cy.covered_count} covered</span>}
      </span>
      <span className={cx(c.tdDesk, c.mono)} data-mine={cy.my_contribution ?? 'none'}>
        {cy.my_contribution === 'paid' ? 'Paid' : cy.my_contribution === 'covered' ? 'Covered' : '—'}
      </span>
    </div>
  )
}

/** Board 16/17: the lime "your turn" card. */
function TurnCard({ circle: ci, cycle }: { circle: Circle; cycle?: CircleCycle }) {
  const seat = ci.my_seat!
  const now = ci.status === 'active' && seat.slot === ci.current_cycle
  const collected = seat.status === 'paid_out' || cycle?.status === 'paid_out'
  const head = collected ? `Collected · Slot ${slotNo(seat.slot)}` : now ? `It’s your turn · Slot ${slotNo(seat.slot)}` : `Your turn · Slot ${slotNo(seat.slot)}`
  const when = collected ? 'Pot collected' : cycle ? shortDate(cycle.due_at) : ci.status === 'forming' ? 'Set when it starts' : '—'
  return (
    <div className={cx(c.turn, now && c.turnNow, c.oTurn)}>
      <svg className={c.turnArc} viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="98" fill="none" stroke="currentColor" strokeDasharray="3 4" />
      </svg>
      <Eyebrow style={{ color: 'rgba(14,16,19,0.7)' }}>{head}</Eyebrow>
      <div className={c.turnDate}>{when}</div>
      <div className={c.turnFoot}>
        <div>
          <div className={c.turnAmt}>{money(ci.pot_after_fee)}</div>
          <div className={c.turnSub}>USDT after fee → {seat.payout_destination === 'savings' ? 'Savings' : 'Wallet'}</div>
        </div>
        {now && <Icon name="sparkle" size={26} />}
      </div>
      {ci.status === 'forming' && <p className={c.turnNote}>Your slot is drawn. Dates are fixed when the last seat fills.</p>}
    </div>
  )
}

/** My seat facts and every action on it. */
function SeatPanel({ circle: ci }: { circle: Circle }) {
  const seat = ci.my_seat!
  const nav = useNavigate()
  const toast = useToast()
  const pin = usePin()
  const act = useCircleActions(ci.id)
  const [dialog, setDialog] = useState<'payout' | 'exit' | 'offer' | null>(null)

  const exited = !!seat.exited_at
  const running = ci.status === 'active' && seat.type === 'real' && !exited
  const canExit = running && seat.status === 'active'
  const settled = seat.status === 'paid_out' || seat.status === 'completed' || ['completed', 'cancelled', 'unwound'].includes(ci.status)

  const rows: KV[] = [
    { label: 'Slot', value: `${slotNo(seat.slot)} of ${ci.members}`, mono: true },
    { label: 'Seat', value: `${seatType[seat.type]} · ${seatStatus[seat.status]}` },
    { label: 'Collateral locked', value: `${money(seat.collateral_locked)} USDT${seat.collateral_percent ? ` (${percent(seat.collateral_percent)})` : ''}`, mono: true },
    { label: 'Owed for covered payments', value: money(seat.owed_for_covered_payments), mono: true, valueStyle: cents(seat.owed_for_covered_payments) > 0 ? { color: 'var(--flare)' } : undefined },
    { label: 'Pot goes to', value: seat.payout_destination === 'savings' ? 'A savings plan' : 'Wallet' },
  ]
  if (exited) {
    rows.push({ label: 'Left on', value: shortDate(seat.exited_at!) })
    if (seat.exit_fee) rows.push({ label: 'Exit fee', value: `${money(seat.exit_fee)} USDT`, mono: true })
  }

  const leave = () =>
    pin({
      title: 'Leave circle',
      sub: `Your ${money(seat.collateral_locked)} USDT collateral comes back in full. You can’t take a new seat for 24 hours.`,
      confirmLabel: 'Leave circle',
      run: async (p) => {
        await act.leave.mutateAsync(p)
        toast('You left the circle')
        nav('/circles', { replace: true })
      },
    })
  const topUp = () =>
    pin({
      title: 'Top up collateral',
      sub: 'We refill your collateral to the level your seat needs. The amount is worked out for you and taken from your wallet.',
      confirmLabel: 'Top up',
      run: async (p) => {
        const r = await act.topUp.mutateAsync(p)
        toast(`Collateral topped up by ${money(r.topped_up)} USDT`)
      },
    })

  return (
    <>
      <Panel title="Your seat" className={c.oSeat}>
        <KeyValues rows={rows} rowHeight={44} style={{ border: 0, padding: 0, background: 'transparent' }} />
        {!settled && !exited && (
          <div className={c.actions}>
            <ActionRow icon="wallet" title="Where your pot goes" sub={seat.payout_destination === 'savings' ? 'Into a savings plan' : 'Into your wallet'} onClick={() => setDialog('payout')} />
            {running && <ActionRow icon="lock" title="Top up collateral" sub="Refill after a missed payment was covered" onClick={topUp} />}
            {canExit && <ActionRow icon="swap" title="Offer my seat to someone" sub="A Kólófi member takes it over by email" onClick={() => setDialog('offer')} />}
            {canExit && <ActionRow icon="logout" title="Leave this circle" sub="Exit fee applies · see the quote first" danger onClick={() => setDialog('exit')} />}
            {ci.status === 'forming' && <ActionRow icon="logout" title="Leave before it starts" sub="Collateral back in full" danger onClick={leave} />}
          </div>
        )}
      </Panel>
      <PayoutDialog open={dialog === 'payout'} onClose={() => setDialog(null)} circle={ci} />
      <ExitDialog open={dialog === 'exit'} onClose={() => setDialog(null)} circle={ci} />
      <OfferDialog open={dialog === 'offer'} onClose={() => setDialog(null)} circle={ci} />
    </>
  )
}

const ActionRow = ({ icon, title, sub, onClick, danger }: { icon: Parameters<typeof Icon>[0]['name']; title: string; sub: string; onClick: () => void; danger?: boolean }) => (
  <button className={cx(c.action, danger && c.actionDanger)} onClick={onClick}>
    <Icon name={icon} size={18} />
    <span>
      <b>{title}</b>
      <small>{sub}</small>
    </span>
    <Icon name="chevronRight" size={16} className={c.chev} />
  </button>
)

function PayoutDialog({ open, onClose, circle: ci }: { open: boolean; onClose: () => void; circle: Circle }) {
  const seat = ci.my_seat!
  const pin = usePin()
  const toast = useToast()
  const act = useCircleActions(ci.id)
  const { data: plans } = usePlans()
  const active = (plans ?? []).filter((p) => p.status === 'active' && p.asset === ci.asset)
  const [choice, setChoice] = useState<string>(seat.payout_destination === 'wallet' ? 'wallet' : '')

  const save = () => {
    const destination = choice === 'wallet' ? 'wallet' : 'savings'
    const plan = active.find((p) => p.id === choice)
    onClose()
    pin({
      title: 'Change where your pot goes',
      sub: destination === 'wallet' ? 'Your pot will land in your wallet.' : `Your pot will go straight into ${plan?.name}.`,
      run: async (p) => {
        await act.payoutTo.mutateAsync({ destination, savings_plan_id: destination === 'savings' ? choice : null, pin: p })
        toast(destination === 'wallet' ? 'Pot goes to your wallet' : `Pot goes to ${plan?.name}`)
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Where your pot goes"
      sub={`On your turn you receive ${money(ci.pot_after_fee)} USDT. Send it to your wallet or straight into a savings plan.`}
      footer={
        <Button disabled={!choice} onClick={save}>
          Continue
        </Button>
      }
    >
      <div className={c.modalList} role="radiogroup">
        <RadioCard selected={choice === 'wallet'} onClick={() => setChoice('wallet')} title="Wallet" sub="Spend or withdraw it whenever you like" />
        {active.map((p) => (
          <RadioCard key={p.id} selected={choice === p.id} onClick={() => setChoice(p.id)} title={p.name} sub={`${p.type === 'locked' ? 'Locked plan' : 'Goal'} · ${money(p.balance)} USDT · ${percent(p.interest.annual_rate_percent)} a year`} />
        ))}
        {plans && active.length === 0 && <p className={c.help}>You have no active savings plan yet. Create one in Save to send your pot there.</p>}
      </div>
    </Modal>
  )
}

function ExitDialog({ open, onClose, circle: ci }: { open: boolean; onClose: () => void; circle: Circle }) {
  const pin = usePin()
  const toast = useToast()
  const act = useCircleActions(ci.id)
  const { data: q, isLoading, error } = useExitQuote(ci.id, open)
  const [reason, setReason] = useState('')

  const go = () => {
    onClose()
    pin({
      title: 'Leave this circle',
      sub: q ? `The ${money(q.exit_fee)} USDT exit fee is deducted. About ${money(q.estimated_return)} USDT comes back to you.` : undefined,
      confirmLabel: 'Leave circle',
      run: async (p) => {
        await act.exit.mutateAsync({ pin: p, reason: reason.trim() || undefined })
        toast('You left the circle. Your seat is now for takeover.')
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Leave a running circle?"
      sub="Your payments stop. Your seat is offered to members on the waitlist, and you get your money back as below."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Stay in the circle
          </Button>
          <Button disabled={!q} onClick={go}>
            Continue to leave
          </Button>
        </>
      }
    >
      {isLoading && <Skeleton h={200} r={16} />}
      {error && (
        <Notice tone="flare" icon="info">
          {errorText(error)}
        </Notice>
      )}
      {q && (
        <>
          <KeyValues
            rowHeight={44}
            rows={[
              { label: `Contributions paid (${q.contributions_paid})`, value: money(q.contributions_paid_amount), mono: true },
              { label: 'Collateral held', value: money(q.collateral_held), mono: true },
              { label: 'Owed for covered payments', value: cents(q.owed_for_covered_payments) > 0 ? `−${money(q.owed_for_covered_payments)}` : '0.00', mono: true },
              { label: 'Exit fee', value: `−${money(q.exit_fee)}`, mono: true, valueStyle: { color: 'var(--flare)' } },
              { label: 'Estimated return', value: `${money(q.estimated_return)} USDT`, mono: true, accent: true },
              { label: 'Returned by', value: q.returned_by ? shortDate(q.returned_by) : 'When your slot pays' },
            ]}
          />
          <Notice tone={q.waitlist_buyers > 0 ? 'sig' : 'neutral'} icon="info" style={{ marginTop: 12 }}>
            {q.waitlist_buyers > 0
              ? `${q.waitlist_buyers} member${q.waitlist_buyers === 1 ? ' is' : 's are'} waiting for a seat like yours. If one buys it, you’re refunded straight away.`
              : 'Nobody is waiting for a seat right now, so you’re refunded when your slot’s pot is paid.'}
          </Notice>
          <p className={c.terms}>{q.terms}</p>
          <TextField label="Reason (optional)" sans value={reason} maxLength={255} placeholder="Tell us why you’re leaving" onChange={(e) => setReason(e.target.value)} />
          <p className={c.terms}>Leaving a running circle lowers your reputation.</p>
        </>
      )}
    </Modal>
  )
}

function OfferDialog({ open, onClose, circle: ci }: { open: boolean; onClose: () => void; circle: Circle }) {
  const pin = usePin()
  const toast = useToast()
  const nav = useNavigate()
  const act = useCircleActions(ci.id)
  const [email, setEmail] = useState('')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const go = () => {
    onClose()
    pin({
      title: 'Offer your seat',
      sub: `We’ll send the offer to ${email.trim()}. They have 48 hours to accept.`,
      confirmLabel: 'Send offer',
      run: async (p) => {
        await act.offer.mutateAsync({ email: email.trim(), pin: p })
        toast('Seat offer sent')
        nav('/circles/market')
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Offer your seat to someone"
      sub="They take over your slot: they pay the contributions already due plus their own collateral, and you’re refunded. Offers expire after 48 hours."
      footer={
        <Button disabled={!valid} onClick={go}>
          Continue
        </Button>
      }
    >
      <TextField label="Their Kólófi email" type="email" sans autoComplete="off" value={email} placeholder="name@example.com" onChange={(e) => setEmail(e.target.value)} />
    </Modal>
  )
}

function InviteCard({ circle: ci }: { circle: Circle }) {
  const toast = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ci.invite_code!)
      toast('Invite code copied')
    } catch {
      toast('Could not copy. Select the code instead.')
    }
  }
  return (
    <section className={cx(c.inviteCard, c.oInvite)}>
      <Eyebrow>{ci.is_organiser ? 'Your invite code' : 'Invite code'}</Eyebrow>
      <div className={c.inviteRow}>
        <span className={c.inviteCode}>{ci.invite_code}</span>
        <Button variant="outline" icon="copy" onClick={copy} className={c.copyBtn} aria-label="Copy invite code">
          Copy
        </Button>
      </div>
      <p className={c.help}>
        {ci.is_organiser ? 'This circle is private. Share the code with people you trust; they join from Circles → Invite code.' : 'This circle is private. Only people with the code can join.'}
      </p>
    </section>
  )
}

function DrawProofPanel({ circle: ci }: { circle: Circle }) {
  const { data: d } = useDraw(ci.id, !!ci.my_seat)
  const [open, setOpen] = useState(false)
  if (!ci.draw_seed_hash && !d) return null
  return (
    <section className={cx(c.block, c.oDraw)}>
      <div className={c.blockHead}>
        <h2>Check your slot draw</h2>
        <span>{d?.seed_revealed ? 'Seed revealed' : 'Seed revealed when the circle starts'}</span>
      </div>
      <div className={c.drawCard}>
        <p className={c.help} style={{ marginTop: 0 }}>
          Before anyone joined, Kólófi committed to a secret seed by publishing its fingerprint. Once the circle starts the seed is revealed, so you can recompute your slot yourself.
        </p>
        <div className={c.drawGrid}>
          <div>
            <span className={c.factLabel}>Seed fingerprint (SHA-256)</span>
            <code className={c.hash}>{d?.seed_hash ?? ci.draw_seed_hash}</code>
          </div>
          <div>
            <span className={c.factLabel}>Seed</span>
            <code className={c.hash}>{d?.seed ?? 'Hidden until the circle starts'}</code>
          </div>
          {d?.my_draw && (
            <div>
              <span className={c.factLabel}>Your draw</span>
              <div className={c.drawMine}>
                <span>
                  Draw #{d.my_draw.sequence} → slot <b>{slotNo(d.my_draw.slot)}</b>
                </span>
                <small>from slots {d.my_draw.candidate_slots.join(', ')}</small>
              </div>
            </div>
          )}
        </div>
        {d && (
          <>
            <TextButton onClick={() => setOpen((o) => !o)}>{open ? 'Hide how to check' : 'How to check it'}</TextButton>
            {open && <p className={c.algo}>{d.algorithm}</p>}
          </>
        )}
      </div>
    </section>
  )
}

/** Banners for circles that are not simply running. */
function StateNotices({ circle: ci }: { circle: Circle }) {
  const seat = ci.my_seat
  if (ci.status === 'unwound') {
    return (
      <Notice tone="flare" icon="info" style={{ marginBottom: 16 }}>
        This circle was closed early and settled.{ci.unwind_loss && cents(ci.unwind_loss) > 0 ? ` The shortfall shared across seats was ${money(ci.unwind_loss)} USDT.` : ''} Your remaining balance has been returned to your wallet.
      </Notice>
    )
  }
  if (ci.status === 'cancelled') {
    return (
      <Notice icon="info" style={{ marginBottom: 16 }}>
        This circle didn’t fill by {shortDate(ci.fill_deadline_at)}, so it was cancelled. Your collateral was returned in full.
      </Notice>
    )
  }
  if (ci.status === 'completed') {
    return (
      <Notice tone="sig" icon="check" style={{ marginBottom: 16 }}>
        Every pot has been paid. Your collateral came back to your wallet.
      </Notice>
    )
  }
  if (seat?.exited_at) {
    return (
      <Notice tone="chain" icon="info" style={{ marginBottom: 16 }}>
        You left this circle on {dateTime(seat.exited_at)}
        {seat.exit_fee ? ` (exit fee ${money(seat.exit_fee)} USDT)` : ''}. Your money comes back when slot {slotNo(seat.slot)}’s pot is paid, or straight away if a waitlisted member buys your seat.
      </Notice>
    )
  }
  if (ci.status === 'forming') {
    return (
      <Notice tone="chain" icon="clock" style={{ marginBottom: 16 }}>
        Filling up. It starts at 08:00 Lagos time the day after the last seat fills. If it isn’t full by {shortDate(ci.fill_deadline_at)}, it’s cancelled and your collateral comes back.
      </Notice>
    )
  }
  return null
}
