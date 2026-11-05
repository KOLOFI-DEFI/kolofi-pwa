import { AnimatePresence, motion } from 'framer-motion'
import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { avatarColors } from '@/core/tokens'
import { cents, splitUsdt } from '@/core/format'
import { ApiError } from '@/core/api/contract'
import type { IconName } from '@/core/icons'
import { Icon } from './Icon'
import s from './ui.module.css'

export { Icon }
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ───────── Screen & layout ───────── */
type Width = 'narrow' | 'medium' | 'wide'
interface ScreenProps {
  children: ReactNode
  footer?: ReactNode
  hero?: 'glow' | 'soft'
  tabs?: boolean
  header?: ReactNode
  bodyClassName?: string
  bodyStyle?: CSSProperties
  /** Content width on tablet and desktop. Desktop screens lay out their own grids inside it. Phones are always full width. */
  width?: Width
}
export function Screen({ children, footer, hero, tabs, header, bodyClassName, bodyStyle, width = 'wide' }: ScreenProps) {
  const w = s[width]
  return (
    <div className={cx(s.screen, hero === 'glow' && s.heroGlow, hero === 'soft' && s.heroSoft)}>
      {header && <div className={cx(s.headWrap, w)}>{header}</div>}
      <main className={cx(s.body, w, tabs && s.withTabs, bodyClassName)} style={bodyStyle}>
        {children}
      </main>
      {footer && <div className={cx(s.footer, w)}>{footer}</div>}
    </div>
  )
}

/** Main column plus a side column on desktop; stacks on phones and tablets. */
export function Columns({ children, aside, asideWidth, even, sticky, style }: { children: ReactNode; aside?: ReactNode; asideWidth?: number; even?: boolean; sticky?: boolean; style?: CSSProperties }) {
  return (
    <div className={cx(s.columns, even && s.columnsEven)} style={{ ...(asideWidth ? ({ '--aside': `${asideWidth}px` } as CSSProperties) : {}), ...style }}>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
      {aside && <aside className={cx(sticky && s.stickyAside)} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>{aside}</aside>}
    </div>
  )
}
/** Responsive card grid: as many columns of at least `min` px as fit. */
export const Grid = ({ children, min = 280, style }: { children: ReactNode; min?: number; style?: CSSProperties }) => (
  <div className={s.grid} style={{ '--min': `${min}px`, ...style } as CSSProperties}>
    {children}
  </div>
)
export const DesktopOnly = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => <div className={s.desktopOnly} style={style}>{children}</div>
export const MobileOnly = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => <div className={s.mobileOnly} style={style}>{children}</div>

/** True on tablet and desktop widths (≥768px). Use for structure that cannot be done in CSS alone. */
export function useIsDesktop(min = 768) {
  const query = `(min-width: ${min}px)`
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

export const Spacer = ({ h }: { h?: number }) => (h ? <div style={{ height: h, flexShrink: 0 }} /> : <div className={s.spacer} />)

export function Stack({ gap = 12, children, style, className }: { gap?: number; children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {children}
    </div>
  )
}
export function Row({ gap = 12, children, style, align = 'center', justify }: { gap?: number; children: ReactNode; style?: CSSProperties; align?: CSSProperties['alignItems']; justify?: CSSProperties['justifyContent'] }) {
  return <div style={{ display: 'flex', alignItems: align, justifyContent: justify, gap, ...style }}>{children}</div>
}

/* ───────── Header ───────── */
interface HeaderProps {
  title?: ReactNode
  sub?: ReactNode
  step?: string
  right?: ReactNode
  back?: boolean | (() => void)
  close?: boolean | (() => void)
}
export function Header({ title, sub, step, right, back = true, close }: HeaderProps) {
  const nav = useNavigate()
  const goBack = () => (typeof back === 'function' ? back() : nav(-1))
  const doClose = () => (typeof close === 'function' ? close() : nav(-1))
  return (
    <header className={s.header}>
      <div>{back && !close && <IconButton icon="back" label="Back" onClick={goBack} />}</div>
      <div>
        {step ? (
          <div className={s.headerStep}>{step}</div>
        ) : (
          <div className={s.headerTitle}>
            {title}
            {sub && <span className={s.headerSub}>{sub}</span>}
          </div>
        )}
      </div>
      <div className={s.headerRight}>{close ? <IconButton icon="close" label="Close" onClick={doClose} /> : right}</div>
    </header>
  )
}
export const HeaderLink = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
  <button className={s.headerLink} onClick={onClick}>
    {children}
  </button>
)
export const HeaderMono = ({ children }: { children: ReactNode }) => <span className={s.headerMono}>{children}</span>

export function IconButton({ icon, label, onClick, badge, size = 20 }: { icon: IconName; label: string; onClick?: () => void; badge?: boolean; size?: number }) {
  return (
    <button className={s.iconBtn} aria-label={label} onClick={onClick}>
      <Icon name={icon} size={size} />
      {badge && <span className={s.dotBadge} />}
    </button>
  )
}

/* ───────── Buttons ───────── */
type BtnVariant = 'primary' | 'secondary' | 'whatsapp' | 'outline' | 'ghost'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  glow?: boolean
  loading?: boolean
  icon?: IconName
}
export function Button({ variant = 'primary', glow, loading, icon, children, className, disabled, ...rest }: ButtonProps) {
  const v = { primary: s.primary, secondary: s.secondary, whatsapp: s.whatsappBtn, outline: cx(s.pillOutline), ghost: s.ghostPill }[variant]
  return (
    <button className={cx(s.btn, v, glow && s.glow, className)} disabled={disabled || loading} {...rest}>
      {loading ? <span className={s.spinner} /> : icon && <Icon name={icon} size={variant === 'outline' ? 18 : 20} />}
      {children}
    </button>
  )
}

/* ───────── Type ───────── */
export const Eyebrow = ({ children, accent, style, className }: { children: ReactNode; accent?: boolean; style?: CSSProperties; className?: string }) => (
  <div className={cx(s.eyebrow, accent && s.eyebrowAccent, className)} style={style}>
    {children}
  </div>
)
export const Hero = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <h1 className={s.hero} style={style}>
    {children}
  </h1>
)
export const H1 = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <h1 className={s.h1} style={style}>
    {children}
  </h1>
)
export const Lead = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <p className={s.lead} style={style}>
    {children}
  </p>
)
export const SectionTitle = ({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: CSSProperties }) => (
  <Row justify="space-between" style={{ marginTop: 24, marginBottom: 12, ...style }}>
    <h2 className={s.sectionTitle}>{children}</h2>
    {right}
  </Row>
)

/** Serif amount with muted decimals: 2,382<span>.60</span> USDT */
export function Amount({
  minor, size = 52, ccy, mutedDecimals = true, color, ccyColor, style, decimals = 2,
}: { minor: number; size?: number; ccy?: string; mutedDecimals?: boolean; color?: string; ccyColor?: string; style?: CSSProperties; decimals?: 0 | 2 }) {
  const [int, dec] = splitUsdt(minor)
  return (
    <span className={s.amount} style={{ fontSize: size, lineHeight: `${Math.round(size * 1.08)}px`, color, ...style }}>
      {int}
      {decimals === 2 && <span className={mutedDecimals ? s.amountDec : undefined}>{dec}</span>}
      {ccy && <span className={s.amountCcy} style={{ color: ccyColor }}>{ccy}</span>}
    </span>
  )
}

/* ───────── Surfaces ───────── */
export function Card({ children, pad = true, style, className, onClick }: { children: ReactNode; pad?: boolean | number; style?: CSSProperties; className?: string; onClick?: () => void }) {
  const p = typeof pad === 'number' ? { padding: pad } : undefined
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={cx(s.card, pad === true && s.cardPad, className)} style={{ ...p, ...(onClick ? { textAlign: 'left', width: '100%', display: 'block' } : {}), ...style }} onClick={onClick}>
      {children}
    </Tag>
  )
}
export const List = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div className={cx(s.card, s.list)} style={{ overflow: 'hidden', ...style }}>
    {children}
  </div>
)
export function ListRow({
  tile, title, sub, value, valueStyle, chevron, onClick, right, style,
}: { tile?: ReactNode; title: ReactNode; sub?: ReactNode; value?: ReactNode; valueStyle?: CSSProperties; chevron?: boolean; onClick?: () => void; right?: ReactNode; style?: CSSProperties }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={s.row} onClick={onClick} style={style}>
      {tile}
      <div className={s.rowMain}>
        <div className={s.rowTitle}>{title}</div>
        {sub && <div className={s.rowSub}>{sub}</div>}
      </div>
      {value !== undefined && <div className={s.rowValue} style={valueStyle}>{value}</div>}
      {right}
      {chevron && <Icon name="chevronRight" size={16} className={s.chev} />}
    </Tag>
  )
}
type TileTone = 'neutral' | 'sig' | 'chain' | 'flare' | 'whatsapp'
export function Tile({ children, tone = 'neutral', size = 40, radius = 12, style }: { children: ReactNode; tone?: TileTone; size?: number; radius?: number; style?: CSSProperties }) {
  const t = { neutral: '', sig: s.tileSig, chain: s.tileChain, flare: s.tileFlare, whatsapp: s.tileWa }[tone]
  return (
    <div className={cx(s.tile, t)} style={{ width: size, height: size, borderRadius: radius, ...style }}>
      {children}
    </div>
  )
}

export interface KV {
  label: ReactNode
  value: ReactNode
  mono?: boolean
  accent?: boolean
  valueStyle?: CSSProperties
}
export function KeyValues({ rows, style, rowHeight }: { rows: KV[]; style?: CSSProperties; rowHeight?: number }) {
  return (
    <div className={cx(s.card, s.kv)} style={style}>
      {rows.map((r, i) => (
        <div key={i} className={s.kvRow} style={rowHeight ? { minHeight: rowHeight } : undefined}>
          <span className={s.kvLabel}>{r.label}</span>
          <span className={cx(s.kvValue, r.mono && s.kvMono, r.accent && s.kvAccent)} style={r.valueStyle}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Badge({ children, tone = 'neutral', style }: { children: ReactNode; tone?: 'neutral' | 'sig' | 'outline'; style?: CSSProperties }) {
  return <span className={cx(s.badge, tone === 'sig' && s.badgeSig, tone === 'outline' && s.badgeOutline)} style={style}>{children}</span>
}
export const Dot = ({ color, size = 8 }: { color?: string; size?: number }) => <span className={s.dot} style={{ background: color, width: size, height: size }} />
export const Pill = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
  <button className={s.pill} onClick={onClick}>
    {children}
  </button>
)

export function Avatar({ initials, size = 44, style }: { initials: string; size?: number; style?: CSSProperties }) {
  return (
    <div className={s.avatar} style={{ width: size, height: size, fontSize: size * 0.36, ...style }}>
      {initials}
    </div>
  )
}
export function AvatarStack({ items }: { items: string[] }) {
  return (
    <div className={s.stack}>
      {items.map((it, i) => (
        <span key={it} className={s.stackItem} style={{ background: avatarColors[i % avatarColors.length] }}>
          {it}
        </span>
      ))}
    </div>
  )
}

export function Progress({ value, color, track, height = 6, style }: { value: number; color?: string; track?: string; height?: number; style?: CSSProperties }) {
  return (
    <div className={s.progress} style={{ height, background: track, ...style }} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={s.progressFill} style={{ width: `${Math.min(100, value * 100)}%`, background: color }} />
    </div>
  )
}
export function StepBars({ total, current }: { total: number; current: number }) {
  return (
    <div className={s.steps}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={cx(s.stepBar, i < current && s.stepOn)} />
      ))}
    </div>
  )
}
export function Dots({ total, current }: { total: number; current: number }) {
  return (
    <div className={s.dots} aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cx(s.dotI, i === current && s.dotOn)} />
      ))}
    </div>
  )
}

/* ───────── Controls ───────── */
export function Segmented<T extends string>({ options, value, onChange, style }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; style?: CSSProperties }) {
  const id = useId()
  return (
    <div className={s.segmented} role="tablist" style={style}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={cx(s.segBtn, o.value === value && s.segOn)} onClick={() => onChange(o.value)}>
          {o.value === value && <motion.span layoutId={`seg-${id}`} className={s.segThumb} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}
export function Chips<T extends string | number>({ options, value, onChange, style }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; style?: CSSProperties }) {
  return (
    <div className={s.chips} role="radiogroup" style={style}>
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} className={cx(s.chip, o.value === value && s.chipOn)} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
export function FilterChips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className={s.chipRow}>
      {options.map((o) => (
        <button key={o.value} className={cx(s.filter, o.value === value && s.filterOn)} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
export function MiniChips<T extends string | number>({ options, value, onChange, style }: { options: { value: T; label: string }[]; value?: T; onChange: (v: T) => void; style?: CSSProperties }) {
  return (
    <Row gap={8} justify="center" style={style}>
      {options.map((o) => (
        <button key={String(o.value)} className={cx(s.miniChip, o.value === value && s.miniChipOn)} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </Row>
  )
}
export function Toggle({ on, onChange, label, ink }: { on: boolean; onChange: (v: boolean) => void; label: string; ink?: boolean }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={cx(s.toggle, on && s.toggleOn, ink && s.toggleInk)} onClick={() => onChange(!on)} />
}
export function RadioCard({ selected, onClick, title, sub, radio = true, style }: { selected: boolean; onClick: () => void; title: ReactNode; sub?: ReactNode; radio?: boolean; style?: CSSProperties }) {
  return (
    <button role="radio" aria-checked={selected} className={cx(s.radioCard, selected && s.radioOn)} onClick={onClick} style={style}>
      <div className={s.rowMain}>
        <div className={s.rowTitle}>{title}</div>
        {sub && <div className={s.rowSub}>{sub}</div>}
      </div>
      {radio && <span className={s.radio} />}
    </button>
  )
}

/* ───────── Inputs ───────── */
interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode
  hint?: ReactNode
  leading?: ReactNode
  error?: string
  sans?: boolean
  active?: boolean
  fieldStyle?: CSSProperties
  inputStyle?: CSSProperties
}
export function TextField({ label, hint, leading, error, sans, active, fieldStyle, inputStyle, id, ...rest }: FieldProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div>
      {label && (
        <label className={s.fieldLabel} htmlFor={fid}>
          {label}
        </label>
      )}
      <div className={cx(s.field, active && s.fieldActive)} style={fieldStyle}>
        {leading}
        <input id={fid} className={cx(s.fieldInput, sans && s.fieldSans)} style={inputStyle} {...rest} />
        {hint && <span className={s.fieldHint}>{hint}</span>}
      </div>
      {error && <div className={s.fieldError}>{error}</div>}
    </div>
  )
}
export const FieldLabel = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div className={s.fieldLabel} style={style}>
    {children}
  </div>
)

export function NumPad({ onKey }: { onKey: (k: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
  return (
    <div className={s.numpad}>
      {keys.map((k) => (
        <button key={k} className={s.key} onClick={() => onKey(k)} aria-label={k === '⌫' ? 'Delete' : k}>
          {k === '⌫' ? <Icon name="backspace" size={24} /> : k}
        </button>
      ))}
    </div>
  )
}

/* ───────── Skeleton ───────── */
export const Skeleton = ({ h = 20, w = '100%', r = 12, style }: { h?: number; w?: number | string; r?: number; style?: CSSProperties }) => (
  <div className={s.skel} style={{ height: h, width: w, borderRadius: r, ...style }} />
)

/* ───────── Toast ───────── */
const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = useCallback((m: string) => {
    setMsg(m)
    if (t.current) clearTimeout(t.current)
    t.current = setTimeout(() => setMsg(null), 2200)
  }, [])
  useEffect(() => () => void (t.current && clearTimeout(t.current)), [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <motion.div role="status" className={s.toast} initial={{ opacity: 0, y: -12, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }}>
          <Icon name="check" size={16} color="var(--sig)" />
          {msg}
        </motion.div>
      )}
    </ToastCtx.Provider>
  )
}

export { s as uiStyles }

/* ───────── Panels & feedback ───────── */
export function Panel({ title, action, children, style, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <section className={cx(s.panel, className)} style={style}>
      {(title || action) && (
        <div className={s.panelHead}>
          {title && <h2 className={s.panelTitle}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
export function Notice({ children, tone = 'neutral', icon, style }: { children: ReactNode; tone?: 'neutral' | 'flare' | 'sig' | 'chain'; icon?: IconName; style?: CSSProperties }) {
  const t = { neutral: '', flare: s.noticeFlare, sig: s.noticeSig, chain: s.noticeChain }[tone]
  return (
    <div className={cx(s.notice, t)} style={style} role={tone === 'flare' ? 'alert' : undefined}>
      {icon && <Icon name={icon} size={18} style={{ flexShrink: 0, marginTop: 1 }} />}
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  )
}
export function EmptyState({ icon = 'circles', title, children, action }: { icon?: IconName; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <Tile size={52} radius={16}>
        <Icon name={icon} size={22} />
      </Tile>
      <div className={s.emptyTitle}>{title}</div>
      {children && <div style={{ maxWidth: 360 }}>{children}</div>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  )
}
export const Soon = ({ children = 'Coming soon' }: { children?: ReactNode }) => <span className={s.soon}>{children}</span>
export const Stat = ({ label, value, sub, style }: { label: ReactNode; value: ReactNode; sub?: ReactNode; style?: CSSProperties }) => (
  <div className={s.stat} style={style}>
    <span className={s.statLabel}>{label}</span>
    <span className={s.statValue}>{value}</span>
    {sub && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{sub}</span>}
  </div>
)
export const TextButton = ({ children, onClick, danger, style }: { children: ReactNode; onClick?: () => void; danger?: boolean; style?: CSSProperties }) => (
  <button type="button" className={cx(s.textBtn, danger && s.dangerBtn)} onClick={onClick} style={style}>
    {children}
  </button>
)

/** Serif amount from an API decimal string: <Money value="74.5" ccy="USDT" /> */
export const Money = ({ value, ...rest }: { value: string | null | undefined } & Omit<Parameters<typeof Amount>[0], 'minor'>) => <Amount minor={cents(value)} {...rest} />

/** A readable message for any thrown error. */
export function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return 'Something went wrong. Please try again.'
}

/* ───────── Dialog ───────── */
export function Modal({ open, onClose, title, sub, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; children?: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  // Rendered into <body> so it sits above the tab bar and side navigation, whatever screen opens it.
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className={s.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx(s.sheet, wide && s.sheetWide)}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className={s.sheetGrip} />
            <div className={s.sheetHead}>
              <div>
                <h2 className={s.sheetTitle}>{title}</h2>
                {sub && <p style={{ color: 'var(--body)', marginTop: 6, fontSize: 14.5, lineHeight: '21px' }}>{sub}</p>}
              </div>
              <IconButton icon="close" label="Close" onClick={onClose} />
            </div>
            {children}
            {footer && <div className={s.sheetFoot}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ───────── PIN ───────── */
export function PinInput({ value, onChange, error, autoFocus = true, label = 'Transaction PIN', reveal }: { value: string; onChange: (v: string) => void; error?: boolean; autoFocus?: boolean; label?: string; reveal?: boolean }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className={s.pinRow}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={cx(s.pinBox, focused && i === Math.min(value.length, 5) && s.pinBoxOn, error && s.pinBoxErr)} aria-hidden>
          {value[i] ? (reveal ? value[i] : '•') : ''}
        </div>
      ))}
      <input
        className={s.pinHidden}
        aria-label={label}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus={autoFocus}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
    </div>
  )
}

interface PinRequest {
  title: string
  sub?: ReactNode
  confirmLabel?: string
  run: (pin: string) => Promise<unknown>
}
const PinCtx = createContext<(req: PinRequest) => void>(() => {})
/** Ask for the transaction PIN, run the money move with it, and keep the dialog open on errors. */
export const usePin = () => useContext(PinCtx)
export function PinProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<PinRequest | null>(null)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ask = useCallback((r: PinRequest) => {
    setPin('')
    setError(null)
    setReq(r)
  }, [])
  const close = useCallback(() => {
    if (!busy) setReq(null)
  }, [busy])
  const submit = async () => {
    if (!req || pin.length !== 6) return
    setBusy(true)
    setError(null)
    try {
      await req.run(pin)
      setReq(null)
    } catch (e) {
      setError(errorText(e))
      setPin('')
    } finally {
      setBusy(false)
    }
  }
  return (
    <PinCtx.Provider value={ask}>
      {children}
      <Modal
        open={!!req}
        onClose={close}
        title={req?.title ?? ''}
        sub={req?.sub ?? 'Enter your 6-digit transaction PIN to confirm.'}
        footer={
          <Button disabled={pin.length !== 6} loading={busy} onClick={submit}>
            {req?.confirmLabel ?? 'Confirm'}
          </Button>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <PinInput value={pin} onChange={setPin} error={!!error} />
        </form>
        {error && <div style={{ color: 'var(--flare)', fontSize: 14, marginTop: 6 }}>{error}</div>}
      </Modal>
    </PinCtx.Provider>
  )
}
