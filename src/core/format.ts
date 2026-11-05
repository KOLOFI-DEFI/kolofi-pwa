import type { Minor } from './types'

const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export const toMinor = (major: number): Minor => Math.round(major * 100)
export const toMajor = (minor: Minor): number => minor / 100

/** 238260 -> "2,382.60" */
export function usdt(minor: Minor, opts: { decimals?: 0 | 2; sign?: boolean } = {}): string {
  const { decimals = 2, sign = false } = opts
  const v = Math.abs(minor) / 100
  const body = decimals === 0 ? nf0.format(v) : nf2.format(v)
  if (minor < 0) return `-${body}`
  return sign ? `+${body}` : body
}

/** 238260 -> ["2,382", ".60"] — serif balances render the decimal part muted. */
export function splitUsdt(minor: Minor): [string, string] {
  const [int, dec = '00'] = usdt(minor).split('.')
  return [int ?? '0', `.${dec}`]
}

/** Naira from kobo. compact: 2000000 -> "₦20k", 180000000 -> "₦1.8M" */
export function ngn(minor: Minor, opts: { compact?: boolean } = {}): string {
  const v = Math.abs(minor) / 100
  const s = minor < 0 ? '-' : ''
  if (opts.compact) {
    if (v >= 1_000_000) return `${s}₦${trim(v / 1_000_000)}M`
    if (v >= 1_000) return `${s}₦${trim(v / 1_000)}k`
  }
  return `${s}₦${nf0.format(v)}`
}
const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''))

/** USDT cents → kobo at a ₦/USDT rate */
export const usdtToNgn = (usdtMinor: Minor, rate: number): Minor => Math.round(usdtMinor * rate)
/** kobo → USDT cents at a ₦/USDT rate */
export const ngnToUsdt = (ngnMinor: Minor, rate: number): Minor => Math.round(ngnMinor / rate)

/** 0x7a2c91F4…3b0ef31b → "0x7a2c…f31b" */
export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}

/** 8034127790 → "803 412 7790" */
export function groupPhone(local: string): string {
  const d = local.replace(/\D/g, '').slice(0, 10)
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(' ')
}
/** +2348034127790 → "+234 803 412 7790" */
export function formatE164NG(e164: string): string {
  return `+234 ${groupPhone(e164.replace(/^\+234/, ''))}`
}

/** "22345517518" → "2234 5517 518" */
export function groupDigits(v: string, size = 4): string {
  const d = v.replace(/\D/g, '')
  return d.replace(new RegExp(`(.{${size}})(?=.)`, 'g'), '$1 ')
}

/** ms → "47:12:09" */
export function countdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dt = (iso: string) => new Date(iso)

/** "Nov 1" */
export const monthDay = (iso: string) => `${MONTHS[dt(iso).getUTCMonth()]} ${dt(iso).getUTCDate()}`
/** "Mar 12, 2027" */
export const fullDate = (iso: string) => `${monthDay(iso)}, ${dt(iso).getUTCFullYear()}`
/** "Sep 2027" */
export const monthYear = (iso: string) => `${MONTHS[dt(iso).getUTCMonth()]} ${dt(iso).getUTCFullYear()}`
/** "Mon" */
export const weekday = (iso: string) => DAYS[dt(iso).getUTCDay()]!
/** "Friday" */
export const weekdayLong = (iso: string) => DAYS_LONG[dt(iso).getUTCDay()]!
/** "Fri, Nov 6" */
export const dayMonthDay = (iso: string) => `${weekday(iso)}, ${monthDay(iso)}`
/** "9:02" */
export const clock = (iso: string) => {
  const x = dt(iso)
  return `${x.getUTCHours()}:${String(x.getUTCMinutes()).padStart(2, '0')}`
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((dt(toIso).getTime() - dt(fromIso).getTime()) / 86_400_000)
}

export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const pad2 = (n: number) => String(n).padStart(2, '0')
export const initials = (first: string, last: string) => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()

/** Date a goal is reached with a fixed contribution per period, counting from the first debit. */
export function projectGoal(targetMinor: Minor, perContributionMinor: Minor, frequency: 'daily' | 'weekly' | 'monthly', firstDebit: Date): string {
  if (perContributionMinor <= 0) return firstDebit.toISOString()
  const periods = Math.ceil(targetMinor / perContributionMinor)
  const d = new Date(firstDebit)
  if (frequency === 'monthly') d.setUTCMonth(d.getUTCMonth() + periods)
  else d.setUTCDate(d.getUTCDate() + periods * (frequency === 'daily' ? 1 : 7))
  return d.toISOString()
}

/** Next debit date for a new mandate: daily → tomorrow, weekly → next Friday, monthly → 1st of next month */
export function firstDebitDate(frequency: 'daily' | 'weekly' | 'monthly', today: Date): Date {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  if (frequency === 'daily') d.setUTCDate(d.getUTCDate() + 1)
  else if (frequency === 'weekly') d.setUTCDate(d.getUTCDate() + (((5 - d.getUTCDay() + 7) % 7) || 7) + 7)
  else d.setUTCMonth(d.getUTCMonth() + 1, 1)
  return d
}

export const perMonth = { daily: 30, weekly: 4.33, monthly: 1 } as const
