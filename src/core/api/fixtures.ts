/**
 * Mock data that mirrors the design boards exactly (Ada / Adaeze Okafor, Yaba Tech Circle, …).
 * "Today" in the mock world is Tue Oct 27 2026 so relative labels ("in 5 days", "next Oct 30") match the designs.
 */
import { brandColors } from '../tokens'
import type {
  Account, AppNotification, AutoSaveMandate, BalanceSummary, Bank, Circle, CircleDetail, Goal, JoinQuote, LockedSaving,
  LockOption, MissedPayment, NextPayment, Payout, Rates, SaveSummary, Transaction, TrustScore, User, WhatsAppPrefs,
} from '../types'

export const MOCK_TODAY = '2026-10-27T09:41:00.000Z'

export const user: User = {
  id: 'usr_ada',
  firstName: 'Adaeze',
  preferredName: 'Ada',
  lastName: 'Okafor',
  phone: '+2348034127790',
  email: 'ada@example.com',
  kyc: { verified: true, method: 'BVN' },
  wallet: { address: '0x7a2c91F4d2E86a1c5B9e07A4f3D2c8b13b0ef31b', network: 'Base', asset: 'USDT' },
  faceId: true,
  memberSince: '2026-08-01T00:00:00.000Z',
}

const series = (start: number, end: number, shape: number[]) =>
  shape.map((s) => Math.round((start + (end - start) * s) * 100) / 100)

export const balance: BalanceSummary = {
  totalMinor: 238260,
  ngnMinor: 357390000,
  monthDeltaMinor: 1842,
  history: {
    '1W': series(2371, 2382.6, [0, 0.12, 0.3, 0.28, 0.55, 0.7, 1]),
    '1M': series(2364, 2382.6, [0.12, 0.17, 0.15, 0.28, 0.27, 0.38, 0.45, 0.42, 0.58, 0.62, 0.72, 0.78, 0.86, 1]),
    '3M': series(2290, 2382.6, [0, 0.08, 0.06, 0.2, 0.3, 0.27, 0.45, 0.5, 0.62, 0.7, 0.82, 1]),
    '1Y': series(1400, 2382.6, [0, 0.05, 0.1, 0.18, 0.22, 0.3, 0.38, 0.45, 0.55, 0.68, 0.82, 1]),
    ALL: series(0, 2382.6, [0, 0.1, 0.22, 0.35, 0.48, 0.62, 0.8, 1]),
  },
}

export const accounts: Account[] = [
  { id: 'acc_deposit', kind: 'deposit', title: 'Deposit', subtitle: 'No interest · take out any time', balanceMinor: 4210 },
  { id: 'acc_savings', kind: 'savings', title: 'Savings', subtitle: 'Car fund · ~4.8% a year', balanceMinor: 124050 },
  { id: 'acc_locked', kind: 'locked', title: 'Locked · 6 mo', subtitle: 'Opens Mar 12, 2027', balanceMinor: 60000 },
]

export const nextPayment: NextPayment = {
  circleId: 'yaba-tech',
  circleName: 'Yaba Tech Circle',
  amountMinor: 10000,
  dueDate: '2026-11-01T09:00:00.000Z',
  auto: true,
  inDays: 5,
}

export const banks: Bank[] = [
  { id: 'gtbank', name: 'GTBank', code: 'GT', color: brandColors.gtbank },
  { id: 'access', name: 'Access', code: 'A', color: brandColors.access },
  { id: 'zenith', name: 'Zenith', code: 'Z', color: brandColors.zenith },
  { id: 'kuda', name: 'Kuda', code: 'K', color: brandColors.kuda },
]

export const rates: Rates = {
  ngnPerUsdt: 1500,
  conversionFeeNgnMinor: 25000,
  withdrawFeeNgnMinor: 30000,
  updatedAt: MOCK_TODAY,
}

export const mandate: AutoSaveMandate = {
  id: 'mdt_1',
  bankId: 'gtbank',
  bankName: 'GTBank',
  accountLast4: '4521',
  amountNgnMinor: 2000000,
  frequency: 'weekly',
  nextDebit: '2026-10-30T08:00:00.000Z',
  active: true,
}

export const saveSummary: SaveSummary = {
  totalMinor: 188260,
  ngnMinor: 282390000,
  interestMinor: 1842,
  apyLabel: '~4.8% a year',
  monthly: [
    ["Nov '25", 14], ['Dec', 15], ['Jan', 16], ['Feb', 18], ['Mar', 20], ['Apr', 22],
    ["May '26", 26], ['Jun', 29], ['Jul', 33], ['Aug', 41], ['Sep', 44], ["Oct '26", 52],
  ].map(([label, value]) => ({ label: label as string, value: value as number })),
}

export const goals: Goal[] = [
  { id: 'goal_car', name: 'Car fund', targetMinor: 300000, savedMinor: 124050, type: 'flexible', by: '2027-06-01T00:00:00.000Z' },
]

export const locked: LockedSaving[] = [
  {
    id: 'lck_1',
    amountMinor: 60000,
    months: 6,
    elapsedMonths: 4,
    opensAt: '2027-03-12T00:00:00.000Z',
    interestMinor: 1420,
    rateLabel: '~6.5% / yr',
    breakFeePct: 3,
  },
]

export const lockOptions: LockOption[] = [
  { months: 3, rateLabel: '~5.5% / yr' },
  { months: 6, rateLabel: '~6.5% / yr' },
  { months: 12, rateLabel: '~8% / yr' },
]

export const recent: Transaction[] = [
  { id: 'tx_1', kind: 'interest', title: 'Interest', hash: '0x5e19a0c2b7d4c0', amountMinor: 42, date: '2026-10-22T06:00:00.000Z' },
  { id: 'tx_2', kind: 'autosave', title: 'Auto-save', hash: '0x91de3f7a08ac', amountMinor: 1333, date: '2026-10-23T08:00:00.000Z' },
  { id: 'tx_3', kind: 'contribution', title: 'Yaba Tech Circle', hash: '0x2b8e44c1f9d0', amountMinor: -10100, date: '2026-10-01T09:00:00.000Z' },
]

export const browseCircles: Circle[] = [
  {
    id: 'monthly-10', name: 'Monthly 10', size: 10, contributionMinor: 10000, period: 'month', potMinor: 100000,
    depositFromPct: 30, spotsLeft: 3, badge: 'popular', members: ['CC', 'TB', 'FA'], startsAt: '2026-12-01T00:00:00.000Z',
  },
  {
    id: 'lagos-starter', name: 'Lagos Starter', size: 5, contributionMinor: 5000, period: 'month', potMinor: 25000,
    depositFromPct: 30, spotsLeft: 1, badge: 'first', members: ['IK', 'NE', 'BO'], startsAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'traders-weekly', name: 'Traders Weekly', size: 20, contributionMinor: 5000, period: 'week', potMinor: 100000,
    depositFromPct: 40, spotsLeft: 9, badge: 'weekly', members: ['ML', 'OA', 'SE'], startsAt: '2026-11-09T00:00:00.000Z',
  },
  {
    id: 'big-pot-20', name: 'Big Pot 20', size: 20, contributionMinor: 20000, period: 'month', potMinor: 400000,
    depositFromPct: 40, spotsLeft: 6, badge: 'locked', requiresTrust: 700, members: ['DA', 'KE', 'TO'], startsAt: '2027-01-01T00:00:00.000Z',
  },
]

export const yabaTech: CircleDetail = {
  id: 'yaba-tech', name: 'Yaba Tech Circle', size: 10, contributionMinor: 10000, period: 'month', potMinor: 100000,
  depositFromPct: 30, spotsLeft: 0, members: ['AO', 'TB', 'CC'], startsAt: '2026-09-01T00:00:00.000Z',
  status: 'active',
  cycle: 3,
  spots: [
    { n: 1, state: 'paid' }, { n: 2, state: 'paid' }, { n: 3, state: 'pot', label: 'POT' }, { n: 4, state: 'kolofi', label: 'K4' },
    { n: 5, state: 'you', label: 'YOU' }, { n: 6, state: 'member' }, { n: 7, state: 'member' }, { n: 8, state: 'member' },
    { n: 9, state: 'member' }, { n: 10, state: 'member' },
  ],
  currentPot: { amountMinor: 100000, toLabel: 'Kólófi spot 03', date: '2026-11-01T00:00:00.000Z' },
  myTurn: { spot: 5, date: '2027-01-01T00:00:00.000Z', payoutMinor: 99500 },
  paidInMinor: 30300,
  paymentsMade: 3,
  depositMinor: 50000,
  backupMinor: 1840,
  missedPayouts: 0,
  missedSince: '2026-09-01T00:00:00.000Z',
  vault: '0x3f8c2D07a19Be4C6d05f7731E2a8b4c1a91e',
  network: 'Base',
}

export const myCircles: Circle[] = [yabaTech]

export const joinQuotes: Record<string, JoinQuote> = {
  'monthly-10': {
    circle: browseCircles[0]!,
    deposits: [
      { pct: 30, amountMinor: 30000, fromSpot: 7 },
      { pct: 40, amountMinor: 40000, fromSpot: 6 },
      { pct: 50, amountMinor: 50000, fromSpot: 5 },
    ],
    spots: Array.from({ length: 10 }, (_, i) => {
      const n = i + 1
      const state = n <= 4 ? 'kolofi' : n === 7 || n === 9 ? 'taken' : 'free'
      const date = new Date(Date.UTC(2026, 11 + i, 1)).toISOString()
      return { n, state: state as 'kolofi' | 'taken' | 'free', date }
    }),
    feePct: 1,
    depositBack: '2027-09-01T00:00:00.000Z',
  },
}

export const payout: Payout = {
  circleId: 'yaba-tech',
  circleName: 'Yaba Tech Circle',
  spot: 5,
  potMinor: 100000,
  feeMinor: 500,
  feePct: 0.5,
  netMinor: 99500,
  ngnMinor: 149250000,
  tx: '0x4e7b21f0d8a3c9a2',
  contributionMinor: 10100,
  paysUntil: '2027-09-01T00:00:00.000Z',
  depositMinor: 50000,
}

export const missed: MissedPayment = {
  id: 'mis_1',
  circleId: 'yaba-tech',
  circleName: 'Yaba Tech Circle',
  amountMinor: 10100,
  dueDate: '2026-11-01T09:00:00.000Z',
  reason: 'insufficient funds',
  graceEndsAt: '', // set relative to load time by the mock adapter (47:12:09 left)
  depositMinor: 50000,
  trustPenalty: 40,
  steps: [
    { title: 'Reminder sent', detail: 'On WhatsApp and in the app · Nov 1', state: 'done' },
    { title: 'We try your bank again', detail: 'Tomorrow, 9:00 am', state: 'next' },
    { title: 'Then we use your wallet', detail: 'Only if you turned on auto-cover', state: 'pending' },
    { title: 'Last step: your deposit', detail: 'After 48 hours, we take it from your 500 USDT deposit', state: 'final' },
  ],
}

export const trust: TrustScore = {
  score: 642,
  max: 850,
  level: 2,
  label: 'Good',
  canJoin: 'Circles up to 200 USDT a month',
  next: { at: 700, unlock: 'Big Pot circles and smaller deposits' },
  factors: [
    { id: 'ontime', icon: 'check', title: 'On-time payments', detail: 'The biggest part of your score', value: '3 / 3', positive: true },
    { id: 'finished', icon: 'circle', title: 'Circles finished', detail: 'Finish one to gain about 60', value: '0' },
    { id: 'id', icon: 'id', title: 'Verified ID', detail: 'BVN checked', value: 'Done', positive: true },
    { id: 'time', icon: 'clock', title: 'Time with Kólófi', detail: 'Since Aug 2026', value: '3 mo' },
  ],
}

export const notifications: AppNotification[] = [
  { id: 'n1', kind: 'missed', title: 'Payment missed', subtitle: '101 USDT · Yaba Tech Circle · 47h left', at: '2026-11-01T09:02:00.000Z', group: 'today', read: false },
  { id: 'n2', kind: 'autosave', title: 'Auto-save done', subtitle: '₦20,000 → 13.33 USDT', at: '2026-11-01T08:00:00.000Z', group: 'today', read: false },
  { id: 'n3', kind: 'pot', title: 'Pot sent to spot 02', subtitle: 'Yaba Tech Circle · everyone was paid', at: '2026-10-26T10:00:00.000Z', group: 'week', read: true },
  { id: 'n4', kind: 'interest', title: 'Interest paid', subtitle: '+0.42 USDT on Savings', at: '2026-10-25T06:00:00.000Z', group: 'week', read: true },
  { id: 'n5', kind: 'circle', title: 'New circle open', subtitle: 'Monthly 10 · 3 spots left', at: '2026-10-24T12:00:00.000Z', group: 'week', read: true },
]

export const whatsapp: WhatsAppPrefs = {
  linked: true,
  phone: '+2348034127790',
  paymentReminders: true,
  potDay: true,
  weeklySummary: false,
}
