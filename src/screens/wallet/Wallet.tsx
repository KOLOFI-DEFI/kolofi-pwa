import { useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { cents, dateTime, money, networkLabel, parseAmount, shortAddress, shortDate, usdt } from '@/core/format'
import { ApiError } from '@/core/api/contract'
import type { CryptoDeposit, CryptoWithdrawal, Network } from '@/core/types'
import type { IconName } from '@/core/icons'
import { useCreateAddress, useDeposits, useFeeQuote, useMe, useWallets, useWithdraw, useWithdrawal, useWithdrawals } from '@/core/data'
import {
  Button, EmptyState, Eyebrow, Icon, KeyValues, Money, Notice, Panel, Screen, Segmented, Skeleton, Soon, Tile, cx, errorText, useIsDesktop, usePin,
} from '@/ui'
import { CopyButton, PageHead, StatusPill, useCopy } from './parts'
import w from './wallet.module.css'

const NETWORKS: Network[] = ['trc20', 'bep20']
/** Short chip label: "TRC-20" */
const netShort = (n: string) => ({ trc20: 'TRC-20', bep20: 'BEP-20' })[n] ?? n.toUpperCase()
/** Plain-language chain name: "TRON" */
const netChain = (n: string) => ({ trc20: 'TRON', bep20: 'BNB Chain' })[n] ?? n.toUpperCase()

const WITHDRAW_MIN = 500 // cents: 5 USDT
const WITHDRAW_MAX = 1_000_000 // cents: 10,000 USDT
/** Not exposed by the API; the smallest deposit we tell members to send. */
const DEPOSIT_MIN = '1'

const ADDRESS_PATTERN: Record<Network, RegExp> = {
  trc20: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  bep20: /^0x[a-fA-F0-9]{40}$/,
}

function useUsdtBalance() {
  const { data: wallets, isLoading } = useWallets()
  const balance = wallets?.balances.find((b) => b.asset === 'usdt')
  return { wallets, balance, isLoading, networks: (balance?.networks ?? NETWORKS) as Network[] }
}

function NetworkPicker({ networks, value, onChange }: { networks: Network[]; value: Network; onChange: (n: Network) => void }) {
  return (
    <div className={w.netPicker} role="radiogroup" aria-label="Network">
      {networks.map((n) => (
        <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={networkLabel(n)} className={cx(w.netOption, n === value && w.netOn)} onClick={() => onChange(n)}>
          <span className={w.netDot} data-net={n} />
          <span className={w.netOptionText}>
            <b>{netShort(n)}</b>
            <span>{netChain(n)}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

/** The live crypto option beside the Naira option that is coming soon. */
function MethodChoice({ live, liveSub, naira, nairaSub }: { live: string; liveSub: string; naira: string; nairaSub: string }) {
  return (
    <div className={w.methods}>
      <div className={cx(w.method, w.methodOn)} role="radio" aria-checked="true">
        <Tile size={40} tone="sig">
          <Icon name="wallet" size={18} />
        </Tile>
        <div className={w.methodText}>
          <div>{live}</div>
          <span>{liveSub}</span>
        </div>
        <span className={w.radioDot} />
      </div>
      <div className={cx(w.method, w.methodOff)} aria-disabled="true">
        <Tile size={40}>₦</Tile>
        <div className={w.methodText}>
          <div>{naira}</div>
          <span>{nairaSub}</span>
        </div>
        <Soon />
      </div>
    </div>
  )
}

/* ═════════ Wallet ═════════ */
export function Wallet() {
  const nav = useNavigate()
  const isWide = useIsDesktop(768)
  const { wallets, balance, networks } = useUsdtBalance()
  const [tab, setTab] = useState<'deposits' | 'withdrawals'>('deposits')
  const totalCents = cents(balance?.available) + cents(balance?.held) + cents(balance?.in_savings)

  const quick: { label: string; icon: IconName; to: string; primary?: boolean }[] = [
    { label: 'Add', icon: 'plus', to: '/wallet/add', primary: true },
    { label: 'Withdraw', icon: 'arrowUpRight', to: '/wallet/withdraw' },
    { label: 'Activity', icon: 'activity', to: '/activity' },
    { label: 'Save', icon: 'vault', to: '/save' },
  ]

  return (
    <Screen tabs width="wide">
      <PageHead
        title="Wallet"
        eyebrow="Tether USD · USDT"
        back="/home"
        actions={
          <>
            <Button variant="outline" icon="activity" onClick={() => nav('/activity')}>
              Statement
            </Button>
            <Button variant="outline" icon="arrowUpRight" onClick={() => nav('/wallet/withdraw')}>
              Withdraw
            </Button>
            <Button icon="plus" onClick={() => nav('/wallet/add')}>
              Add money
            </Button>
          </>
        }
      />

      <div className={w.walletGrid}>
        <section className={w.balanceCard}>
          <svg className={w.balanceArc} viewBox="0 0 200 200" aria-hidden>
            <circle cx="100" cy="100" r="98" fill="none" stroke="currentColor" strokeDasharray="3 4" />
          </svg>
          <Eyebrow className={w.inkEyebrow}>Available to spend</Eyebrow>
          <div className={w.balanceAmount}>{balance ? <Money value={balance.available} size={48} ccy="USDT" color="#fff" ccyColor="rgba(255,255,255,0.6)" /> : <Skeleton h={52} w={220} style={{ opacity: 0.3 }} />}</div>
          <p className={w.balanceNote}>{balance ? `${usdt(totalCents)} USDT across wallet and savings` : ' '}</p>
          <div className={w.balanceNets}>
            {networks.map((n) => (
              <span key={n} className={w.inkTag}>
                <span className={w.netDot} data-net={n} />
                {netShort(n)}
              </span>
            ))}
          </div>
        </section>

        <StatCard className={w.statHeld} label="Held" value={balance?.held} note="Reserved for withdrawals in progress" icon="clock" />
        <StatCard className={w.statSavings} label="In savings" value={balance?.in_savings} note="Across your goal and locked plans" icon="vault" onClick={() => nav('/save')} />

        <div className={w.quick}>
          {quick.map((a) => (
            <button key={a.label} className={cx(w.quickBtn, a.primary && w.quickPrimary)} onClick={() => nav(a.to)}>
              <Icon name={a.icon} size={22} />
              <span>{a.label}</span>
            </button>
          ))}
        </div>

        <section className={w.history}>
          <Panel
            title={isWide ? 'History' : undefined}
            action={
              <Segmented
                options={[
                  { value: 'deposits', label: 'Deposits' },
                  { value: 'withdrawals', label: 'Withdrawals' },
                ]}
                value={tab}
                onChange={setTab}
                style={{ width: isWide ? 250 : '100%' }}
              />
            }
          >
            {tab === 'deposits' ? <DepositTable /> : <WithdrawalTable />}
          </Panel>
        </section>

        <aside className={w.addresses}>
          <Panel title="Deposit addresses" action={<span className={w.panelHint}>USDT only</span>}>
            <div className={w.addrList}>
              {!wallets && [0, 1].map((i) => <Skeleton key={i} h={74} r={16} />)}
              {wallets &&
                networks.map((n) => {
                  const addr = wallets.addresses.find((a) => a.network === n && a.is_active)
                  return (
                    <div key={n} className={w.addrItem}>
                      <div className={w.addrTop}>
                        <span className={w.addrNet}>
                          <span className={w.netDot} data-net={n} />
                          {networkLabel(n)}
                        </span>
                        {addr && <CopyButton text={addr.address} what={`${netShort(n)} address copied`} />}
                      </div>
                      {addr ? (
                        <button type="button" className={w.addrValue} onClick={() => nav(`/wallet/add?network=${n}`)} title="Show deposit details">
                          {addr.address}
                        </button>
                      ) : (
                        <button type="button" className={w.addrCreate} onClick={() => nav(`/wallet/add?network=${n}`)}>
                          <Icon name="plus" size={16} />
                          Get a {netShort(n)} address
                        </button>
                      )}
                    </div>
                  )
                })}
            </div>
            <p className={w.addrNote}>Send only USDT on the matching network. Deposits are credited after network confirmations.</p>
            <div className={w.soonRow}>
              <Tile size={36} radius={10}>
                ₦
              </Tile>
              <div className={w.soonText}>
                <div>Naira bank transfer or card</div>
                <span>Fund and withdraw in Naira</span>
              </div>
              <Soon />
            </div>
          </Panel>
        </aside>
      </div>
    </Screen>
  )
}

function StatCard({ label, value, note, icon, className, onClick }: { label: string; value: string | undefined; note: string; icon: IconName; className?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={cx(w.stat, onClick && w.statLink, className)} onClick={onClick}>
      <span className={w.statTop}>
        <Tile size={34} radius={10}>
          <Icon name={icon} size={16} />
        </Tile>
        {onClick && <Icon name="chevronRight" size={16} className={w.chev} />}
      </span>
      <span className={w.statLabel}>{label}</span>
      <span className={w.statValue}>{value === undefined ? <Skeleton h={28} w={110} /> : <Money value={value} size={28} ccy="USDT" />}</span>
      <span className={w.statNote}>{note}</span>
    </Tag>
  )
}

function LoadMore({ show, loading, onClick }: { show: boolean; loading: boolean; onClick: () => void }) {
  if (!show) return null
  return (
    <div className={w.more}>
      <Button variant="ghost" loading={loading} onClick={onClick}>
        Load more
      </Button>
    </div>
  )
}

function RowsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ padding: '12px 0' }}>
          <Skeleton h={40} />
        </div>
      ))}
    </>
  )
}

function DepositTable() {
  const nav = useNavigate()
  const { items, hasNextPage, fetchNextPage, isFetchingNextPage, error } = useDeposits()
  if (error) return <Notice tone="flare">{errorText(error)}</Notice>
  return (
    <div className={w.table}>
      <div className={w.tHead} aria-hidden>
        <span>Deposit</span>
        <span>Transaction</span>
        <span>Date</span>
        <span>Status</span>
        <span>Amount</span>
      </div>
      {items === undefined && <RowsSkeleton />}
      {items?.length === 0 && (
        <EmptyState icon="arrowDownLeft" title="No deposits yet" action={<Button variant="outline" onClick={() => nav('/wallet/add')}>Add money</Button>}>
          Send USDT to your deposit address and it shows up here.
        </EmptyState>
      )}
      {items?.map((d) => <DepositRow key={d.id} d={d} />)}
      <LoadMore show={!!hasNextPage} loading={isFetchingNextPage} onClick={() => void fetchNextPage()} />
    </div>
  )
}

function DepositRow({ d }: { d: CryptoDeposit }) {
  const copy = useCopy()
  const at = d.credited_at ?? d.created_at
  return (
    <div className={w.tRow}>
      <span className={w.tMain}>
        <Tile size={38} radius={11} tone="sig">
          <Icon name="arrowDownLeft" size={17} />
        </Tile>
        <span className={w.tText}>
          <span className={w.tTitle}>Deposit</span>
          <span className={w.tSub}>
            {netShort(d.network)}
            <span className={w.subDate}> · {shortDate(at)}</span>
          </span>
        </span>
      </span>
      <span className={w.tCell}>
        <button type="button" className={w.hash} onClick={() => copy(d.tx_hash, 'Transaction hash copied')} title="Copy transaction hash">
          {shortAddress(d.tx_hash, 8, 6)}
          <Icon name="copy" size={13} />
        </button>
      </span>
      <span className={cx(w.tCell, w.tDate)}>{dateTime(at)}</span>
      <span className={w.tStatus}>
        <StatusPill status={d.status} />
      </span>
      <span className={cx(w.tAmount, d.status === 'credited' && w.in)}>+{money(d.amount)}</span>
    </div>
  )
}

function WithdrawalTable() {
  const nav = useNavigate()
  const { items, hasNextPage, fetchNextPage, isFetchingNextPage, error } = useWithdrawals()
  if (error) return <Notice tone="flare">{errorText(error)}</Notice>
  return (
    <div className={w.table}>
      <div className={w.tHead} aria-hidden>
        <span>Sent to</span>
        <span>Network</span>
        <span>Date</span>
        <span>Status</span>
        <span>Amount</span>
      </div>
      {items === undefined && <RowsSkeleton />}
      {items?.length === 0 && (
        <EmptyState icon="arrowUpRight" title="No withdrawals yet" action={<Button variant="outline" onClick={() => nav('/wallet/withdraw')}>Withdraw</Button>}>
          USDT you send to other wallets shows up here.
        </EmptyState>
      )}
      {items?.map((x) => <WithdrawalRow key={x.id} x={x} />)}
      <LoadMore show={!!hasNextPage} loading={isFetchingNextPage} onClick={() => void fetchNextPage()} />
    </div>
  )
}

function WithdrawalRow({ x }: { x: CryptoWithdrawal }) {
  const nav = useNavigate()
  return (
    <button type="button" className={cx(w.tRow, w.tLink)} onClick={() => nav(`/wallet/withdrawals/${x.id}`)}>
      <span className={w.tMain}>
        <Tile size={38} radius={11}>
          <Icon name="arrowUpRight" size={17} />
        </Tile>
        <span className={w.tText}>
          <span className={cx(w.tTitle, w.mono)}>{shortAddress(x.address)}</span>
          <span className={w.tSub}>
            {netShort(x.network)}
            <span className={w.subDate}> · {shortDate(x.created_at)}</span>
          </span>
        </span>
      </span>
      <span className={w.tCell}>{networkLabel(x.network)}</span>
      <span className={cx(w.tCell, w.tDate)}>{dateTime(x.created_at)}</span>
      <span className={w.tStatus}>
        <StatusPill status={x.status} />
      </span>
      <span className={w.tAmount}>
        −{money(x.amount)}
        <span className={w.tFee}>fee {money(x.fee)}</span>
      </span>
    </button>
  )
}

/* ═════════ Add money (board 09) ═════════ */
export function AddMoney() {
  const isWide = useIsDesktop(768)
  const [params, setParams] = useSearchParams()
  const { wallets, networks } = useUsdtBalance()
  const create = useCreateAddress()
  const copy = useCopy()
  const fromQuery = params.get('network') as Network | null
  const network: Network = fromQuery && networks.includes(fromQuery) ? fromQuery : (networks[0] ?? 'trc20')
  const setNetwork = (n: Network) => {
    create.reset()
    setParams({ network: n }, { replace: true })
  }
  const address = wallets?.addresses.find((a) => a.network === network && a.is_active)
  const getAddress = () => create.mutate(network)

  const cta = address ? (
    <Button icon="copy" onClick={() => copy(address.address, 'Address copied')}>
      Copy address
    </Button>
  ) : (
    <Button icon="plus" loading={create.isPending} disabled={!wallets} onClick={getAddress}>
      Get my {netShort(network)} address
    </Button>
  )

  return (
    <Screen width="wide" footer={isWide ? undefined : <div className={w.footPad}>{cta}</div>}>
      <PageHead title="Add money" eyebrow="Fund your wallet" back="/wallet" backLabel="Wallet" />

      <div className={w.flow}>
        <div className={w.flowMain}>
          <section>
            <h2 className={w.sectionTitle}>How you’re paying</h2>
            <MethodChoice live="USDT from a crypto wallet" liveSub="From an exchange or any wallet that sends USDT" naira="Naira bank transfer or card" nairaSub="Pay in Naira and we convert it" />
          </section>

          <section>
            <h2 className={w.sectionTitle}>Network</h2>
            <NetworkPicker networks={networks} value={network} onChange={setNetwork} />
          </section>

          <section className={w.steps}>
            <h2 className={w.sectionTitle}>Three steps</h2>
            <ol className={w.stepList}>
              <li>
                <b>Copy your {netShort(network)} address.</b> It’s yours alone, and you can reuse it for every deposit.
              </li>
              <li>
                <b>Send USDT on {netChain(network)}.</b> In your exchange or wallet, pick USDT and the {networkLabel(network)} network, then paste the address.
              </li>
              <li>
                <b>Wait for confirmations.</b> Once the network confirms the transfer, the money lands in your wallet and we let you know.
              </li>
            </ol>
          </section>
        </div>

        <aside className={w.flowAside}>
          <div className={w.addrCard}>
            <div className={w.addrCardHead}>
              <Eyebrow className={w.inkEyebrow}>Your USDT address</Eyebrow>
              <span className={w.inkTag}>
                <span className={w.netDot} data-net={network} />
                {netShort(network)}
              </span>
            </div>
            {!wallets ? (
              <Skeleton h={60} style={{ marginTop: 14, opacity: 0.25 }} />
            ) : address ? (
              <div className={w.bigAddr}>{address.address}</div>
            ) : (
              <div className={w.noAddr}>
                <p>You don’t have a {netShort(network)} address yet. We’ll create one for you now.</p>
                {isWide && (
                  <Button icon="plus" loading={create.isPending} onClick={getAddress} className={w.inkBtn}>
                    Get my {netShort(network)} address
                  </Button>
                )}
              </div>
            )}
            {create.error && <p className={w.inkError}>{errorText(create.error)}</p>}
            <div className={w.addrMeta}>
              <div>
                <span>Asset</span>
                <b>USDT</b>
              </div>
              <div>
                <span>Network</span>
                <b>{networkLabel(network)}</b>
              </div>
            </div>
            {address && isWide && (
              <Button icon="copy" className={w.inkBtn} onClick={() => copy(address.address, 'Address copied')}>
                Copy address
              </Button>
            )}
          </div>

          <ul className={w.warnings}>
            <li data-tone="flare">
              <Icon name="info" size={18} />
              <span>
                Send only <b>USDT on {networkLabel(network)}</b>. Other coins, or USDT on another network, can be lost for good.
              </span>
            </li>
            <li>
              <Icon name="target" size={18} />
              <span>Send at least {DEPOSIT_MIN} USDT. Smaller amounts may not be credited.</span>
            </li>
            <li>
              <Icon name="clock" size={18} />
              <span>It arrives once the network confirms it, usually within a few minutes.</span>
            </li>
          </ul>
        </aside>
      </div>
    </Screen>
  )
}

/* ═════════ Withdraw (board 10) ═════════ */
export function Withdraw() {
  const nav = useNavigate()
  const isWide = useIsDesktop(768)
  const pin = usePin()
  const { data: me } = useMe()
  const { balance, networks } = useUsdtBalance()
  const withdraw = useWithdraw()
  const [network, setNetwork] = useState<Network>('trc20')
  const [address, setAddress] = useState('')
  const [addressTouched, setAddressTouched] = useState(false)
  const [amountText, setAmountText] = useState('')

  const amount = parseAmount(amountText)
  const availableCents = cents(balance?.available)
  const quote = useFeeQuote({ event: 'withdrawal.crypto', asset: 'usdt', network, amount: amount ?? '0' }, !!amount)
  const maxQuote = useFeeQuote({ event: 'withdrawal.crypto', asset: 'usdt', network, amount: balance?.available ?? '0' }, availableCents > 0)
  const fresh = quote.data && quote.data.amount === amount ? quote.data : undefined
  const feeCents = fresh ? cents(fresh.fee) : null
  const totalCents = fresh ? cents(fresh.total) : null
  const maxCents = Math.max(0, availableCents - cents(maxQuote.data?.fee))

  const heldUntil = me?.withdrawals_held_until && new Date(me.withdrawals_held_until).getTime() > Date.now() ? me.withdrawals_held_until : null
  const frozen = !!me?.is_frozen
  const unverified = me ? !me.email_verified : false
  const blocked = !!heldUntil || frozen || unverified

  const addressValid = ADDRESS_PATTERN[network].test(address)
  const apiField = (name: string) => (withdraw.error instanceof ApiError ? withdraw.error.field(name) : undefined)
  const addressError =
    (addressTouched && address && !addressValid ? `That isn’t a ${netShort(network)} address. It should start with ${network === 'bep20' ? '0x' : 'T'}.` : undefined) ?? apiField('address')

  const amountCents = cents(amount)
  let amountError: string | undefined
  if (!amount) amountError = amountText.trim() && !/^0*\.?0*$/.test(amountText) ? 'Enter an amount like 25 or 25.50' : undefined
  else if (amountCents < WITHDRAW_MIN) amountError = 'The minimum withdrawal is 5 USDT'
  else if (amountCents > WITHDRAW_MAX) amountError = 'The most you can send at once is 10,000 USDT'
  else if (totalCents !== null && totalCents > availableCents) amountError = 'Amount plus fee is more than your available balance'
  else amountError = apiField('amount')

  const ready = !blocked && addressValid && !!amount && !amountError && totalCents !== null

  const submit = () => {
    if (!ready || !amount) return
    pin({
      title: 'Confirm withdrawal',
      sub: `Send ${money(amount)} USDT to ${shortAddress(address)} on ${networkLabel(network)}. ${usdt(totalCents ?? 0)} USDT leaves your wallet.`,
      confirmLabel: `Withdraw ${money(amount)} USDT`,
      run: async (p) => {
        const result = await withdraw.mutateAsync({ asset: 'usdt', network, address, amount, pin: p })
        nav(`/wallet/withdrawals/${result.id}`, { replace: true })
      },
    })
  }

  const cta = (
    <Button disabled={!ready} loading={withdraw.isPending} onClick={submit}>
      {amount && !amountError ? `Withdraw ${money(amount)} USDT` : 'Withdraw'}
    </Button>
  )

  return (
    <Screen width="wide" footer={isWide ? undefined : <div className={w.footPad}>{cta}</div>}>
      <PageHead title="Withdraw" eyebrow="Send USDT out" back="/wallet" backLabel="Wallet" />

      <div className={w.flow}>
        <div className={w.flowMain}>
          {heldUntil && (
            <Notice tone="flare" icon="lock">
              <b>Withdrawals are paused until {dateTime(heldUntil)}.</b> We hold withdrawals for 24 hours after a password reset to keep your money safe.
            </Notice>
          )}
          {frozen && (
            <Notice tone="flare" icon="lock">
              <b>Your account is frozen.</b> Withdrawals are turned off. Contact support to unfreeze it.
            </Notice>
          )}
          {unverified && !frozen && (
            <Notice tone="flare" icon="mail">
              <b>Verify your email first.</b> Crypto withdrawals need a confirmed email address.
            </Notice>
          )}

          <section>
            <h2 className={w.sectionTitle}>Amount</h2>
            <div className={cx(w.amountBox, amountError && w.bad)}>
              <label className={w.amountLine}>
                <input
                  className={w.amountInput}
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="Amount in USDT"
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value.replace(/[^\d.,]/g, ''))}
                />
                <span className={w.amountCcy}>USDT</span>
              </label>
              <button type="button" className={w.maxBtn} disabled={maxCents <= 0} onClick={() => setAmountText((maxCents / 100).toFixed(2))}>
                Max
              </button>
            </div>
            <div className={w.amountFoot}>
              <span>
                Available <b>{balance ? money(balance.available) : '…'} USDT</b>
              </span>
              <span>Min 5 · max 10,000</span>
            </div>
            {amountError && <div className={w.fieldError}>{amountError}</div>}
          </section>

          <section>
            <h2 className={w.sectionTitle}>Send to</h2>
            <MethodChoice live="USDT to a wallet address" liveSub="An exchange or any wallet that receives USDT" naira="Naira to a bank account" nairaSub="Cash out to any Nigerian bank" />
          </section>

          <section>
            <h2 className={w.sectionTitle}>Network</h2>
            <NetworkPicker networks={networks} value={network} onChange={setNetwork} />
          </section>

          <section>
            <label className={w.sectionTitle} htmlFor="wd-address">
              Destination address
            </label>
            <div className={cx(w.addrField, addressError && w.bad)}>
              <input
                id="wd-address"
                className={w.addrInput}
                placeholder={network === 'bep20' ? '0x…' : 'T…'}
                autoComplete="off"
                spellCheck={false}
                value={address}
                onChange={(e) => setAddress(e.target.value.trim())}
                onBlur={() => setAddressTouched(true)}
              />
              <button
                type="button"
                className={w.pasteBtn}
                onClick={async () => {
                  try {
                    setAddress((await navigator.clipboard.readText()).trim())
                    setAddressTouched(true)
                  } catch {
                    /* clipboard read blocked; the member can paste by hand */
                  }
                }}
              >
                Paste
              </button>
            </div>
            {addressError ? <div className={w.fieldError}>{addressError}</div> : <div className={w.fieldHint}>Double-check it. Crypto sent to the wrong address can’t be recovered.</div>}
          </section>
        </div>

        <aside className={cx(w.flowAside, w.sticky)}>
          <div className={w.review}>
            <Eyebrow>Review</Eyebrow>
            <div className={w.reviewAmount}>
              <Money value={amount ?? '0'} size={40} ccy="USDT" />
            </div>
            <p className={w.reviewTo}>{addressValid ? `to ${shortAddress(address, 8, 6)} on ${netShort(network)}` : `on ${networkLabel(network)}`}</p>
            <KeyValues
              style={{ marginTop: 16 }}
              rows={[
                { label: 'They receive', value: amount ? `${money(amount)} USDT` : '—', mono: true },
                { label: 'Kólófi fee', value: feeCents === null ? (amount && quote.isFetching ? 'Checking…' : '—') : `${usdt(feeCents)} USDT`, mono: true },
                { label: 'Total from wallet', value: totalCents === null ? '—' : `${usdt(totalCents)} USDT`, mono: true, accent: true },
                { label: 'Available after', value: `${usdt(Math.max(0, availableCents - (totalCents ?? 0)))} USDT`, mono: true },
                { label: 'Arrives', value: 'Usually within minutes' },
              ]}
            />
            {quote.error && <p className={w.fieldError}>{errorText(quote.error)}</p>}
            <p className={w.reviewNote}>Withdrawals can’t be reversed once sent. You’ll confirm with your transaction PIN.</p>
            {isWide && <div className={w.reviewCta}>{cta}</div>}
          </div>
        </aside>
      </div>
    </Screen>
  )
}

/* ═════════ Withdrawal detail ═════════ */
export function WithdrawalDetail() {
  const nav = useNavigate()
  const { id = '' } = useParams()
  const { data: x, error, refetch, isFetching } = useWithdrawal(id)

  if (error) {
    return (
      <Screen width="wide">
        <PageHead title="Withdrawal" back="/wallet" backLabel="Wallet" />
        <EmptyState icon="info" title="We couldn’t load this withdrawal" action={<Button variant="outline" onClick={() => nav('/wallet')}>Back to wallet</Button>}>
          {errorText(error)}
        </EmptyState>
      </Screen>
    )
  }

  const inFlight = x ? ['processing', 'pending', 'unknown'].includes(x.status) : false
  const refresh = (
    <Button variant="outline" icon="refresh" loading={isFetching} onClick={() => void refetch()}>
      Refresh status
    </Button>
  )

  return (
    <Screen width="wide">
      <PageHead
        title="Withdrawal"
        eyebrow={x ? `${networkLabel(x.network)} · ${shortDate(x.created_at)}` : undefined}
        back="/wallet"
        backLabel="Wallet"
        actions={
          <>
            {inFlight && refresh}
            <Button variant="outline" icon="arrowUpRight" onClick={() => nav('/wallet/withdraw')}>
              New withdrawal
            </Button>
          </>
        }
      />

      {!x ? (
        <div className={w.detail}>
          <Skeleton h={220} r={24} />
          <Skeleton h={320} r={24} />
        </div>
      ) : (
        <div className={w.detail}>
          <div className={w.detailMain}>
            <section className={w.detailHero}>
              <div className={w.detailHeroTop}>
                <Eyebrow>{x.status === 'completed' ? 'Sent' : x.status === 'failed' ? 'Not sent' : 'Sending'}</Eyebrow>
                <StatusPill status={x.status} />
              </div>
              <div className={w.detailAmount}>
                <Money value={x.amount} size={52} ccy="USDT" />
              </div>
              <p className={w.reviewTo}>
                to <span className={w.mono}>{shortAddress(x.address, 8, 6)}</span> on {netShort(x.network)}
              </p>
            </section>

            <Panel title="Status">
              <Timeline x={x} />
              {inFlight && <div className={w.phoneOnly}>{refresh}</div>}
            </Panel>
          </div>

          <aside className={w.detailAside}>
            <KeyValues
              rows={[
                { label: 'Amount sent', value: `${money(x.amount)} USDT`, mono: true },
                { label: 'Kólófi fee', value: `${money(x.fee)} USDT`, mono: true },
                { label: 'Total from wallet', value: `${money(x.total)} USDT`, mono: true, accent: true },
                { label: 'Network', value: networkLabel(x.network) },
                { label: 'Requested', value: dateTime(x.created_at) },
                ...(x.completed_at ? [{ label: x.status === 'failed' ? 'Closed' : 'Completed', value: dateTime(x.completed_at) }] : []),
              ]}
            />
            <CopyBlock label="Destination address" value={x.address} what="Address copied" />
            {x.tx_hash ? (
              <CopyBlock label="Transaction hash" value={x.tx_hash} what="Transaction hash copied" />
            ) : (
              <div className={w.copyBlock}>
                <span className={w.copyLabel}>Transaction hash</span>
                <span className={w.muted}>{x.status === 'failed' ? 'Not sent to the network' : 'Appears once the network accepts it'}</span>
              </div>
            )}
          </aside>
        </div>
      )}
    </Screen>
  )
}

function CopyBlock({ label, value, what }: { label: string; value: string; what: string }) {
  return (
    <div className={w.copyBlock}>
      <div className={w.copyBlockHead}>
        <span className={w.copyLabel}>{label}</span>
        <CopyButton text={value} what={what} />
      </div>
      <span className={w.copyValue}>{value}</span>
    </div>
  )
}

function Timeline({ x }: { x: CryptoWithdrawal }) {
  const failed = x.status === 'failed'
  const refunded = x.status === 'refunded'
  const done = x.status === 'completed'
  const settled = done || failed || refunded
  const at = x.completed_at ? dateTime(x.completed_at) : null
  const last: { title: string; sub: string; state: 'done' | 'todo' | 'bad' } = failed
    ? { title: 'Failed', sub: `The withdrawal didn’t go through${at ? ` · ${at}` : ''}.`, state: 'bad' }
    : refunded
      ? { title: 'Refunded', sub: 'The money is back in your wallet.', state: 'done' }
      : done
        ? { title: 'Completed', sub: `${at ? `${at} · ` : ''}Arrived at the destination.`, state: 'done' }
        : { title: 'Completed', sub: 'We’ll let you know when it lands.', state: 'todo' }
  const steps: { title: string; sub: ReactNode; state: 'done' | 'now' | 'todo' | 'bad' }[] = [
    { title: 'Requested', sub: `${dateTime(x.created_at)} · ${money(x.total)} USDT held from your wallet`, state: 'done' },
    { title: 'Processing', sub: settled ? 'Submitted to the network' : 'Sending to the network. This usually takes a few minutes.', state: settled ? 'done' : 'now' },
    last,
  ]
  return (
    <ol className={w.timeline}>
      {steps.map((s) => (
        <li key={s.title} data-state={s.state}>
          <span className={w.tlDot}>{s.state === 'done' ? <Icon name="check" size={13} /> : s.state === 'bad' ? <Icon name="close" size={13} /> : null}</span>
          <div>
            <div className={w.tlTitle}>{s.title}</div>
            <div className={w.tlSub}>{s.sub}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}
