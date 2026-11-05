import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router'
import { useSession, type Stage } from '@/state/session'
import { TabBar } from '@/ui/TabBar'
import { IntroCircles, IntroOnchain, IntroSave } from '@/screens/onboarding/Intro'
import { AutoSave, Kyc, Otp, Phone, WalletReady } from '@/screens/auth/Auth'
import { Home } from '@/screens/home/Home'
import { AddMoney, Withdraw } from '@/screens/money/Money'
import { LockedSavings, NewGoal, Save } from '@/screens/save/Save'
import { CircleDetailScreen, Circles, JoinCircle, MissedPaymentScreen, PayoutScreen } from '@/screens/circles/Circles'
import { Notifications, Profile, Trust, WhatsApp } from '@/screens/profile/Profile'
import { DevKit } from '@/screens/dev/DevKit'

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
  { path: '/', element: <Start /> },
  { path: '/intro/save', element: <IntroSave /> },
  { path: '/intro/circles', element: <IntroCircles /> },
  { path: '/intro/onchain', element: <IntroOnchain /> },
  { path: '/auth/phone', element: <Phone /> },
  { path: '/auth/otp', element: <Otp /> },
  { path: '/auth/kyc', element: <Kyc /> },
  { path: '/auth/wallet-ready', element: <WalletReady /> },
  { path: '/auth/auto-save', element: <AutoSave /> },
  { path: '/dev/kit', element: <DevKit /> },
  {
    element: <RequireReady />,
    children: [
      {
        element: <TabsLayout />,
        children: [
          { path: '/home', element: <Home /> },
          { path: '/save', element: <Save /> },
          { path: '/circles', element: <Circles /> },
          { path: '/profile', element: <Profile /> },
        ],
      },
      { path: '/money/add', element: <AddMoney /> },
      { path: '/money/withdraw', element: <Withdraw /> },
      { path: '/save/new-goal', element: <NewGoal /> },
      { path: '/save/locked', element: <LockedSavings /> },
      { path: '/circles/:id', element: <CircleDetailScreen /> },
      { path: '/circles/:id/join', element: <JoinCircle /> },
      { path: '/circles/:id/payout', element: <PayoutScreen /> },
      { path: '/circles/:id/missed', element: <MissedPaymentScreen /> },
      { path: '/notifications', element: <Notifications /> },
      { path: '/trust', element: <Trust /> },
      { path: '/whatsapp', element: <WhatsApp /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
