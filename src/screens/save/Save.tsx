import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { MOCK_TODAY } from '@/core/api'
import { firstDebitDate, fullDate, monthDay, monthYear, ngn, ngnToUsdt, projectGoal, shortAddress, usdt, usdtToNgn, weekdayLong } from '@/core/format'
import type { Frequency, PotType, TxKind } from '@/core/types'
import {
  useAccounts, useCreateGoal, useGoals, useLock, useLocked, useLockOptions, useMandate, useRates, useRecent, useSaveSummary, useToggleMandate,
} from '@/core/data'
import {
  Amount, Button, Card, Chips, Eyebrow, FieldLabel, H1, Header, Icon, List, ListRow, Progress, Row, Screen, SectionTitle,
  Segmented, Skeleton, Stack, TextField, Tile, Toggle, useToast, uiStyles as u, cx,
} from '@/ui'
import { BarChart } from '@/ui/charts'
import v from './save.module.css'

const FREQS: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]
const txTile: Record<TxKind, { g: string; tone: 'neutral' | 'sig' | 'chain' | 'flare' }> = {
  interest: { g: '%', tone: 'sig' },
  autosave: { g: '↓', tone: 'sig' },
  deposit: { g: '+', tone: 'neutral' },
  withdraw: { g: '↗', tone: 'neutral' },
  pot: { g: '◎', tone: 'sig' },
  contribution: { g: '↑', tone: 'neutral' },
}

/* ───────── 11 Save ───────── */
export function Save() {
  const nav = useNavigate()
  const { data: sum } = useSaveSummary()
  const { data: mandate } = useMandate()
  const { data: goals } = useGoals()
  const { data: locked } = useLocked()
  const { data: recent } = useRecent()
  const { data: accounts } = useAccounts()
  const depositAcc = accounts?.find((a) => a.kind === 'deposit')
  const toggle = useToggleMandate()
  const lock = locked?.[0]

  return (
    <Screen tabs>
      <Row justify="space-between" style={{ marginTop: 14 }}>
        <H1>Save</H1>
        <Button variant="outline" icon="plus" onClick={() => nav('/save/new-goal')}>
          New goal
        </Button>
      </Row>

      <Card style={{ marginTop: 22, padding: '20px 20px 18px', borderRadius: 24 }}>
        {sum ? (
          <>
            <Row justify="space-between" align="flex-start">
              <div>
                <Eyebrow style={{ fontSize: 10.5 }}>Total saved</Eyebrow>
                <div style={{ marginTop: 6 }}>
                  <Amount minor={sum.totalMinor} size={44} ccy="USDT" />
                </div>
                <div style={{ fontSize: 14, color: 'var(--body)', marginTop: 4 }}>≈ {ngn(sum.ngnMinor)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Eyebrow style={{ fontSize: 10.5 }}>Interest</Eyebrow>
                <div className="mono" style={{ color: 'var(--accent)', fontSize: 17, marginTop: 8 }}>
                  {usdt(sum.interestMinor, { sign: true })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sum.apyLabel}</div>
              </div>
            </Row>
            <div style={{ marginTop: 26 }}>
              <BarChart values={sum.monthly.map((m) => m.value)} labels={[sum.monthly[0]!.label, sum.monthly[6]!.label, sum.monthly[11]!.label].map((l) => l.toUpperCase()) as [string, string, string]} />
            </div>
          </>
        ) : (
          <Skeleton h={190} />
        )}
      </Card>

      {mandate && (
        <div className={cx(v.banner, !mandate.active && v.bannerOff)}>
          <div className={v.bannerTile}>₦</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15.5 }}>
              {ngn(mandate.amountNgnMinor)} every {mandate.frequency === 'weekly' ? weekdayLong(mandate.nextDebit) : mandate.frequency === 'daily' ? 'day' : 'month'}
            </div>
            <div style={{ fontSize: 13, marginTop: 2, opacity: 0.8 }}>
              From {mandate.bankName} ••{mandate.accountLast4} · {mandate.active ? `next ${monthDay(mandate.nextDebit)}` : 'paused'}
            </div>
          </div>
          <Toggle ink on={mandate.active} onChange={(on) => toggle.mutate(on)} label="Auto-save" />
        </div>
      )}

      <SectionTitle>Your pots</SectionTitle>
      <Stack gap={10}>
        {(goals ?? []).map((g) => (
          <Card key={g.id} style={{ padding: '16px 16px 18px' }}>
            <Row>
              <Tile tone="sig" size={40}>
                <Icon name="target" size={18} />
              </Tile>
              <div style={{ flex: 1 }}>
                <div className={u.rowTitle}>{g.name}</div>
                <div className={u.rowSub}>
                  {g.type === 'flexible' ? 'Savings' : 'Locked'} · by {monthYear(g.by)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 16 }}>{usdt(g.savedMinor)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>of {usdt(g.targetMinor, { decimals: 0 })}</div>
              </div>
            </Row>
            <Progress value={g.savedMinor / g.targetMinor} style={{ marginTop: 16 }} />
          </Card>
        ))}
        <div className={v.twoUp}>
          {lock && (
            <Card onClick={() => nav('/save/locked')} style={{ padding: 16 }}>
              <Row justify="space-between" align="flex-start">
                <Tile tone="chain" size={36} radius={10}>
                  <Icon name="lock" size={16} />
                </Tile>
                <span className="mono" style={{ fontSize: 10, letterSpacing: 1, color: 'var(--accent)' }}>HIGHEST</span>
              </Row>
              <div className={u.rowTitle} style={{ marginTop: 14 }}>
                Locked · {lock.months} mo
              </div>
              <div className={u.rowSub}>Opens {monthDay(lock.opensAt)}</div>
              <div className="mono" style={{ fontSize: 16, marginTop: 14 }}>{usdt(lock.amountMinor)}</div>
            </Card>
          )}
          <Card onClick={() => nav('/money/withdraw')} style={{ padding: 16 }}>
            <Row justify="space-between" align="flex-start">
              <Tile size={36} radius={10}>$</Tile>
              <span className="mono" style={{ fontSize: 10, letterSpacing: 1, color: 'var(--muted)' }}>NO FEE</span>
            </Row>
            <div className={u.rowTitle} style={{ marginTop: 14 }}>Deposit</div>
            <div className={u.rowSub}>Take out any time</div>
            <div className="mono" style={{ fontSize: 16, marginTop: 14 }}>{depositAcc ? usdt(depositAcc.balanceMinor) : '—'}</div>
          </Card>
        </div>
      </Stack>

      <SectionTitle>Recent</SectionTitle>
      <List>
        {(recent ?? []).map((t) => (
          <ListRow
            key={t.id}
            tile={<Tile tone={txTile[t.kind].tone} size={38} radius={19}>{txTile[t.kind].g}</Tile>}
            title={t.title}
            sub={<span className="mono" style={{ color: 'var(--chain)', fontSize: 11.5 }}>{shortAddress(t.hash, 6, 4)}</span>}
            right={
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 15, color: t.amountMinor > 0 ? 'var(--accent)' : 'var(--text)' }}>{usdt(t.amountMinor, { sign: true })}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{monthDay(t.date)}</div>
              </div>
            }
          />
        ))}
      </List>
    </Screen>
  )
}

/* ───────── 12 New goal ───────── */
const AMOUNTS = [1000000, 2000000, 5000000]

export function NewGoal() {
  const nav = useNavigate()
  const toast = useToast()
  const { data: rates } = useRates()
  const create = useCreateGoal()
  const [name, setName] = useState('School fees')
  const [target, setTarget] = useState('1200')
  const [amount, setAmount] = useState(2000000)
  const [freq, setFreq] = useState<Frequency>('weekly')
  const [type, setType] = useState<PotType>('flexible')
  const targetMinor = Math.round(Number(target || 0) * 100)
  const rate = rates?.ngnPerUsdt ?? 1500
  const each = ngnToUsdt(amount, rate)
  const by = useMemo(() => projectGoal(targetMinor, each, freq, firstDebitDate(freq, new Date(MOCK_TODAY))), [targetMinor, each, freq])

  return (
    <Screen
      header={<Header title="New goal" />}
      footer={
        <>
          <div className={u.dashed} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
            <span style={{ fontSize: 14, color: 'var(--body)' }}>You’ll reach it by</span>
            <b style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15.5 }}>
              {targetMinor > 0 ? `${monthYear(by)} · ${usdt(each)} USDT each` : '—'}
            </b>
          </div>
          <Button
            disabled={!name.trim() || targetMinor <= 0}
            loading={create.isPending}
            onClick={async () => {
              await create.mutateAsync({ name: name.trim(), targetMinor, amountNgnMinor: amount, frequency: freq, type })
              toast(`${name.trim()} goal created`)
              nav('/save')
            }}
          >
            Create goal
          </Button>
        </>
      }
    >
      <Stack gap={20}>
        <TextField label="What are you saving for?" sans value={name} onChange={(e) => setName(e.target.value)} hint={<span style={{ color: 'var(--muted)' }}>EDIT</span>} />
        <div>
          <FieldLabel>Target</FieldLabel>
          <div className={cx(u.field, u.fieldActive)} style={{ minHeight: 72 }}>
            <input
              aria-label="Target in USDT"
              className={v.targetInput}
              inputMode="numeric"
              value={Number(target || 0).toLocaleString('en-US')}
              onChange={(e) => setTarget(e.target.value.replace(/\D/g, '').slice(0, 7))}
            />
            <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>
              USDT ≈ {ngn(usdtToNgn(targetMinor, rate), { compact: true })}
            </span>
          </div>
        </div>
        <div>
          <FieldLabel>Take from my bank each time</FieldLabel>
          <Chips options={AMOUNTS.map((a) => ({ value: a, label: ngn(a, { compact: true }) }))} value={amount} onChange={setAmount} />
        </div>
        <div>
          <FieldLabel>How often</FieldLabel>
          <Segmented options={FREQS} value={freq} onChange={setFreq} />
        </div>
        <div>
          <FieldLabel>Pot type</FieldLabel>
          <div className={v.twoUp}>
            <button className={cx(u.radioCard, type === 'flexible' && u.radioOn, v.potType)} onClick={() => setType('flexible')} aria-pressed={type === 'flexible'}>
              <div className={u.rowTitle}>Flexible</div>
              <div className={u.rowSub}>Interest · 1% to take out early</div>
            </button>
            <button className={cx(u.radioCard, type === 'locked' && u.radioOn, v.potType)} onClick={() => setType('locked')} aria-pressed={type === 'locked'}>
              <div className={u.rowTitle}>Locked</div>
              <div className={u.rowSub}>More interest · 3/6/12 months</div>
            </button>
          </div>
        </div>
      </Stack>
    </Screen>
  )
}

/* ───────── 13 Locked savings ───────── */
export function LockedSavings() {
  const toast = useToast()
  const { data: locked } = useLocked()
  const { data: options } = useLockOptions()
  const lockMut = useLock()
  const [months, setMonths] = useState(6)
  const [step, setStep] = useState<'pick' | 'amount'>('pick')
  const [amount, setAmount] = useState('100')
  const l = locked?.[0]
  const fee = l ? Math.round((l.amountMinor * l.breakFeePct) / 100) : 0
  const lose = l ? fee + l.interestMinor : 0

  return (
    <Screen
      header={<Header title="Locked Savings" />}
      footer={
        <Button
          loading={lockMut.isPending}
          icon={step === 'amount' ? 'lock' : undefined}
          onClick={async () => {
            if (step === 'pick') return setStep('amount')
            await lockMut.mutateAsync({ months, amountMinor: Math.round(Number(amount) * 100) })
            toast(`${amount} USDT locked for ${months} months`)
            setStep('pick')
          }}
        >
          {step === 'pick' ? 'Lock More Money' : `Lock ${amount || 0} USDT for ${months} mo`}
        </Button>
      }
    >
      {l ? (
        <div className={v.lockCard}>
          <Row justify="space-between">
            <span className="mono" style={{ fontSize: 11, letterSpacing: 1.4, color: '#7FB7FF' }}>
              LOCKED · {l.months} MONTHS
            </span>
            <Icon name="lock" size={18} color="#7FB7FF" />
          </Row>
          <div style={{ marginTop: 12 }}>
            <Amount minor={l.amountMinor} size={52} ccy="USDT" color="#ECEAE4" ccyColor="#8C9198" style={{ ['--faint' as string]: '#8C9198' }} />
          </div>
          <Progress value={l.elapsedMonths / l.months} color="#7FB7FF" track="rgba(255,255,255,0.1)" height={7} style={{ marginTop: 18 }} />
          <Row justify="space-between" style={{ marginTop: 10 }}>
            <span className={v.lockMeta}>
              {l.elapsedMonths} OF {l.months} MONTHS
            </span>
            <span className={v.lockMeta} style={{ color: '#ECEAE4' }}>
              OPENS {fullDate(l.opensAt).toUpperCase()}
            </span>
          </Row>
          <div className={v.twoUp} style={{ marginTop: 20 }}>
            <div className={v.lockStat}>
              <span className={v.lockMeta}>INTEREST SO FAR</span>
              <span className="mono" style={{ color: '#C6F35E', fontSize: 17 }}>{usdt(l.interestMinor, { sign: true })}</span>
            </div>
            <div className={v.lockStat}>
              <span className={v.lockMeta}>RATE (VARIES)</span>
              <span className="mono" style={{ color: '#ECEAE4', fontSize: 17 }}>{l.rateLabel}</span>
            </div>
          </div>
        </div>
      ) : (
        <Skeleton h={250} r={22} />
      )}

      <SectionTitle style={{ marginTop: 26 }}>Start a new lock</SectionTitle>
      <div className={v.lockOptions}>
        {(options ?? []).map((o) => (
          <motion.button key={o.months} whileTap={{ scale: 0.97 }} className={cx(v.lockOpt, o.months === months && v.lockOptOn)} onClick={() => setMonths(o.months)} aria-pressed={o.months === months}>
            <span className={v.lockOptTitle}>{o.months} mo</span>
            <span className="mono" style={{ fontSize: 11 }}>{o.rateLabel}</span>
          </motion.button>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>Longer locks earn more. Rates go up and down and are not promised.</p>

      {step === 'amount' && (
        <div style={{ marginTop: 18 }}>
          <TextField label="How much to lock (USDT)" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} hint="FROM DEPOSIT" />
        </div>
      )}

      {l && (
        <div className={v.breakCard}>
          <Row justify="space-between">
            <span style={{ color: 'var(--flare)', fontWeight: 500, fontSize: 15.5 }}>Break lock early</span>
            <span className="mono" style={{ color: 'var(--flare)', fontSize: 13 }}>-{usdt(lose)} USDT</span>
          </Row>
          <p style={{ fontSize: 14, color: 'var(--body)', marginTop: 8, lineHeight: '21px' }}>
            You pay a {l.breakFeePct}% fee ({usdt(fee)}) and lose the interest earned ({usdt(l.interestMinor)}). You’d get {usdt(l.amountMinor - lose)} USDT.
          </p>
        </div>
      )}
    </Screen>
  )
}
