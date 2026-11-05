import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button, Dots, Eyebrow, Hero, Icon, Lead, Screen } from '@/ui'
import { useSession } from '@/state/session'
import s from './intro.module.css'

const float = { animate: { y: [0, -10, 0] }, transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' as const } }

function IntroLayout({ step, eyebrow, title, lead, cta, next, art }: { step: number; eyebrow: string; title: ReactNode; lead: string; cta: string; next: string; art: ReactNode }) {
  const nav = useNavigate()
  const setStage = useSession((x) => x.setStage)
  const toAuth = () => {
    setStage('phone')
    nav('/auth/phone')
  }
  return (
    <Screen hero="glow">
      <Button variant="ghost" className={s.skip} onClick={toAuth}>
        Skip
      </Button>
      <div className={s.stage}>
        <motion.div key={step} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>
          {art}
        </motion.div>
      </div>
      <motion.div className={s.content} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
        <Dots total={3} current={step} />
        <Eyebrow accent style={{ marginTop: 18 }}>
          {eyebrow}
        </Eyebrow>
        <Hero style={{ marginTop: 14 }}>{title}</Hero>
        <Lead style={{ marginTop: 14 }}>{lead}</Lead>
      </motion.div>
      <div className={s.cta}>
        <Button glow onClick={() => (next === 'auth' ? toAuth() : nav(next))}>
          {cta}
        </Button>
        <p className={s.login}>
          Already have an account?{' '}
          <button onClick={toAuth}>
            <b>Log in</b>
          </button>
        </p>
      </div>
    </Screen>
  )
}

export function IntroSave() {
  return (
    <IntroLayout
      step={0}
      eyebrow="Kólófi Save"
      title={<>Save in dollars,<br />straight from<br />your Naira.</>}
      lead="Pick an amount once. We change it to USDT and it earns interest while you sleep."
      cta="Continue"
      next="/intro/circles"
      art={
        <div className={s.boxWrap}>
          <div className={s.shadow} />
          <motion.div className={s.box} {...float}>
            <div className={s.boxLid}>
              <div className={s.slot} />
            </div>
          </motion.div>
          <motion.div className={`${s.tag} ${s.tagNaira}`} animate={{ y: [0, 6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}>
            ₦20,000
          </motion.div>
          <motion.div className={`${s.tag} ${s.tagUsdt}`} animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}>
            → 13.33 USDT
          </motion.div>
        </div>
      }
    />
  )
}

export function IntroCircles() {
  const R = 131
  const c = 150
  const dots = Array.from({ length: 10 }, (_, i) => i)
  return (
    <IntroLayout
      step={1}
      eyebrow="Kólófi Circles"
      title={<>Ajo where<br />nobody can run<br />with the pot.</>}
      lead="Everyone puts down a safety deposit. A smart contract pays each person on their day."
      cta="Continue"
      next="/intro/onchain"
      art={
        <div className={s.orbit}>
          <svg width={300} height={300} style={{ position: 'absolute', inset: 0 }} aria-hidden>
            <circle cx={c} cy={c} r={R} fill="none" stroke="var(--accent)" strokeOpacity={0.7} strokeWidth={1} />
          </svg>
          <motion.div style={{ position: 'absolute', inset: 0 }} animate={{ rotate: 360 }} transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}>
            {dots.map((i) => {
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
      }
    />
  )
}

export function IntroOnchain() {
  return (
    <IntroLayout
      step={2}
      eyebrow="On-chain"
      title={<>Every kobo,<br />on the record.</>}
      lead="Your wallet, your circle’s vault and every payment are on-chain, so anyone can check."
      cta="Get started"
      next="auth"
      art={
        <div className={s.blocks}>
          <motion.div className={s.block} style={{ left: 0, top: 0, width: 258 }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className={s.blockMeta}>BLOCK 18,204,329</div>
            <div className={s.blockLine}>
              <span>Deposit locked</span>
              <span className="mono">500.00</span>
            </div>
          </motion.div>
          <motion.div className={s.block} style={{ left: 40, top: 84, width: 262 }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className={s.blockMeta}>BLOCK 18,204,330</div>
            <div className={s.blockLine}>
              <span>Ada paid in</span>
              <span className="mono">101.00</span>
            </div>
          </motion.div>
          <motion.div className={`${s.block} ${s.confirmed}`} style={{ left: 12, top: 172, width: 290 }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 22 }}>
            <div className={s.blockMeta}>
              <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--accent)' }} />
                CONFIRMED
              </span>
              <span>BLOCK 18,204,331</span>
            </div>
            <div className={s.blockLine}>
              <span>Pot sent → Spot 02</span>
              <span className="mono">995.00</span>
            </div>
            <span className={s.tx}>
              tx 0x91de…08ac <Icon name="external" size={11} color="var(--chain)" />
            </span>
          </motion.div>
        </div>
      }
    />
  )
}
