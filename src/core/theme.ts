import { palettes, type ColorScheme, type Palette } from './tokens'

export type ThemePreference = 'system' | ColorScheme

export function resolveScheme(pref: ThemePreference, system: ColorScheme | null | undefined): ColorScheme {
  if (pref === 'system') return system === 'dark' ? 'dark' : 'light'
  return pref
}

export function paletteFor(scheme: ColorScheme): Palette {
  return palettes[scheme]
}

/** camelCase token → CSS custom property name: surface2 → --surface2, onSig → --on-sig */
export const cssVarName = (key: string) => `--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`

export const THEME_STORAGE_KEY = 'kolofi.theme'
