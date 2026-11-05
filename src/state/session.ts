import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/core/types'

/**
 * The signed-in member. `token` is the API bearer token; `user` is the last `/me` we saw, so the
 * router can decide where to send someone before the first request finishes.
 */
interface SessionState {
  token: string | null
  user: User | null
  /** The member has seen the intro slides on this device. */
  introSeen: boolean
  signIn: (token: string, user: User) => void
  setUser: (user: User) => void
  setIntroSeen: () => void
  signOut: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      introSeen: false,
      signIn: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      setIntroSeen: () => set({ introSeen: true }),
      signOut: () => set({ token: null, user: null }),
    }),
    { name: 'kolofi.session.v2' },
  ),
)

export type Stage = 'intro' | 'auth' | 'verify' | 'pin' | 'ready'

/** Where a member is in getting set up. Only `ready` reaches the app. */
export function stageOf(s: Pick<SessionState, 'token' | 'user' | 'introSeen'>): Stage {
  if (!s.token || !s.user) return s.introSeen ? 'auth' : 'intro'
  if (!s.user.email_verified) return 'verify'
  if (!s.user.has_transaction_pin) return 'pin'
  return 'ready'
}

export const stageRoute: Record<Stage, string> = {
  intro: '/welcome',
  auth: '/login',
  verify: '/auth/verify',
  pin: '/auth/pin',
  ready: '/home',
}
