import { motion } from 'framer-motion'
import { Eyebrow, Icon } from '@/ui'
import s from './intro.module.css'

const float = { animate: { y: [0, -10, 0] }, transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' as const } }

/** Savings box with USDT tags (board 01). */
export function SaveArt() {
  return (
    <div className={s.boxWrap}>
      <div className={s.shadow} />
      <motion.div className={s.box} {...float}>
        <div className={s.boxLid}>
          <div className={s.slot} />
        </div>
      </motion.div>
      <motion.div className={`${s.tag} ${s.tagNaira}`} animate={{ y: [0, 6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}>
        +250 USDT
      </motion.div>
      <motion.div className={`${s.tag} ${s.tagUsdt}`} animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}>
        12% a year
      </motion.div>
    </div>
  )
}

/** Circle of seats around this month's pot (board 02). */
export function CirclesArt() {
  const R = 131
  const c = 150
  return (
    <div className={s.orbit}>
      <svg width={300} height={300} style={{ position: 'absolute', inset: 0 }} aria-hidden>
        <circle cx={c} cy={c} r={R} fill="none" stroke="var(--accent)" strokeOpacity={0.7} strokeWidth={1} />
      </svg>
      <motion.div style={{ position: 'absolute', inset: 0 }} animate={{ rotate: 360 }} transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}>
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((-90 + i * 36) * Math.PI) / 180
          const kind = i <= 3 ? 'k' : i === 6 ? 'hi' : 'm'
          const d = kind === 'hi' ? 40 : 34
          return (
            <span
              key={i}
              className={`${s.orbitDot} ${kind === 'k' ? s.dotKolofi : kind === 'hi' ? s.dotHi : s.dotMember}`}
              style={{ width: d, height: d, left: c + R * Math.cos(a) - d / 2, top: c + R * Math.sin(a) - d / 2 }}
            />
          )
        })}
      </motion.div>
      <div className={s.orbitCenter}>
        <Eyebrow accent>This month&apos;s pot</Eyebrow>
        <div className={s.orbitAmount}>1,000</div>
        <Eyebrow>USDT</Eyebrow>
      </div>
    </div>
  )
}

/** Payment records stacking up (board 03). */
export function LedgerArt() {
  return (
    <div className={s.blocks}>
      <motion.div className={s.block} style={{ left: 0, top: 0, width: 258 }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className={s.blockMeta}>RECORD · 18,204,329</div>
        <div className={s.blockLine}>
          <span>Collateral locked</span>
          <span className="mono">500.00</span>
        </div>
      </motion.div>
      <motion.div className={s.block} style={{ left: 40, top: 84, width: 262 }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className={s.blockMeta}>RECORD · 18,204,330</div>
        <div className={s.blockLine}>
          <span>Ada paid in</span>
          <span className="mono">102.00</span>
        </div>
      </motion.div>
      <motion.div className={`${s.block} ${s.confirmed}`} style={{ left: 12, top: 172, width: 290 }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 22 }}>
        <div className={s.blockMeta}>
          <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--accent)' }} />
            SETTLED
          </span>
          <span>RECORD · 18,204,331</span>
        </div>
        <div className={s.blockLine}>
          <span>Pot paid → Seat 07</span>
          <span className="mono">990.00</span>
        </div>
        <span className={s.tx}>
          Recorded <Icon name="check" size={12} color="var(--chain)" />
        </span>
      </motion.div>
    </div>
  )
}

export const slides = [
  {
    eyebrow: 'Kólófi Save',
    title: (
      <>
        Save in dollars,
        <br />
        earn while
        <br />
        you sleep.
      </>
    ),
    lead: 'Send USDT to your Kólófi wallet, move it into a goal or a locked plan, and watch interest land every day.',
    art: <SaveArt />,
  },
  {
    eyebrow: 'Kólófi Circles',
    title: (
      <>
        Ajo where
        <br />
        nobody can run
        <br />
        with the pot.
      </>
    ),
    lead: 'Every member locks collateral before the first payment, so the pot reaches each person on their turn.',
    art: <CirclesArt />,
  },
  {
    eyebrow: 'Accounted for',
    title: (
      <>
        Every USDT,
        <br />
        on the record.
      </>
    ),
    lead: 'Every payment in and out is recorded the moment it happens, so your balance, savings and circle are always exact.',
    art: <LedgerArt />,
  },
]
