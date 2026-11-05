import { motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router'
import type { IconName } from '@/core/icons'
import { Icon } from './Icon'
import s from './ui.module.css'

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/home', label: 'Home', icon: 'home' },
  { to: '/save', label: 'Save', icon: 'vault' },
  { to: '/circles', label: 'Circles', icon: 'circles' },
  { to: '/profile', label: 'Profile', icon: 'user' },
]

export function TabBar() {
  const { pathname } = useLocation()
  return (
    <nav className={s.tabbar} aria-label="Main">
      {tabs.map((t) => {
        const on = pathname === t.to || pathname.startsWith(`${t.to}/`)
        return (
          <NavLink key={t.to} to={t.to} aria-label={t.label} className={`${s.tab} ${on ? s.tabActive : ''}`} style={{ position: 'relative', color: on ? 'var(--on-sig)' : undefined }}>
            {on && (
              <motion.span
                layoutId="tab-pill"
                className={s.tabOn}
                style={{ position: 'absolute', inset: 0, zIndex: -1, borderRadius: 26 }}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <Icon name={t.icon} size={22} />
            {on && <span>{t.label}</span>}
          </NavLink>
        )
      })}
    </nav>
  )
}
