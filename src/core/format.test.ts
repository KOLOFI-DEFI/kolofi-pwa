import { describe, expect, it } from 'vitest'
import { countdown, firstDebitDate, fullDate, groupDigits, groupPhone, ngn, ngnToUsdt, projectGoal, shortAddress, splitUsdt, usdt } from './format'
import { createMockApi } from './api/mock'

describe('format', () => {
  it('formats USDT', () => {
    expect(usdt(238260)).toBe('2,382.60')
    expect(usdt(1842, { sign: true })).toBe('+18.42')
    expect(usdt(-3220)).toBe('-32.20')
    expect(splitUsdt(238260)).toEqual(['2,382', '.60'])
  })
  it('formats Naira', () => {
    expect(ngn(357390000)).toBe('₦3,573,900')
    expect(ngn(2000000, { compact: true })).toBe('₦20k')
    expect(ngn(180000000, { compact: true })).toBe('₦1.8M')
  })
  it('converts at the design rate', () => {
    expect(ngnToUsdt(2000000, 1500)).toBe(1333)
    expect(ngnToUsdt(5000000, 1500)).toBe(3333)
  })
  it('shortens addresses and groups digits', () => {
    expect(shortAddress('0x7a2c91F4d2E86a1c5B9e07A4f3D2c8b13b0ef31b')).toBe('0x7a2c…f31b')
    expect(groupPhone('8034127790')).toBe('803 412 7790')
    expect(groupDigits('22345517518')).toBe('2234 5517 518')
  })
  it('formats a countdown', () => {
    expect(countdown((47 * 3600 + 12 * 60 + 9) * 1000)).toBe('47:12:09')
    expect(countdown(-5)).toBe('00:00:00')
  })
  it('projects the new-goal date from the design (1,200 USDT at ₦20k weekly → Aug 2028)', () => {
    const first = firstDebitDate('weekly', new Date('2026-10-27T09:41:00Z'))
    expect(fullDate(first.toISOString())).toBe('Nov 6, 2026')
    const iso = projectGoal(120000, 1333, 'weekly', first)
    expect(iso.startsWith('2028-08')).toBe(true)
  })
})

describe('mock api', () => {
  const api = createMockApi({ latency: 0 })
  it('serves the design balance', async () => {
    const b = await api.wallet.balance()
    expect(b.totalMinor).toBe(238260)
  })
  it('rejects a short BVN', async () => {
    await expect(api.auth.verifyIdentity({ method: 'BVN', number: '123' })).rejects.toThrow()
  })
  it('marks notifications read', async () => {
    await api.notifications.markAllRead()
    expect((await api.notifications.list()).every((n) => n.read)).toBe(true)
  })
})
