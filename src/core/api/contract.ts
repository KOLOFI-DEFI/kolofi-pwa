import type {
  ActivityEntry, AppNotification, AuthResult, AutoSave, AutoSaveInput, Circle, CirclePackage, CollateralOption, CreatePlanInput,
  CryptoDeposit, CryptoWithdrawal, Dec, DrawProof, ExitQuote, Feature, FeeQuote, MarketRates, Network, NotificationPrefs, Page,
  Reputation, SavingsMovement, SavingsPlan, SavingsRates, SavingsSummary, SeatTransfer, Session, Statement, Takeover, User,
  WaitlistEntry, WalletAddress, Wallets, WithdrawalQuote,
} from '../types'

/**
 * The client contract for the Kólófi API (`/api/v1`). The `http` adapter maps each method to its route;
 * the `mock` adapter serves the same shapes from memory so the app runs without a backend.
 * Every method returns the response's `data`; paginated lists return a `Page`.
 */
export interface KolofiApi {
  auth: {
    register(input: { first_name: string; last_name: string; email: string; phone: string; password: string; password_confirmation: string }): Promise<AuthResult>
    login(input: { email: string; password: string }): Promise<AuthResult>
    logout(): Promise<void>
    sendEmailCode(): Promise<void>
    verifyEmail(code: string): Promise<{ email_verified: boolean }>
    forgotPassword(email: string): Promise<{ message: string }>
    resetPassword(input: { email: string; code: string; password: string; password_confirmation: string }): Promise<{ withdrawals_held_until: string | null }>
  }
  me: {
    get(): Promise<User>
    changePassword(input: { current_password: string; password: string; password_confirmation: string }): Promise<void>
    setPin(input: { password: string; pin: string; pin_confirmation: string }): Promise<void>
    sessions(): Promise<Session[]>
    revokeSession(id: number): Promise<void>
    revokeOtherSessions(): Promise<number>
    notificationPrefs(): Promise<NotificationPrefs>
    updateNotificationPrefs(email: Partial<NotificationPrefs['email']>): Promise<NotificationPrefs>
    reputation(): Promise<Reputation>
  }
  wallets: {
    get(): Promise<Wallets>
    createAddress(network: Network): Promise<WalletAddress>
    deposits(cursor?: string | null): Promise<Page<CryptoDeposit>>
  }
  withdrawals: {
    list(cursor?: string | null): Promise<Page<CryptoWithdrawal>>
    get(id: string): Promise<CryptoWithdrawal>
    create(input: { asset: 'usdt'; network: Network; address: string; amount: Dec; pin: string }): Promise<CryptoWithdrawal>
  }
  fees: {
    quote(input: { event: string; asset: 'usdt'; network?: Network; amount: Dec }): Promise<FeeQuote>
  }
  meta: {
    features(): Promise<Feature[]>
    rates(): Promise<MarketRates>
  }
  savings: {
    summary(): Promise<SavingsSummary>
    rates(): Promise<SavingsRates>
    plans(): Promise<SavingsPlan[]>
    plan(id: string): Promise<SavingsPlan>
    create(input: CreatePlanInput): Promise<SavingsPlan>
    update(id: string, patch: { name?: string; target_amount?: Dec | null; target_date?: string; auto_renew?: boolean }): Promise<SavingsPlan>
    close(id: string): Promise<SavingsPlan>
    movements(id: string, cursor?: string | null): Promise<Page<SavingsMovement>>
    deposit(id: string, amount: Dec): Promise<{ movement: SavingsMovement; plan: SavingsPlan }>
    withdrawalQuote(id: string, amount: Dec): Promise<WithdrawalQuote>
    withdraw(id: string, amount: Dec, pin: string): Promise<{ movement: SavingsMovement; plan: SavingsPlan }>
    setAutoSave(id: string, input: AutoSaveInput): Promise<AutoSave>
    pauseAutoSave(id: string): Promise<AutoSave>
    resumeAutoSave(id: string): Promise<AutoSave>
    cancelAutoSave(id: string): Promise<void>
  }
  circles: {
    packages(): Promise<CirclePackage[]>
    quote(packageId: string, collateralBps: number): Promise<CollateralOption>
    join(packageId: string, collateralBps: number, pin: string): Promise<Circle>
    createPrivate(packageId: string, collateralBps: number, pin: string): Promise<Circle>
    joinByCode(inviteCode: string, collateralBps: number, pin: string): Promise<Circle>
    mine(): Promise<Circle[]>
    get(id: string): Promise<Circle>
    draw(id: string): Promise<DrawProof>
    leave(id: string, pin: string): Promise<void>
    exitQuote(id: string): Promise<ExitQuote>
    exit(id: string, pin: string, reason?: string): Promise<Circle>
    topUp(id: string, pin: string): Promise<{ topped_up: Dec }>
    setPayoutDestination(id: string, input: { destination: 'wallet' | 'savings'; savings_plan_id?: string | null; pin: string }): Promise<Circle>
    waitlist(): Promise<WaitlistEntry[]>
    joinWaitlist(packageId: string, collateralBps: number): Promise<WaitlistEntry>
    leaveWaitlist(packageId: string): Promise<void>
    takeovers(): Promise<Takeover[]>
    buyTakeover(seatId: string, pin: string): Promise<SeatTransfer>
    transfers(): Promise<SeatTransfer[]>
    offerSeat(circleId: string, email: string, pin: string): Promise<SeatTransfer>
    acceptTransfer(id: string, collateralBps: number, pin: string): Promise<SeatTransfer>
    closeTransfer(id: string): Promise<SeatTransfer>
  }
  activity: {
    list(cursor?: string | null): Promise<Page<ActivityEntry>>
    statement(from: string, to: string): Promise<Statement>
  }
  notifications: {
    list(cursor?: string | null): Promise<Page<AppNotification>>
    unreadCount(): Promise<number>
    markRead(id: string): Promise<void>
    markAllRead(): Promise<void>
  }
}

/**
 * Any API failure. `code` is the API's stable error code (e.g. `INSUFFICIENT_BALANCE`, `INVALID_PIN`),
 * `VALIDATION` for field errors (see `fields`), or `NETWORK` when the request never reached the server.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string[]> = {},
  ) {
    super(message)
  }

  /** First error for a form field, if any. */
  field(name: string): string | undefined {
    return this.fields[name]?.[0]
  }
}

export interface ApiConfig {
  mode: 'mock' | 'http'
  /** Root of the API, e.g. `https://api.kolofi.ng/api/v1` or `/api/v1` behind the dev proxy. */
  baseUrl?: string
  getToken?: () => string | null
  /** Called on any 401 so the app can sign the member out. */
  onUnauthorized?: () => void
  /** mock only: artificial latency in ms */
  latency?: number
}
