import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cssVarName, paletteFor, resolveScheme } from '@/core/theme'
import type { ColorScheme, Palette } from '@/core/tokens'
import { useThemeStore } from '@/state/theme'

const ThemeCtx = createContext<{ scheme: ColorScheme; palette: Palette }>({ scheme: 'light', palette: paletteFor('light') })
export const useTheme = () => useContext(ThemeCtx)

const mq = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useThemeStore((s) => s.preference)
  const [system, setSystem] = useState<ColorScheme>(() => (mq()?.matches ? 'dark' : 'light'))

  useEffect(() => {
    const m = mq()
    if (!m) return
    const on = (e: MediaQueryListEvent) => setSystem(e.matches ? 'dark' : 'light')
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])

  const scheme = resolveScheme(preference, system)
  const palette = paletteFor(scheme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = scheme
    for (const [k, v] of Object.entries(palette)) root.style.setProperty(cssVarName(k), v)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.bg)
  }, [scheme, palette])

  const value = useMemo(() => ({ scheme, palette }), [scheme, palette])
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}
