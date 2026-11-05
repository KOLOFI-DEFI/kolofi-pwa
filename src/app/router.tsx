import type { ComponentType } from 'react'
import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router'
import { stageOf, stageRoute, useSession } from '@/state/session'
import { AppShell } from '@/ui/Shell'

/** Route-level code splitting: each screen module becomes its own chunk. */
type Mod = Record<string, unknown>
const lazy = <M extends Mod>(load: () => Promise<M>, name: keyof M & string) => async () => ({
  Component: (await load())[name] as ComponentType,
})

const auth = () => import('@/screens/auth/Auth')
const home = () => import('@/screens/home/Home')
const wallet = () => import('@/screens/wallet/Wallet')
const activity = () => import('@/screens/activity/Activity')
const save = () => import('@/screens/save/Save')
const circles = () => import('@/screens/circles/Circles')
const profile = () => import('@/screens/profile/Profile')

const useStage = () => useSession((s) => stageOf(s))

function Start() {
  return <Navigate to={stageRoute[useStage()]} replace />
}

/** Signed-out pages. A signed-in member is sent on to wherever their set-up stands. */
function Guest() {
  const stage = useStage()
  if (stage !== 'intro' && stage !== 'auth') return <Navigate to={stageRoute[stage]} replace />
  return <Outlet />
}

/** Set-up steps after sign-up: only reachable at that step. */
function SetupStep({ stage }: { stage: 'verify' | 'pin' }) {
  const current = useStage()
  if (current !== stage) return <Navigate to={stageRoute[current]} replace />
  return <Outlet />
}

/** App pages need a verified email and a transaction PIN. */
function RequireReady() {
  const stage = useStage()
  const loc = useLocation()
  if (stage !== 'ready') return <Navigate to={stageRoute[stage]} replace state={{ from: loc.pathname }} />
  return <Outlet />
}

export const router = createBrowserRouter([
  {
    HydrateFallback: () => null,
    children: [
      { path: '/', element: <Start /> },
      {
        element: <Guest />,
        children: [
          { path: '/welcome', lazy: lazy(auth, 'Welcome') },
          { path: '/login', lazy: lazy(auth, 'Login') },
          { path: '/signup', lazy: lazy(auth, 'Signup') },
          { path: '/forgot-password', lazy: lazy(auth, 'ForgotPassword') },
          { path: '/reset-password', lazy: lazy(auth, 'ResetPassword') },
        ],
      },
      { element: <SetupStep stage="verify" />, children: [{ path: '/auth/verify', lazy: lazy(auth, 'VerifyEmail') }] },
      { element: <SetupStep stage="pin" />, children: [{ path: '/auth/pin', lazy: lazy(auth, 'SetPin') }] },
      {
        element: <RequireReady />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/home', lazy: lazy(home, 'Home') },

              { path: '/wallet', lazy: lazy(wallet, 'Wallet') },
              { path: '/wallet/add', lazy: lazy(wallet, 'AddMoney') },
              { path: '/wallet/withdraw', lazy: lazy(wallet, 'Withdraw') },
              { path: '/wallet/withdrawals/:id', lazy: lazy(wallet, 'WithdrawalDetail') },

              { path: '/activity', lazy: lazy(activity, 'Activity') },

              { path: '/save', lazy: lazy(save, 'Save') },
              { path: '/save/new', lazy: lazy(save, 'NewPlan') },
              { path: '/save/:id', lazy: lazy(save, 'PlanDetail') },

              { path: '/circles', lazy: lazy(circles, 'Circles') },
              { path: '/circles/market', lazy: lazy(circles, 'Market') },
              { path: '/circles/join-code', lazy: lazy(circles, 'JoinByCode') },
              { path: '/circles/packages/:id', lazy: lazy(circles, 'PackageJoin') },
              { path: '/circles/:id', lazy: lazy(circles, 'CircleDetail') },

              { path: '/notifications', lazy: lazy(profile, 'Notifications') },
              { path: '/reputation', lazy: lazy(profile, 'Reputation') },
              { path: '/profile', lazy: lazy(profile, 'Profile') },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
