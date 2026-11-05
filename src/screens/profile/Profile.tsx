import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useInstall } from '@/app/install'
import { useQueryClient } from '@tanstack/react-query'
import { dateTime, formatE164NG, fullDate, initials, monthYear, shortDate, timeAgo } from '@/core/format'
import type { NotificationCategory, Session } from '@/core/types'
import type { ThemePreference } from '@/core/theme'
import type { IconName } from '@/core/icons'
import { ApiError } from '@/core/api/contract'
import {
  getApi, qk, useChangePassword, useFeatures, useMe, useNotificationPrefs, useReputation, useRevokeOtherSessions, useRevokeSession, useSessions,
  useSetPin, useUnreadCount, useUpdateNotificationPrefs,
} from '@/core/data'
import { useSession } from '@/state/session'
import { useThemeStore } from '@/state/theme'
import {
  Avatar, Badge, Button, Icon, Notice, PinInput, Screen, Segmented, Skeleton, Soon, TextButton, TextField, Tile, Toggle, cx, errorText, useToast,
} from '@/ui'
import { bands } from './bands'
import { Dialog } from './Dialog'
import p from './profile.module.css'

export { Notifications } from './Notifications'
export { Reputation } from './Reputation'

/* ═════════ Shared bits ═════════ */
const fieldErrors = (error: unknown) => (name: string) => (error instanceof ApiError ? error.field(name) : undefined)
/** A message for errors that are not tied to one of the form's fields. */
const formError = (error: unknown, fields: string[]) => (error && !(error instanceof ApiError && fields.some((f) => error.field(f))) ? errorText(error) : null)

const passwordRules = [
  { label: '10+ characters', test: (v: string) => v.length >= 10 },
  { label: 'Upper & lower case', test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: 'A number', test: (v: string) => /\d/.test(v) },
]
const weakPins = ['000000', '111111', '123456', '654321', '121212']

/** A settings group: an eyebrow over a list card on phones, a titled panel on tablet and desktop. */
function Section({ title, desc, action, children, className }: { title: string; desc?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx(p.section, className)}>
      <div className={p.sectionHead}>
        <div>
          <h2 className={p.sectionTitle}>{title}</h2>
          {desc && <p className={p.sectionDesc}>{desc}</p>}
        </div>
        {action}
      </div>
      <div className={p.sectionBody}>{children}</div>
    </section>
  )
}

interface SettingRowProps {
  icon: IconName
  tone?: 'neutral' | 'sig' | 'chain' | 'flare'
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode
  onClick?: () => void
  chevron?: boolean
}
function SettingRow({ icon, tone, title, sub, right, onClick, chevron }: SettingRowProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={cx(p.row, onClick && p.rowLink)} onClick={onClick}>
      <Tile tone={tone} size={38} radius={11}>
        <Icon name={icon} size={17} />
      </Tile>
      <div className={p.rowMain}>
        <div className={p.rowTitle}>{title}</div>
        {sub && <div className={p.rowSub}>{sub}</div>}
      </div>
      {right && <div className={p.rowRight}>{right}</div>}
      {chevron && <Icon name="chevronRight" size={16} className={p.chev} />}
    </Tag>
  )
}

/* ═════════ Profile (board 20) ═════════ */
type Dialog = 'password' | 'pin' | 'help' | 'logout' | 'revokeOthers' | { revoke: Session } | null

const prefRows: { key: NotificationCategory; title: string; sub: string; icon: IconName }[] = [
  { key: 'transactions', title: 'Transactions', sub: 'Deposits, withdrawals and fees', icon: 'wallet' },
  { key: 'savings', title: 'Savings & circles', sub: 'Auto-saves, interest, contributions and payouts', icon: 'vault' },
  { key: 'security', title: 'Security', sub: 'New sign-ins, password and PIN changes', icon: 'shield' },
]

export function Profile() {
  const installer = useInstall()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { data: me } = useMe()
  const { data: rep } = useReputation()
  const { data: unread } = useUnreadCount()
  const { data: sessions } = useSessions()
  const { data: prefs } = useNotificationPrefs()
  const { data: features } = useFeatures()
  const updatePrefs = useUpdateNotificationPrefs()
  const revoke = useRevokeSession()
  const revokeOthers = useRevokeOtherSessions()
  const { preference, setPreference } = useThemeStore()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const close = () => setDialog(null)

  const soon = features?.filter((f) => f.status === 'coming_soon')
  const others = sessions?.filter((x) => !x.is_current) ?? []
  const revoking = typeof dialog === 'object' && dialog ? dialog.revoke : null
  const heldUntil = me?.withdrawals_held_until && new Date(me.withdrawals_held_until).getTime() > Date.now() ? me.withdrawals_held_until : null
  const band = rep && bands.find((b) => b.key === rep.band)

  const logOut = async () => {
    setLoggingOut(true)
    try {
      await getApi().auth.logout()
    } catch {
      /* The token is dropped on this device either way. */
    }
    useSession.getState().signOut()
    nav('/login', { replace: true })
    qc.clear()
  }

  const links = (
    <>
      <SettingRow
        icon="star"
        tone="sig"
        title="Reputation"
        sub={band ? `${band.label} · how circles see you` : 'How circles see you'}
        right={<span className={p.score}>{rep?.score ?? '…'}</span>}
        onClick={() => nav('/reputation')}
        chevron
      />
      <SettingRow icon="bell" title="Notifications" sub={unread ? `${unread} unread` : 'All caught up'} onClick={() => nav('/notifications')} chevron />
      <SettingRow icon="help" title="Help & support" sub="Answers to common questions" onClick={() => setDialog('help')} chevron />
    </>
  )

  return (
    <Screen tabs>
      <header className={p.head}>
        <div>
          <h1 className={p.title}>Profile</h1>
          <p className={p.lead}>Your account, security and preferences.</p>
        </div>
        <Button variant="outline" icon="logout" className={p.headBtn} onClick={() => setDialog('logout')}>
          Log out
        </Button>
      </header>

      <div className={p.layout}>
        {/* Phone: the board's identity card. Desktop: the sticky profile summary. */}
        <aside className={p.side}>
          <div className={p.idCard}>
            <div className={p.idTop}>
              <Avatar initials={me ? initials(me.first_name, me.last_name) : ''} size={58} />
              <div className={p.idText}>
                <div className={p.idName}>{me ? `${me.first_name} ${me.last_name}` : <Skeleton h={20} w={140} />}</div>
                <div className={p.idEmail}>{me?.email}</div>
              </div>
              <button className={p.repBadge} onClick={() => nav('/reputation')} aria-label="Open reputation">
                <span className={p.repScore}>{rep?.score ?? '…'}</span>
                <span className={p.repLabel}>REP</span>
              </button>
            </div>
            <div className={p.idExtra}>
              <div className={p.since}>{me && `Member since ${monthYear(me.created_at)}`}</div>
              <ul className={p.checks}>
                <li>
                  <span className={cx(p.check, me?.email_verified && p.checkOn)}>
                    <Icon name={me?.email_verified ? 'check' : 'mail'} size={13} />
                  </span>
                  <span className={p.checkText}>Email {me?.email_verified ? 'verified' : 'not verified'}</span>
                </li>
                <li>
                  <span className={p.check}>
                    <Icon name="device" size={13} />
                  </span>
                  <span className={p.checkText}>Phone verification</span>
                  <Soon>Soon</Soon>
                </li>
                <li>
                  <span className={p.check}>
                    <Icon name="personal" size={13} />
                  </span>
                  <span className={p.checkText}>BVN / NIN check</span>
                  <Soon>Soon</Soon>
                </li>
              </ul>
              <div className={p.idLinks}>{links}</div>
            </div>
          </div>
        </aside>

        <div className={p.main}>
          {(me?.is_frozen || heldUntil) && (
            <div className={p.notices}>
          {me?.is_frozen && (
            <Notice tone="flare" icon="lock">
              <strong>Your account is frozen.</strong> Money can’t leave your account while it’s under review. Contact support to find out more.
            </Notice>
          )}
          {heldUntil && (
            <Notice tone="chain" icon="clock">
              <strong>Withdrawals are paused until {dateTime(heldUntil)}.</strong> This is a security hold after a recent change to your sign-in details. Everything else works as normal.
            </Notice>
          )}
            </div>
          )}

          <Section title="Account" desc="The details on your Kólófi account.">
            <SettingRow icon="mail" title="Email" sub={me?.email ?? '—'} right={me && (me.email_verified ? <Badge tone="sig">Verified</Badge> : <Badge tone="outline">Not verified</Badge>)} />
            <SettingRow icon="device" title="Phone" sub={me ? formatE164NG(me.phone) : '—'} right={<Soon>Soon</Soon>} />
            <SettingRow icon="personal" title="Identity verification" sub="With your BVN or NIN" right={<Soon>Soon</Soon>} />
            <SettingRow icon="clock" title="Member since" sub={me ? fullDate(me.created_at) : '—'} />
          </Section>

          <Section title="Security" desc="Your password signs you in. Your transaction PIN approves every money move.">
            <SettingRow icon="key" title="Password" sub="10+ characters, upper & lower case and a number" right={<span className={p.rowAction}>Change</span>} onClick={() => setDialog('password')} chevron />
            <SettingRow
              icon="lock"
              title="Transaction PIN"
              sub="6 digits, asked for every withdrawal, saving and circle payment"
              right={<span className={p.rowAction}>Change</span>}
              onClick={() => setDialog('pin')}
              chevron
            />
          </Section>

          <Section
            title="Signed-in devices"
            desc="Sign out anywhere you don’t recognise, then change your password."
            action={
              others.length > 0 && (
                <TextButton danger onClick={() => setDialog('revokeOthers')}>
                  Sign out others
                </TextButton>
              )
            }
          >
            {!sessions && (
              <div className={p.pad}>
                <Skeleton h={44} />
              </div>
            )}
            {sessions?.map((x) => (
              <SettingRow
                key={x.id}
                icon={/web|chrome|safari|firefox|edge|windows|mac/i.test(x.device_name) ? 'monitor' : 'device'}
                tone={x.is_current ? 'sig' : 'neutral'}
                title={x.device_name}
                sub={x.is_current ? 'Active now' : `Last active ${x.last_used_at ? timeAgo(x.last_used_at) : 'a while ago'} · signed in ${shortDate(x.created_at)}`}
                right={
                  x.is_current ? (
                    <Badge tone="sig">This device</Badge>
                  ) : (
                    <TextButton danger onClick={() => setDialog({ revoke: x })}>
                      Sign out
                    </TextButton>
                  )
                }
              />
            ))}
          </Section>

          <Section title="Email notifications" desc="Choose what we email you about. Security emails always stay on.">
            {prefRows.map((r) => (
              <SettingRow
                key={r.key}
                icon={r.icon}
                title={r.title}
                sub={r.sub}
                right={
                  !prefs ? (
                    <Skeleton h={28} w={48} r={14} />
                  ) : prefs.locked.includes(r.key) ? (
                    <Badge>Always on</Badge>
                  ) : (
                    <Toggle on={prefs.email[r.key]} label={`${r.title} emails`} onChange={(on) => updatePrefs.mutate({ [r.key]: on }, { onError: (e) => toast(errorText(e)) })} />
                  )
                }
              />
            ))}
            <SettingRow icon="bell" title="Push notifications" sub="Alerts on this device" right={<Soon />} />
            <SettingRow icon="whatsapp" title="WhatsApp" sub="Reminders and balances in a chat" right={<Soon />} />
          </Section>

          <Section title="Appearance" desc="Follows your device unless you pick one.">
            <div className={p.appearance}>
              <SettingRow icon={preference === 'dark' ? 'moon' : 'sun'} title="Theme" sub={preference === 'system' ? 'Matches your device' : preference === 'dark' ? 'Always dark' : 'Always light'} />
              <div className={p.segWrap}>
                <Segmented<ThemePreference>
                  options={[
                    { value: 'system', label: 'System' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  value={preference}
                  onChange={setPreference}
                />
              </div>
            </div>
          </Section>

          {(installer.available || installer.installed) && (
            <Section title="App" desc="Kólófi works in the browser, or installed on your home screen or desktop.">
              {installer.installed ? (
                <SettingRow icon="check" tone="sig" title="Installed" sub="You’re using the Kólófi app" />
              ) : (
                <SettingRow icon="download" tone="sig" title="Install the app" sub="Opens full screen and loads instantly" onClick={installer.install} chevron />
              )}
            </Section>
          )}

          <Section title="Kólófi" className={p.linksSection}>
            {links}
          </Section>

          <Section title="Coming soon" desc="On the way. These are switched off for now.">
            {!soon && (
              <div className={p.pad}>
                <Skeleton h={44} />
              </div>
            )}
            {soon?.map((f) => <SettingRow key={f.key} icon="sparkle" title={f.label} right={<Soon />} />)}
            {soon?.length === 0 && <div className={p.pad}>Everything we’ve announced is live.</div>}
          </Section>

          <Button variant="secondary" icon="logout" className={p.phoneLogout} onClick={() => setDialog('logout')}>
            Log out
          </Button>
        </div>
      </div>

      {dialog === 'password' && <ChangePasswordDialog onClose={close} />}
      {dialog === 'pin' && <ChangePinDialog onClose={close} />}
      {dialog === 'help' && <HelpDialog onClose={close} />}
      {installer.dialog}
      <Dialog
        open={dialog === 'logout'}
        onClose={close}
        title="Log out?"
        sub="You’ll need your email and password to sign back in on this device."
        footer={
          <>
            <Button loading={loggingOut} onClick={logOut}>
              Log out
            </Button>
            <Button variant="secondary" onClick={close}>
              Stay signed in
            </Button>
          </>
        }
      />
      <Dialog
        open={dialog === 'revokeOthers'}
        onClose={close}
        title="Sign out other devices?"
        sub={`${others.length} other device${others.length === 1 ? '' : 's'} will be signed out. This device stays signed in.`}
        footer={
          <>
            <Button
              loading={revokeOthers.isPending}
              onClick={() =>
                revokeOthers.mutate(undefined, {
                  onSuccess: () => {
                    close()
                    toast('Other devices signed out')
                  },
                  onError: (e) => toast(errorText(e)),
                })
              }
            >
              Sign them out
            </Button>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
          </>
        }
      />
      <Dialog
        open={!!revoking}
        onClose={close}
        title="Sign out this device?"
        sub={revoking ? `${revoking.device_name} will need to sign in again.` : undefined}
        footer={
          <>
            <Button
              loading={revoke.isPending}
              onClick={() =>
                revoking &&
                revoke.mutate(revoking.id, {
                  onSuccess: () => {
                    close()
                    toast('Device signed out')
                  },
                  onError: (e) => toast(errorText(e)),
                })
              }
            >
              Sign out
            </Button>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
          </>
        }
      />
    </Screen>
  )
}

/* ═════════ Dialogs ═════════ */
function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const change = useChangePassword()
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const fe = fieldErrors(change.error)
  const strong = passwordRules.every((r) => r.test(f.next))
  const ready = !!f.current && strong && f.next === f.confirm
  const other = formError(change.error, ['current_password', 'password'])

  const submit = () => {
    if (!ready) return
    change.mutate(
      { current_password: f.current, password: f.next, password_confirmation: f.confirm },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: qk.me })
          onClose()
          toast('Password changed')
        },
      },
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Change password"
      sub="Use a password you don’t use anywhere else."
      footer={
        <>
          <Button type="submit" form="change-password" disabled={!ready} loading={change.isPending}>
            Change password
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <form
        id="change-password"
        className={p.form}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <TextField label="Current password" type="password" sans autoComplete="current-password" autoFocus value={f.current} onChange={set('current')} error={fe('current_password')} />
        <div>
          <TextField label="New password" type="password" sans autoComplete="new-password" value={f.next} onChange={set('next')} error={fe('password')} />
          <div className={p.rules}>
            {passwordRules.map((r) => (
              <span key={r.label} className={cx(r.test(f.next) && p.ruleOk)}>
                <Icon name={r.test(f.next) ? 'check' : 'personal'} size={12} />
                {r.label}
              </span>
            ))}
          </div>
        </div>
        <TextField
          label="Confirm new password"
          type="password"
          sans
          autoComplete="new-password"
          value={f.confirm}
          onChange={set('confirm')}
          error={f.confirm && f.confirm !== f.next ? 'The passwords do not match.' : undefined}
        />
        {other && (
          <Notice tone="flare" icon="info">
            {other}
          </Notice>
        )}
      </form>
    </Dialog>
  )
}

function ChangePinDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const setPin = useSetPin()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [pin, setPinValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [password, setPassword] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const fe = fieldErrors(setPin.error)
  const weak = weakPins.includes(pin)
  const other = formError(setPin.error, ['password', 'pin'])

  const titles = ['Choose a new PIN', 'Enter it again', 'Confirm with your password']
  const subs = [
    'Six digits you’ll use to approve money moves. Avoid birthdays and repeats.',
    'Type the same six digits to make sure.',
    'For your security, we need your account password to change your PIN.',
  ]

  const next = () => {
    if (step === 0) {
      if (pin.length === 6 && !weak) {
        setStep(1)
      }
    } else if (step === 1) {
      if (confirm.length !== 6) return
      if (confirm !== pin) {
        setMismatch(true)
        setConfirm('')
        return
      }
      setMismatch(false)
      setStep(2)
    } else if (password) {
      setPin.mutate(
        { password, pin, pin_confirmation: confirm },
        {
          onSuccess: () => {
            onClose()
            toast('Transaction PIN changed')
          },
          onError: (e) => {
            if (e instanceof ApiError && e.field('pin')) {
              setPinValue('')
              setConfirm('')
              setStep(0)
            }
          },
        },
      )
    }
  }
  const back = () => {
    setPin.reset()
    if (step === 0) {
      onClose()
      return
    }
    if (step === 1) {
      setConfirm('')
      setMismatch(false)
    }
    setStep(step === 2 ? 1 : 0)
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={titles[step]}
      sub={subs[step]}
      footer={
        <>
          <Button type="submit" form="change-pin" loading={setPin.isPending} disabled={(step === 0 && (pin.length !== 6 || weak)) || (step === 1 && confirm.length !== 6) || (step === 2 && !password)}>
            {step === 2 ? 'Change PIN' : 'Continue'}
          </Button>
          <Button variant="secondary" onClick={back}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
        </>
      }
    >
      <form
        id="change-pin"
        className={p.form}
        onSubmit={(e) => {
          e.preventDefault()
          next()
        }}
      >
        <div className={p.stepDots} aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={cx(i <= step && p.stepOn)} />
          ))}
        </div>
        {step === 0 && (
          <div>
            <PinInput key="pin" value={pin} onChange={setPinValue} label="New PIN" error={weak || !!fe('pin')} />
            {weak && <div className={p.err}>That PIN is too easy to guess. Pick another.</div>}
            {fe('pin') && !weak && <div className={p.err}>{fe('pin')}</div>}
          </div>
        )}
        {step === 1 && (
          <div>
            <PinInput key="confirm" value={confirm} onChange={setConfirm} label="Confirm PIN" error={mismatch} />
            {mismatch && <div className={p.err}>Those PINs don’t match. Try again.</div>}
          </div>
        )}
        {step === 2 && <TextField label="Account password" type="password" sans autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} error={fe('password')} />}
        {other && (
          <Notice tone="flare" icon="info">
            {other}
          </Notice>
        )}
      </form>
    </Dialog>
  )
}

const faqs: { q: string; a: string }[] = [
  { q: 'How do I add money?', a: 'Send USDT on TRON (TRC-20) or BNB Chain (BEP-20) to your Kólófi deposit address from Wallet → Add money. Naira funding is coming soon.' },
  { q: 'Where is my money held?', a: 'Your balances are kept in USDT and stay yours. Your wallet, savings and circle collateral are shown separately on Home.' },
  { q: 'I want a new transaction PIN', a: 'Change it under Security on this page. You’ll need your account password.' },
  { q: 'Someone asked for my PIN', a: 'Kólófi will never ask for your PIN or password. Sign out other devices and change your password straight away.' },
]
function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      title="Help & support"
      sub="Quick answers to the questions we hear most."
      wide
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className={p.faqs}>
        {faqs.map((f) => (
          <div key={f.q} className={p.faq}>
            <div className={p.faqQ}>{f.q}</div>
            <div className={p.faqA}>{f.a}</div>
          </div>
        ))}
        <div className={p.faq}>
          <div className={p.faqQ}>
            Chat with support <Soon />
          </div>
          <div className={p.faqA}>In-app chat and WhatsApp support are on the way.</div>
        </div>
      </div>
    </Dialog>
  )
}
