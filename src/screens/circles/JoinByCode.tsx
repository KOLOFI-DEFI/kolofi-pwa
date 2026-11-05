import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '@/core/api/contract'
import { cycleNoun, money } from '@/core/format'
import { useJoinCircle, usePackages } from '@/core/data'
import { Button, FieldLabel, FilterChips, Header, Notice, Screen, TextField, cx, useIsDesktop, usePin, useToast } from '@/ui'
import { COMMON_LEVELS, CollateralPicker, InkRow, gateError, levelPct } from './shared'
import c from './circles.module.css'

const CODE_LEN = 8

/* ───────── Join a private circle with an invite code ───────── */
export function JoinByCode() {
  const nav = useNavigate()
  const toast = useToast()
  const pin = usePin()
  const wide = useIsDesktop(1100)
  const join = useJoinCircle()
  const { data: packages } = usePackages()
  const privatePackages = (packages ?? []).filter((p) => p.allow_private)

  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | undefined>()
  const [pkgId, setPkgId] = useState<string>('unknown')
  const [bps, setBps] = useState<number>(COMMON_LEVELS[0]!)
  const [problem, setProblem] = useState<string | null>(null)

  const pkg = privatePackages.find((p) => p.id === pkgId)
  const opt = pkg?.options.find((o) => o.collateral_bps === bps)
  const ready = code.length === CODE_LEN

  const pickPackage = (id: string) => {
    setPkgId(id)
    const p = privatePackages.find((x) => x.id === id)
    if (p && !p.options.some((o) => o.collateral_bps === bps)) setBps(p.options[0]!.collateral_bps)
  }

  const confirm = () => {
    setProblem(null)
    pin({
      title: 'Join private circle',
      sub: opt ? `${money(opt.collateral)} USDT is locked from your wallet now. It comes back when the circle ends.` : `Collateral of ${levelPct(bps)} of the pot is locked from your wallet now. It comes back when the circle ends.`,
      confirmLabel: 'Join circle',
      run: async (p) => {
        try {
          const circle = await join.mutateAsync({ packageId: '', bps, pin: p, mode: 'code', code })
          toast('You joined the circle')
          nav(`/circles/${circle.id}`, { replace: true })
        } catch (e) {
          if (e instanceof ApiError && (e.code === 'INVITE_NOT_VALID' || e.field('invite_code'))) {
            setCodeError(e.field('invite_code') ?? e.message)
            return
          }
          if (e instanceof ApiError && (e.code === 'COLLATERAL_LEVEL_NOT_OFFERED' || gateError(e))) {
            setProblem(e.message)
            return
          }
          throw e
        }
      },
    })
  }

  const cta = (
    <Button icon="key" disabled={!ready} loading={join.isPending} onClick={confirm}>
      Join with code
    </Button>
  )

  return (
    <Screen header={<Header title="Join with invite code" />} footer={wide ? undefined : <div className={c.footLift}>{cta}</div>}>
      <div className={c.flow}>
        <div className={c.flowMain}>
          <section>
            <p className={c.help} style={{ marginTop: 0 }}>
              Private circles are invite-only. Ask the organiser for the 8-character code they got when they started the circle.
            </p>
            <TextField
              label="Invite code"
              value={code}
              placeholder="K7P2QX9M"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={CODE_LEN}
              error={codeError}
              inputStyle={{ fontFamily: 'var(--font-mono)', letterSpacing: 4, textTransform: 'uppercase' }}
              hint={`${code.length}/${CODE_LEN}`}
              onChange={(e) => {
                setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, CODE_LEN))
                setCodeError(undefined)
              }}
            />
          </section>

          <section>
            <div className={c.stepHead}>
              <h2>Choose your collateral</h2>
              <span>More = earlier turn</span>
            </div>
            <p className={c.help}>
              The organiser’s package decides which levels are offered and which slots each one unlocks. If you know the package, pick it to see exact amounts.
            </p>
            {privatePackages.length > 0 && (
              <>
                <FieldLabel style={{ marginTop: 12 }}>Organiser’s package</FieldLabel>
                <FilterChips<string>
                  options={[{ value: 'unknown', label: 'Not sure' }, ...privatePackages.map((p) => ({ value: p.id, label: p.name }))]}
                  value={pkgId}
                  onChange={pickPackage}
                />
              </>
            )}
            <div style={{ marginTop: 14 }}>
              {pkg ? (
                <CollateralPicker options={pkg.options} value={bps} onChange={setBps} />
              ) : (
                <div className={c.levels} role="radiogroup" aria-label="Collateral level">
                  {COMMON_LEVELS.map((l) => (
                    <button key={l} type="button" role="radio" aria-checked={l === bps} className={cx(c.level, l === bps && c.levelOn)} onClick={() => setBps(l)}>
                      <span className={c.levelPct}>{levelPct(l)}</span>
                      <span className={c.levelSlots}>of the pot</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {problem && (
            <Notice tone="flare" icon="info">
              {problem}
            </Notice>
          )}

          <Notice icon="info">
            Once you join, your collateral is locked and your slot is drawn from the slots your level unlocks. Payments are taken from your wallet automatically each cycle; a missed one is covered from your collateral and repaid from your pot.
          </Notice>
        </div>

        {wide && (
          <aside className={c.flowSide}>
            <div className={c.inkCard}>
              <div className={c.inkMeta}>INVITE CODE</div>
              <div className={c.inkCode}>{code.padEnd(CODE_LEN, '·')}</div>
              <div className={c.inkRows}>
                <InkRow label="Package" value={pkg?.name ?? 'Set by organiser'} />
                <InkRow label="Collateral level" value={levelPct(bps)} />
                {opt && pkg && (
                  <>
                    <InkRow label="Collateral locked now" value={`${money(opt.collateral)} USDT`} strong />
                    <InkRow label={`You pay each ${cycleNoun(pkg.cycle)}`} value={`${money(opt.per_cycle_total)} USDT`} />
                    <InkRow label="Your slot range" value={opt.slots_available_from} />
                    <InkRow label="You collect on your turn" value={`${money(opt.pot_after_fee)} USDT`} strong />
                  </>
                )}
              </div>
              <div className={c.inkCta}>{cta}</div>
              <p className={c.inkFine}>Your collateral is locked when you join and comes back when the circle ends. Your slot is drawn at random from the slots your level unlocks.</p>
            </div>
          </aside>
        )}
      </div>
    </Screen>
  )
}
