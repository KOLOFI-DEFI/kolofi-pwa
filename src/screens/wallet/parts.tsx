import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Icon, IconButton, cx, useToast } from '@/ui'
import w from './wallet.module.css'

/** Copy text to the clipboard and confirm with a toast. */
export function useCopy() {
  const toast = useToast()
  return async (text: string, what = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text)
      toast(what)
    } catch {
      toast('Copy blocked by the browser. Select the text instead.')
    }
  }
}

/** Small icon-and-label copy button for addresses and hashes. */
export function CopyButton({ text, label = 'Copy', what, ink }: { text: string; label?: string; what?: string; ink?: boolean }) {
  const copy = useCopy()
  return (
    <button type="button" className={cx(w.copyBtn, ink && w.copyInk)} onClick={() => copy(text, what)} aria-label={`${label} ${what ?? ''}`.trim()}>
      <Icon name="copy" size={15} />
      <span>{label}</span>
    </button>
  )
}

type Tone = 'ok' | 'wait' | 'bad' | 'neutral'
const statusTone: Record<string, Tone> = {
  completed: 'ok',
  credited: 'ok',
  processing: 'wait',
  pending: 'wait',
  unknown: 'wait',
  failed: 'bad',
  unsupported: 'bad',
  refunded: 'neutral',
}
export const statusLabel = (status: string) => (status === 'unknown' || status === 'pending' ? 'processing' : status)

/** Mono status pill: green for done, blue while in flight, red when failed. */
export function StatusPill({ status }: { status: string }) {
  return (
    <span className={w.status} data-tone={statusTone[status] ?? 'neutral'}>
      {statusLabel(status)}
    </span>
  )
}

/**
 * Page heading. Phones: back button and centred title, like the boards' header.
 * Tablet and desktop: serif title on the left, actions as buttons on the right.
 */
export function PageHead({ title, eyebrow, back, backLabel, actions, phoneRight }: { title: string; eyebrow?: ReactNode; back?: string; backLabel?: string; actions?: ReactNode; phoneRight?: ReactNode }) {
  const nav = useNavigate()
  const goBack = () => (back ? nav(back) : nav(-1))
  return (
    <header className={w.head}>
      <div className={w.headBack}>
        <IconButton icon="back" label="Back" onClick={goBack} />
      </div>
      <div className={w.headText}>
        {back && backLabel && (
          <button type="button" className={w.crumb} onClick={goBack}>
            <Icon name="back" size={14} />
            {backLabel}
          </button>
        )}
        {eyebrow && <div className={w.headEyebrow}>{eyebrow}</div>}
        <h1 className={w.headTitle}>{title}</h1>
      </div>
      <div className={w.headPhoneRight}>{phoneRight}</div>
      {actions && <div className={w.headActions}>{actions}</div>}
    </header>
  )
}
