import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { cents, cycleNoun, money } from '@/core/format'
import type { CirclePackage, CollateralOption } from '@/core/types'
import { useCircleQuote, useJoinCircle, usePackages, useReputation, useWaitlistActions, useWallets } from '@/core/data'
import { Button, EmptyState, Header, KeyValues, Notice, RadioCard, Screen, Skeleton, TextButton, errorText, useIsDesktop, usePin, useToast } from '@/ui'
import { CollateralPicker, InkRow, SlotStrip, breakdownRows, cycleWord, gateError } from './shared'
import c from './circles.module.css'

type Mode = 'public' | 'private'

/* ───────── 15 Join: collateral & turn ───────── */
export function PackageJoin() {
  const { id = '' } = useParams()
  const { data: packages, isError } = usePackages()
  const pkg = packages?.find((p) => p.id === id)

  if (packages && !pkg) {
    return (
      <Screen header={<Header title="Join circle" />}>
        <EmptyState title="Package not found">{isError ? 'We could not load packages.' : 'This package is no longer open.'}</EmptyState>
      </Screen>
    )
  }
  if (!pkg) {
    return (
      <Screen header={<Header title="Join circle" />}>
        <Skeleton h={150} r={22} />
        <Skeleton h={90} r={18} style={{ marginTop: 20 }} />
      </Screen>
    )
  }
  return <JoinFlow pkg={pkg} />
}

function JoinFlow({ pkg }: { pkg: CirclePackage }) {
  const nav = useNavigate()
  const toast = useToast()
  const pin = usePin()
  const wide = useIsDesktop(1100)
  const join = useJoinCircle()
  const waitlist = useWaitlistActions()
  const { data: rep } = useReputation()
  const { data: wallets } = useWallets()

  const defaultBps = pkg.options.reduce((a, b) => (b.earliest_slot < a.earliest_slot ? b : a), pkg.options[0]!).collateral_bps
  const [bps, setBps] = useState<number>(defaultBps)
  const [mode, setMode] = useState<Mode>('public')
  const [blocked, setBlocked] = useState<string | null>(null)
  const { data: quote } = useCircleQuote(pkg.id, bps)
  const opt: CollateralOption = quote ?? pkg.options.find((o) => o.collateral_bps === bps) ?? pkg.options[0]!

  const available = wallets?.balances.find((b) => b.asset === 'usdt')?.available
  const short = available !== undefined && cents(available) < cents(opt.collateral)
  const gated = !!pkg.min_reputation && !!rep && rep.score < pkg.min_reputation

  const confirm = () =>
    pin({
      title: mode === 'private' ? 'Start private circle' : 'Join circle',
      sub: `${money(opt.collateral)} USDT is locked from your wallet now. It comes back when the circle ends.`,
      confirmLabel: `Lock ${money(opt.collateral, { decimals: 0 })} USDT`,
      run: async (p) => {
        try {
          const circle = await join.mutateAsync({ packageId: pkg.id, bps, pin: p, mode })
          toast(mode === 'private' ? 'Private circle started' : `You joined ${pkg.name}`)
          nav(`/circles/${circle.id}`, { replace: true })
        } catch (e) {
          const gate = gateError(e)
          if (!gate) throw e
          setBlocked(gate.message)
        }
      },
    })

  const joinWaitlist = async () => {
    try {
      await waitlist.join.mutateAsync({ packageId: pkg.id, bps })
      toast('You’re on the waitlist')
      nav('/circles/market')
    } catch (e) {
      setBlocked(errorText(e))
    }
  }

  const cta = (
    <Button icon="lock" disabled={gated || short} loading={join.isPending} onClick={confirm}>
      Lock {money(opt.collateral, { decimals: 0 })} USDT &amp; {mode === 'private' ? 'start' : 'join'}
    </Button>
  )
  const per = cycleNoun(pkg.cycle)

  return (
    <Screen header={<Header title="Join circle" sub={wide ? pkg.name : undefined} />} footer={wide ? undefined : <div className={c.footLift}>{cta}</div>}>
      <div className={c.flow}>
        <div className={c.flowMain}>
          {/* Package hero (phone and tablet); on desktop the summary card carries it. */}
          <div className={c.inkHero}>
            <div className={c.inkName}>{pkg.name}</div>
            <div className={c.inkMeta}>
              {pkg.members} SEATS · {money(pkg.contribution, { decimals: 0 })} USDT / {per.toUpperCase()} · {pkg.house_seats} KÓLÓFI SEATS
            </div>
            <div className={c.inkPot}>
              {money(opt.pot, { decimals: 0 })} <small>USDT POT</small>
            </div>
          </div>

          {gated && (
            <Notice tone="flare" icon="shield">
              This package needs a reputation of {pkg.min_reputation}. Yours is {rep?.score}. Pay on time in other circles to raise it.
            </Notice>
          )}

          <section>
            <div className={c.stepHead}>
              <h2>Choose your collateral</h2>
              <span>More = earlier turn</span>
            </div>
            <p className={c.help}>
              Collateral is a share of the pot, locked while the circle runs and returned at the end. It covers you if a payment is missed, so a bigger share unlocks earlier slots.
            </p>
            <CollateralPicker options={pkg.options} value={bps} onChange={(v) => { setBps(v); setBlocked(null) }} />
          </section>

          <section>
            <div className={c.stepHead}>
              <h2>Where your turn can land</h2>
              <span>Slots {opt.slots_available_from}</span>
            </div>
            <SlotStrip members={pkg.members} house={pkg.house_seats} earliest={opt.earliest_slot} />
            <p className={c.help} style={{ marginTop: 12 }}>
              Your slot is drawn at random from the open slots you qualify for. The draw seed is fixed before anyone joins, and you can check it from the circle once it starts.
            </p>
          </section>

          <section>
            <div className={c.stepHead}>
              <h2>How do you want to join?</h2>
            </div>
            <div className={c.modes} role="radiogroup">
              <RadioCard selected={mode === 'public'} onClick={() => setMode('public')} title="Join the next public circle" sub="You’re seated with other members. It starts the day after the last seat fills." />
              {pkg.allow_private && (
                <RadioCard selected={mode === 'private'} onClick={() => setMode('private')} title="Start a private circle" sub="You organise it and get an invite code. Only people with the code can join." />
              )}
            </div>
          </section>

          {!blocked && !gated && (
            <p className={c.help} style={{ margin: 0 }}>
              Rather step into a circle that’s already running?{' '}
              <TextButton onClick={joinWaitlist}>Join the waitlist</TextButton> and buy a seat when a member leaves.
            </p>
          )}

          {blocked && (
            <Notice tone="flare" icon="info">
              <div>{blocked}</div>
              <div className={c.noticeActions}>
                <Button variant="outline" loading={waitlist.join.isPending} onClick={joinWaitlist}>
                  Join the waitlist
                </Button>
                <span className={c.noticeHint}>We’ll offer you a seat in a running circle of this package when one opens. No money moves until you buy.</span>
              </div>
            </Notice>
          )}
          {short && (
            <Notice tone="chain" icon="wallet">
              You need {money(opt.collateral)} USDT available to lock. Your wallet has {money(available)} USDT.{' '}
              <TextButton onClick={() => nav('/wallet/add')}>Add money</TextButton>
            </Notice>
          )}

          {!wide && <KeyValues rows={breakdownRows(opt, pkg.cycle, pkg.grace_hours)} rowHeight={46} />}
        </div>

        {wide && (
          <aside className={c.flowSide}>
            <div className={c.inkCard}>
              <div className={c.inkName}>{pkg.name}</div>
              <div className={c.inkMeta}>
                {cycleWord(pkg.cycle).toUpperCase()} · {pkg.members} SEATS · {pkg.house_seats} KÓLÓFI
              </div>
              <div className={c.inkPot}>
                {money(opt.pot_after_fee)} <small>USDT ON YOUR TURN</small>
              </div>
              <div className={c.inkRows}>
                <InkRow label="Collateral locked now" value={`${money(opt.collateral)} USDT`} strong />
                <InkRow label={`Contribution / ${per}`} value={money(opt.contribution)} />
                <InkRow label="Contribution fee" value={money(opt.contribution_fee)} />
                <InkRow label="Reserve levy" value={money(opt.reserve_levy)} />
                <InkRow label={`You pay each ${per}`} value={`${money(opt.per_cycle_total)} USDT`} strong />
                <InkRow label="Pot" value={money(opt.pot)} />
                <InkRow label="Payout fee" value={`−${money(opt.payout_fee)}`} />
                <InkRow label="Grace on a failed payment" value={`${pkg.grace_hours}h, then late fee`} />
              </div>
              <div className={c.inkCta}>{cta}</div>
              <p className={c.inkFine}>Payments are taken from your wallet automatically each {per}. A missed payment is covered from your collateral, then by Kólófi, and repaid from your pot.</p>
            </div>
          </aside>
        )}
      </div>
    </Screen>
  )
}
