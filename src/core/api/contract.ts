import type {
  Account, AppNotification, AutoSaveMandate, BalanceSummary, Bank, Circle, CircleDetail, Frequency, Goal, JoinQuote,
  LockedSaving, LockOption, Minor, MissedPayment, NextPayment, Payout, PotType, Rates, ResolvedAccount, SaveSummary,
  Transaction, TrustScore, User, WhatsAppPrefs,
} from '../types'

/**
 * The API contract both apps code against. The `mock` adapter implements it from fixtures;
 * the `http` adapter maps each method to a REST endpoint (see http.ts for the route table).
 */
export interface KolofiApi {
  auth: {
    sendOtp(input: { phone: string; whatsappReminders: boolean }): Promise<{ requestId: string; expiresIn: number }>
    verifyOtp(input: { requestId: string; code: string }): Promise<{ token: string; isNewUser: boolean }>
    verifyIdentity(input: { method: 'BVN' | 'NIN'; number: string }): Promise<User>
    logout(): Promise<void>
  }
  user: {
    me(): Promise<User>
    update(patch: Partial<Pick<User, 'faceId' | 'email'>>): Promise<User>
  }
  wallet: {
    balance(): Promise<BalanceSummary>
    accounts(): Promise<Account[]>
    nextPayment(): Promise<NextPayment | null>
  }
  banks: {
    list(): Promise<Bank[]>
    resolve(input: { bankId: string; accountNumber: string }): Promise<ResolvedAccount>
  }
  money: {
    rates(): Promise<Rates>
    deposit(input: { source: 'bank'; amountNgnMinor: Minor }): Promise<Transaction>
    withdraw(input: { from: string; amountMinor: Minor; to: 'bank' | 'wallet'; address?: string }): Promise<Transaction>
  }
  save: {
    summary(): Promise<SaveSummary>
    goals(): Promise<Goal[]>
    createGoal(input: { name: string; targetMinor: Minor; amountNgnMinor: Minor; frequency: Frequency; type: PotType }): Promise<Goal>
    mandate(): Promise<AutoSaveMandate | null>
    createMandate(input: { bankId: string; accountNumber: string; amountNgnMinor: Minor; frequency: Frequency }): Promise<AutoSaveMandate>
    setMandateActive(active: boolean): Promise<AutoSaveMandate>
    locked(): Promise<LockedSaving[]>
    lockOptions(): Promise<LockOption[]>
    lock(input: { months: number; amountMinor: Minor }): Promise<LockedSaving>
    recent(): Promise<Transaction[]>
  }
  circles: {
    mine(): Promise<Circle[]>
    browse(filter?: { period?: 'month' | 'week'; maxContributionMinor?: Minor }): Promise<Circle[]>
    detail(id: string): Promise<CircleDetail>
    joinQuote(id: string): Promise<JoinQuote>
    join(input: { circleId: string; depositPct: number; spot: number }): Promise<CircleDetail>
    payout(id: string): Promise<Payout>
    movePayout(input: { circleId: string; to: 'savings' | 'wallet' }): Promise<void>
    missed(): Promise<MissedPayment | null>
    payMissed(input: { id: string; from: 'wallet' | 'bank' }): Promise<void>
  }
  trust: { score(): Promise<TrustScore> }
  notifications: {
    list(): Promise<AppNotification[]>
    markAllRead(): Promise<void>
  }
  whatsapp: {
    prefs(): Promise<WhatsAppPrefs>
    update(patch: Partial<WhatsAppPrefs>): Promise<WhatsAppPrefs>
  }
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export interface ApiConfig {
  mode: 'mock' | 'http'
  baseUrl?: string
  getToken?: () => string | null | Promise<string | null>
  /** mock only: artificial latency in ms */
  latency?: number
}
