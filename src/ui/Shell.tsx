import { useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import type { IconName } from '@/core/icons'
import { initials } from '@/core/format'
import { useMe, useUnreadCount } from '@/core/data'
import { useTheme } from '@/app/ThemeProvider'
import { useThemeStore } from '@/state/theme'
import { useSession } from '@/state/session'
import { getApi } from '@/core/data'
import { useInstall } from '@/app/install'
import { Icon } from './Icon'
import { TabBar } from './TabBar'
import { cx } from './index'
import sh from './shell.module.css'

const primary: { to: string; label: string; icon: IconName }[] = [
  { to: '/home', label: 'Home', icon: 'home' },
  { to: '/wallet', label: 'Wallet', icon: 'wallet' },
  { to: '/save', label: 'Save', icon: 'vault' },
  { to: '/circles', label: 'Circles', icon: 'circles' },
  { to: '/activity', label: 'Activity', icon: 'activity' },
]
const secondary: { to: string; label: string; icon: IconName }[] = [
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
  { to: '/reputation', label: 'Reputation', icon: 'star' },
  { to: '/profile', label: 'Profile & security', icon: 'user' },
]

/**
 * Signed-in layout. Phones: full-screen pages with the floating tab bar.
 * Tablet (≥768): icon rail. Desktop (≥1100): full side navigation with account, theme and sign-out.
 */
export function AppShell() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const { data: me } = useMe()
  const { data: unread } = useUnreadCount()
  const { scheme } = useTheme()
  const setPreference = useThemeStore((s) => s.setPreference)
  const signOut = useSession((s) => s.signOut)
  const queryClient = useQueryClient()
  const installer = useInstall()
  const user = me ?? useSession.getState().user
  const isOn = (to: string) => pathname === to || pathname.startsWith(`${to}/`)

  const logout = async () => {
    try {
      await getApi().auth.logout()
    } catch {
      /* the token may already be gone */
    }
    signOut()
    queryClient.clear()
    nav('/login', { replace: true })
  }

  const item = (l: { to: string; label: string; icon: IconName }, badge?: number) => (
    <NavLink key={l.to} to={l.to} className={cx(sh.item, isOn(l.to) && sh.itemOn)} title={l.label} aria-current={isOn(l.to) ? 'page' : undefined}>
      <span className={sh.itemIcon}>
        <Icon name={l.icon} size={20} />
        {!!badge && <span className={sh.badgeDot} />}
      </span>
      <span className={sh.itemLabel}>{l.label}</span>
      {!!badge && <span className={sh.count}>{badge > 99 ? '99+' : badge}</span>}
    </NavLink>
  )

  return (
    <div className={sh.shell}>
      <aside className={sh.side} aria-label="Main">
        <NavLink to="/home" className={sh.brand} aria-label="Kólófi home">
          <img src={scheme === 'dark' ? '/kolofi-logo-light.svg' : '/kolofi-logo.svg'} alt="Kólófi" className={sh.logo} />
          <img src="/favicon.svg" alt="" className={sh.mark} />
        </NavLink>

        <button className={sh.cta} onClick={() => nav('/wallet/add')}>
          <Icon name="plus" size={18} />
          <span className={sh.itemLabel}>Add money</span>
        </button>

        <nav className={sh.group}>{primary.map((l) => item(l))}</nav>
        <div className={sh.sep} />
        <nav className={sh.group}>{secondary.map((l) => item(l, l.to === '/notifications' ? unread : undefined))}</nav>

        <div className={sh.bottom}>
          {installer.available && (
            <button className={sh.install} onClick={installer.install} title="Install the Kólófi app">
              <span className={sh.itemIcon}>
                <Icon name="download" size={18} />
              </span>
              <span className={sh.installText}>
                <span className={sh.installTitle}>Install the app</span>
                <span className={sh.installSub}>Open Kólófi from your desktop</span>
              </span>
            </button>
          )}
          <div className={sh.theme} role="radiogroup" aria-label="Appearance">
            {(['light', 'dark'] as const).map((t) => (
              <button key={t} role="radio" aria-checked={scheme === t} className={cx(sh.themeBtn, scheme === t && sh.themeOn)} onClick={() => setPreference(t)} aria-label={`${t} theme`}>
                <Icon name={t === 'light' ? 'sun' : 'moon'} size={16} />
              </button>
            ))}
          </div>
          {user && (
            <div className={sh.me}>
              <span className={sh.avatar}>{initials(user.first_name, user.last_name)}</span>
              <span className={sh.meText}>
                <span className={sh.meName}>
                  {user.first_name} {user.last_name}
                </span>
                <span className={sh.meMail}>{user.email}</span>
              </span>
              <button className={sh.logout} onClick={logout} aria-label="Log out" title="Log out">
                <Icon name="logout" size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className={sh.main}>
        <Outlet />
      </div>
      {installer.dialog}
      <TabBar />
    </div>
  )
}
