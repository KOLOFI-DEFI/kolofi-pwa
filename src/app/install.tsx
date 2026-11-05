import { useState } from 'react'
import { create } from 'zustand'
import { Button, Icon, Modal } from '@/ui'

/** Chrome/Edge/Android fire this before showing their own install UI; we keep it to show it on our button. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'prompt' | 'ios' | 'manual'

interface InstallState {
  event: InstallPromptEvent | null
  installed: boolean
}

const standalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent)

export const useInstallStore = create<InstallState>(() => ({ event: null, installed: standalone() }))

/**
 * Listen for the browser's install events. Call once at startup, before React renders,
 * because `beforeinstallprompt` can fire before the first screen mounts.
 */
export function listenForInstall() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    useInstallStore.setState({ event: e as InstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => useInstallStore.setState({ event: null, installed: true }))
  window.matchMedia('(display-mode: standalone)').addEventListener('change', (m) => useInstallStore.setState({ installed: m.matches }))
}

/**
 * Whether to offer installing, and how. `prompt`: the browser's own dialog (Chrome, Edge, Android).
 * `ios`: Safari has no prompt, so we show the Share → Add to Home Screen steps. `manual`: other browsers.
 */
export function useInstall() {
  const { event, installed } = useInstallStore()
  const platform: Platform = event ? 'prompt' : isIos() ? 'ios' : 'manual'
  const [help, setHelp] = useState(false)

  const install = async () => {
    if (!event) return setHelp(true)
    await event.prompt()
    const { outcome } = await event.userChoice
    useInstallStore.setState({ event: null, installed: outcome === 'accepted' })
  }

  // Offer it when the browser can prompt, or on iPhone/iPad Safari; elsewhere the button would only show instructions.
  const available = !installed && (platform === 'prompt' || platform === 'ios')

  const dialog = <InstallHelp open={help} onClose={() => setHelp(false)} platform={platform} />
  return { available, installed, platform, install, dialog }
}

function InstallHelp({ open, onClose, platform }: { open: boolean; onClose: () => void; platform: Platform }) {
  const steps =
    platform === 'ios'
      ? [
          <>Tap the <b>Share</b> button in Safari’s toolbar.</>,
          <>Scroll down and tap <b>Add to Home Screen</b>.</>,
          <>Tap <b>Add</b>. Kólófi opens from your home screen like any app.</>,
        ]
      : [
          <>Open your browser’s menu.</>,
          <>Choose <b>Install Kólófi</b> or <b>Add to Home screen</b>.</>,
          <>Confirm. Kólófi then opens in its own window.</>,
        ]
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Install Kólófi"
      sub="Get Kólófi on your home screen. It opens full screen and loads instantly, even on a slow connection."
      footer={<Button onClick={onClose}>Got it</Button>}
    >
      <ol style={{ display: 'grid', gap: 14, margin: '16px 0 0', padding: 0, listStyle: 'none' }}>
        {steps.map((s, i) => (
          <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 15, lineHeight: '22px', color: 'var(--body)' }}>
            <span
              style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 14, display: 'grid', placeItems: 'center',
                background: 'var(--sig-tint)', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 13,
              }}
            >
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </Modal>
  )
}

/** Download icon + label; used in the side navigation and the Profile settings. */
export const InstallIcon = () => <Icon name="download" size={18} />
