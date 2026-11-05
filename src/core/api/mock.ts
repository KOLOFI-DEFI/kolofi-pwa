import { ApiError, type ApiConfig, type KolofiApi } from './contract'
import type {
  ActivityEntry, AppNotification, AutoSave, Circle, CirclePackage, CollateralOption, CryptoDeposit, CryptoWithdrawal, Dec,
  NotificationPrefs, Page, Reputation, SavingsMovement, SavingsPlan, SeatTransfer, Session, Takeover, User, WaitlistEntry, WalletAddress,
} from '../types'

/** Mock credentials: any email with this password logs in; this PIN approves money moves; this code verifies email. */
export const MOCK_PASSWORD = 'Kolofi2026!'
export const MOCK_PIN = '482915'
export const MOCK_CODE = '123456'

const clone = <T,>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T))
const iso = (offsetDays = 0, h = 9) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  d.setUTCHours(h, 0, 0, 0)
  return d.toISOString()
}
const ulid = () => `01MOCK${Math.random().toString(36).slice(2, 12).toUpperCase().padEnd(20, '0')}`.slice(0, 26)
const cents = (d: Dec) => Math.round(parseFloat(d || '0') * 100)
const dec = (c: number) => (c / 100).toFixed(2).replace(/\.?0+$/, '') || '0'

/* ───────── Fixtures ───────── */
const baseUser: User = {
  id: '01JCA0ZB7K3V9QH2X5M8N4P6RT',
  first_name: 'Ada',
  last_name: 'Obi',
  email: 'ada@example.com',
  phone: '+2348031234567',
  email_verified: true,
  phone_verified: false,
  has_transaction_pin: true,
  is_frozen: false,
  withdrawals_held_until: null,
  created_at: iso(-120),
}

const option = (bps: number, earliest: number, contribution = 100, members = 10): CollateralOption => {
  const pot = contribution * members
  return {
    collateral_bps: bps,
    collateral_percent: String(bps / 100),
    collateral: dec((pot * bps) / 100),
    contribution: String(contribution),
    contribution_fee: '1',
    reserve_levy: '1',
    per_cycle_total: String(contribution + 2),
    pot: String(pot),
    payout_fee: dec(pot * 100 * 0.01),
    pot_after_fee: dec(pot * 100 * 0.99),
    earliest_slot: earliest,
    slots_available_from: `${earliest} to ${members}`,
  }
}

const packages: CirclePackage[] = [
  { id: '01JCA7PACKAGE0000000000000', name: '10 seats, 100 USDT monthly', asset: 'usdt', members: 10, contribution: '100', cycle: 'monthly', house_seats: 4, grace_hours: 48, min_reputation: null, allow_private: true, options: [option(5000, 5), option(4000, 6), option(3000, 7)] },
  { id: '01JCA7PACKAGE0000000000001', name: '6 seats, 50 USDT weekly', asset: 'usdt', members: 6, contribution: '50', cycle: 'weekly', house_seats: 2, grace_hours: 24, min_reputation: null, allow_private: false, options: [option(5000, 3, 50, 6), option(3500, 4, 50, 6)] },
  { id: '01JCA7PACKAGE0000000000002', name: '12 seats, 250 USDT monthly', asset: 'usdt', members: 12, contribution: '250', cycle: 'monthly', house_seats: 5, grace_hours: 48, min_reputation: 600, allow_private: true, options: [option(5000, 6, 250, 12), option(4000, 8, 250, 12)] },
]

function seatsFor(members: number, house: number, mySlot: number | null, current: number): Circle['seats'] {
  const names = ['Bola A.', 'Chidi N.', 'Tola K.', 'Emeka U.', 'Funmi B.', 'Ike O.', 'Zainab M.', 'Seyi F.']
  return Array.from({ length: members }, (_, i) => {
    const slot = i + 1
    const isHouse = slot <= house
    return {
      slot,
      type: isHouse ? 'house' : 'real',
      is_me: slot === mySlot,
      member: isHouse ? 'Kólófi seat' : slot === mySlot ? 'Ada O.' : names[i % names.length]!,
      status: slot < current ? 'paid_out' : 'active',
    } as const
  })
}

function cyclesFor(members: number, current: number, start: string): Circle['cycles'] {
  return Array.from({ length: members }, (_, i) => {
    const n = i + 1
    const due = new Date(start)
    due.setUTCMonth(due.getUTCMonth() + i)
    return {
      number: n,
      due_at: due.toISOString(),
      status: n < current ? 'paid_out' : n === current ? 'collecting' : 'scheduled',
      pays_slot: n,
      paid_count: n < current ? members : n === current ? Math.max(0, members - 3) : 0,
      covered_count: 0,
      my_contribution: n < current ? 'paid' : null,
    }
  })
}

const activeStart = iso(-58)
const myCircles: Circle[] = [
  {
    id: '01JCA8C1RCLE00000000000000', package: '10 seats, 100 USDT monthly', status: 'active', asset: 'usdt', members: 10, house_seats: 4, cycle: 'monthly',
    contribution: '100', per_cycle_total: '102', pot: '1000', pot_after_fee: '990', late_fee: '2', current_cycle: 3, starts_at: activeStart,
    fill_deadline_at: iso(-60), visibility: 'public', invite_code: null, is_organiser: false,
    draw_seed_hash: '9f2c4e0b6a1d8f3e5c7b9a0d2e4f6a8b1c3d5e7f9a0b2c4d6e8f0a1b3c5d7e9f', unwind_loss: null,
    my_seat: { id: '01JCA9SEAT0000000000000000', slot: 7, type: 'real', status: 'active', collateral_percent: '50', collateral_locked: '500', owed_for_covered_payments: '0', payout_destination: 'wallet', exited_at: null, exit_fee: null },
    seats: seatsFor(10, 4, 7, 3), cycles: cyclesFor(10, 3, activeStart),
  },
  {
    id: '01JCA8C1RCLE00000000000001', package: '6 seats, 50 USDT weekly', status: 'forming', asset: 'usdt', members: 6, house_seats: 2, cycle: 'weekly',
    contribution: '50', per_cycle_total: '52', pot: '300', pot_after_fee: '297', late_fee: '1', current_cycle: 0, starts_at: null,
    fill_deadline_at: iso(9), visibility: 'private', invite_code: 'K7P2QX9M', is_organiser: true,
    draw_seed_hash: '3a1b9c7d5e2f4a6b8c0d1e3f5a7b9c2d4e6f8a0b1c3d5e7f9a2b4c6d8e0f1a3b', unwind_loss: null,
    my_seat: { id: '01JCA9SEAT0000000000000001', slot: 4, type: 'real', status: 'reserved', collateral_percent: '50', collateral_locked: '150', owed_for_covered_payments: '0', payout_destination: 'savings', exited_at: null, exit_fee: null },
    seats: (seatsFor(6, 2, 4, 0) ?? []).map((s) => (s.slot > 4 ? { ...s, member: null, status: 'open' as const } : { ...s, status: s.type === 'house' ? 'reserved' as const : 'reserved' as const })), cycles: [],
  },
]

const autoSave: AutoSave = { id: '01JCA5AUT0SAVE00000000000Q', amount: '10', frequency: 'weekly', day_of_week: 5, day_of_month: null, status: 'active', next_run_at: iso(3, 7), last_run_at: iso(-4, 7), consecutive_failures: 0, last_failure_reason: null }

const plans: SavingsPlan[] = [
  { id: '01JCA4PLAN000000000000000R', type: 'goal', name: 'Rent', asset: 'usdt', balance: '640', target_amount: '1200', progress_percent: '53.33', target_date: iso(150).slice(0, 10), lock_months: null, matures_at: null, auto_renew: null, early_fee_applies: true, status: 'active', auto_save: autoSave, interest: { annual_rate_percent: '8.00', rate_type: 'variable', earned: '4.12', accrued_through: iso(-1).slice(0, 10) }, matured_at: null, closed_at: null, created_at: iso(-90) },
  { id: '01JCA4PLAN000000000000001S', type: 'goal', name: 'New laptop', asset: 'usdt', balance: '180.5', target_amount: '900', progress_percent: '20.06', target_date: iso(240).slice(0, 10), lock_months: null, matures_at: null, auto_renew: null, early_fee_applies: true, status: 'active', auto_save: null, interest: { annual_rate_percent: '8.00', rate_type: 'variable', earned: '0.86', accrued_through: iso(-1).slice(0, 10) }, matured_at: null, closed_at: null, created_at: iso(-40) },
  { id: '01JCA4PLANL0CKED000000000S', type: 'locked', name: 'School fees', asset: 'usdt', balance: '500', target_amount: null, progress_percent: null, target_date: null, lock_months: 6, matures_at: iso(112), auto_renew: false, early_fee_applies: true, status: 'active', auto_save: null, interest: { annual_rate_percent: '12.00', rate_type: 'fixed_for_term', earned: '11.18', accrued_through: iso(-1).slice(0, 10) }, matured_at: null, closed_at: null, created_at: iso(-68) },
]

const movements = (planId: string): SavingsMovement[] => [
  { id: ulid(), type: 'interest', direction: 'in', amount: '0.14', fee: '0', net: '0.14', run_date: null, created_at: iso(-1, 0) },
  { id: ulid(), type: 'auto_save', direction: 'in', amount: '10', fee: '0', net: '10', run_date: iso(-4).slice(0, 10), created_at: iso(-4, 7) },
  { id: ulid(), type: 'deposit', direction: 'in', amount: planId.endsWith('S') ? '500' : '120', fee: '0', net: planId.endsWith('S') ? '500' : '120', run_date: null, created_at: iso(-20) },
  { id: ulid(), type: 'early_withdrawal', direction: 'out', amount: '20', fee: '0.2', net: '19.8', run_date: null, created_at: iso(-31) },
]

const activity: ActivityEntry[] = [
  { id: ulid(), type: 'savings_interest', label: 'Savings interest', direction: 'in', asset: 'usdt', amount: '0.14', balance_after: '1320.5', reference: { kind: 'savings_movement', plan: 'Rent' }, created_at: iso(-1, 0) },
  { id: ulid(), type: 'crypto_deposit', label: 'Crypto deposit', direction: 'in', asset: 'usdt', amount: '250', balance_after: '1320.36', reference: { kind: 'crypto_deposit', tx_hash: 'c0dcd7177e4c8ecf2c2508d0475ec96b2fe9447be29b71e7ee6af8863c042ae5' }, created_at: iso(-2, 14) },
  { id: ulid(), type: 'circle_contribution', label: 'Circle contribution', direction: 'out', asset: 'usdt', amount: '102', balance_after: '1070.36', reference: { kind: 'circle_contribution', circle: '10 seats, 100 USDT monthly' }, created_at: iso(-3, 8) },
  { id: ulid(), type: 'savings_auto_save', label: 'Auto-save', direction: 'out', asset: 'usdt', amount: '10', balance_after: '1172.36', reference: { kind: 'savings_movement', plan: 'Rent' }, created_at: iso(-4, 7) },
  { id: ulid(), type: 'crypto_withdrawal', label: 'Crypto withdrawal', direction: 'out', asset: 'usdt', amount: '51', balance_after: '1182.36', reference: { kind: 'crypto_withdrawal', tx_hash: '7a1e0c55d3b2f4e6a8c0b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2' }, created_at: iso(-9, 16) },
  { id: ulid(), type: 'circle_payout', label: 'Circle pot', direction: 'in', asset: 'usdt', amount: '990', balance_after: '1233.36', reference: { kind: 'circle_cycle', circle: '6 seats, 50 USDT weekly' }, created_at: iso(-30, 9) },
]

const notifications: AppNotification[] = [
  { id: '9d3f6a2e-1b4c-4e8a-9f0d-2c7b5e1a3d40', type: 'CircleContributionDueNotification', category: 'savings', title: 'Contribution due in 3 days', body: '102 USDT for 10 seats, 100 USDT monthly is due on Friday. Keep it in your wallet and it is taken automatically.', details: { circle_id: myCircles[0]!.id }, read_at: null, created_at: iso(0, 8) },
  { id: '9d3f6a2e-1b4c-4e8a-9f0d-2c7b5e1a3d41', type: 'CryptoDepositCreditedNotification', category: 'transactions', title: 'Deposit received', body: '250 USDT arrived on trc20 and is now in your wallet.', details: {}, read_at: null, created_at: iso(-2, 14) },
  { id: '9d3f6a2e-1b4c-4e8a-9f0d-2c7b5e1a3d42', type: 'AutoSaveRanNotification', category: 'savings', title: 'Auto-save done', body: '10 USDT moved into Rent.', details: { plan_id: plans[0]!.id }, read_at: iso(-3), created_at: iso(-4, 7) },
  { id: '9d3f6a2e-1b4c-4e8a-9f0d-2c7b5e1a3d43', type: 'NewDeviceLoginNotification', category: 'security', title: 'New sign-in', body: 'Your account was opened on Chrome on Windows. If this was not you, change your password.', details: {}, read_at: iso(-8), created_at: iso(-9, 11) },
]

const reputation: Reputation = {
  score: 655, band: 'good', version: 1, starting_score: 500, max_score: 1000, circles_barred: false,
  weights: [
    { type: 'contribution_on_time', points: 5, description: 'Circle contribution paid on time' },
    { type: 'contribution_late', points: -5, description: 'Circle contribution paid during the grace window' },
    { type: 'contribution_covered', points: -40, description: 'Missed circle contribution covered by collateral or the reserve' },
    { type: 'default_after_payout', points: -100, description: 'Missed a contribution after collecting the pot' },
    { type: 'circle_completed', points: 50, description: 'Completed a circle' },
    { type: 'circle_exited', points: -60, description: 'Left a running circle' },
    { type: 'savings_matured', points: 10, description: 'Kept a locked savings plan to the end of its term' },
  ],
  recent_events: [
    { type: 'contribution_on_time', points: 5, score_after: 655, description: 'Circle contribution paid on time', created_at: iso(-3, 8) },
    { type: 'circle_completed', points: 50, score_after: 650, description: 'Completed a circle', created_at: iso(-30, 9) },
    { type: 'savings_matured', points: 10, score_after: 600, description: 'Kept a locked savings plan to the end of its term', created_at: iso(-45) },
    { type: 'contribution_late', points: -5, score_after: 590, description: 'Circle contribution paid during the grace window', created_at: iso(-62) },
  ],
  appeal: 'If you think a change is wrong, contact support and ask for a review. A person checks every appeal.',
}

/** In-memory backend with the same shapes as the real API. State lives for the life of the page. */
export function createMockApi(config: Pick<ApiConfig, 'latency'> = {}): KolofiApi {
  const latency = config.latency ?? 220
  const wait = <T,>(v: T): Promise<T> => new Promise((res) => setTimeout(() => res(clone(v)), latency))
  const fail = (status: number, code: string, message: string, fields?: Record<string, string[]>): never => {
    throw new ApiError(status, code, message, fields)
  }

  const db = {
    user: clone(baseUser),
    available: 1320.5 * 100,
    held: 0,
    addresses: [{ id: ulid(), network: 'trc20', address: 'TRxDJMn9G5qhqSQcH51PUJ5jb8qH84GGfe', is_active: true, created_at: iso(-110) }] as WalletAddress[],
    deposits: [
      { id: ulid(), asset: 'usdt', network: 'trc20', amount: '250', tx_hash: activity[1]!.reference!.tx_hash!, status: 'credited', credited_at: iso(-2, 14), created_at: iso(-2, 14) },
      { id: ulid(), asset: 'usdt', network: 'bep20', amount: '600', tx_hash: '0x4be1c2a9d0e7f3b6a1c5d8e2f9a0b3c6d7e1f4a8b2c5d9e0f3a6b7c1d4e8f2a5', status: 'credited', credited_at: iso(-50), created_at: iso(-50) },
    ] as CryptoDeposit[],
    withdrawals: [
      { id: ulid(), asset: 'usdt', network: 'trc20', address: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7', amount: '50', fee: '1', total: '51', status: 'completed', tx_hash: activity[4]!.reference!.tx_hash!, created_at: iso(-9, 16), completed_at: iso(-9, 16) },
    ] as CryptoWithdrawal[],
    plans: clone(plans),
    movements: new Map<string, SavingsMovement[]>(),
    circles: clone(myCircles),
    waitlist: [] as WaitlistEntry[],
    takeovers: [{ seat_id: '01JCADSEATTAKE0VER0000000A', circle_id: '01JCA8C1RCLE00000000000009', package: '10 seats, 100 USDT monthly', slot: 8, members: 10, current_cycle: 2, asset: 'usdt', contribution: '100', pot: '1000', catch_up: '100', collateral: '500', total_to_pay: '600' }] as Takeover[],
    transfers: [{ id: ulid(), kind: 'swap', status: 'pending', role: 'buyer', counterparty: 'Bola A.', circle_id: '01JCA8C1RCLE00000000000007', slot: 9, asset: 'usdt', catch_up: '200', collateral: '500', seller_refund: null, fee: '2', expires_at: iso(2), completed_at: null }] as SeatTransfer[],
    notifications: clone(notifications),
    activity: clone(activity),
    prefs: { email: { transactions: true, savings: true, security: true }, locked: ['security'] } as NotificationPrefs,
    sessions: [
      { id: 42, device_name: 'web · Chrome/131', is_current: true, last_used_at: iso(0, 10), created_at: iso(-1), expires_at: iso(29) },
      { id: 37, device_name: 'iPhone 16', is_current: false, last_used_at: iso(-2, 20), created_at: iso(-12), expires_at: iso(18) },
    ] as Session[],
  }

  const requirePin = (pin: string) => {
    if (!db.user.has_transaction_pin) fail(403, 'PIN_NOT_SET', 'Set a transaction PIN first.')
    if (pin !== MOCK_PIN) fail(403, 'INVALID_PIN', 'That PIN is not right.')
  }
  const spend = (amountCents: number) => {
    if (amountCents > db.available) fail(422, 'INSUFFICIENT_BALANCE', 'Your available balance is too low.')
    db.available -= amountCents
  }
  const findPlan = (id: string) => db.plans.find((p) => p.id === id) ?? fail(404, 'NOT_FOUND', 'We could not find that record.')
  const findCircle = (id: string) => db.circles.find((c) => c.id === id) ?? fail(404, 'NOT_FOUND', 'We could not find that record.')
  const paged = <T,>(items: T[]): Page<T> => ({ data: items, next_cursor: null })
  const log = (entry: Omit<ActivityEntry, 'id' | 'asset' | 'balance_after' | 'created_at'>) =>
    db.activity.unshift({ id: ulid(), asset: 'usdt', balance_after: dec(db.available), created_at: new Date().toISOString(), ...entry })
  const auth = () => ({ user: db.user, token: `mock|${Date.now()}`, expires_at: iso(30) })

  const circleFrom = (pkg: CirclePackage, bps: number, visibility: 'public' | 'private'): Circle => {
    const opt = pkg.options.find((o) => o.collateral_bps === bps) ?? fail(422, 'COLLATERAL_LEVEL_NOT_OFFERED', 'This package does not offer that collateral level.')
    const slot = opt.earliest_slot + Math.floor(Math.random() * (pkg.members - opt.earliest_slot + 1))
    return {
      id: ulid(), package: pkg.name, status: 'forming', asset: 'usdt', members: pkg.members, house_seats: pkg.house_seats, cycle: pkg.cycle,
      contribution: pkg.contribution, per_cycle_total: opt.per_cycle_total, pot: opt.pot, pot_after_fee: opt.pot_after_fee, late_fee: '2',
      current_cycle: 0, starts_at: null, fill_deadline_at: iso(14), visibility, invite_code: visibility === 'private' ? Math.random().toString(36).slice(2, 10).toUpperCase() : null,
      is_organiser: visibility === 'private', draw_seed_hash: Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''), unwind_loss: null,
      my_seat: { id: ulid(), slot, type: 'real', status: 'reserved', collateral_percent: opt.collateral_percent, collateral_locked: opt.collateral, owed_for_covered_payments: '0', payout_destination: 'wallet', exited_at: null, exit_fee: null },
      seats: (seatsFor(pkg.members, pkg.house_seats, slot, 0) ?? []).map((s) => (s.slot === slot || s.type === 'house' ? { ...s, status: 'reserved' as const } : { ...s, member: null, status: 'open' as const })),
      cycles: [],
    }
  }

  const joinCircle = (pkg: CirclePackage, bps: number, pin: string, visibility: 'public' | 'private') => {
    requirePin(pin)
    const c = circleFrom(pkg, bps, visibility)
    spend(cents(c.my_seat!.collateral_locked))
    db.circles.unshift(c)
    log({ type: 'circle_collateral_lock', label: 'Circle collateral locked', direction: 'out', amount: c.my_seat!.collateral_locked, reference: { kind: 'circle_seat', circle: c.package } })
    return wait(c)
  }

  return {
    auth: {
      async register(input) {
        const fields: Record<string, string[]> = {}
        if (input.password.length < 10) fields.password = ['The password field must be at least 10 characters.']
        if (input.password !== input.password_confirmation) fields.password = ['The password field confirmation does not match.']
        if (!/^\+234[789][01]\d{8}$/.test(input.phone)) fields.phone = ['Enter a Nigerian mobile number in the format +2348012345678.']
        if (Object.keys(fields).length) fail(422, 'VALIDATION', Object.values(fields)[0]![0]!, fields)
        db.user = { ...clone(baseUser), id: ulid(), first_name: input.first_name, last_name: input.last_name, email: input.email, phone: input.phone, email_verified: false, has_transaction_pin: false, created_at: new Date().toISOString() }
        db.available = 0
        db.plans = []
        db.circles = []
        db.activity = []
        db.notifications = []
        return wait(auth())
      },
      async login({ email, password }) {
        if (password !== MOCK_PASSWORD) fail(422, 'VALIDATION', 'These credentials do not match our records.', { email: ['These credentials do not match our records.'] })
        db.user = { ...db.user, email }
        return wait(auth())
      },
      logout: () => wait(undefined),
      sendEmailCode: () => wait(undefined),
      async verifyEmail(code) {
        if (code !== MOCK_CODE) fail(422, 'INVALID_CODE', 'That code is not right or has expired.')
        db.user.email_verified = true
        return wait({ email_verified: true })
      },
      forgotPassword: () => wait({ message: 'If that email has an account, a reset code is on its way.' }),
      async resetPassword({ code }) {
        if (code !== MOCK_CODE) fail(422, 'INVALID_CODE', 'That code is not right or has expired.')
        return wait({ withdrawals_held_until: iso(1) })
      },
    },
    me: {
      get: () => wait(db.user),
      async changePassword({ current_password }) {
        if (current_password !== MOCK_PASSWORD) fail(422, 'VALIDATION', 'The password is incorrect.', { current_password: ['The password is incorrect.'] })
        return wait(undefined)
      },
      async setPin({ password, pin, pin_confirmation }) {
        if (password !== MOCK_PASSWORD) fail(422, 'VALIDATION', 'The password is incorrect.', { password: ['The password is incorrect.'] })
        if (!/^\d{6}$/.test(pin)) fail(422, 'VALIDATION', 'The PIN must be 6 digits.', { pin: ['The PIN must be 6 digits.'] })
        if (pin !== pin_confirmation) fail(422, 'VALIDATION', 'The PIN confirmation does not match.', { pin: ['The PIN confirmation does not match.'] })
        db.user.has_transaction_pin = true
        return wait(undefined)
      },
      sessions: () => wait(db.sessions),
      async revokeSession(id) {
        db.sessions = db.sessions.filter((s) => s.id !== id)
        return wait(undefined)
      },
      async revokeOtherSessions() {
        const n = db.sessions.filter((s) => !s.is_current).length
        db.sessions = db.sessions.filter((s) => s.is_current)
        return wait(n)
      },
      notificationPrefs: () => wait(db.prefs),
      async updateNotificationPrefs(email) {
        db.prefs.email = { ...db.prefs.email, ...email, security: true }
        return wait(db.prefs)
      },
      reputation: () => wait(reputation),
    },
    wallets: {
      get: () =>
        wait({
          balances: [{ asset: 'usdt' as const, name: 'Tether USD', available: dec(db.available), held: dec(db.held), in_savings: dec(db.plans.filter((p) => p.status === 'active').reduce((s, p) => s + cents(p.balance), 0)), networks: ['trc20', 'bep20'] as const }].map((b) => ({ ...b, networks: [...b.networks] })),
          addresses: db.addresses,
        }),
      async createAddress(network) {
        const existing = db.addresses.find((a) => a.network === network)
        if (existing) return wait(existing)
        const address: WalletAddress = { id: ulid(), network, address: network === 'bep20' ? '0x7a2c91F4d2E86a1c5B9e07A4f3D2c8b13b0ef31b' : 'TJYeasTPa6gpEEfYqvdGAJpEXbRDk6M3Lt', is_active: true, created_at: new Date().toISOString() }
        db.addresses.push(address)
        return wait(address)
      },
      deposits: () => wait(paged(db.deposits)),
    },
    withdrawals: {
      list: () => wait(paged(db.withdrawals)),
      get: (id) => wait(db.withdrawals.find((w) => w.id === id) ?? fail(404, 'NOT_FOUND', 'We could not find that record.')),
      async create({ network, address, amount, pin }) {
        requirePin(pin)
        if (cents(amount) < 500) fail(422, 'AMOUNT_TOO_SMALL', 'The minimum withdrawal is 5 USDT.')
        const total = cents(amount) + 100
        spend(total)
        const w: CryptoWithdrawal = { id: ulid(), asset: 'usdt', network, address, amount, fee: '1', total: dec(total), status: 'processing', tx_hash: null, created_at: new Date().toISOString(), completed_at: null }
        db.withdrawals.unshift(w)
        log({ type: 'crypto_withdrawal', label: 'Crypto withdrawal', direction: 'out', amount: dec(total), reference: { kind: 'crypto_withdrawal', id: w.id } })
        return wait(w)
      },
    },
    fees: {
      quote: ({ event, amount }) => {
        const fee = event === 'withdrawal.crypto' ? 100 : 0
        return wait({ event, asset: 'usdt' as const, amount, fee: dec(fee), total: dec(cents(amount) + fee) })
      },
    },
    meta: {
      features: () =>
        wait([
          { key: 'crypto_deposits', status: 'live' as const, label: 'Fund your account with crypto' },
          { key: 'naira_funding', status: 'coming_soon' as const, label: 'Fund with Naira by bank transfer or card' },
          { key: 'naira_withdrawals', status: 'coming_soon' as const, label: 'Withdraw to a Nigerian bank account' },
          { key: 'identity_verification', status: 'coming_soon' as const, label: 'Verify your identity with BVN or NIN' },
          { key: 'circles', status: 'live' as const, label: 'Kolofi Circles' },
          { key: 'savings_yield', status: 'live' as const, label: 'Earn interest on savings' },
        ]),
      rates: () => wait({ ngn_per_usd: '1585.5', assets: { usdt: { usd: '1.0002' } }, fetched_at: new Date().toISOString() }),
    },
    savings: {
      summary: () => {
        const active = db.plans.filter((p) => p.status === 'active')
        const sum = (t?: string) => dec(active.filter((p) => !t || p.type === t).reduce((s, p) => s + cents(p.balance), 0))
        return wait({ asset: 'usdt' as const, total: sum(), goal: sum('goal'), locked: sum('locked'), active_plans: active.length, interest_earned: dec(db.plans.reduce((s, p) => s + cents(p.interest.earned), 0)) })
      },
      rates: () =>
        wait({
          asset: 'usdt' as const,
          products: [
            { type: 'goal' as const, lock_months: null, label: 'Goal savings', annual_rate_percent: '8.00', rate_type: 'variable' as const },
            { type: 'locked' as const, lock_months: 3, label: 'Locked for 3 months', annual_rate_percent: '10.00', rate_type: 'fixed_for_term' as const },
            { type: 'locked' as const, lock_months: 6, label: 'Locked for 6 months', annual_rate_percent: '12.00', rate_type: 'fixed_for_term' as const },
            { type: 'locked' as const, lock_months: 12, label: 'Locked for 12 months', annual_rate_percent: '14.00', rate_type: 'fixed_for_term' as const },
          ],
          terms: 'Simple interest, worked out daily on the lowest balance you held that day and added to your plan each day. Goal savings rates can change; a locked plan keeps the rate it started with until its term ends.',
        }),
      plans: () => wait(db.plans),
      plan: (id) => wait(findPlan(id)),
      async create(input) {
        const rate = input.type === 'locked' ? { 3: '10.00', 6: '12.00', 12: '14.00' }[input.lock_months as 3 | 6 | 12] ?? '10.00' : '8.00'
        const deposit = input.initial_deposit ? cents(input.initial_deposit) : 0
        if (deposit) spend(deposit)
        const matures = input.type === 'locked' ? (() => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() + (input.lock_months ?? 3)); return d.toISOString() })() : null
        const plan: SavingsPlan = {
          id: ulid(), type: input.type, name: input.name, asset: 'usdt', balance: dec(deposit), target_amount: input.target_amount ?? null,
          progress_percent: input.target_amount ? ((deposit / cents(input.target_amount)) * 100).toFixed(2) : null, target_date: input.target_date ?? null,
          lock_months: input.lock_months ?? null, matures_at: matures, auto_renew: input.type === 'locked' ? !!input.auto_renew : null, early_fee_applies: true,
          status: 'active', auto_save: null, interest: { annual_rate_percent: rate, rate_type: input.type === 'locked' ? 'fixed_for_term' : 'variable', earned: '0', accrued_through: null },
          matured_at: null, closed_at: null, created_at: new Date().toISOString(),
        }
        db.plans.unshift(plan)
        db.movements.set(plan.id, deposit ? [{ id: ulid(), type: 'deposit', direction: 'in', amount: dec(deposit), fee: '0', net: dec(deposit), run_date: null, created_at: plan.created_at }] : [])
        if (deposit) log({ type: 'savings_deposit', label: 'Moved to savings', direction: 'out', amount: dec(deposit), reference: { kind: 'savings_movement', plan: plan.name } })
        return wait(plan)
      },
      async update(id, patch) {
        const p = findPlan(id)
        Object.assign(p, patch)
        if (p.target_amount) p.progress_percent = ((cents(p.balance) / cents(p.target_amount)) * 100).toFixed(2)
        return wait(p)
      },
      async close(id) {
        const p = findPlan(id)
        if (cents(p.balance) > 0) fail(422, 'PLAN_NOT_EMPTY', 'Withdraw everything from this plan before closing it.')
        Object.assign(p, { status: 'closed', closed_at: new Date().toISOString(), auto_save: null })
        return wait(p)
      },
      movements: (id) => {
        if (!db.movements.has(id)) db.movements.set(id, movements(id))
        return wait(paged(db.movements.get(id)!))
      },
      async deposit(id, amount) {
        const p = findPlan(id)
        spend(cents(amount))
        p.balance = dec(cents(p.balance) + cents(amount))
        if (p.target_amount) p.progress_percent = ((cents(p.balance) / cents(p.target_amount)) * 100).toFixed(2)
        const m: SavingsMovement = { id: ulid(), type: 'deposit', direction: 'in', amount, fee: '0', net: amount, run_date: null, created_at: new Date().toISOString() }
        db.movements.set(id, [m, ...(db.movements.get(id) ?? movements(id))])
        log({ type: 'savings_deposit', label: 'Moved to savings', direction: 'out', amount, reference: { kind: 'savings_movement', plan: p.name } })
        return wait({ movement: m, plan: p })
      },
      withdrawalQuote(id, amount) {
        const p = findPlan(id)
        if (cents(amount) > cents(p.balance)) fail(422, 'INSUFFICIENT_BALANCE', 'Your available balance is too low.')
        const pct = p.early_fee_applies ? (p.type === 'locked' ? 0.03 : 0.01) : 0
        const fee = Math.round(cents(amount) * pct)
        return wait({ type: p.early_fee_applies ? (p.type === 'locked' ? 'lock_break' : 'early_withdrawal') : 'withdrawal', amount, fee: dec(fee), you_receive: dec(cents(amount) - fee) } as const)
      },
      async withdraw(id, amount, pin) {
        requirePin(pin)
        const p = findPlan(id)
        if (cents(amount) > cents(p.balance)) fail(422, 'INSUFFICIENT_BALANCE', 'Your available balance is too low.')
        const pct = p.early_fee_applies ? (p.type === 'locked' ? 0.03 : 0.01) : 0
        const fee = Math.round(cents(amount) * pct)
        p.balance = dec(cents(p.balance) - cents(amount))
        if (p.target_amount) p.progress_percent = ((cents(p.balance) / cents(p.target_amount)) * 100).toFixed(2)
        db.available += cents(amount) - fee
        const m: SavingsMovement = { id: ulid(), type: p.early_fee_applies ? (p.type === 'locked' ? 'lock_break' : 'early_withdrawal') : 'withdrawal', direction: 'out', amount, fee: dec(fee), net: dec(cents(amount) - fee), run_date: null, created_at: new Date().toISOString() }
        db.movements.set(id, [m, ...(db.movements.get(id) ?? movements(id))])
        log({ type: 'savings_withdrawal', label: 'From savings', direction: 'in', amount: m.net, reference: { kind: 'savings_movement', plan: p.name } })
        return wait({ movement: m, plan: p })
      },
      async setAutoSave(id, input) {
        const p = findPlan(id)
        p.auto_save = { id: p.auto_save?.id ?? ulid(), amount: input.amount, frequency: input.frequency, day_of_week: input.day_of_week ?? null, day_of_month: input.day_of_month ?? null, status: 'active', next_run_at: iso(input.frequency === 'daily' ? 1 : input.frequency === 'weekly' ? 5 : 20, 7), last_run_at: p.auto_save?.last_run_at ?? null, consecutive_failures: 0, last_failure_reason: null }
        return wait(p.auto_save)
      },
      async pauseAutoSave(id) {
        const p = findPlan(id)
        if (!p.auto_save) fail(404, 'NOT_FOUND', 'This plan has no auto-save.')
        p.auto_save = { ...p.auto_save!, status: 'paused', next_run_at: null }
        return wait(p.auto_save)
      },
      async resumeAutoSave(id) {
        const p = findPlan(id)
        if (!p.auto_save) fail(404, 'NOT_FOUND', 'This plan has no auto-save.')
        p.auto_save = { ...p.auto_save!, status: 'active', next_run_at: iso(3, 7) }
        return wait(p.auto_save)
      },
      async cancelAutoSave(id) {
        findPlan(id).auto_save = null
        return wait(undefined)
      },
    },
    circles: {
      packages: () => wait(packages),
      quote: (id, bps) => {
        const pkg = packages.find((p) => p.id === id) ?? fail(404, 'NOT_FOUND', 'We could not find that record.')
        return wait(pkg.options.find((o) => o.collateral_bps === bps) ?? fail(422, 'COLLATERAL_LEVEL_NOT_OFFERED', 'This package does not offer that collateral level.'))
      },
      join: (id, bps, pin) => joinCircle(packages.find((p) => p.id === id) ?? fail(404, 'NOT_FOUND', 'We could not find that record.'), bps, pin, 'public'),
      createPrivate: (id, bps, pin) => joinCircle(packages.find((p) => p.id === id) ?? fail(404, 'NOT_FOUND', 'We could not find that record.'), bps, pin, 'private'),
      async joinByCode(code, bps, pin) {
        if (code.toUpperCase() !== 'K7P2QX9M') fail(404, 'INVITE_NOT_VALID', 'That invite code is not valid, or the circle is no longer taking members.')
        return joinCircle(packages[0]!, bps, pin, 'private')
      },
      mine: () => wait(db.circles.map(({ seats: _s, cycles: _c, ...c }) => c as Circle)),
      get: (id) => wait(findCircle(id)),
      draw: (id) => {
        const c = findCircle(id)
        return wait({
          seed_hash: c.draw_seed_hash,
          seed: c.status === 'forming' ? null : 'b1946ac92492d2347c6235b4d2611184c4e5c7d9a2f0e8b3a6d1c9f7e2b5a8d0',
          seed_revealed: c.status !== 'forming',
          my_draw: c.my_seat ? { sequence: 3, member_id: db.user.id, candidate_slots: Array.from({ length: c.members - c.house_seats }, (_, i) => c.house_seats + 1 + i), slot: c.my_seat.slot } : null,
          algorithm: 'Check that SHA-256(seed) equals seed_hash. Then compute HMAC-SHA256 of "{sequence}:{member_id}" with the seed as the key, take the first 12 hex digits as a number, and take it modulo the number of candidate slots. That index into candidate_slots, in ascending order, is your slot.',
        })
      },
      async leave(id, pin) {
        requirePin(pin)
        const c = findCircle(id)
        if (c.status !== 'forming') fail(422, 'CANNOT_LEAVE', 'You can only leave a circle this way before it starts.')
        db.available += cents(c.my_seat!.collateral_locked)
        db.circles = db.circles.filter((x) => x.id !== id)
        return wait(undefined)
      },
      exitQuote: (id) => {
        const c = findCircle(id)
        if (c.status !== 'active' || c.my_seat?.type !== 'real') fail(422, 'CANNOT_EXIT', 'Only a member seat in a running circle can be left this way.')
        const paid = (c.cycles ?? []).filter((x) => x.my_contribution).length
        const fee = Math.max(1, paid) * cents(c.contribution) * 0.1
        return wait({ asset: 'usdt' as const, slot: c.my_seat!.slot, contributions_paid: paid, contributions_paid_amount: dec(paid * cents(c.contribution)), exit_fee: dec(fee), collateral_held: c.my_seat!.collateral_locked, owed_for_covered_payments: '0', estimated_return: dec(paid * cents(c.contribution) + cents(c.my_seat!.collateral_locked) - fee - 1000), returned_by: c.cycles?.[c.my_seat!.slot - 1]?.due_at ?? null, waitlist_buyers: 1, terms: 'Leaving stops all further charges. Your seat’s payments are covered by your collateral, then by Kólófi, until your slot comes up. A waitlisted buyer refunds you straight away; otherwise you are refunded when your slot’s pot is paid.' })
      },
      async exit(id, pin) {
        requirePin(pin)
        const c = findCircle(id)
        c.my_seat = { ...c.my_seat!, type: 'takeover', exited_at: new Date().toISOString(), exit_fee: '20' }
        return wait(c)
      },
      async topUp(id, pin) {
        requirePin(pin)
        findCircle(id)
        fail(422, 'NOTHING_TO_TOP_UP', 'Your collateral is already at the level your seat needs.')
        return wait({ topped_up: '0' })
      },
      async setPayoutDestination(id, { destination, pin }) {
        requirePin(pin)
        const c = findCircle(id)
        c.my_seat = { ...c.my_seat!, payout_destination: destination }
        return wait(c)
      },
      waitlist: () => wait(db.waitlist),
      async joinWaitlist(id, bps) {
        const pkg = packages.find((p) => p.id === id) ?? fail(404, 'NOT_FOUND', 'We could not find that record.')
        const entry: WaitlistEntry = { id: ulid(), package_id: id, package: pkg.name, collateral_bps: bps, status: 'waiting', joined_at: new Date().toISOString() }
        db.waitlist = [entry, ...db.waitlist.filter((w) => w.package_id !== id)]
        return wait(entry)
      },
      async leaveWaitlist(id) {
        db.waitlist = db.waitlist.filter((w) => w.package_id !== id)
        return wait(undefined)
      },
      takeovers: () => wait(db.waitlist.length ? db.takeovers : []),
      async buyTakeover(seatId, pin) {
        requirePin(pin)
        const t = db.takeovers.find((x) => x.seat_id === seatId) ?? fail(409, 'SEAT_NOT_FOR_SALE', 'This seat is no longer for sale.')
        spend(cents(t.total_to_pay))
        db.takeovers = db.takeovers.filter((x) => x.seat_id !== seatId)
        const tr: SeatTransfer = { id: ulid(), kind: 'waitlist', status: 'completed', role: 'buyer', counterparty: 'Tola K.', circle_id: t.circle_id, slot: t.slot, asset: 'usdt', catch_up: t.catch_up, collateral: t.collateral, seller_refund: null, fee: '0', expires_at: null, completed_at: new Date().toISOString() }
        db.transfers.unshift(tr)
        return wait(tr)
      },
      transfers: () => wait(db.transfers),
      async offerSeat(circleId, email, pin) {
        requirePin(pin)
        const c = findCircle(circleId)
        if (!email.includes('@')) fail(404, 'RECIPIENT_NOT_FOUND', 'We could not find a verified Kolofi member with that email.')
        const tr: SeatTransfer = { id: ulid(), kind: 'swap', status: 'pending', role: 'seller', counterparty: email.split('@')[0]!, circle_id: c.id, slot: c.my_seat!.slot, asset: 'usdt', catch_up: dec((c.current_cycle - 1) * cents(c.contribution)), collateral: null, seller_refund: null, fee: '2', expires_at: iso(2), completed_at: null }
        db.transfers.unshift(tr)
        return wait(tr)
      },
      async acceptTransfer(id, _bps, pin) {
        requirePin(pin)
        const tr = db.transfers.find((t) => t.id === id) ?? fail(404, 'OFFER_NOT_FOUND', 'That offer was not made to you.')
        spend(cents(tr.catch_up ?? '0') + cents(tr.collateral ?? '0'))
        Object.assign(tr, { status: 'completed', completed_at: new Date().toISOString() })
        return wait(tr)
      },
      async closeTransfer(id) {
        const tr = db.transfers.find((t) => t.id === id) ?? fail(404, 'OFFER_NOT_FOUND', 'That offer is not yours.')
        tr.status = tr.role === 'buyer' ? 'declined' : 'cancelled'
        return wait(tr)
      },
    },
    activity: {
      list: () => wait(paged(db.activity)),
      statement: (from, to) => {
        const entries = db.activity.filter((a) => a.created_at.slice(0, 10) >= from && a.created_at.slice(0, 10) <= to)
        const sum = (dir: 'in' | 'out') => dec(entries.filter((e) => e.direction === dir).reduce((s, e) => s + cents(e.amount), 0))
        return wait({ member: { id: db.user.id, name: `${db.user.first_name} ${db.user.last_name}` }, asset: 'usdt' as const, from, to, timezone: 'Africa/Lagos', opening_balance: entries.length ? dec(cents(entries.at(-1)!.balance_after) + (entries.at(-1)!.direction === 'in' ? -1 : 1) * cents(entries.at(-1)!.amount)) : dec(db.available), total_in: sum('in'), total_out: sum('out'), closing_balance: dec(db.available), entries })
      },
    },
    notifications: {
      list: () => wait(paged(db.notifications)),
      unreadCount: () => wait(db.notifications.filter((n) => !n.read_at).length),
      async markRead(id) {
        const n = db.notifications.find((x) => x.id === id)
        if (n) n.read_at = new Date().toISOString()
        return wait(undefined)
      },
      async markAllRead() {
        db.notifications.forEach((n) => (n.read_at ??= new Date().toISOString()))
        return wait(undefined)
      },
    },
  }
}
