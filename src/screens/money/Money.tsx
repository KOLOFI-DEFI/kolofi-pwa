import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ngn, ngnToUsdt, shortAddress, usdt, usdtToNgn } from '@/core/format'
import { useAccounts, useDeposit, useMandate, useMe, useRates, useWithdraw } from '@/core/data'
import {
  Button, Card, Eyebrow, Header, KeyValues, ListRow, MiniChips, NumPad, RadioCard, Screen, Segmented, Spacer, Stack,
  TextField, Tile, useToast, uiStyles as u,
} from '@/ui'
import m from './money.module.css'

const PRESETS = [1000000, 2000000, 5000000, 10000000]

/** Numpad editing on a major-unit string ("50000", "12.5") */
function applyKey(cur: string, k: string, maxDecimals: number): string {
  if (k === '⌫') return cur.length <= 1 ? '0' : cur.slice(0, -1)
  if (k === '.') return maxDecimals === 0 || cur.includes('.') ? cur : `${cur}.`
  const [, dec] = cur.split('.')
  if (dec !== undefined && dec.length >= maxDecimals) return cur
  const next = cur === '0' ? k : cur + k
  return next.replace('.', '').length > 9 ? cur : next
}
const fmtTyped = (v: string) => {
  const [i, d] = v.split('.')
  const int = Number(i || 0).toLocaleString('en-US')
  return d !== undefined ? `${int}.${d}` : int
}

/* ───────── 09 Add money ───────── */
export function AddMoney() {
  const nav = useNavigate()
  const toast = useToast()
  const { data: rates } = useRates()
  const { data: mandate } = useMandate()
  const { data: me } = useMe()
  const deposit = useDeposit()
  const [tab, setTab] = useState<'bank' | 'crypto'>('bank')
  const [typed, setTyped] = useState('50000')
  const amountMinor = Math.round(Number(typed) * 100)
  const fee = rates?.conversionFeeNgnMinor ?? 0
  const gets = rates ? ngnToUsdt(Math.max(0, amountMinor - fee), rates.ngnPerUsdt) : 0
  const bankLabel = mandate ? `${mandate.bankName} ••${mandate.accountLast4}` : 'GTBank'

  return (
    <Screen
      header={<Header title="Add Money" />}
      footer={
        tab === 'bank' ? (
          <Button
            disabled={amountMinor <= fee}
            loading={deposit.isPending}
            onClick={async () => {
              await deposit.mutateAsync(amountMinor)
              toast(`${ngn(amountMinor)} on its way`)
              nav('/home')
            }}
          >
            Add {ngn(amountMinor)}
          </Button>
        ) : (
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(me?.wallet.address ?? '')
              } catch {
                /* blocked */
              }
              toast('Address copied')
            }}
            icon="copy"
          >
            Copy address
          </Button>
        )
      }
    >
      <Segmented
        options={[
          { value: 'bank', label: 'From bank' },
          { value: 'crypto', label: 'Crypto deposit' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'bank' ? (
        <>
          <div className={m.amountBlock}>
            <div className={m.bigAmount}>₦{fmtTyped(typed)}</div>
            <div className={m.approx}>≈ {usdt(gets)} USDT</div>
          </div>
          <MiniChips options={PRESETS.map((p) => ({ value: p, label: ngn(p, { compact: true }) }))} value={amountMinor} onChange={(v) => setTyped(String(v / 100))} />
          <KeyValues
            style={{ marginTop: 20 }}
            rows={[
              { label: 'From', value: bankLabel },
              { label: 'Rate', value: `1 USDT = ${ngn((rates?.ngnPerUsdt ?? 0) * 100)}`, mono: true },
              { label: 'Conversion fee', value: ngn(fee), mono: true },
              { label: 'Goes to', value: 'Deposit' },
            ]}
          />
          <Spacer />
          <div style={{ marginTop: 16 }}>
            <NumPad onKey={(k) => setTyped((c) => applyKey(c, k, 0))} />
          </div>
        </>
      ) : (
        <Stack gap={14} style={{ marginTop: 28 }}>
          <Card style={{ padding: 18 }}>
            <Eyebrow style={{ fontSize: 10 }}>Your USDT address</Eyebrow>
            <div className="mono" style={{ fontSize: 15, marginTop: 8, wordBreak: 'break-all' }}>
              {me?.wallet.address}
            </div>
            <div style={{ height: 1, background: 'var(--line)', margin: '16px 0' }} />
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <Eyebrow style={{ fontSize: 10 }}>Network</Eyebrow>
                <div style={{ marginTop: 6, fontWeight: 500 }}>Base</div>
              </div>
              <div>
                <Eyebrow style={{ fontSize: 10 }}>Asset</Eyebrow>
                <div style={{ marginTop: 6, fontWeight: 500 }}>USDT</div>
              </div>
            </div>
          </Card>
          <div className={m.warn}>
            <b>!</b> Send only USDT on Base to {me ? shortAddress(me.wallet.address) : 'this address'}. Other coins or networks can be lost.
          </div>
        </Stack>
      )}
    </Screen>
  )
}

/* ───────── 10 Withdraw ───────── */
export function Withdraw() {
  const nav = useNavigate()
  const toast = useToast()
  const { data: accounts } = useAccounts()
  const { data: rates } = useRates()
  const { data: mandate } = useMandate()
  const withdraw = useWithdraw()
  const deposit = accounts?.find((a) => a.kind === 'deposit')
  const available = deposit?.balanceMinor ?? 0
  const [typed, setTyped] = useState('40.00')
  const [to, setTo] = useState<'bank' | 'wallet'>('bank')
  const [address, setAddress] = useState('')
  const amountMinor = Math.round(Number(typed) * 100)
  const fee = rates?.withdrawFeeNgnMinor ?? 0
  const youGet = rates ? Math.max(0, usdtToNgn(amountMinor, rates.ngnPerUsdt) - fee) : 0
  const over = amountMinor > available
  const bankLabel = mandate ? `${mandate.bankName} ••${mandate.accountLast4}` : 'your bank'
  const pct = (p: number) => setTyped((Math.floor((available * p) / 100) / 100).toFixed(2))
  const validAddr = /^0x[a-fA-F0-9]{40}$/.test(address)

  return (
    <Screen
      header={<Header title="Withdraw" />}
      footer={
        <Button
          disabled={amountMinor <= 0 || over || (to === 'wallet' && !validAddr)}
          loading={withdraw.isPending}
          onClick={async () => {
            await withdraw.mutateAsync({ from: deposit?.id ?? '', amountMinor, to, address: to === 'wallet' ? address : undefined })
            toast('Withdrawal sent')
            nav('/home')
          }}
        >
          Withdraw {usdt(amountMinor).replace(/\.00$/, '')} USDT
        </Button>
      }
    >
      <Eyebrow style={{ marginBottom: 10 }}>From</Eyebrow>
      <Card pad={false}>
        <ListRow tile={<Tile size={40}>$</Tile>} title="Deposit" sub="No fee · available now" value={usdt(available)} valueStyle={{ fontSize: 16 }} />
      </Card>

      <div className={m.amountBlock} style={{ marginTop: 30 }}>
        <label className={m.bigAmount} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
          <input
            className={m.amountInput}
            inputMode="decimal"
            aria-label="Amount in USDT"
            value={typed}
            size={Math.max(3, typed.length)}
            onChange={(e) => setTyped(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
            onBlur={() => setTyped((Number(typed) || 0).toFixed(2))}
          />
          <span className={u.amountCcy}>USDT</span>
        </label>
        {over && <div className={u.fieldError}>More than your Deposit balance</div>}
      </div>
      <MiniChips
        style={{ marginTop: 6 }}
        options={[
          { value: 25, label: '25%' },
          { value: 50, label: '50%' },
          { value: 100, label: 'Max' },
        ]}
        onChange={pct}
      />

      <Eyebrow style={{ marginTop: 34, marginBottom: 10 }}>Send to</Eyebrow>
      <Stack gap={10}>
        <RadioCard selected={to === 'bank'} onClick={() => setTo('bank')} title={`Naira to ${bankLabel}`} sub="Changed at today’s rate" />
        <RadioCard selected={to === 'wallet'} onClick={() => setTo('wallet')} title="USDT to another wallet" sub="On Base · paste an address" />
        {to === 'wallet' && (
          <TextField aria-label="Wallet address" placeholder="0x…" value={address} onChange={(e) => setAddress(e.target.value.trim())} error={address && !validAddr ? 'Enter a valid Base address' : undefined} inputStyle={{ fontSize: 15 }} />
        )}
      </Stack>
      <KeyValues
        style={{ marginTop: 18 }}
        rows={
          to === 'bank'
            ? [
                { label: 'You get', value: ngn(youGet), mono: true, accent: true },
                { label: 'Fee', value: ngn(fee), mono: true },
                { label: 'Arrives', value: 'In about 5 minutes' },
              ]
            : [
                { label: 'You send', value: `${usdt(amountMinor)} USDT`, mono: true, accent: true },
                { label: 'Network fee', value: 'Paid by Kólófi' },
                { label: 'Arrives', value: 'In under a minute' },
              ]
        }
      />
    </Screen>
  )
}
