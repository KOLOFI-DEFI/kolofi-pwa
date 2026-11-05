/**
 * TanStack Query hooks over KolofiApi. Shared by both apps; each app calls `setApi()` once at startup.
 * Screens import these hooks only — never an adapter.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { KolofiApi } from './api/contract'
import type { Frequency, Minor, PotType, WhatsAppPrefs } from './types'

let api: KolofiApi | null = null
export function setApi(instance: KolofiApi) {
  api = instance
}
export function getApi(): KolofiApi {
  if (!api) throw new Error('setApi() must be called before using data hooks')
  return api
}

export const qk = {
  me: ['me'] as const,
  balance: ['wallet', 'balance'] as const,
  accounts: ['wallet', 'accounts'] as const,
  nextPayment: ['wallet', 'next-payment'] as const,
  banks: ['banks'] as const,
  rates: ['rates'] as const,
  saveSummary: ['save', 'summary'] as const,
  goals: ['save', 'goals'] as const,
  mandate: ['save', 'mandate'] as const,
  locked: ['save', 'locked'] as const,
  lockOptions: ['save', 'lock-options'] as const,
  recent: ['save', 'recent'] as const,
  myCircles: ['circles', 'mine'] as const,
  browse: (f?: object) => ['circles', 'browse', f ?? {}] as const,
  circle: (id: string) => ['circles', id] as const,
  joinQuote: (id: string) => ['circles', id, 'join-quote'] as const,
  payout: (id: string) => ['circles', id, 'payout'] as const,
  missed: ['circles', 'missed'] as const,
  trust: ['trust'] as const,
  notifications: ['notifications'] as const,
  whatsapp: ['whatsapp'] as const,
}

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: () => getApi().user.me() })
export const useBalance = () => useQuery({ queryKey: qk.balance, queryFn: () => getApi().wallet.balance() })
export const useAccounts = () => useQuery({ queryKey: qk.accounts, queryFn: () => getApi().wallet.accounts() })
export const useNextPayment = () => useQuery({ queryKey: qk.nextPayment, queryFn: () => getApi().wallet.nextPayment() })
export const useBanks = () => useQuery({ queryKey: qk.banks, queryFn: () => getApi().banks.list(), staleTime: Infinity })
export const useRates = () => useQuery({ queryKey: qk.rates, queryFn: () => getApi().money.rates(), staleTime: 60_000 })
export const useSaveSummary = () => useQuery({ queryKey: qk.saveSummary, queryFn: () => getApi().save.summary() })
export const useGoals = () => useQuery({ queryKey: qk.goals, queryFn: () => getApi().save.goals() })
export const useMandate = () => useQuery({ queryKey: qk.mandate, queryFn: () => getApi().save.mandate() })
export const useLocked = () => useQuery({ queryKey: qk.locked, queryFn: () => getApi().save.locked() })
export const useLockOptions = () => useQuery({ queryKey: qk.lockOptions, queryFn: () => getApi().save.lockOptions() })
export const useRecent = () => useQuery({ queryKey: qk.recent, queryFn: () => getApi().save.recent() })
export const useMyCircles = () => useQuery({ queryKey: qk.myCircles, queryFn: () => getApi().circles.mine() })
export const useBrowseCircles = (f?: { period?: 'month' | 'week'; maxContributionMinor?: Minor }) =>
  useQuery({ queryKey: qk.browse(f), queryFn: () => getApi().circles.browse(f) })
export const useCircle = (id: string) => useQuery({ queryKey: qk.circle(id), queryFn: () => getApi().circles.detail(id) })
export const useJoinQuote = (id: string) => useQuery({ queryKey: qk.joinQuote(id), queryFn: () => getApi().circles.joinQuote(id) })
export const usePayout = (id: string) => useQuery({ queryKey: qk.payout(id), queryFn: () => getApi().circles.payout(id) })
export const useMissed = () => useQuery({ queryKey: qk.missed, queryFn: () => getApi().circles.missed() })
export const useTrust = () => useQuery({ queryKey: qk.trust, queryFn: () => getApi().trust.score() })
export const useNotifications = () => useQuery({ queryKey: qk.notifications, queryFn: () => getApi().notifications.list() })
export const useWhatsApp = () => useQuery({ queryKey: qk.whatsapp, queryFn: () => getApi().whatsapp.prefs() })

export const useResolveAccount = () =>
  useMutation({ mutationFn: (v: { bankId: string; accountNumber: string }) => getApi().banks.resolve(v) })

export const useSendOtp = () => useMutation({ mutationFn: (v: { phone: string; whatsappReminders: boolean }) => getApi().auth.sendOtp(v) })
export const useVerifyOtp = () => useMutation({ mutationFn: (v: { requestId: string; code: string }) => getApi().auth.verifyOtp(v) })
export function useVerifyIdentity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { method: 'BVN' | 'NIN'; number: string }) => getApi().auth.verifyIdentity(v),
    onSuccess: (u) => qc.setQueryData(qk.me, u),
  })
}

export function useCreateMandate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { bankId: string; accountNumber: string; amountNgnMinor: Minor; frequency: Frequency }) => getApi().save.createMandate(v),
    onSuccess: (m) => qc.setQueryData(qk.mandate, m),
  })
}
export function useToggleMandate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (active: boolean) => getApi().save.setMandateActive(active),
    onSuccess: (m) => qc.setQueryData(qk.mandate, m),
  })
}
export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { name: string; targetMinor: Minor; amountNgnMinor: Minor; frequency: Frequency; type: PotType }) => getApi().save.createGoal(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals }),
  })
}
export function useLock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { months: number; amountMinor: Minor }) => getApi().save.lock(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.locked }),
  })
}
export function useDeposit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (amountNgnMinor: Minor) => getApi().money.deposit({ source: 'bank', amountNgnMinor }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallet'] }),
  })
}
export function useWithdraw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { from: string; amountMinor: Minor; to: 'bank' | 'wallet'; address?: string }) => getApi().money.withdraw(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallet'] }),
  })
}
export function useJoinCircle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { circleId: string; depositPct: number; spot: number }) => getApi().circles.join(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.myCircles }),
  })
}
export const useMovePayout = () =>
  useMutation({ mutationFn: (v: { circleId: string; to: 'savings' | 'wallet' }) => getApi().circles.movePayout(v) })
export const usePayMissed = () => useMutation({ mutationFn: (v: { id: string; from: 'wallet' | 'bank' }) => getApi().circles.payMissed(v) })
export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => getApi().notifications.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  })
}
export function useUpdateWhatsApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<WhatsAppPrefs>) => getApi().whatsapp.update(patch),
    onMutate: (patch) => {
      const prev = qc.getQueryData<WhatsAppPrefs>(qk.whatsapp)
      if (prev) qc.setQueryData(qk.whatsapp, { ...prev, ...patch })
    },
  })
}
export function useUpdateMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { faceId?: boolean }) => getApi().user.update(patch),
    onSuccess: (u) => qc.setQueryData(qk.me, u),
  })
}
