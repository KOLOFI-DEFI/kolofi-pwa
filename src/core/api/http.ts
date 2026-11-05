import { ApiError, type ApiConfig, type KolofiApi } from './contract'
import type { Page } from '../types'

const DEVICE = typeof navigator !== 'undefined' ? `web · ${navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d]+/)?.[0] ?? 'browser'}` : 'web'

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`

/** REST adapter for the Kólófi API. Every route lives here; screens only see `KolofiApi`. */
export function createHttpApi(config: ApiConfig): KolofiApi {
  const base = (config.baseUrl ?? '/api/v1').replace(/\/$/, '')

  async function call<T>(method: string, path: string, body?: unknown, opts: { idempotent?: boolean; raw?: boolean } = {}): Promise<T> {
    const token = config.getToken?.()
    let res: Response
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(opts.idempotent ? { 'Idempotency-Key': uuid() } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw new ApiError(0, 'NETWORK', 'We could not reach Kólófi. Check your connection and try again.')
    }

    const json = res.status === 204 ? null : await res.json().catch(() => null)

    if (!res.ok) {
      if (res.status === 401 && token) config.onUnauthorized?.()
      throw toError(res.status, json)
    }

    return (opts.raw ? json : json?.data) as T
  }

  const get = <T,>(p: string) => call<T>('GET', p)
  const post = <T,>(p: string, b: unknown = {}, idempotent = false) => call<T>('POST', p, b, { idempotent })
  const put = <T,>(p: string, b: unknown) => call<T>('PUT', p, b)
  const patch = <T,>(p: string, b: unknown) => call<T>('PATCH', p, b)
  const del = <T,>(p: string) => call<T>('DELETE', p)

  async function page<T>(path: string, cursor?: string | null): Promise<Page<T>> {
    const sep = path.includes('?') ? '&' : '?'
    const json = await call<{ data: T[]; meta?: { next_cursor?: string | null } }>('GET', cursor ? `${path}${sep}cursor=${encodeURIComponent(cursor)}` : path, undefined, { raw: true })
    return { data: json.data, next_cursor: json.meta?.next_cursor ?? null }
  }

  return {
    auth: {
      register: (b) => post('/auth/register', { ...b, device_name: DEVICE }),
      login: (b) => post('/auth/login', { ...b, device_name: DEVICE }),
      logout: () => post('/auth/logout'),
      sendEmailCode: () => post('/auth/email/verification/send'),
      verifyEmail: (code) => post('/auth/email/verification/verify', { code }),
      forgotPassword: (email) => post('/auth/password/forgot', { email }),
      resetPassword: (b) => post('/auth/password/reset', b),
    },
    me: {
      get: () => get('/me'),
      changePassword: (b) => put('/me/password', b),
      setPin: (b) => put('/me/transaction-pin', b),
      sessions: () => get('/me/sessions'),
      revokeSession: (id) => del(`/me/sessions/${id}`),
      revokeOtherSessions: async () => (await del<{ signed_out: number }>('/me/sessions')).signed_out,
      notificationPrefs: () => get('/me/notification-preferences'),
      updateNotificationPrefs: (email) => put('/me/notification-preferences', { email }),
      reputation: () => get('/me/reputation'),
    },
    wallets: {
      get: () => get('/wallets'),
      createAddress: (network) => post('/wallets/addresses', { network }),
      deposits: (cursor) => page('/deposits/crypto', cursor),
    },
    withdrawals: {
      list: (cursor) => page('/withdrawals/crypto', cursor),
      get: (id) => get(`/withdrawals/crypto/${id}`),
      create: (b) => post('/withdrawals/crypto', b, true),
    },
    fees: {
      quote: (q) => get(`/fees/quote?${new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined) as [string, string][])}`),
    },
    meta: {
      features: () => get('/meta/features'),
      rates: () => get('/market/rates'),
    },
    savings: {
      summary: () => get('/savings/summary'),
      rates: () => get('/savings/rates'),
      plans: () => get('/savings/plans'),
      plan: (id) => get(`/savings/plans/${id}`),
      create: (b) => post('/savings/plans', b, true),
      update: (id, b) => patch(`/savings/plans/${id}`, b),
      close: (id) => post(`/savings/plans/${id}/close`),
      movements: (id, cursor) => page(`/savings/plans/${id}/movements`, cursor),
      deposit: (id, amount) => post(`/savings/plans/${id}/deposits`, { amount }, true),
      withdrawalQuote: (id, amount) => post(`/savings/plans/${id}/withdrawals/quote`, { amount }),
      withdraw: (id, amount, pin) => post(`/savings/plans/${id}/withdrawals`, { amount, pin }, true),
      setAutoSave: (id, b) => put(`/savings/plans/${id}/auto-save`, b),
      pauseAutoSave: (id) => post(`/savings/plans/${id}/auto-save/pause`),
      resumeAutoSave: (id) => post(`/savings/plans/${id}/auto-save/resume`),
      cancelAutoSave: (id) => del(`/savings/plans/${id}/auto-save`),
    },
    circles: {
      packages: () => get('/circles/packages'),
      quote: (id, collateral_bps) => post(`/circles/packages/${id}/quote`, { collateral_bps }),
      join: (id, collateral_bps, pin) => post(`/circles/packages/${id}/join`, { collateral_bps, pin }, true),
      createPrivate: (id, collateral_bps, pin) => post(`/circles/packages/${id}/private`, { collateral_bps, pin }, true),
      joinByCode: (invite_code, collateral_bps, pin) => post('/circles/join-by-code', { invite_code, collateral_bps, pin }, true),
      mine: () => get('/circles'),
      get: (id) => get(`/circles/${id}`),
      draw: (id) => get(`/circles/${id}/draw`),
      leave: (id, pin) => post(`/circles/${id}/leave`, { pin }, true),
      exitQuote: (id) => post(`/circles/${id}/exit/quote`),
      exit: (id, pin, reason) => post(`/circles/${id}/exit`, { pin, reason }, true),
      topUp: (id, pin) => post(`/circles/${id}/collateral/top-up`, { pin }, true),
      setPayoutDestination: (id, b) => patch(`/circles/${id}/payout-destination`, b),
      waitlist: () => get('/circles/waitlist'),
      joinWaitlist: (id, collateral_bps) => post(`/circles/packages/${id}/waitlist`, { collateral_bps }),
      leaveWaitlist: (id) => del(`/circles/packages/${id}/waitlist`),
      takeovers: () => get('/circles/takeovers'),
      buyTakeover: (seatId, pin) => post(`/circles/takeovers/${seatId}/buy`, { pin }, true),
      transfers: () => get('/circles/transfers'),
      offerSeat: (circleId, email, pin) => post(`/circles/${circleId}/transfer`, { email, pin }, true),
      acceptTransfer: (id, collateral_bps, pin) => post(`/circles/transfers/${id}/accept`, { collateral_bps, pin }, true),
      closeTransfer: (id) => post(`/circles/transfers/${id}/close`),
    },
    activity: {
      list: (cursor) => page('/activity', cursor),
      statement: (from, to) => get(`/statements?from=${from}&to=${to}`),
    },
    notifications: {
      list: (cursor) => page('/notifications', cursor),
      unreadCount: async () => (await get<{ unread: number }>('/notifications/unread-count')).unread,
      markRead: (id) => post(`/notifications/${id}/read`),
      markAllRead: () => post('/notifications/read-all'),
    },
  }
}

/** Turn any API error body into an ApiError: `{error:{code,message}}`, Laravel validation, or plain `{message}`. */
function toError(status: number, json: unknown): ApiError {
  const body = (json ?? {}) as { error?: { code?: string; message?: string }; message?: string; errors?: Record<string, string[]> }

  if (body.error) {
    return new ApiError(status, body.error.code ?? 'ERROR', body.error.message ?? 'Something went wrong.')
  }

  if (status === 422 && body.errors) {
    const first = Object.values(body.errors)[0]?.[0]
    return new ApiError(status, 'VALIDATION', first ?? body.message ?? 'Check the highlighted fields.', body.errors)
  }

  if (status === 429) {
    return new ApiError(status, 'TOO_MANY_ATTEMPTS', 'Too many attempts. Wait a minute and try again.')
  }

  if (status === 401) {
    return new ApiError(status, 'UNAUTHENTICATED', 'Your session has ended. Log in again.')
  }

  return new ApiError(status, 'ERROR', body.message ?? 'Something went wrong. Please try again.')
}
