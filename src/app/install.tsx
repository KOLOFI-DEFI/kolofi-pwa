import { useState, type ReactNode } from 'react'
import { create } from 'zustand'
import { Button, Icon, Modal } from '@/ui'

/** Chrome/Edge/Android fire this before showing their own install UI; we keep it to show it on our button. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * How this browser installs a web app. `prompt`: it gave us its own install dialog (Chrome/Edge/Android, when it fires
 * `beforeinstallprompt`). Everything else needs the user to do it from the browser's own UI, so we show the steps.
 */
type Platform = 'prompt' | 'ios' | 'mac-safari' | 'chromium' | 'android' | 'firefox' | 'other'

interface InstallState {
  event: InstallPromptEvent | null
  installed: boolean
}

const standalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

function detectPlatform(): Exclude<Platform, 'prompt'> {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  const iPadOS = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1
  if (/iphone|ipad|ipod/i.test(ua) || iPadOS) return 'ios' // every iOS browser adds to the Home Screen via Share
  if (/android/i.test(ua)) return 'android'
  if (/firefox/i.test(ua)) return 'firefox'
  if (/edg\/|chrome\/|chromium\/|opr\//i.test(ua)) return 'chromium'
  if (/safari/i.test(ua) && /macintosh/i.test(ua)) return 'mac-safari'
  return 'other'
}

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
  const platform: Platform = event ? 'prompt' : detectPlatform()
  const [help, setHelp] = useState(false)

  const install = async () => {
    if (!event) return setHelp(true)
    await event.prompt()
    const { outcome } = await event.userChoice
    useInstallStore.setState({ event: null, installed: outcome === 'accepted' })
  }

  // Offer it whenever we are not already running as the installed app. Browsers often hold back their own
  // prompt (not yet "engaged", dismissed before, or no prompt at all in Safari/Firefox), so without the event
  // the button explains how to install from the browser instead of disappearing.
  const available = !installed

  const dialog = <InstallHelp open={help} onClose={() => setHelp(false)} platform={platform} />
  return { available, installed, platform, install, dialog }
}

function InstallHelp({ open, onClose, platform }: { open: boolean; onClose: () => void; platform: Platform }) {
  const steps: Record<Platform, ReactNode[]> = {
    prompt: [],
    ios: [
      <>Tap the <b>Share</b> button in your browser’s toolbar.</>,
      <>Scroll down and tap <b>Add to Home Screen</b>.</>,
      <>Tap <b>Add</b>. Kólófi opens from your home screen like any app.</>,
    ],
    android: [
      <>Open your browser’s <b>⋮</b> menu.</>,
      <>Tap <b>Install app</b> or <b>Add to Home screen</b>.</>,
      <>Confirm. Kólófi opens from your home screen like any app.</>,
    ],
    'mac-safari': [
      <>In Safari’s menu bar, open <b>File</b>.</>,
      <>Choose <b>Add to Dock…</b></>,
      <>Click <b>Add</b>. Kólófi opens from your Dock in its own window.</>,
    ],
    chromium: [
      <>Click the <b>install</b> icon at the right of the address bar, or open the browser’s <b>⋮</b> menu.</>,
      <>Choose <b>Install Kólófi</b> (in Chrome: <b>Cast, save and share → Install page as app</b>).</>,
      <>Already installed? Open Kólófi from your apps or desktop instead.</>,
    ],
    firefox: [
      <>Firefox on desktop can’t install web apps yet.</>,
      <>Open this page in <b>Chrome</b>, <b>Edge</b> or <b>Safari</b>.</>,
      <>Then choose <b>Install</b> (or <b>Add to Dock</b> in Safari).</>,
    ],
    other: [
      <>Open your browser’s menu.</>,
      <>Choose <b>Install</b> or <b>Add to Home screen</b>.</>,
      <>Confirm. Kólófi then opens in its own window.</>,
    ],
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Install Kólófi"
      sub="Get Kólófi on your home screen. It opens full screen and loads instantly, even on a slow connection."
      footer={<Button onClick={onClose}>Got it</Button>}
    >
      <ol style={{ display: 'grid', gap: 14, margin: '16px 0 0', padding: 0, listStyle: 'none' }}>
        {steps[platform].map((s, i) => (
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
