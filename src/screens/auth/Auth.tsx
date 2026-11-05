import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { MOCK_TODAY } from '@/core/api'
import { dayMonthDay, groupDigits, groupPhone, ngn, ngnToUsdt, shortAddress, usdt, weekdayLong, firstDebitDate } from '@/core/format'
import type { Frequency } from '@/core/types'
import {
  useBanks, useCreateMandate, useMe, useRates, useResolveAccount, useSendOtp, useVerifyIdentity, useVerifyOtp,
} from '@/core/data'
import { useSession } from '@/state/session'
import {
  Button, Card, Chips, Eyebrow, Header, HeaderMono, Hero, Icon, Lead, Row, Screen, Segmented, Stack, StepBars,
  TextField, Toggle, Tile, useToast, uiStyles as u, cx,
} from '@/ui'
import a from './auth.module.css'

/* ───────── 04 Phone ───────── */
export function Phone() {
  const nav = useNavigate()
  const session = useSession()
  const [phone, setPhone] = useState(session.phone || '')
  const [wa, setWa] = useState(session.whatsappReminders)
  const send = useSendOtp()
  const digits = phone.replace(/\D/g, '')
  const valid = digits.length === 10

  const submit = async () => {
    const res = await send.mutateAsync({ phone: `+234${digits}`, whatsappReminders: wa })
    session.setPhone(digits, wa)
    session.setOtpRequest(res.requestId)
    session.setStage('otp')
    nav('/auth/otp')
  }
  return (
    <Screen
      header={
        <>
          <Header step="Step 1 of 2" back={() => nav('/intro/onchain')} />
          <StepBars total={2} current={1} />
        </>
      }
      footer={
        <>
          <p className={a.terms}>By continuing you agree to Kólófi’s Terms and Privacy Policy.</p>
          <Button disabled={!valid} loading={send.isPending} onClick={submit}>
            Send code
          </Button>
        </>
      }
    >
      <Hero>What’s your phone number?</Hero>
      <Lead style={{ marginTop: 12 }}>We’ll text you a 6-digit code. This number also gets your WhatsApp reminders.</Lead>
      <Row gap={10} style={{ marginTop: 28 }} align="stretch">
        <div className={cx(u.field, a.cc)}>
          <span className={a.flag} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className={a.ccText}>+234</span>
        </div>
        <div style={{ flex: 1 }}>
          <TextField
            aria-label="Phone number"
            inputMode="numeric"
            autoComplete="tel-national"
            autoFocus
            placeholder="803 412 7790"
            value={groupPhone(phone)}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 10))}
            active={digits.length > 0}
          />
        </div>
      </Row>
      {send.error && <div className={u.fieldError}>{(send.error as Error).message}</div>}
      <Card style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px 16px 18px' }}>
        <Tile tone="whatsapp" size={40} radius={10}>
          <Icon name="whatsapp" size={22} color="#fff" inverse="var(--whatsapp)" />
        </Tile>
        <div style={{ flex: 1 }}>
          <div className={u.rowTitle} style={{ fontSize: 15 }}>WhatsApp reminders</div>
          <div className={u.rowSub}>Before every payment and on pot day</div>
        </div>
        <Toggle on={wa} onChange={setWa} label="WhatsApp reminders" />
      </Card>
    </Screen>
  )
}

/* ───────── OTP (not in the boards — added, same visual language) ───────── */
export function Otp() {
  const nav = useNavigate()
  const session = useSession()
  const [code, setCode] = useState('')
  const [left, setLeft] = useState(45)
  const verify = useVerifyOtp()
  const resend = useSendOtp()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (code.length !== 6 || !session.otpRequestId) return
    verify.mutateAsync({ requestId: session.otpRequestId, code }).then(
      (r) => {
        session.signIn(r.token)
        session.setStage('kyc')
        nav('/auth/kyc')
      },
      () => setCode(''),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <Screen
      header={
        <>
          <Header step="Step 1 of 2" />
          <StepBars total={2} current={1} />
        </>
      }
      footer={
        <Button
          variant="secondary"
          disabled={left > 0}
          onClick={async () => {
            const r = await resend.mutateAsync({ phone: `+234${session.phone}`, whatsappReminders: session.whatsappReminders })
            session.setOtpRequest(r.requestId)
            setLeft(45)
          }}
        >
          {left > 0 ? `Resend code in 0:${String(left).padStart(2, '0')}` : 'Resend code'}
        </Button>
      }
    >
      <Hero>Enter the code</Hero>
      <Lead style={{ marginTop: 12 }}>
        We sent a 6-digit code to <b style={{ color: 'var(--text)', fontWeight: 600 }}>+234 {groupPhone(session.phone)}</b>.
      </Lead>
      <label className={a.otp} onClick={() => inputRef.current?.focus()}>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={cx(u.field, a.otpBox, i === code.length && u.fieldActive)}>
            {code[i] ?? ''}
          </span>
        ))}
        <input
          ref={inputRef}
          className="sr-only"
          aria-label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
      </label>
      {verify.error && <div className={u.fieldError}>{(verify.error as Error).message}</div>}
      <p className={a.terms} style={{ textAlign: 'left', marginTop: 16 }}>
        Mock mode: use 123456.
      </p>
    </Screen>
  )
}

/* ───────── 05 BVN / NIN ───────── */
export function Kyc() {
  const nav = useNavigate()
  const setStage = useSession((x) => x.setStage)
  const [method, setMethod] = useState<'BVN' | 'NIN'>('BVN')
  const [num, setNum] = useState('')
  const verify = useVerifyIdentity()
  const ok = num.length === 11
  return (
    <Screen
      header={
        <>
          <Header step="Step 2 of 2" />
          <StepBars total={2} current={2} />
        </>
      }
      footer={
        <Button
          disabled={!ok}
          loading={verify.isPending}
          onClick={async () => {
            await verify.mutateAsync({ method, number: num })
            setStage('wallet')
            nav('/auth/wallet-ready')
          }}
        >
          Verify &amp; create wallet
        </Button>
      }
    >
      <Hero style={{ fontSize: 33, letterSpacing: -0.6, whiteSpace: 'nowrap' }}>Confirm it’s really you</Hero>
      <Lead style={{ marginTop: 12 }}>Enter your BVN or NIN. It keeps fake accounts out of your circles.</Lead>
      <Segmented
        style={{ marginTop: 24 }}
        options={[
          { value: 'BVN', label: 'BVN' },
          { value: 'NIN', label: 'NIN' },
        ]}
        value={method}
        onChange={(m) => {
          setMethod(m)
          setNum('')
        }}
      />
      <div style={{ marginTop: 24 }}>
        <TextField
          label={method === 'BVN' ? 'Bank Verification Number (11 digits)' : 'National Identification Number (11 digits)'}
          inputMode="numeric"
          placeholder="0000 0000 000"
          value={groupDigits(num)}
          onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 11))}
          hint={num.length ? `${num.length}/11${ok ? ' ✓' : ''}` : undefined}
          active={num.length > 0}
          error={verify.error ? (verify.error as Error).message : undefined}
        />
      </div>
      <Card style={{ marginTop: 26, padding: '18px 18px' }}>
        <Stack gap={14}>
          {['We only check your name and date of birth.', 'We never see your bank PIN or balance.', 'One person, one account. No duplicates.'].map((t) => (
            <Row key={t} gap={12}>
              <Icon name="check" size={16} stroke={2.2} color="var(--accent)" />
              <span style={{ fontSize: 14.5 }}>{t}</span>
            </Row>
          ))}
        </Stack>
      </Card>
    </Screen>
  )
}

/* ───────── 06 Wallet ready ───────── */
export function WalletReady() {
  const nav = useNavigate()
  const setStage = useSession((x) => x.setStage)
  const { data: me } = useMe()
  const toast = useToast()
  const addr = me?.wallet.address ?? ''
  return (
    <Screen
      hero="glow"
      footer={
        <Button
          glow
          onClick={() => {
            setStage('autosave')
            nav('/auth/auto-save')
          }}
        >
          Set up auto-save
        </Button>
      }
    >
      <div className={a.walletStage}>
        <motion.div className={a.walletBox} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
          <div className={a.walletLid}>
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35, type: 'spring', stiffness: 400, damping: 14 }} style={{ display: 'grid' }}>
              <Icon name="check" size={28} stroke={2.6} color="#0E1013" />
            </motion.span>
          </div>
        </motion.div>
        <div className={a.walletShadow} />
      </div>
      <Eyebrow accent style={{ textAlign: 'center' }}>
        Verified · Welcome, {me?.preferredName ?? '…'}
      </Eyebrow>
      <Hero style={{ textAlign: 'center', marginTop: 10, fontSize: 34 }}>Your wallet is ready</Hero>
      <Lead style={{ textAlign: 'center', marginTop: 10, fontSize: 15 }}>This is your own USDT wallet. Savings and circle payouts land here.</Lead>
      <Card style={{ marginTop: 28, padding: '18px 16px' }}>
        <Row justify="space-between" align="flex-start">
          <div>
            <Eyebrow style={{ fontSize: 10 }}>Wallet address</Eyebrow>
            <div className="mono" style={{ fontSize: 15, marginTop: 6 }}>
              {addr ? shortAddress(addr, 10, 8) : '…'}
            </div>
          </div>
          <button
            className={u.iconBtn}
            style={{ width: 40, height: 40, borderRadius: 12 }}
            aria-label="Copy wallet address"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(addr)
              } catch {
                /* clipboard blocked */
              }
              toast('Address copied')
            }}
          >
            <Icon name="copy" size={18} />
          </button>
        </Row>
        <div style={{ height: 1, background: 'var(--line)', margin: '16px 0' }} />
        <Row>
          <div style={{ flex: 1 }}>
            <Eyebrow style={{ fontSize: 10 }}>Network</Eyebrow>
            <Row gap={8} style={{ marginTop: 6 }}>
              <span className={a.netDot} style={{ background: 'var(--chain)' }} />
              <b style={{ fontWeight: 500 }}>{me?.wallet.network ?? 'Base'}</b>
            </Row>
          </div>
          <div style={{ flex: 1 }}>
            <Eyebrow style={{ fontSize: 10 }}>Asset</Eyebrow>
            <Row gap={8} style={{ marginTop: 6 }}>
              <span className={a.netDot} style={{ background: 'var(--success)' }} />
              <b style={{ fontWeight: 500 }}>USDT</b>
            </Row>
          </div>
        </Row>
      </Card>
    </Screen>
  )
}

/* ───────── 07 Link bank & auto-save ───────── */
const AMOUNTS = [1000000, 2000000, 5000000] as const
const FREQS: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]
const freqWord = { daily: 'every day', weekly: 'every', monthly: 'on the 1st of every month' }

export function AutoSave() {
  const nav = useNavigate()
  const setStage = useSession((x) => x.setStage)
  const { data: banks = [] } = useBanks()
  const { data: rates } = useRates()
  const resolve = useResolveAccount()
  const create = useCreateMandate()
  const [bankId, setBankId] = useState('gtbank')
  const [acct, setAcct] = useState('')
  const [amount, setAmount] = useState<number>(2000000)
  const [freq, setFreq] = useState<Frequency>('weekly')
  const bank = banks.find((b) => b.id === bankId)

  useEffect(() => {
    if (acct.length === 10) resolve.mutate({ bankId, accountNumber: acct })
    else resolve.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acct, bankId])

  const first = useMemo(() => firstDebitDate(freq, new Date(MOCK_TODAY)).toISOString(), [freq])
  const each = rates ? ngnToUsdt(amount, rates.ngnPerUsdt) : 0
  const summary = freq === 'weekly' ? `${ngn(amount)} every ${weekdayLong(first)} from ${bank?.name ?? ''}` : `${ngn(amount)} ${freqWord[freq]} from ${bank?.name ?? ''}`
  const name = resolve.data?.accountName

  return (
    <Screen
      header={<Header title="Set Up Auto-Save" right={<HeaderMono>1/1</HeaderMono>} />}
      footer={
        <Button
          disabled={!name}
          loading={create.isPending}
          onClick={async () => {
            await create.mutateAsync({ bankId, accountNumber: acct, amountNgnMinor: amount, frequency: freq })
            setStage('ready')
            nav('/home', { replace: true })
          }}
        >
          Approve Mandate
        </Button>
      }
    >
      <Hero style={{ fontSize: 34 }}>Link your bank</Hero>
      <Lead style={{ marginTop: 10, fontSize: 15 }}>We take your amount on each date and change it to USDT. Pause or stop any time.</Lead>

      <Eyebrow style={{ marginTop: 26, marginBottom: 10 }}>Your bank</Eyebrow>
      <div className={a.banks}>
        {banks.map((b) => (
          <button key={b.id} className={cx(u.card, a.bank, b.id === bankId && a.bankOn)} onClick={() => setBankId(b.id)} aria-pressed={b.id === bankId}>
            <span className={a.bankLogo} style={{ background: b.color }}>
              {b.code}
            </span>
            <span>{b.name}</span>
          </button>
        ))}
      </div>

      <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>Account number</Eyebrow>
      <TextField
        aria-label="Account number"
        inputMode="numeric"
        placeholder="0000 0000 00"
        value={groupDigits(acct)}
        onChange={(e) => setAcct(e.target.value.replace(/\D/g, '').slice(0, 10))}
        hint={resolve.isPending ? 'Checking…' : name ? `✓ ${name}` : undefined}
        active={acct.length > 0}
        error={resolve.error ? (resolve.error as Error).message : undefined}
      />

      <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>How much each time</Eyebrow>
      <Chips options={AMOUNTS.map((v) => ({ value: v, label: ngn(v, { compact: true }) }))} value={amount} onChange={setAmount} />

      <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>How often</Eyebrow>
      <Segmented options={FREQS} value={freq} onChange={setFreq} />

      <div className={u.dashed} style={{ marginTop: 22, padding: '16px 18px' }}>
        <div style={{ fontWeight: 500, fontSize: 15.5 }}>{summary}</div>
        <div className={u.rowSub} style={{ marginTop: 4 }}>
          ≈ {usdt(each)} USDT each time · first debit {dayMonthDay(first)}
        </div>
      </div>
    </Screen>
  )
}
