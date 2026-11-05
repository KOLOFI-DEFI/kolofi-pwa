import { motion } from 'framer-motion'
import { useId, type CSSProperties, type ReactNode } from 'react'
/** One seat on the circle ring. Build these from `Circle.seats` with `ringSpots()`. */
export interface CircleSpot {
  n: number
  state: 'kolofi' | 'paid' | 'pot' | 'you' | 'member' | 'open'
  label?: string
}

/** Seats → ring spots: house seats show as Kólófi, paid-out seats ticked, the current cycle's slot as the pot. */
export function ringSpots(seats: { slot: number; type: string; is_me: boolean; status: string; member: string | null }[], currentCycle: number): CircleSpot[] {
  return seats.map((s) => ({
    n: s.slot,
    state:
      s.slot === currentCycle && currentCycle > 0
        ? 'pot'
        : s.is_me
          ? 'you'
          : s.status === 'paid_out' || s.status === 'completed'
            ? 'paid'
            : s.type === 'house'
              ? 'kolofi'
              : s.member === null
                ? 'open'
                : 'member',
    label: s.is_me ? 'YOU' : undefined,
  }))
}
import { Icon } from './Icon'

/* ───────── Line chart (Home balance) ───────── */
export function LineChart({ values, height = 130 }: { values: number[]; height?: number }) {
  const id = useId().replace(/:/g, '')
  const W = 390
  const H = height
  const pad = 10
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (W - pad) , pad + (1 - (v - min) / span) * (H - pad * 3.5)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${W - pad},${H} L0,${H} Z`
  const [ex, ey] = pts[pts.length - 1]!
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill={`url(#g${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
      <defs>
        <clipPath id={`c${id}`}>
          <motion.rect x={0} y={-20} height={H + 40} initial={{ width: 0 }} animate={{ width: W + 20 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
        </clipPath>
      </defs>
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" clipPath={`url(#c${id})`} />
      <circle cx={ex} cy={ey} r={10} fill="var(--accent)" opacity={0.18} />
      <circle cx={ex} cy={ey} r={5} fill="var(--accent)" />
    </svg>
  )
}

/* ───────── Bar chart (Save monthly) ───────── */
export function BarChart({ values, labels, height = 74 }: { values: number[]; labels: [string, string, string]; height?: number }) {
  const max = Math.max(...values)
  const n = values.length
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
        {values.map((v, i) => {
          const tone = i === n - 1 ? 'var(--sig)' : i >= n - 3 ? 'var(--accent-soft)' : 'var(--surface2)'
          return (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.03, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ flex: 1, height: `${Math.max(6, (v / max) * 100)}%`, background: tone, borderRadius: 4, transformOrigin: 'bottom' }}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, color: 'var(--muted)' }}>
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  )
}

/* ───────── Gauge (Trust score) ───────── */
export function Gauge({ value, max, children, size = 270 }: { value: number; max: number; children?: ReactNode; size?: number }) {
  const r = size * 0.42
  const cx = size / 2
  const cy = size * 0.52
  const sw = size * 0.085
  const a0 = -100
  const a1 = 100
  const pt = (deg: number) => {
    const t = (deg * Math.PI) / 180
    return [cx + r * Math.sin(t), cy - r * Math.cos(t)] as const
  }
  const arc = (from: number, to: number) => {
    const [x0, y0] = pt(from)
    const [x1, y1] = pt(to)
    return `M${x0},${y0} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1},${y1}`
  }
  const frac = Math.max(0, Math.min(1, value / max))
  const end = a0 + (a1 - a0) * frac
  const h = cy + r * 0.2 + sw / 2
  return (
    <div style={{ position: 'relative', width: size, height: h, margin: '0 auto' }}>
      <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} aria-hidden>
        <path d={arc(a0, a1)} stroke="var(--surface2)" strokeWidth={sw} fill="none" />
        <motion.path
          d={arc(a0, end)}
          stroke="var(--accent)"
          strokeWidth={sw}
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: cy - r * 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{children}</div>
    </div>
  )
}

/* ───────── Circle ring (Circle detail) ───────── */
const spotStyle = (state: CircleSpot['state']) => {
  switch (state) {
    case 'paid':
    case 'kolofi':
      return { background: 'var(--chain-soft)', border: '1.5px dashed var(--chain)', color: 'var(--chain)' }
    case 'pot':
      return { background: 'var(--sig)', border: '0', color: 'var(--on-sig)', boxShadow: '0 0 0 8px color-mix(in srgb, var(--sig) 25%, transparent), 0 0 28px var(--glow)' }
    case 'you':
      return { background: 'var(--bg)', border: '2px solid var(--accent)', color: 'var(--accent)' }
    case 'open':
      return { background: 'transparent', border: '1.5px dashed var(--line-strong)', color: 'var(--faint)' }
    default:
      return { background: 'var(--surface2)', border: '1px solid var(--line-strong)', color: 'var(--muted)' }
  }
}

export function CircleRing({ spots, size = 300, children }: { spots: CircleSpot[]; size?: number; children?: ReactNode }) {
  const R = size * 0.465
  const c = size / 2
  const n = spots.length
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }} aria-hidden>
        <defs>
          <radialGradient id="ringGlow">
            <stop offset="0" stopColor="var(--sig)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--sig)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={size * 0.36} fill="url(#ringGlow)" />
        <circle cx={c} cy={c} r={R} fill="none" stroke="var(--line-strong)" strokeWidth={1} />
        <circle cx={c} cy={c} r={size * 0.33} fill="none" stroke="var(--line-strong)" strokeDasharray="3 4" strokeWidth={1} />
      </svg>
      {spots.map((sp, i) => {
        const a = ((-90 + (i * 360) / n) * Math.PI) / 180
        const big = sp.state === 'pot' || sp.state === 'you'
        const d = big ? 46 : 42
        const x = c + R * Math.cos(a) - d / 2
        const y = c + R * Math.sin(a) - d / 2
        return (
          <motion.div
            key={sp.n}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.04 * i, type: 'spring', stiffness: 380, damping: 24 }}
            style={{
              position: 'absolute', left: x, top: y, width: d, height: d, borderRadius: '50%', display: 'grid', placeItems: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: 0.5, ...spotStyle(sp.state),
            }}
            aria-label={`Spot ${sp.n}: ${sp.state}`}
          >
            {sp.state === 'paid' ? <Icon name="check" size={16} stroke={2} /> : sp.label ?? String(sp.n).padStart(2, '0')}
          </motion.div>
        )
      })}
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  )
}

export function RingLegend() {
  const item = (style: CSSProperties, label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', ...style }} />
      {label}
    </span>
  )
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 18, fontSize: 12, color: 'var(--muted)' }}>
      {item({ border: '1.5px dashed var(--chain)' }, 'Kólófi spot')}
      {item({ background: 'var(--sig)' }, 'Collecting')}
      {item({ border: '2px solid var(--accent)' }, 'You')}
      {item({ background: 'var(--surface2)', border: '1px solid var(--line-strong)' }, 'Member')}
    </div>
  )
}
