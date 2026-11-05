/**
 * Kólófi design tokens — single source of truth for kolofi-pwa and kolofi-mobile.
 * Values sampled from the design boards (design/boards) at 1pt = 1px (iPhone 430×932 frame).
 * Do not import platform code here: this folder is copied verbatim into kolofi-mobile.
 */

export type ColorScheme = 'light' | 'dark'

export interface Palette {
  bg: string
  bgHero: string // top glow of hero screens
  surface: string
  surface2: string // active segment, chips, neutral icon tiles
  surfaceRaised: string // tab bar, floating pills
  line: string
  lineStrong: string
  text: string
  body: string
  muted: string
  faint: string
  sig: string // signal lime: CTAs, selected chips, active tab
  sigSoft: string // tinted lime backgrounds (icon tiles, badges)
  sigTint: string
  onSig: string
  accent: string // olive in light, lime in dark: eyebrows, progress, chart line, positive deltas
  accentSoft: string
  chain: string // on-chain blue: Kólófi spots, tx links, Base dot
  chainSoft: string
  flare: string // alerts, missed payment, break lock
  flareSoft: string
  success: string // USDT dot
  whatsapp: string
  ink: string // always-dark cards (locked savings, join summary, view button)
  onInk: string
  inkMuted: string
  overlay: string
  glow: string
  shadow: string
}

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    bg: '#F3F2EE',
    bgHero: '#DCE3C4',
    surface: '#FFFFFF',
    surface2: '#ECEBE6',
    surfaceRaised: '#ECEBE6',
    line: '#E6E5E0',
    lineStrong: '#D9DAD5',
    text: '#111311',
    body: '#4B4E4B',
    muted: '#6E716C',
    faint: '#9A9C97',
    sig: '#C6F35E',
    sigSoft: '#F8FDEB',
    sigTint: '#EFFBD3',
    onSig: '#0E1013',
    accent: '#4F6B00',
    accentSoft: '#B9C499',
    chain: '#3A72DE',
    chainSoft: '#EDF5FF',
    flare: '#E5483B',
    flareSoft: '#FDECEA',
    success: '#1FA97A',
    whatsapp: '#25D366',
    ink: '#0B0D10',
    onInk: '#ECEAE4',
    inkMuted: '#8C9198',
    overlay: 'rgba(14,16,19,0.4)',
    glow: 'rgba(198,243,94,0.45)',
    shadow: 'rgba(20,24,16,0.12)',
  },
  dark: {
    bg: '#06070A',
    bgHero: '#1B2A0C',
    surface: '#101318',
    surface2: '#161A20',
    surfaceRaised: '#14171C',
    line: '#20242A',
    lineStrong: '#2A2E35',
    text: '#ECEAE4',
    body: '#B4B8BE',
    muted: '#9AA0A8',
    faint: '#6B7079',
    sig: '#C6F35E',
    sigSoft: '#1A2210',
    sigTint: '#26331A',
    onSig: '#0E1013',
    accent: '#C6F35E',
    accentSoft: '#5D7426',
    chain: '#7FB7FF',
    chainSoft: '#131D2B',
    flare: '#FF7A6B',
    flareSoft: '#2A1412',
    success: '#3FD49E',
    whatsapp: '#25D366',
    ink: '#0B0D10',
    onInk: '#ECEAE4',
    inkMuted: '#8C9198',
    overlay: 'rgba(0,0,0,0.6)',
    glow: 'rgba(198,243,94,0.35)',
    shadow: 'rgba(0,0,0,0.5)',
  },
}

export const fonts = {
  display: 'Young Serif',
  sans: 'Figtree',
  mono: 'DM Mono',
} as const

/** Type scale: [fontSize, lineHeight, letterSpacing(px)] */
export const type = {
  hero: [36, 38, -0.4], // intro + onboarding titles
  h1: [32, 36, -0.3], // tab page titles (Save, Circles, Profile)
  balance: [52, 56, -1], // big balances
  amount: [46, 50, -0.8], // add/withdraw amount
  amountSm: [28, 32, -0.4], // card amounts (1,000 pot)
  title: [17, 22, 0], // header titles
  bodyLg: [16, 24, 0],
  body: [15, 22, 0],
  label: [14, 20, 0],
  small: [12, 16, 0],
  eyebrow: [11, 14, 1.4], // mono uppercase
  mono: [15, 20, 0.2],
} as const

export const radii = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 10: 40, 12: 48 } as const
export const layout = {
  gutter: 24,
  headerHeight: 56,
  buttonHeight: 56,
  inputHeight: 60,
  tabBarHeight: 68,
  maxWidth: 440,
} as const

export const brandColors = {
  gtbank: '#E2561B',
  access: '#F07F1E',
  zenith: '#D11F2B',
  kuda: '#40196D',
} as const

/** Avatar backgrounds used for member initials in circle cards */
export const avatarColors = ['#C6F35E', '#8FB8FF', '#F7B27A', '#B9E5C7', '#E6C4F5'] as const
