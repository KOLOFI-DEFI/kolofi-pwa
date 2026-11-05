import type { ComponentProps } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '@/ui'

/**
 * `Modal` rendered into `document.body`. Inside a `Screen` the overlay is trapped in the screen's
 * stacking context, so on phones the floating tab bar would cover the sheet's buttons.
 */
export const Dialog = (props: ComponentProps<typeof Modal>) => createPortal(<Modal {...props} />, document.body)
