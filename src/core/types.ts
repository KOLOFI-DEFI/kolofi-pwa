/** Domain models shared by kolofi-pwa and kolofi-mobile. Amounts are integer minor units (USDT cents, Naira kobo). */

export type Minor = number
export type ISODate = string
export type Frequency = 'daily' | 'weekly' | 'monthly'
export type Network = 'Base'
export type ChartRange = '1W' | '1M' | '3M' | '1Y' | 'ALL'

export interface Wallet {
  address: string
  network: Network
  asset: 'USDT'
}

export interface User {
  id: string
  firstName: string
  preferredName: string
  lastName: string
  phone: string // E.164
  email?: string
  kyc: { verified: boolean; method?: 'BVN' | 'NIN' }
  wallet: Wallet
  faceId: boolean
  memberSince: ISODate
}

export interface BalanceSummary {
  totalMinor: Minor
  ngnMinor: Minor
  monthDeltaMinor: Minor
  history: Record<ChartRange, number[]>
}

export type AccountKind = 'deposit' | 'savings' | 'locked'
export interface Account {
  id: string
  kind: AccountKind
  title: string
  subtitle: string
  balanceMinor: Minor
}

export interface NextPayment {
  circleId: string
  circleName: string
  amountMinor: Minor
  dueDate: ISODate
  inDays: number
  auto: boolean
}

export interface Bank {
  id: string
  name: string
  code: string // tile letters
  color: string
}

export interface ResolvedAccount {
  bankId: string
  accountNumber: string
  accountName: string
}

export interface AutoSaveMandate {
  id: string
  bankId: string
  bankName: string
  accountLast4: string
  amountNgnMinor: Minor
  frequency: Frequency
  nextDebit: ISODate
  active: boolean
}

export interface Rates {
  ngnPerUsdt: number
  conversionFeeNgnMinor: Minor
  withdrawFeeNgnMinor: Minor
  updatedAt: ISODate
}

export interface SaveSummary {
  totalMinor: Minor
  ngnMinor: Minor
  interestMinor: Minor
  apyLabel: string
  monthly: { label: string; value: number }[]
}

export type PotType = 'flexible' | 'locked'
export interface Goal {
  id: string
  name: string
  targetMinor: Minor
  savedMinor: Minor
  type: PotType
  by: ISODate
}

export interface LockedSaving {
  id: string
  amountMinor: Minor
  months: number
  elapsedMonths: number
  opensAt: ISODate
  interestMinor: Minor
  rateLabel: string
  breakFeePct: number
}

export interface LockOption {
  months: 3 | 6 | 12
  rateLabel: string
}

export type TxKind = 'interest' | 'deposit' | 'withdraw' | 'pot' | 'autosave' | 'contribution'
export interface Transaction {
  id: string
  kind: TxKind
  title: string
  hash: string
  amountMinor: Minor // signed
  date: ISODate
}

export type CircleBadge = 'popular' | 'first' | 'weekly' | 'locked'
export interface Circle {
  id: string
  name: string
  size: number
  contributionMinor: Minor
  period: 'month' | 'week'
  potMinor: Minor
  depositFromPct: number
  spotsLeft: number
  badge?: CircleBadge
  requiresTrust?: number
  members: string[] // initials shown in avatar stack
  startsAt: ISODate
}

export type SpotState = 'kolofi' | 'paid' | 'pot' | 'you' | 'member'
export interface CircleSpot {
  n: number
  state: SpotState
  label?: string
}

export interface CircleDetail extends Circle {
  status: 'active' | 'forming' | 'finished'
  cycle: number
  spots: CircleSpot[]
  currentPot: { amountMinor: Minor; toLabel: string; date: ISODate }
  myTurn: { spot: number; date: ISODate; payoutMinor: Minor }
  paidInMinor: Minor
  paymentsMade: number
  depositMinor: Minor
  backupMinor: Minor
  missedPayouts: number
  missedSince: ISODate
  vault: string
  network: Network
}

export type JoinSpotState = 'kolofi' | 'taken' | 'free'
export interface JoinQuote {
  circle: Circle
  deposits: { pct: number; amountMinor: Minor; fromSpot: number }[]
  spots: { n: number; state: JoinSpotState; date: ISODate }[]
  feePct: number
  depositBack: ISODate
}

export interface Payout {
  circleId: string
  circleName: string
  spot: number
  potMinor: Minor
  feeMinor: Minor
  feePct: number
  netMinor: Minor
  ngnMinor: Minor
  tx: string
  contributionMinor: Minor
  paysUntil: ISODate
  depositMinor: Minor
}

export interface MissedStep {
  title: string
  detail: string
  state: 'done' | 'next' | 'pending' | 'final'
}
export interface MissedPayment {
  id: string
  circleId: string
  circleName: string
  amountMinor: Minor
  dueDate: ISODate
  reason: string
  graceEndsAt: ISODate
  depositMinor: Minor
  trustPenalty: number
  steps: MissedStep[]
}

export interface TrustFactor {
  id: string
  icon: 'check' | 'circle' | 'id' | 'clock'
  title: string
  detail: string
  value: string
  positive?: boolean
}
export interface TrustScore {
  score: number
  max: number
  level: number
  label: string
  canJoin: string
  next: { at: number; unlock: string }
  factors: TrustFactor[]
}

export type NotificationKind = 'missed' | 'autosave' | 'pot' | 'interest' | 'circle'
export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  subtitle: string
  at: ISODate
  group: 'today' | 'week'
  read: boolean
}

export interface WhatsAppPrefs {
  linked: boolean
  phone: string
  paymentReminders: boolean
  potDay: boolean
  weeklySummary: boolean
}
