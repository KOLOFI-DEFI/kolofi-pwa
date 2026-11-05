import type { ComponentType } from 'react'
import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router'
import { useSession, type Stage } from '@/state/session'
import { TabBar } from '@/ui/TabBar'

/** Route-level code splitting: each screen module becomes its own chunk. */
type Mod = Record<string, unknown>
const lazy = <M extends Mod>(load: () => Promise<M>, name: keyof M & string) => async () => ({
  Component: (await load())[name] as ComponentType,
})

const auth = () => import('@/screens/auth/Auth')
const circles = () => import('@/screens/circles/Circles')
const devkit = () => import('@/screens/dev/DevKit')
const home = () => import('@/screens/home/Home')
const money = () => import('@/screens/money/Money')
const intro = () => import('@/screens/onboarding/Intro')
const profile = () => import('@/screens/profile/Profile')
const save = () => import('@/screens/save/Save')

const stageRoute: Record<Stage, string> = {
  intro: '/intro/save',
  phone: '/auth/phone',
  otp: '/auth/otp',
  kyc: '/auth/kyc',
  wallet: '/auth/wallet-ready',
  autosave: '/auth/auto-save',
  ready: '/home',
}

function Start() {
  const stage = useSession((s) => s.stage)
  return <Navigate to={stageRoute[stage]} replace />
}

/** App routes need a finished sign-up; otherwise resume where the user left off. */
function RequireReady() {
  const stage = useSession((s) => s.stage)
  const loc = useLocation()
  if (stage !== 'ready') return <Navigate to={stageRoute[stage]} replace state={{ from: loc.pathname }} />
  return <Outlet />
}

function TabsLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}

export const router = createBrowserRouter([
  {
    // Shown while the first lazy screen chunk loads (blank, matches the dark splash).
    HydrateFallback: () => null,
    children: [
      { path: '/', element: <Start /> },
      { path: '/intro/save', lazy: lazy(intro, 'IntroSave') },
      { path: '/intro/circles', lazy: lazy(intro, 'IntroCircles') },
      { path: '/intro/onchain', lazy: lazy(intro, 'IntroOnchain') },
      { path: '/auth/phone', lazy: lazy(auth, 'Phone') },
      { path: '/auth/otp', lazy: lazy(auth, 'Otp') },
      { path: '/auth/kyc', lazy: lazy(auth, 'Kyc') },
      { path: '/auth/wallet-ready', lazy: lazy(auth, 'WalletReady') },
      { path: '/auth/auto-save', lazy: lazy(auth, 'AutoSave') },
      { path: '/dev/kit', lazy: lazy(devkit, 'DevKit') },
      {
        element: <RequireReady />,
        children: [
          {
            element: <TabsLayout />,
            children: [
              { path: '/home', lazy: lazy(home, 'Home') },
              { path: '/save', lazy: lazy(save, 'Save') },
              { path: '/circles', lazy: lazy(circles, 'Circles') },
              { path: '/profile', lazy: lazy(profile, 'Profile') },
            ],
          },
          { path: '/money/add', lazy: lazy(money, 'AddMoney') },
          { path: '/money/withdraw', lazy: lazy(money, 'Withdraw') },
          { path: '/save/new-goal', lazy: lazy(save, 'NewGoal') },
          { path: '/save/locked', lazy: lazy(save, 'LockedSavings') },
          { path: '/circles/:id', lazy: lazy(circles, 'CircleDetailScreen') },
          { path: '/circles/:id/join', lazy: lazy(circles, 'JoinCircle') },
          { path: '/circles/:id/payout', lazy: lazy(circles, 'PayoutScreen') },
          { path: '/circles/:id/missed', lazy: lazy(circles, 'MissedPaymentScreen') },
          { path: '/notifications', lazy: lazy(profile, 'Notifications') },
          { path: '/trust', lazy: lazy(profile, 'Trust') },
          { path: '/whatsapp', lazy: lazy(profile, 'WhatsApp') },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
