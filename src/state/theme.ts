import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { THEME_STORAGE_KEY, type ThemePreference } from '@/core/theme'

interface ThemeState {
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
}

const safeStorage = createJSONStorage(() => {
  try {
    return window.localStorage
  } catch {
    const mem = new Map<string, string>()
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) }
  }
})

export const useThemeStore = create<ThemeState>()(
  persist((set) => ({ preference: 'system', setPreference: (preference) => set({ preference }) }), {
    name: THEME_STORAGE_KEY,
    storage: safeStorage,
  }),
)
