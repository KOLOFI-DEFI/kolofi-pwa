/**
 * TanStack Query hooks over KolofiApi. Each app calls `setApi()` once at startup.
 * Screens import these hooks only — never an adapter. Mutations refresh every query they can change.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { KolofiApi } from './api/contract'
import type { AutoSaveInput, CreatePlanInput, Dec, Network, NotificationPrefs, Page } from './types'

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
  sessions: ['me', 'sessions'] as const,
  prefs: ['me', 'notification-prefs'] as const,
  reputation: ['me', 'reputation'] as const,
  wallets: ['wallets'] as const,
  deposits: ['wallets', 'deposits'] as const,
  withdrawals: ['withdrawals'] as const,
  withdrawal: (id: string) => ['withdrawals', id] as const,
  feeQuote: (q: object) => ['fees', q] as const,
  features: ['meta', 'features'] as const,
  rates: ['meta', 'rates'] as const,
  savingsSummary: ['savings', 'summary'] as const,
  savingsRates: ['savings', 'rates'] as const,
  plans: ['savings', 'plans'] as const,
  plan: (id: string) => ['savings', 'plans', id] as const,
  movements: (id: string) => ['savings', 'plans', id, 'movements'] as const,
  packages: ['circles', 'packages'] as const,
  quote: (id: string, bps: number) => ['circles', 'packages', id, bps] as const,
  circles: ['circles', 'mine'] as const,
  circle: (id: string) => ['circles', 'detail', id] as const,
  draw: (id: string) => ['circles', 'detail', id, 'draw'] as const,
  exitQuote: (id: string) => ['circles', 'detail', id, 'exit-quote'] as const,
  waitlist: ['circles', 'waitlist'] as const,
  takeovers: ['circles', 'takeovers'] as const,
  transfers: ['circles', 'transfers'] as const,
  activity: ['activity'] as const,
  statement: (from: string, to: string) => ['activity', 'statement', from, to] as const,
  notifications: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
}

/** Anything that moves money can change these. */
const refreshMoney = (qc: QueryClient) =>
  Promise.all(['wallets', 'savings', 'circles', 'activity', 'withdrawals', 'notifications'].map((k) => qc.invalidateQueries({ queryKey: [k] })))

const flat = <T,>(pages: Page<T>[] | undefined) => pages?.flatMap((p) => p.data)
function usePaged<T>(key: readonly unknown[], fetch: (cursor: string | null) => Promise<Page<T>>, enabled = true) {
  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fetch(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    enabled,
  })
  return { ...q, items: flat(q.data?.pages) }
}

/* ───────── Reads ───────── */
export const useMe = (enabled = true) => useQuery({ queryKey: qk.me, queryFn: () => getApi().me.get(), enabled })
export const useSessions = () => useQuery({ queryKey: qk.sessions, queryFn: () => getApi().me.sessions() })
export const useNotificationPrefs = () => useQuery({ queryKey: qk.prefs, queryFn: () => getApi().me.notificationPrefs() })
export const useReputation = () => useQuery({ queryKey: qk.reputation, queryFn: () => getApi().me.reputation() })
export const useWallets = () => useQuery({ queryKey: qk.wallets, queryFn: () => getApi().wallets.get() })
export const useDeposits = () => usePaged(qk.deposits, (c) => getApi().wallets.deposits(c))
export const useWithdrawals = () => usePaged(qk.withdrawals, (c) => getApi().withdrawals.list(c))
/** Polls every 15s while the withdrawal is still moving. */
export const useWithdrawal = (id: string) =>
  useQuery({
    queryKey: qk.withdrawal(id),
    queryFn: () => getApi().withdrawals.get(id),
    refetchInterval: (q) => (['pending', 'processing', 'unknown'].includes(q.state.data?.status ?? '') ? 15_000 : false),
  })
export const useFeeQuote = (q: { event: string; asset: 'usdt'; network?: Network; amount: Dec }, enabled = true) =>
  useQuery({ queryKey: qk.feeQuote(q), queryFn: () => getApi().fees.quote(q), enabled, staleTime: 60_000, placeholderData: (prev) => prev })
export const useFeatures = () => useQuery({ queryKey: qk.features, queryFn: () => getApi().meta.features(), staleTime: Infinity })
export const useMarketRates = () => useQuery({ queryKey: qk.rates, queryFn: () => getApi().meta.rates(), staleTime: 5 * 60_000 })
export const useSavingsSummary = () => useQuery({ queryKey: qk.savingsSummary, queryFn: () => getApi().savings.summary() })
export const useSavingsRates = () => useQuery({ queryKey: qk.savingsRates, queryFn: () => getApi().savings.rates(), staleTime: 10 * 60_000 })
export const usePlans = () => useQuery({ queryKey: qk.plans, queryFn: () => getApi().savings.plans() })
export const usePlan = (id: string) => useQuery({ queryKey: qk.plan(id), queryFn: () => getApi().savings.plan(id) })
export const useMovements = (id: string) => usePaged(qk.movements(id), (c) => getApi().savings.movements(id, c))
export const usePackages = () => useQuery({ queryKey: qk.packages, queryFn: () => getApi().circles.packages() })
export const useCircleQuote = (id: string, bps: number | null) =>
  useQuery({ queryKey: qk.quote(id, bps ?? 0), queryFn: () => getApi().circles.quote(id, bps!), enabled: !!id && bps !== null })
export const useMyCircles = () => useQuery({ queryKey: qk.circles, queryFn: () => getApi().circles.mine() })
export const useCircle = (id: string) => useQuery({ queryKey: qk.circle(id), queryFn: () => getApi().circles.get(id) })
export const useDraw = (id: string, enabled = true) => useQuery({ queryKey: qk.draw(id), queryFn: () => getApi().circles.draw(id), enabled })
export const useExitQuote = (id: string, enabled = true) => useQuery({ queryKey: qk.exitQuote(id), queryFn: () => getApi().circles.exitQuote(id), enabled, retry: false })
export const useWaitlist = () => useQuery({ queryKey: qk.waitlist, queryFn: () => getApi().circles.waitlist() })
export const useTakeovers = () => useQuery({ queryKey: qk.takeovers, queryFn: () => getApi().circles.takeovers() })
export const useTransfers = () => useQuery({ queryKey: qk.transfers, queryFn: () => getApi().circles.transfers() })
export const useActivity = () => usePaged(qk.activity, (c) => getApi().activity.list(c))
export const useStatement = (from: string, to: string, enabled = true) =>
  useQuery({ queryKey: qk.statement(from, to), queryFn: () => getApi().activity.statement(from, to), enabled })
export const useNotifications = () => usePaged(qk.notifications, (c) => getApi().notifications.list(c))
export const useUnreadCount = () => useQuery({ queryKey: qk.unread, queryFn: () => getApi().notifications.unreadCount(), refetchInterval: 60_000 })

/* ───────── Auth ───────── */
export const useRegister = () => useMutation({ mutationFn: (v: Parameters<KolofiApi['auth']['register']>[0]) => getApi().auth.register(v) })
export const useLogin = () => useMutation({ mutationFn: (v: { email: string; password: string }) => getApi().auth.login(v) })
export const useSendEmailCode = () => useMutation({ mutationFn: () => getApi().auth.sendEmailCode() })
export function useVerifyEmail() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (code: string) => getApi().auth.verifyEmail(code), onSuccess: () => qc.invalidateQueries({ queryKey: qk.me }) })
}
export const useForgotPassword = () => useMutation({ mutationFn: (email: string) => getApi().auth.forgotPassword(email) })
export const useResetPassword = () => useMutation({ mutationFn: (v: Parameters<KolofiApi['auth']['resetPassword']>[0]) => getApi().auth.resetPassword(v) })

/* ───────── Profile & security ───────── */
export const useChangePassword = () => useMutation({ mutationFn: (v: Parameters<KolofiApi['me']['changePassword']>[0]) => getApi().me.changePassword(v) })
export function useSetPin() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (v: { password: string; pin: string; pin_confirmation: string }) => getApi().me.setPin(v), onSuccess: () => qc.invalidateQueries({ queryKey: qk.me }) })
}
export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => getApi().me.revokeSession(id), onSuccess: () => qc.invalidateQueries({ queryKey: qk.sessions }) })
}
export function useRevokeOtherSessions() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => getApi().me.revokeOtherSessions(), onSuccess: () => qc.invalidateQueries({ queryKey: qk.sessions }) })
}
export function useUpdateNotificationPrefs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: Partial<NotificationPrefs['email']>) => getApi().me.updateNotificationPrefs(email),
    onMutate: (email) => {
      const prev = qc.getQueryData<NotificationPrefs>(qk.prefs)
      if (prev) qc.setQueryData(qk.prefs, { ...prev, email: { ...prev.email, ...email } })
    },
    onSuccess: (p) => qc.setQueryData(qk.prefs, p),
  })
}

/* ───────── Wallet ───────── */
export function useCreateAddress() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (network: Network) => getApi().wallets.createAddress(network), onSuccess: () => qc.invalidateQueries({ queryKey: qk.wallets }) })
}
export function useWithdraw() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (v: Parameters<KolofiApi['withdrawals']['create']>[0]) => getApi().withdrawals.create(v), onSuccess: () => refreshMoney(qc) })
}

/* ───────── Savings ───────── */
export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (v: CreatePlanInput) => getApi().savings.create(v), onSuccess: () => refreshMoney(qc) })
}
export function useUpdatePlan(id: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (patch: Parameters<KolofiApi['savings']['update']>[1]) => getApi().savings.update(id, patch), onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }) })
}
export function useClosePlan(id: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => getApi().savings.close(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }) })
}
export function useSaveInto(id: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (amount: Dec) => getApi().savings.deposit(id, amount), onSuccess: () => refreshMoney(qc) })
}
export const useSavingsWithdrawalQuote = (id: string) => useMutation({ mutationFn: (amount: Dec) => getApi().savings.withdrawalQuote(id, amount) })
export function useWithdrawFromPlan(id: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (v: { amount: Dec; pin: string }) => getApi().savings.withdraw(id, v.amount, v.pin), onSuccess: () => refreshMoney(qc) })
}
export function useAutoSave(id: string) {
  const qc = useQueryClient()
  const done = () => qc.invalidateQueries({ queryKey: ['savings'] })
  return {
    set: useMutation({ mutationFn: (v: AutoSaveInput) => getApi().savings.setAutoSave(id, v), onSuccess: done }),
    pause: useMutation({ mutationFn: () => getApi().savings.pauseAutoSave(id), onSuccess: done }),
    resume: useMutation({ mutationFn: () => getApi().savings.resumeAutoSave(id), onSuccess: done }),
    cancel: useMutation({ mutationFn: () => getApi().savings.cancelAutoSave(id), onSuccess: done }),
  }
}

/* ───────── Circles ───────── */
export function useJoinCircle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { packageId: string; bps: number; pin: string; mode: 'public' | 'private' | 'code'; code?: string }) =>
      v.mode === 'code'
        ? getApi().circles.joinByCode(v.code ?? '', v.bps, v.pin)
        : v.mode === 'private'
          ? getApi().circles.createPrivate(v.packageId, v.bps, v.pin)
          : getApi().circles.join(v.packageId, v.bps, v.pin),
    onSuccess: () => refreshMoney(qc),
  })
}
export function useCircleActions(id: string) {
  const qc = useQueryClient()
  const done = () => refreshMoney(qc)
  return {
    leave: useMutation({ mutationFn: (pin: string) => getApi().circles.leave(id, pin), onSuccess: done }),
    exit: useMutation({ mutationFn: (v: { pin: string; reason?: string }) => getApi().circles.exit(id, v.pin, v.reason), onSuccess: done }),
    topUp: useMutation({ mutationFn: (pin: string) => getApi().circles.topUp(id, pin), onSuccess: done }),
    payoutTo: useMutation({
      mutationFn: (v: { destination: 'wallet' | 'savings'; savings_plan_id?: string | null; pin: string }) => getApi().circles.setPayoutDestination(id, v),
      onSuccess: (c) => {
        qc.setQueryData(qk.circle(id), c)
        return qc.invalidateQueries({ queryKey: qk.circles })
      },
    }),
    offer: useMutation({ mutationFn: (v: { email: string; pin: string }) => getApi().circles.offerSeat(id, v.email, v.pin), onSuccess: done }),
  }
}
export function useWaitlistActions() {
  const qc = useQueryClient()
  const done = () => qc.invalidateQueries({ queryKey: ['circles'] })
  return {
    join: useMutation({ mutationFn: (v: { packageId: string; bps: number }) => getApi().circles.joinWaitlist(v.packageId, v.bps), onSuccess: done }),
    leave: useMutation({ mutationFn: (packageId: string) => getApi().circles.leaveWaitlist(packageId), onSuccess: done }),
  }
}
export function useMarketActions() {
  const qc = useQueryClient()
  const done = () => refreshMoney(qc)
  return {
    buy: useMutation({ mutationFn: (v: { seatId: string; pin: string }) => getApi().circles.buyTakeover(v.seatId, v.pin), onSuccess: done }),
    accept: useMutation({ mutationFn: (v: { id: string; bps: number; pin: string }) => getApi().circles.acceptTransfer(v.id, v.bps, v.pin), onSuccess: done }),
    close: useMutation({ mutationFn: (id: string) => getApi().circles.closeTransfer(id), onSuccess: done }),
  }
}

/* ───────── Notifications ───────── */
export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => getApi().notifications.markRead(id), onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }) })
}
export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => getApi().notifications.markAllRead(), onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }) })
}
