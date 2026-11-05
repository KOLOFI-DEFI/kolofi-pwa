import { useState } from 'react'
import { Link } from 'react-router'
import { icons, type IconName } from '@/core/icons'
import { palettes } from '@/core/tokens'
import { useTheme } from '@/app/ThemeProvider'
import { useThemeStore } from '@/state/theme'
import { useSession } from '@/state/session'
import {
  Amount, AvatarStack, Badge, Button, Card, Chips, Dots, Eyebrow, FilterChips, H1, Header, Hero, Icon, KeyValues, Lead, List,
  ListRow, MiniChips, Progress, RadioCard, Row, Screen, SectionTitle, Segmented, Stack, StepBars, TextField, Tile, Toggle,
} from '@/ui'
import { BarChart, CircleRing, Gauge, LineChart } from '@/ui/charts'

const ROUTES = [
  '/intro/save', '/intro/circles', '/intro/onchain', '/auth/phone', '/auth/otp', '/auth/kyc', '/auth/wallet-ready', '/auth/auto-save',
  '/home', '/money/add', '/money/withdraw', '/save', '/save/new-goal', '/save/locked', '/circles', '/circles/monthly-10/join',
  '/circles/yaba-tech', '/circles/yaba-tech/payout', '/circles/yaba-tech/missed', '/notifications', '/profile', '/trust', '/whatsapp',
]

/** Component gallery + screen index for design review (light/dark). Not linked from the app. */
export function DevKit() {
  const { scheme } = useTheme()
  const setPref = useThemeStore((s) => s.setPreference)
  const setStage = useSession((s) => s.setStage)
  const [seg, setSeg] = useState('b')
  const [chip, setChip] = useState(2)
  const [on, setOn] = useState(true)
  const [radio, setRadio] = useState(0)
  return (
    <Screen header={<Header title="Design kit" back={false} right={<Button variant="ghost" onClick={() => setPref(scheme === 'dark' ? 'light' : 'dark')}>{scheme === 'dark' ? 'Light' : 'Dark'}</Button>} />}>
      <Stack gap={14}>
        <SectionTitle style={{ marginTop: 0 }}>Screens</SectionTitle>
        <Button variant="secondary" onClick={() => setStage('ready')}>Unlock app routes (stage = ready)</Button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ROUTES.map((r) => (
            <Link key={r} to={r} className="mono" style={{ fontSize: 12, padding: '6px 10px', border: '1px solid var(--line-strong)', borderRadius: 8 }}>
              {r}
            </Link>
          ))}
        </div>

        <SectionTitle>Colour</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {Object.entries(palettes[scheme]).map(([k, v]) => (
            <div key={k} style={{ fontSize: 10 }} className="mono">
              <div style={{ height: 40, borderRadius: 8, background: v, border: '1px solid var(--line-strong)' }} />
              {k}
            </div>
          ))}
        </div>

        <SectionTitle>Type</SectionTitle>
        <Eyebrow accent>Eyebrow · accent</Eyebrow>
        <Hero>Save in dollars, straight from your Naira.</Hero>
        <H1>Circles</H1>
        <Amount minor={238260} ccy="USDT" />
        <Lead>Pick an amount once. We change it to USDT and it earns interest while you sleep.</Lead>

        <SectionTitle>Buttons</SectionTitle>
        <Button glow>Continue</Button>
        <Button variant="secondary">Keep in Wallet</Button>
        <Button variant="whatsapp">Open WhatsApp</Button>
        <Row>
          <Button variant="outline" icon="plus">New goal</Button>
          <Button variant="ghost">Skip</Button>
        </Row>

        <SectionTitle>Controls</SectionTitle>
        <Segmented options={[{ value: 'a', label: 'Daily' }, { value: 'b', label: 'Weekly' }, { value: 'c', label: 'Monthly' }]} value={seg} onChange={setSeg} />
        <Chips options={[1, 2, 3].map((v) => ({ value: v, label: `₦${v}0k` }))} value={chip} onChange={setChip} />
        <MiniChips options={[1, 2, 3].map((v) => ({ value: v, label: `₦${v}0k` }))} value={chip} onChange={setChip} />
        <FilterChips options={[{ value: 'a', label: 'All' }, { value: 'b', label: 'Monthly' }, { value: 'c', label: 'Under 100 USDT' }]} value="a" onChange={() => {}} />
        <Row>
          <Toggle on={on} onChange={setOn} label="Toggle" />
          <Toggle ink on={on} onChange={setOn} label="Toggle ink" />
        </Row>
        <RadioCard selected={radio === 0} onClick={() => setRadio(0)} title="Naira to GTBank ••4521" sub="Changed at today’s rate" />
        <RadioCard selected={radio === 1} onClick={() => setRadio(1)} title="USDT to another wallet" sub="On Base · paste an address" />
        <TextField label="Bank Verification Number (11 digits)" defaultValue="2234 5517 518" hint="11/11 ✓" active />

        <SectionTitle>Content</SectionTitle>
        <Row>
          <Badge tone="sig">Popular</Badge>
          <Badge>First circle</Badge>
          <AvatarStack items={['CC', 'TB', 'FA']} />
        </Row>
        <Progress value={0.41} />
        <StepBars total={2} current={1} />
        <Dots total={3} current={1} />
        <List>
          <ListRow tile={<Tile>$</Tile>} title="Deposit" sub="No interest · take out any time" value="42.10" />
          <ListRow tile={<Tile tone="sig"><Icon name="star" size={16} /></Tile>} title="Trust score" sub="Good · level 2" value="642" chevron />
        </List>
        <KeyValues rows={[{ label: 'From', value: 'GTBank ••4521' }, { label: 'Rate', value: '1 USDT = ₦1,500', mono: true }]} />
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 12, color: 'var(--text)' }}>
            {(Object.keys(icons) as IconName[]).map((n) => (
              <span key={n} title={n} style={{ display: 'grid', placeItems: 'center' }}>
                <Icon name={n} />
              </span>
            ))}
          </div>
        </Card>

        <SectionTitle>Charts</SectionTitle>
        <LineChart values={[1, 2, 1.8, 3, 2.9, 4, 4.5, 4.3, 5.5, 6, 7]} />
        <BarChart values={[14, 15, 16, 18, 20, 22, 26, 29, 33, 41, 44, 52]} labels={["NOV '25", "MAY '26", "OCT '26"]} />
        <Gauge value={642} max={850}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 56 }}>642</div>
        </Gauge>
        <CircleRing spots={Array.from({ length: 10 }, (_, i) => ({ n: i + 1, state: (['paid', 'paid', 'pot', 'kolofi', 'you'] as const)[i] ?? 'member', label: i === 2 ? 'POT' : i === 4 ? 'YOU' : undefined }))} />
      </Stack>
    </Screen>
  )
}
