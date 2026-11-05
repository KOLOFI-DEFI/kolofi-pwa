import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Where the user is in sign-up. `ready` unlocks the tabs. */
export type Stage = 'intro' | 'phone' | 'otp' | 'kyc' | 'wallet' | 'autosave' | 'ready'

interface SessionState {
  stage: Stage
  token: string | null
  phone: string // local digits, no +234
  whatsappReminders: boolean
  otpRequestId: string | null
  setStage: (s: Stage) => void
  setPhone: (phone: string, whatsappReminders: boolean) => void
  setOtpRequest: (id: string) => void
  signIn: (token: string) => void
  signOut: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      stage: 'intro',
      token: null,
      phone: '',
      whatsappReminders: true,
      otpRequestId: null,
      setStage: (stage) => set({ stage }),
      setPhone: (phone, whatsappReminders) => set({ phone, whatsappReminders }),
      setOtpRequest: (otpRequestId) => set({ otpRequestId }),
      signIn: (token) => set({ token }),
      signOut: () => set({ token: null, stage: 'intro', otpRequestId: null }),
    }),
    { name: 'kolofi.session' },
  ),
)
