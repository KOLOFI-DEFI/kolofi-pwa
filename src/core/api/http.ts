import { ApiError, type ApiConfig, type KolofiApi } from './contract'

/**
 * REST adapter. Route table below is the proposed contract for the backend team;
 * change paths here only — screens talk to `KolofiApi`, never to fetch.
 */
export function createHttpApi(config: ApiConfig): KolofiApi {
  const base = (config.baseUrl ?? '').replace(/\/$/, '')

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await config.getToken?.()
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      let code = 'http_error'
      let message = res.statusText
      try {
        const j = (await res.json()) as { code?: string; message?: string }
        code = j.code ?? code
        message = j.message ?? message
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(res.status, code, message)
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }
  const get = <T,>(p: string) => call<T>('GET', p)
  const post = <T,>(p: string, b?: unknown) => call<T>('POST', p, b ?? {})
  const patch = <T,>(p: string, b: unknown) => call<T>('PATCH', p, b)
  const qs = (o: Record<string, unknown> = {}) => {
    const e = Object.entries(o).filter(([, v]) => v !== undefined)
    return e.length ? `?${new URLSearchParams(e.map(([k, v]) => [k, String(v)]))}` : ''
  }

  return {
    auth: {
      sendOtp: (b) => post('/auth/otp', b),
      verifyOtp: (b) => post('/auth/otp/verify', b),
      verifyIdentity: (b) => post('/kyc/verify', b),
      logout: () => post('/auth/logout'),
    },
    user: { me: () => get('/me'), update: (b) => patch('/me', b) },
    wallet: {
      balance: () => get('/wallet/balance'),
      accounts: () => get('/wallet/accounts'),
      nextPayment: () => get('/wallet/next-payment'),
    },
    banks: { list: () => get('/banks'), resolve: (b) => post('/banks/resolve', b) },
    money: {
      rates: () => get('/rates'),
      deposit: (b) => post('/money/deposits', b),
      withdraw: (b) => post('/money/withdrawals', b),
    },
    save: {
      summary: () => get('/save/summary'),
      goals: () => get('/save/goals'),
      createGoal: (b) => post('/save/goals', b),
      mandate: () => get('/save/mandate'),
      createMandate: (b) => post('/save/mandate', b),
      setMandateActive: (active) => patch('/save/mandate', { active }),
      locked: () => get('/save/locked'),
      lockOptions: () => get('/save/locked/options'),
      lock: (b) => post('/save/locked', b),
      recent: () => get('/save/transactions'),
    },
    circles: {
      mine: () => get('/circles/mine'),
      browse: (f) => get(`/circles${qs(f)}`),
      detail: (id) => get(`/circles/${id}`),
      joinQuote: (id) => get(`/circles/${id}/join-quote`),
      join: ({ circleId, ...b }) => post(`/circles/${circleId}/join`, b),
      payout: (id) => get(`/circles/${id}/payout`),
      movePayout: ({ circleId, to }) => post(`/circles/${circleId}/payout/move`, { to }),
      missed: () => get('/circles/missed-payment'),
      payMissed: ({ id, from }) => post(`/circles/missed-payment/${id}/pay`, { from }),
    },
    trust: { score: () => get('/trust') },
    notifications: { list: () => get('/notifications'), markAllRead: () => post('/notifications/read-all') },
    whatsapp: { prefs: () => get('/whatsapp'), update: (b) => patch('/whatsapp', b) },
  }
}
