/**
 * Domain models, shaped exactly like the Kólófi API (`/api/v1`) responses.
 * Money is a decimal string in major units ("74.5" USDT), never a float; format it with `core/format`.
 * IDs are ULID strings except notifications (UUID) and sessions (number).
 */

export type Dec = string
export type ISODate = string
export type Asset = 'usdt'
export type Network = 'trc20' | 'bep20'

/* ───────── Auth & profile ───────── */
export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  email_verified: boolean
  phone_verified: boolean
  has_transaction_pin: boolean
  is_frozen: boolean
  withdrawals_held_until: ISODate | null
  created_at: ISODate
}

export interface AuthResult {
  user: User
  token: string
  expires_at: ISODate
}

export interface Session {
  id: number
  device_name: string
  is_current: boolean
  last_used_at: ISODate | null
  created_at: ISODate
  expires_at: ISODate | null
}

export type NotificationCategory = 'transactions' | 'savings' | 'security'
export interface NotificationPrefs {
  email: Record<NotificationCategory, boolean>
  locked: NotificationCategory[]
}

/* ───────── Wallet ───────── */
export interface WalletBalance {
  asset: Asset
  name: string
  available: Dec
  held: Dec
  in_savings: Dec
  networks: Network[]
}
export interface WalletAddress {
  id: string
  network: Network
  address: string
  is_active: boolean
  created_at: ISODate
}
export interface Wallets {
  balances: WalletBalance[]
  addresses: WalletAddress[]
}

export interface CryptoDeposit {
  id: string
  asset: Asset
  network: Network
  amount: Dec
  tx_hash: string
  status: string
  credited_at: ISODate | null
  created_at: ISODate
}

export interface CryptoWithdrawal {
  id: string
  asset: Asset
  network: Network
  address: string
  amount: Dec
  fee: Dec
  total: Dec
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown' | string
  tx_hash: string | null
  created_at: ISODate
  completed_at: ISODate | null
}

export interface FeeQuote {
  event: string
  asset: Asset
  amount: Dec
  fee: Dec
  total: Dec
}

export interface MarketRates {
  ngn_per_usd: Dec
  assets: Record<string, { usd: Dec }>
  fetched_at: ISODate
}

export interface Feature {
  key: string
  status: 'live' | 'coming_soon'
  label: string
}

/* ───────── Savings ───────── */
export type PlanType = 'goal' | 'locked'
export type PlanStatus = 'active' | 'matured' | 'closed'
export type Frequency = 'daily' | 'weekly' | 'monthly'

export interface AutoSave {
  id: string
  amount: Dec
  frequency: Frequency
  day_of_week: number | null
  day_of_month: number | null
  status: 'active' | 'paused' | 'cancelled'
  next_run_at: ISODate | null
  last_run_at: ISODate | null
  consecutive_failures: number
  last_failure_reason: string | null
}

export interface PlanInterest {
  annual_rate_percent: Dec
  rate_type: 'variable' | 'fixed_for_term'
  earned: Dec
  accrued_through: ISODate | null
}

export interface SavingsPlan {
  id: string
  type: PlanType
  name: string
  asset: Asset
  balance: Dec
  target_amount: Dec | null
  progress_percent: Dec | null
  target_date: ISODate | null
  lock_months: number | null
  matures_at: ISODate | null
  auto_renew: boolean | null
  early_fee_applies: boolean
  status: PlanStatus
  auto_save: AutoSave | null
  interest: PlanInterest
  matured_at: ISODate | null
  closed_at: ISODate | null
  created_at: ISODate
}

export interface SavingsSummary {
  asset: Asset
  total: Dec
  goal: Dec
  locked: Dec
  active_plans: number
  interest_earned: Dec
}

export interface SavingsProduct {
  type: PlanType
  lock_months: number | null
  label: string
  annual_rate_percent: Dec
  rate_type: 'variable' | 'fixed_for_term'
}
export interface SavingsRates {
  asset: Asset
  products: SavingsProduct[]
  terms: string
}

export type MovementType = 'deposit' | 'auto_save' | 'withdrawal' | 'early_withdrawal' | 'lock_break' | 'maturity_payout' | 'circle_payout' | 'interest'
export interface SavingsMovement {
  id: string
  type: MovementType
  direction: 'in' | 'out'
  amount: Dec
  fee: Dec
  net: Dec
  run_date: ISODate | null
  created_at: ISODate
}

export interface WithdrawalQuote {
  type: MovementType
  amount: Dec
  fee: Dec
  you_receive: Dec
}

export interface CreatePlanInput {
  type: PlanType
  name: string
  target_amount?: Dec | null
  target_date?: string
  lock_months?: number
  auto_renew?: boolean
  initial_deposit?: Dec
}

export interface AutoSaveInput {
  amount: Dec
  frequency: Frequency
  day_of_week?: number | null
  day_of_month?: number | null
}

/* ───────── Circles ───────── */
export interface CollateralOption {
  collateral_bps: number
  collateral_percent: Dec
  collateral: Dec
  contribution: Dec
  contribution_fee: Dec
  reserve_levy: Dec
  per_cycle_total: Dec
  pot: Dec
  payout_fee: Dec
  pot_after_fee: Dec
  earliest_slot: number
  slots_available_from: string
}

export interface CirclePackage {
  id: string
  name: string
  asset: Asset
  members: number
  contribution: Dec
  cycle: string
  house_seats: number
  grace_hours: number
  min_reputation?: number | null
  allow_private?: boolean
  options: CollateralOption[]
}

export type CircleStatus = 'forming' | 'active' | 'completed' | 'cancelled' | 'unwound'
export type SeatType = 'house' | 'real' | 'takeover'
export type SeatStatus = 'open' | 'reserved' | 'active' | 'paid_out' | 'completed' | 'cancelled'

export interface MySeat {
  id: string
  slot: number
  type: SeatType
  status: SeatStatus
  collateral_percent: Dec | null
  collateral_locked: Dec
  owed_for_covered_payments: Dec
  payout_destination: 'wallet' | 'savings'
  exited_at: ISODate | null
  exit_fee: Dec | null
}

export interface CircleSeat {
  slot: number
  type: SeatType
  is_me: boolean
  member: string | null
  status: SeatStatus
}

export type CycleStatus = 'scheduled' | 'collecting' | 'shortfall' | 'paid_out' | 'cancelled'
export interface CircleCycle {
  number: number
  due_at: ISODate
  status: CycleStatus
  pays_slot: number
  paid_count: number
  covered_count: number
  my_contribution: 'paid' | 'covered' | null
}

export interface Circle {
  id: string
  package: string
  status: CircleStatus
  asset: Asset
  members: number
  house_seats: number
  cycle: string
  contribution: Dec
  per_cycle_total: Dec
  pot: Dec
  pot_after_fee: Dec
  late_fee: Dec
  current_cycle: number
  starts_at: ISODate | null
  fill_deadline_at: ISODate
  visibility: 'public' | 'private'
  invite_code: string | null
  is_organiser: boolean
  draw_seed_hash: string | null
  unwind_loss: Dec | null
  my_seat: MySeat | null
  seats?: CircleSeat[]
  cycles?: CircleCycle[]
}

export interface DrawProof {
  seed_hash: string | null
  seed: string | null
  seed_revealed: boolean
  my_draw: { sequence: number; member_id: string; candidate_slots: number[]; slot: number } | null
  algorithm: string
}

export interface ExitQuote {
  asset: Asset
  slot: number
  contributions_paid: number
  contributions_paid_amount: Dec
  exit_fee: Dec
  collateral_held: Dec
  owed_for_covered_payments: Dec
  estimated_return: Dec
  returned_by: ISODate | null
  waitlist_buyers: number
  terms: string
}

export interface WaitlistEntry {
  id: string
  package_id: string
  package: string
  collateral_bps: number
  status: 'waiting' | 'fulfilled' | 'cancelled'
  joined_at: ISODate
}

export interface Takeover {
  seat_id: string
  circle_id: string
  package: string
  slot: number
  members: number
  current_cycle: number
  asset: Asset
  contribution: Dec
  pot: Dec
  catch_up: Dec
  collateral: Dec
  total_to_pay: Dec
}

export interface SeatTransfer {
  id: string
  kind: 'waitlist' | 'swap'
  status: 'pending' | 'completed' | 'declined' | 'cancelled' | 'expired'
  role: 'buyer' | 'seller'
  counterparty: string | null
  circle_id: string
  slot: number
  asset: Asset
  catch_up: Dec | null
  collateral: Dec | null
  seller_refund: Dec | null
  fee: Dec | null
  expires_at: ISODate | null
  completed_at: ISODate | null
}

/* ───────── Reputation ───────── */
export type ReputationBand = 'excellent' | 'good' | 'building' | 'at_risk'
export interface ReputationEvent {
  type: string
  points: number
  score_after: number
  description: string
  created_at: ISODate
}
export interface Reputation {
  score: number
  band: ReputationBand
  version: number
  starting_score: number
  max_score: number
  circles_barred: boolean
  weights: { type: string; points: number; description: string }[]
  recent_events: ReputationEvent[]
  appeal?: string
}

/* ───────── Activity & notifications ───────── */
export interface ActivityEntry {
  id: string
  type: string
  label: string
  direction: 'in' | 'out'
  asset: Asset
  amount: Dec
  balance_after: Dec
  reference: { kind: string; id?: string; plan?: string; tx_hash?: string; circle?: string } | null
  created_at: ISODate
}

export interface Statement {
  member: { id: string; name: string }
  asset: Asset
  from: string
  to: string
  timezone: string
  opening_balance: Dec
  total_in: Dec
  total_out: Dec
  closing_balance: Dec
  entries: ActivityEntry[]
}

export interface AppNotification {
  id: string
  type: string
  category: NotificationCategory
  title: string
  body: string
  details: Record<string, unknown>
  read_at: ISODate | null
  created_at: ISODate
}

/** One page of a cursor-paginated list. */
export interface Page<T> {
  data: T[]
  next_cursor: string | null
}
