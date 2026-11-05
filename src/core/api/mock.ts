import { ApiError, type ApiConfig, type KolofiApi } from './contract'
import * as fx from './fixtures'
import { firstDebitDate, ngnToUsdt, projectGoal } from '../format'
import type { CircleDetail, Goal, Transaction, User } from '../types'

const clone = <T,>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T))

/** In-memory backend that serves the design data. State lives for the life of the app session. */
export function createMockApi(config: Pick<ApiConfig, 'latency'> = {}): KolofiApi {
  const latency = config.latency ?? 250
  const wait = <T,>(v: T): Promise<T> => new Promise((res) => setTimeout(() => res(clone(v)), latency))

  const db = {
    user: clone(fx.user) as User,
    mandate: clone(fx.mandate),
    goals: clone(fx.goals),
    locked: clone(fx.locked),
    notifications: clone(fx.notifications),
    whatsapp: clone(fx.whatsapp),
    myCircles: clone(fx.myCircles),
    missed: { ...clone(fx.missed), graceEndsAt: new Date(Date.now() + (47 * 3600 + 12 * 60 + 9) * 1000).toISOString() },
    otp: new Map<string, string>(),
  }

  const tx = (partial: Omit<Transaction, 'id' | 'hash' | 'date'>): Transaction => ({
    id: `tx_${Math.random().toString(36).slice(2, 9)}`,
    hash: `0x${Math.random().toString(16).slice(2, 14)}`,
    date: new Date().toISOString(),
    ...partial,
  })

  return {
    auth: {
      async sendOtp({ phone }) {
        if (!/^\+234\d{10}$/.test(phone)) throw new ApiError(422, 'invalid_phone', 'Enter a valid Nigerian number')
        const requestId = `otp_${Date.now()}`
        db.otp.set(requestId, '123456')
        return wait({ requestId, expiresIn: 60 })
      },
      async verifyOtp({ requestId, code }) {
        if (db.otp.get(requestId) !== code && code !== '000000') throw new ApiError(401, 'bad_code', 'That code is not right')
        return wait({ token: 'mock-token', isNewUser: true })
      },
      async verifyIdentity({ method, number }) {
        if (number.replace(/\D/g, '').length !== 11) throw new ApiError(422, 'invalid_id', `${method} must be 11 digits`)
        db.user.kyc = { verified: true, method }
        return wait(db.user)
      },
      async logout() {
        return wait(undefined)
      },
    },
    user: {
      me: async () => wait(db.user),
      async update(patch) {
        Object.assign(db.user, patch)
        return wait(db.user)
      },
    },
    wallet: {
      balance: async () => wait(fx.balance),
      accounts: async () => wait(fx.accounts),
      nextPayment: async () => wait(fx.nextPayment),
    },
    banks: {
      list: async () => wait(fx.banks),
      async resolve({ bankId, accountNumber }) {
        if (accountNumber.replace(/\D/g, '').length !== 10) throw new ApiError(422, 'invalid_account', 'Account number is 10 digits')
        return wait({ bankId, accountNumber, accountName: 'ADAEZE OKAFOR' })
      },
    },
    money: {
      rates: async () => wait(fx.rates),
      async deposit({ amountNgnMinor }) {
        const net = amountNgnMinor - fx.rates.conversionFeeNgnMinor
        return wait(tx({ kind: 'deposit', title: 'Added from GTBank', amountMinor: ngnToUsdt(net, fx.rates.ngnPerUsdt) }))
      },
      async withdraw({ amountMinor }) {
        if (amountMinor > fx.accounts[0]!.balanceMinor) throw new ApiError(422, 'insufficient', 'Not enough in Deposit')
        return wait(tx({ kind: 'withdraw', title: 'Withdraw', amountMinor: -amountMinor }))
      },
    },
    save: {
      summary: async () => wait(fx.saveSummary),
      goals: async () => wait(db.goals),
      async createGoal({ name, targetMinor, amountNgnMinor, frequency, type }) {
        const per = ngnToUsdt(amountNgnMinor, fx.rates.ngnPerUsdt)
        const goal: Goal = {
          id: `goal_${Date.now()}`, name, targetMinor, savedMinor: 0, type,
          by: projectGoal(targetMinor, per, frequency, firstDebitDate(frequency, new Date(fx.MOCK_TODAY))),
        }
        db.goals.push(goal)
        return wait(goal)
      },
      mandate: async () => wait(db.mandate),
      async createMandate({ bankId, accountNumber, amountNgnMinor, frequency }) {
        const bank = fx.banks.find((b) => b.id === bankId) ?? fx.banks[0]!
        db.mandate = { ...db.mandate, bankId, bankName: bank.name, accountLast4: accountNumber.slice(-4), amountNgnMinor, frequency, active: true }
        return wait(db.mandate)
      },
      async setMandateActive(active) {
        db.mandate.active = active
        return wait(db.mandate)
      },
      locked: async () => wait(db.locked),
      lockOptions: async () => wait(fx.lockOptions),
      async lock({ months, amountMinor }) {
        const l = { ...db.locked[0]!, id: `lck_${Date.now()}`, months, amountMinor, elapsedMonths: 0, interestMinor: 0 }
        db.locked.push(l)
        return wait(l)
      },
      recent: async () => wait(fx.recent),
    },
    circles: {
      mine: async () => wait(db.myCircles),
      async browse(filter) {
        let list = fx.browseCircles
        if (filter?.period) list = list.filter((c) => c.period === filter.period)
        if (filter?.maxContributionMinor) list = list.filter((c) => c.contributionMinor < filter.maxContributionMinor!)
        return wait(list)
      },
      async detail(id) {
        const c = db.myCircles.find((x) => x.id === id) as CircleDetail | undefined
        if (!c) throw new ApiError(404, 'not_found', 'Circle not found')
        return wait(c)
      },
      async joinQuote(id) {
        const q = fx.joinQuotes[id] ?? { ...fx.joinQuotes['monthly-10']!, circle: fx.browseCircles.find((c) => c.id === id) ?? fx.browseCircles[0]! }
        return wait(q)
      },
      async join({ circleId }) {
        const base = fx.browseCircles.find((c) => c.id === circleId)
        if (!base) throw new ApiError(404, 'not_found', 'Circle not found')
        return wait(fx.yabaTech)
      },
      payout: async () => wait(fx.payout),
      movePayout: async () => wait(undefined),
      missed: async () => wait(db.missed),
      async payMissed() {
        return wait(undefined)
      },
    },
    trust: { score: async () => wait(fx.trust) },
    notifications: {
      list: async () => wait(db.notifications),
      async markAllRead() {
        db.notifications.forEach((n) => (n.read = true))
        return wait(undefined)
      },
    },
    whatsapp: {
      prefs: async () => wait(db.whatsapp),
      async update(patch) {
        Object.assign(db.whatsapp, patch)
        return wait(db.whatsapp)
      },
    },
  }
}
