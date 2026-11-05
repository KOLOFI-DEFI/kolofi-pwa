import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { clock, formatE164NG, shortAddress, weekday } from '@/core/format'
import type { NotificationKind, TrustFactor } from '@/core/types'
import type { ThemePreference } from '@/core/theme'
import {
  useMandate, useMarkAllRead, useMe, useNotifications, useTrust, useUpdateMe, useUpdateWhatsApp, useWhatsApp,
} from '@/core/data'
import { ngn } from '@/core/format'
import { useSession } from '@/state/session'
import { useThemeStore } from '@/state/theme'
import {
  Avatar, Button, Card, Eyebrow, H1, Header, HeaderLink, Hero, Icon, Lead, List, ListRow, Row, Screen, Segmented, Skeleton,
  Stack, Tile, Toggle, uiStyles as u,
} from '@/ui'
import { Gauge } from '@/ui/charts'
import p from './profile.module.css'

/** Kólófi's WhatsApp business number. Replace with the real one from the backend team. */
const KOLOFI_WHATSAPP = 'https://wa.me/?text=Hi%20K%C3%B3l%C3%B3fi%2C%20what%27s%20my%20balance%3F'

/* ───────── 20 Profile ───────── */
export function Profile() {
  const nav = useNavigate()
  const { data: me } = useMe()
  const { data: trust } = useTrust()
  const { data: mandate } = useMandate()
  const { data: notes } = useNotifications()
  const { data: wa } = useWhatsApp()
  const update = useUpdateMe()
  const signOut = useSession((s) => s.signOut)
  const { preference, setPreference } = useThemeStore()
  const unread = notes?.filter((n) => !n.read).length ?? 0

  return (
    <Screen tabs>
      <H1 style={{ marginTop: 14 }}>Profile</H1>
      <Card style={{ marginTop: 20, padding: '18px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar initials={me ? `${me.firstName[0]}${me.lastName[0]}` : ''} size={58} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{me ? `${me.firstName} ${me.lastName}` : <Skeleton h={18} w={140} />}</div>
          <div className="mono" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
            {me && `${shortAddress(me.wallet.address)} · ${me.wallet.network}`}
          </div>
        </div>
        <button className={p.trustBadge} onClick={() => nav('/trust')}>
          <span className="mono" style={{ fontSize: 18 }}>{trust?.score ?? '…'}</span>
          <span className="mono" style={{ fontSize: 9, letterSpacing: 1 }}>TRUST</span>
        </button>
      </Card>

      <Eyebrow className={p.group}>Account</Eyebrow>
      <List>
        <ListRow tile={<Tile><Icon name="personal" size={14} /></Tile>} title="Personal details" sub="Name, phone, email" chevron onClick={() => {}} />
        <ListRow
          tile={<Tile>₦</Tile>}
          title="Bank & auto-save"
          sub={mandate ? `${mandate.bankName} ••${mandate.accountLast4} · ${ngn(mandate.amountNgnMinor)} ${mandate.frequency}` : '—'}
          chevron
          onClick={() => nav('/save')}
        />
        <ListRow tile={<Tile>$</Tile>} title="Wallet & network" sub={me ? `${shortAddress(me.wallet.address)} · ${me.wallet.network}` : '—'} chevron onClick={() => nav('/money/add')} />
      </List>

      <Eyebrow className={p.group}>Kólófi</Eyebrow>
      <List>
        <ListRow
          tile={<Tile tone="sig"><Icon name="star" size={16} /></Tile>}
          title="Trust score"
          sub={trust ? `${trust.label} · level ${trust.level}` : '—'}
          value={trust?.score}
          valueStyle={{ color: 'var(--accent)' }}
          onClick={() => nav('/trust')}
        />
        <ListRow tile={<Tile tone="whatsapp">W</Tile>} title="WhatsApp" sub={wa?.linked ? 'Linked' : 'Not linked'} chevron onClick={() => nav('/whatsapp')} />
        <ListRow tile={<Tile><Icon name="pie" size={17} /></Tile>} title="Notifications" sub={unread ? `${unread} new` : 'All caught up'} chevron onClick={() => nav('/notifications')} />
      </List>

      <Eyebrow className={p.group}>Security</Eyebrow>
      <List>
        <ListRow
          tile={<Tile><Icon name="faceId" size={17} /></Tile>}
          title="Face ID"
          sub="To open the app and send money"
          value={me?.faceId ? 'On' : 'Off'}
          valueStyle={{ color: me?.faceId ? 'var(--accent)' : 'var(--muted)', fontFamily: 'var(--font-sans)', fontSize: 14.5 }}
          onClick={() => update.mutate({ faceId: !me?.faceId })}
        />
        <div style={{ padding: '14px 16px' }}>
          <Row gap={14} style={{ marginBottom: 12 }}>
            <Tile><Icon name={preference === 'dark' ? 'moon' : 'sun'} size={18} /></Tile>
            <div>
              <div className={u.rowTitle}>Appearance</div>
              <div className={u.rowSub}>Follows your phone unless you pick one</div>
            </div>
          </Row>
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
        <ListRow tile={<Tile><Icon name="help" size={18} /></Tile>} title="Help & support" sub="Chat with us on WhatsApp" chevron onClick={() => window.open(KOLOFI_WHATSAPP, '_blank')} />
      </List>
      <Button
        variant="secondary"
        style={{ marginTop: 20 }}
        onClick={() => {
          signOut()
          nav('/', { replace: true })
        }}
      >
        Sign out
      </Button>
    </Screen>
  )
}

/* ───────── 19 Notifications ───────── */
const noteTile: Record<NotificationKind, { tone: 'flare' | 'sig' | 'chain'; glyph: ReactNode }> = {
  missed: { tone: 'flare', glyph: '!' },
  autosave: { tone: 'sig', glyph: '↓' },
  pot: { tone: 'sig', glyph: <Icon name="target" size={16} /> },
  interest: { tone: 'sig', glyph: '%' },
  circle: { tone: 'chain', glyph: '+' },
}
export function Notifications() {
  const nav = useNavigate()
  const { data: notes } = useNotifications()
  const { data: wa } = useWhatsApp()
  const read = useMarkAllRead()
  const groups = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This week' },
  ] as const
  return (
    <Screen header={<Header title="Notifications" right={<HeaderLink onClick={() => read.mutate()}>Read</HeaderLink>} />}>
      {!notes && <Skeleton h={140} r={18} />}
      {groups.map((g) => {
        const items = notes?.filter((n) => n.group === g.key) ?? []
        if (!items.length) return null
        return (
          <div key={g.key}>
            <Eyebrow className={p.group} style={{ marginTop: g.key === 'today' ? 4 : undefined }}>
              {g.label}
            </Eyebrow>
            <List>
              {items.map((n) => (
                <ListRow
                  key={n.id}
                  tile={<Tile tone={noteTile[n.kind].tone}>{noteTile[n.kind].glyph}</Tile>}
                  title={<span style={{ fontWeight: n.read ? 500 : 600 }}>{n.title}</span>}
                  sub={n.subtitle}
                  value={g.key === 'today' ? clock(n.at) : weekday(n.at)}
                  valueStyle={{ fontSize: 13, color: 'var(--muted)', fontFamily: g.key === 'today' ? undefined : 'var(--font-sans)' }}
                  onClick={n.kind === 'missed' ? () => nav('/circles/yaba-tech/missed') : n.kind === 'circle' ? () => nav('/circles') : undefined}
                />
              ))}
            </List>
          </div>
        )
      })}
      {wa && (
        <Card pad={false} style={{ marginTop: 22 }} onClick={() => nav('/whatsapp')}>
          <ListRow tile={<Tile tone="whatsapp">W</Tile>} title="Get these on WhatsApp" sub={wa.linked ? `Linked · ${formatE164NG(wa.phone)}` : 'Not linked'} chevron />
        </Card>
      )}
    </Screen>
  )
}

/* ───────── 21 Trust score ───────── */
const factorTile = (f: TrustFactor) => {
  switch (f.icon) {
    case 'check':
      return <Tile tone="sig"><Icon name="check" size={18} stroke={2.2} /></Tile>
    case 'circle':
      return <Tile><span style={{ width: 8, height: 8, borderRadius: 4, border: '1.5px solid var(--muted)' }} /></Tile>
    case 'id':
      return <Tile tone="sig"><span className="mono" style={{ fontSize: 14 }}>ID</span></Tile>
    default:
      return <Tile><Icon name="stopwatch" size={18} /></Tile>
  }
}
export function Trust() {
  const { data: t } = useTrust()
  return (
    <Screen header={<Header title="Trust Score" />}>
      {!t ? (
        <Skeleton h={240} r={20} />
      ) : (
        <>
          <div style={{ marginTop: 18 }}>
            <Gauge value={t.score} max={t.max} size={270}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 62, lineHeight: '62px' }}>{t.score}</div>
              <Eyebrow style={{ fontSize: 10, marginTop: 4 }}>Out of {t.max}</Eyebrow>
              <span className={p.level}>
                {t.label.toUpperCase()} · LEVEL {t.level}
              </span>
            </Gauge>
          </div>
          <div className={p.twoUp}>
            <Card style={{ padding: 16 }}>
              <Eyebrow style={{ fontSize: 10 }}>You can join</Eyebrow>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 8, lineHeight: '21px' }}>{t.canJoin}</div>
            </Card>
            <div className={p.nextCard}>
              <Eyebrow style={{ fontSize: 10 }}>
                At {t.next.at} · {t.next.at - t.score} to go
              </Eyebrow>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 8, lineHeight: '21px' }}>{t.next.unlock}</div>
            </div>
          </div>
          <h2 className={u.sectionTitle} style={{ margin: '26px 0 12px' }}>What builds your score</h2>
          <List>
            {t.factors.map((f) => (
              <ListRow key={f.id} tile={factorTile(f)} title={f.title} sub={f.detail} value={f.value} valueStyle={{ color: f.positive ? 'var(--accent)' : 'var(--text)', fontSize: 14 }} />
            ))}
          </List>
        </>
      )}
    </Screen>
  )
}

/* ───────── 22 WhatsApp ───────── */
export function WhatsApp() {
  const { data: wa } = useWhatsApp()
  const update = useUpdateWhatsApp()
  const rows = [
    { key: 'paymentReminders', title: 'Payment reminders', sub: '3 days and 1 day before' },
    { key: 'potDay', title: 'Pot day', sub: 'When it’s your turn' },
    { key: 'weeklySummary', title: 'Weekly summary', sub: 'Every Sunday evening' },
  ] as const
  return (
    <Screen
      header={<Header title="WhatsApp" />}
      footer={
        <Button variant="whatsapp" onClick={() => window.open(KOLOFI_WHATSAPP, '_blank', 'noopener')}>
          Open WhatsApp
        </Button>
      }
    >
      <div className={p.waHero}>
        <div className={p.waIcon}>
          <Icon name="whatsapp" size={44} color="#fff" inverse="var(--whatsapp)" />
        </div>
      </div>
      <Hero style={{ textAlign: 'center', fontSize: 32, lineHeight: '36px' }}>Check your money in a chat</Hero>
      <Lead style={{ textAlign: 'center', marginTop: 12, fontSize: 15 }}>Ask for your balance or next payment. We remind you before we take money.</Lead>
      {wa ? (
        <Stack gap={12} style={{ marginTop: 26 }}>
          <Card style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Linked number</div>
            <Row justify="space-between" style={{ marginTop: 4 }}>
              <span className="mono" style={{ fontSize: 17 }}>{formatE164NG(wa.phone)}</span>
              <span className="mono" style={{ fontSize: 11, letterSpacing: 1, color: 'var(--accent)' }}>✓ LINKED</span>
            </Row>
          </Card>
          <List>
            {rows.map((r) => (
              <ListRow key={r.key} title={<span style={{ fontSize: 15 }}>{r.title}</span>} sub={r.sub} right={<Toggle on={wa[r.key]} onChange={(on) => update.mutate({ [r.key]: on })} label={r.title} />} style={{ minHeight: 62, padding: '10px 18px' }} />
            ))}
          </List>
          <div className={p.warn}>
            <span style={{ color: 'var(--flare)', fontWeight: 700 }}>!</span>
            <span>Kólófi will never ask for your PIN or password on WhatsApp.</span>
          </div>
        </Stack>
      ) : (
        <Skeleton h={200} r={18} style={{ marginTop: 26 }} />
      )}
    </Screen>
  )
}
