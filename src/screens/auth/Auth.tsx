import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ApiError } from '@/core/api'
import { useLogin, useRegister, useForgotPassword, useResetPassword, useSendEmailCode, useSetPin, useVerifyEmail, getApi } from '@/core/data'
import { useInstall } from '@/app/install'
import { useTheme } from '@/app/ThemeProvider'
import { useSession } from '@/state/session'
import { Button, Dots, Eyebrow, Header, Hero, Icon, Lead, Notice, PinInput, Row, TextField, Tile, errorText, useToast, uiStyles as u, cx } from '@/ui'
import { slides } from './Art'
import a from './auth.module.css'
import s from './intro.module.css'

/* ═════════ Layout ═════════ */

/** Rotates through the three product stories on the desktop brand panel. */
function useSlide(start = 0, ms = 6500) {
  const [i, setI] = useState(start)
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), ms)
    return () => clearInterval(t)
  }, [ms])
  return [i, setI] as const
}

function BrandPanel({ start = 0 }: { start?: number }) {
  const [i, setI] = useSlide(start)
  const slide = slides[i]!
  return (
    <aside className={a.brand} aria-hidden="false">
      <img className={a.brandLogo} src="/kolofi-logo-light.svg" alt="Kólófi" />
      <div className={a.brandArt}>
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.45 }}>
            {slide.art}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className={a.brandCopy}>
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35 }}>
            <Eyebrow accent>{slide.eyebrow}</Eyebrow>
            <h2 className={a.brandTitle}>{slide.title}</h2>
            <p className={a.brandLead}>{slide.lead}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className={a.brandFoot}>
        <div className={a.brandDots} role="tablist" aria-label="Story">
          {slides.map((sl, n) => (
            <button key={n} role="tab" aria-selected={n === i} aria-label={sl.eyebrow} className={cx(a.brandDot, n === i && a.brandDotOn)} onClick={() => setI(n)} />
          ))}
        </div>
        <span className={a.brandSafe}>
          <Icon name="shield" size={14} />
          Save in USDT · Join ajo circles
        </span>
      </div>
    </aside>
  )
}

interface AuthLayoutProps {
  title: ReactNode
  lead?: ReactNode
  eyebrow?: string
  children: ReactNode
  actions: ReactNode
  onSubmit: () => void
  back?: string | (() => void)
  top?: { text: string; label: string; to: string }
  slide?: number
}

/** Phone: the board's single column with sticky actions. Desktop: brand panel left, form right. */
function AuthLayout({ title, lead, eyebrow, children, actions, onSubmit, back, top, slide }: AuthLayoutProps) {
  const nav = useNavigate()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }
  return (
    <div className={a.page}>
      <BrandPanel start={slide} />
      <div className={a.formSide}>
        <div className={a.topbar}>
          {back ? <Header back={typeof back === 'string' ? () => nav(back) : back} /> : <span />}
          {top && (
            <span className={a.topLink}>
              {top.text}
              <Link to={top.to}>{top.label}</Link>
            </span>
          )}
        </div>
        <div className={a.formWrap}>
          <form className={a.form} onSubmit={submit} noValidate>
            {eyebrow && <Eyebrow accent style={{ marginBottom: 12 }}>{eyebrow}</Eyebrow>}
            <Hero>{title}</Hero>
            {lead && <Lead style={{ marginTop: 12 }}>{lead}</Lead>}
            {children}
            <div className={a.actions}>{actions}</div>
          </form>
        </div>
      </div>
    </div>
  )
}

/** Field errors from a failed request, keyed by API field name. */
function useFieldErrors(error: unknown) {
  return (name: string) => (error instanceof ApiError ? error.field(name) : undefined)
}
const formError = (error: unknown) => (error && !(error instanceof ApiError && error.code === 'VALIDATION' && Object.keys(error.fields).length) ? errorText(error) : null)

/* ═════════ Welcome ═════════ */
export function Welcome() {
  const nav = useNavigate()
  const setIntroSeen = useSession((x) => x.setIntroSeen)
  const [step, setStep] = useState(0)
  const slide = slides[step]!
  const go = (to: string) => {
    setIntroSeen()
    nav(to)
  }
  const last = step === slides.length - 1
  const { scheme } = useTheme()
  const installer = useInstall()

  return (
    <div className={a.page}>
      <BrandPanel />
      <div className={cx(a.formSide, a.welcomeSide)}>
          {/* Phone: boards 01–03 as a story */}
          <div className={cx(a.welcomeTop, a.phoneOnly)}>
            <img src={scheme === 'dark' ? '/kolofi-logo-light.svg' : '/kolofi-logo.svg'} alt="Kólófi" style={{ height: 22 }} />
            <Row gap={8}>
              {installer.available && (
                <Button variant="ghost" icon="download" onClick={installer.install} style={{ width: 'auto', height: 36, padding: '0 14px' }}>
                  Install
                </Button>
              )}
              <Button variant="ghost" onClick={() => go('/login')} style={{ width: 'auto', height: 36, padding: '0 14px' }}>
                Log in
              </Button>
            </Row>
          </div>
          <div className={cx(a.welcomeStage, a.phoneOnly)}>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                {slide.art}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className={cx(a.welcomeCopy, a.phoneOnly)}>
            <Dots total={slides.length} current={step} />
            <Eyebrow accent style={{ marginTop: 18 }}>
              {slide.eyebrow}
            </Eyebrow>
            <Hero style={{ marginTop: 14 }}>{slide.title}</Hero>
            <Lead style={{ marginTop: 14 }}>{slide.lead}</Lead>
            <div className={s.cta}>
              <Button glow onClick={() => (last ? go('/signup') : setStep(step + 1))}>
                {last ? 'Create your account' : 'Continue'}
              </Button>
              <p className={s.login}>
                Already have an account?{' '}
                <button onClick={() => go('/login')}>
                  <b>Log in</b>
                </button>
              </p>
            </div>
          </div>

          {/* Desktop: a choice panel beside the story */}
          <div className={cx(a.formWrap, a.desktopWelcome)}>
            <div className={a.form}>
              <div className={a.welcomeChoices}>
                <Eyebrow accent>Welcome to Kólófi</Eyebrow>
                <Hero style={{ marginTop: 4 }}>Your money, saved in dollars and shared fairly.</Hero>
                <Lead style={{ marginTop: 4, marginBottom: 12 }}>Open an account in two minutes. All you need is an email address and a Nigerian phone number.</Lead>
                <button className={a.choice} onClick={() => go('/signup')}>
                  <Tile tone="sig" size={44} radius={14}>
                    <Icon name="plus" size={20} />
                  </Tile>
                  <span style={{ flex: 1 }}>
                    <span className={a.choiceTitle}>Create an account</span>
                    <span className={a.choiceSub} style={{ display: 'block' }}>Save in USDT and join circles</span>
                  </span>
                  <Icon name="chevronRight" size={18} />
                </button>
                <button className={a.choice} onClick={() => go('/login')}>
                  <Tile size={44} radius={14}>
                    <Icon name="user" size={20} />
                  </Tile>
                  <span style={{ flex: 1 }}>
                    <span className={a.choiceTitle}>Log in</span>
                    <span className={a.choiceSub} style={{ display: 'block' }}>Welcome back</span>
                  </span>
                  <Icon name="chevronRight" size={18} />
                </button>
                {installer.available && (
                  <button className={a.choice} onClick={installer.install}>
                    <Tile size={44} radius={14}>
                      <Icon name="download" size={20} />
                    </Tile>
                    <span style={{ flex: 1 }}>
                      <span className={a.choiceTitle}>Install the app</span>
                      <span className={a.choiceSub} style={{ display: 'block' }}>Open Kólófi from your desktop or home screen</span>
                    </span>
                    <Icon name="chevronRight" size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
      </div>
      {installer.dialog}
    </div>
  )
}

/* ═════════ Log in ═════════ */
export function Login() {
  const nav = useNavigate()
  const signIn = useSession((x) => x.signIn)
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const fe = useFieldErrors(login.error)

  const submit = async () => {
    if (!email || !password) return
    const res = await login.mutateAsync({ email: email.trim(), password }).catch(() => null)
    if (res) {
      signIn(res.token, res.user)
      nav('/', { replace: true })
    }
  }

  return (
    <AuthLayout
      back="/welcome"
      top={{ text: 'New to Kólófi?', label: 'Create account', to: '/signup' }}
      eyebrow="Welcome back"
      title="Log in to Kólófi"
      lead="Use the email and password you signed up with."
      onSubmit={submit}
      slide={0}
      actions={
        <>
          <Button type="submit" disabled={!email || !password} loading={login.isPending}>
            Log in
          </Button>
          <p className={cx(a.switch, a.phoneOnly)}>
            New to Kólófi? <Link to="/signup">Create an account</Link>
          </p>
        </>
      }
    >
      <div className={a.fields}>
        <TextField label="Email" type="email" autoComplete="email" sans value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" error={fe('email')} autoFocus />
        <TextField label="Password" type="password" autoComplete="current-password" sans value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" error={fe('password')} />
        <Link to="/forgot-password" className={a.forgot}>
          Forgot password?
        </Link>
        {formError(login.error) && <Notice tone="flare" icon="info">{formError(login.error)}</Notice>}
      </div>
    </AuthLayout>
  )
}

/* ═════════ Sign up ═════════ */
const rules = [
  { label: '10+ characters', test: (p: string) => p.length >= 10 },
  { label: 'Upper & lower case', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'A number', test: (p: string) => /\d/.test(p) },
]

export function Signup() {
  const nav = useNavigate()
  const signIn = useSession((x) => x.signIn)
  const register = useRegister()
  const [f, setF] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', confirm: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const fe = useFieldErrors(register.error)
  const digits = f.phone.replace(/\D/g, '').replace(/^0/, '').slice(0, 10)
  const strong = rules.every((r) => r.test(f.password))
  const ready = f.first_name && f.last_name && f.email.includes('@') && digits.length === 10 && strong && f.password === f.confirm

  const submit = async () => {
    if (!ready) return
    const res = await register
      .mutateAsync({ first_name: f.first_name.trim(), last_name: f.last_name.trim(), email: f.email.trim(), phone: `+234${digits}`, password: f.password, password_confirmation: f.confirm })
      .catch(() => null)
    if (res) {
      signIn(res.token, res.user)
      nav('/auth/verify', { replace: true })
    }
  }

  return (
    <AuthLayout
      back="/welcome"
      top={{ text: 'Already have an account?', label: 'Log in', to: '/login' }}
      eyebrow="Step 1 of 3"
      title="Create your account"
      lead="We’ll send a code to your email to confirm it’s you."
      onSubmit={submit}
      slide={1}
      actions={
        <>
          <p className={a.terms}>By continuing you agree to Kólófi’s Terms and Privacy Policy.</p>
          <Button type="submit" disabled={!ready} loading={register.isPending}>
            Create account
          </Button>
          <p className={cx(a.switch, a.phoneOnly)}>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </>
      }
    >
      <div className={a.fields}>
        <div className={a.row2}>
          <TextField label="First name" sans autoComplete="given-name" value={f.first_name} onChange={set('first_name')} error={fe('first_name')} autoFocus />
          <TextField label="Last name" sans autoComplete="family-name" value={f.last_name} onChange={set('last_name')} error={fe('last_name')} />
        </div>
        <TextField label="Email" type="email" sans autoComplete="email" value={f.email} onChange={set('email')} placeholder="you@example.com" error={fe('email')} />
        <TextField
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={f.phone}
          onChange={set('phone')}
          placeholder="803 123 4567"
          error={fe('phone')}
          leading={
            <span className={cx(a.cc)} style={{ display: 'inline-flex', alignItems: 'center', paddingLeft: 0 }}>
              <span className={a.flag} aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className={a.ccText}>+234</span>
            </span>
          }
        />
        <div>
          <TextField label="Password" type="password" sans autoComplete="new-password" value={f.password} onChange={set('password')} error={fe('password')} />
          <div className={a.rules}>
            {rules.map((r) => (
              <span key={r.label} className={cx(r.test(f.password) && a.ruleOk)}>
                <Icon name={r.test(f.password) ? 'check' : 'personal'} size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                {r.label}
              </span>
            ))}
          </div>
        </div>
        <TextField
          label="Confirm password"
          type="password"
          sans
          autoComplete="new-password"
          value={f.confirm}
          onChange={set('confirm')}
          error={f.confirm && f.confirm !== f.password ? 'The passwords do not match.' : undefined}
        />
        {formError(register.error) && <Notice tone="flare" icon="info">{formError(register.error)}</Notice>}
      </div>
    </AuthLayout>
  )
}

/* ═════════ Verify email ═════════ */
export function VerifyEmail() {
  const nav = useNavigate()
  const toast = useToast()
  const { user, setUser, signOut } = useSession()
  const verify = useVerifyEmail()
  const resend = useSendEmailCode()
  const [code, setCode] = useState('')
  const [wait, setWait] = useState(60)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait(wait - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const submit = async () => {
    if (code.length !== 6) return
    const ok = await verify.mutateAsync(code).catch(() => null)
    if (ok && user) {
      setUser({ ...user, email_verified: true })
      nav('/auth/pin', { replace: true })
    } else setCode('')
  }
  useEffect(() => {
    if (code.length === 6) void submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <AuthLayout
      back={() => {
        signOut()
        nav('/login')
      }}
      eyebrow="Step 2 of 3"
      title="Check your email"
      lead={
        <>
          Enter the 6-digit code we sent to <b style={{ color: 'var(--text)' }}>{user?.email}</b>.
        </>
      }
      onSubmit={submit}
      slide={2}
      actions={
        <Button type="submit" disabled={code.length !== 6} loading={verify.isPending}>
          Verify email
        </Button>
      }
    >
      <PinInput value={code} onChange={setCode} reveal label="Email code" error={!!verify.error} />
      {verify.error && <div style={{ color: 'var(--flare)', fontSize: 14 }}>{errorText(verify.error)}</div>}
      <p className={a.resend}>
        Didn’t get it?{' '}
        <button
          type="button"
          disabled={wait > 0 || resend.isPending}
          onClick={async () => {
            await resend.mutateAsync().then(() => toast('New code sent'), (e) => toast(errorText(e)))
            setWait(60)
          }}
        >
          {wait > 0 ? `Resend in 0:${String(wait).padStart(2, '0')}` : 'Send a new code'}
        </button>
      </p>
    </AuthLayout>
  )
}

/* ═════════ Transaction PIN ═════════ */
export function SetPin() {
  const nav = useNavigate()
  const { user, setUser } = useSession()
  const setPin = useSetPin()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [pin, setPinValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [password, setPassword] = useState('')
  const weak = ['000000', '111111', '123456', '654321', '121212'].includes(pin)
  const fe = useFieldErrors(setPin.error)

  const submit = async () => {
    if (step === 0 && pin.length === 6 && !weak) return setStep(1)
    if (step === 1 && confirm.length === 6) return confirm === pin ? setStep(2) : setConfirm('')
    if (step === 2 && password) {
      const ok = await setPin.mutateAsync({ password, pin, pin_confirmation: confirm }).then(() => true, () => false)
      if (ok) {
        const me = await getApi().me.get().catch(() => null)
        setUser(me ?? { ...user!, has_transaction_pin: true })
        nav('/home', { replace: true })
      }
    }
  }

  const titles = ['Choose a transaction PIN', 'Enter it again', 'Confirm with your password']
  const leads = [
    'You’ll use these 6 digits to approve withdrawals, savings and circle payments.',
    'Just to make sure it’s right.',
    'For your security, we need your account password to set a PIN.',
  ]

  return (
    <AuthLayout
      back={step > 0 ? () => setStep((step - 1) as 0 | 1) : undefined}
      eyebrow="Step 3 of 3"
      title={titles[step]}
      lead={leads[step]}
      onSubmit={submit}
      slide={1}
      actions={
        <Button type="submit" loading={setPin.isPending} disabled={(step === 0 && (pin.length !== 6 || weak)) || (step === 1 && confirm.length !== 6) || (step === 2 && !password)}>
          {step === 2 ? 'Set PIN and continue' : 'Continue'}
        </Button>
      }
    >
      <div className={a.pinSteps}>
        {['PIN', 'Confirm', 'Password'].map((l, i) => (
          <span key={l} className={cx(a.pinStep, i === step && a.pinStepOn)}>
            {l}
          </span>
        ))}
      </div>
      {step === 0 && (
        <>
          <PinInput key="p" value={pin} onChange={setPinValue} label="New PIN" error={weak} />
          {weak && <div style={{ color: 'var(--flare)', fontSize: 14 }}>That PIN is too easy to guess. Pick another.</div>}
        </>
      )}
      {step === 1 && (
        <>
          <PinInput key="c" value={confirm} onChange={setConfirm} label="Confirm PIN" />
          {confirm.length === 0 && pin && <div style={{ color: 'var(--muted)', fontSize: 14 }}>Type the same 6 digits.</div>}
        </>
      )}
      {step === 2 && (
        <div className={a.fields}>
          <TextField label="Password" type="password" sans autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fe('password')} autoFocus />
        </div>
      )}
      {setPin.error && !fe('password') && <Notice tone="flare" icon="info" style={{ marginTop: 12 }}>{errorText(setPin.error)}</Notice>}
    </AuthLayout>
  )
}

/* ═════════ Forgot & reset password ═════════ */
export function ForgotPassword() {
  const nav = useNavigate()
  const forgot = useForgotPassword()
  const [email, setEmail] = useState('')
  const submit = async () => {
    if (!email.includes('@')) return
    const ok = await forgot.mutateAsync(email.trim()).then(() => true, () => false)
    if (ok) nav('/reset-password', { state: { email: email.trim() } })
  }
  return (
    <AuthLayout
      back="/login"
      top={{ text: 'Remembered it?', label: 'Log in', to: '/login' }}
      eyebrow="Reset password"
      title="Forgot your password?"
      lead="Enter your email and we’ll send a 6-digit reset code."
      onSubmit={submit}
      slide={2}
      actions={
        <Button type="submit" disabled={!email.includes('@')} loading={forgot.isPending}>
          Send reset code
        </Button>
      }
    >
      <div className={a.fields}>
        <TextField label="Email" type="email" sans autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
        {forgot.error && <Notice tone="flare" icon="info">{errorText(forgot.error)}</Notice>}
      </div>
    </AuthLayout>
  )
}

export function ResetPassword() {
  const nav = useNavigate()
  const toast = useToast()
  const loc = useLocation()
  const reset = useResetPassword()
  const [email, setEmail] = useState((loc.state as { email?: string } | null)?.email ?? '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const fe = useFieldErrors(reset.error)
  const strong = rules.every((r) => r.test(password))
  const ready = email.includes('@') && code.length === 6 && strong && password === confirm

  const submit = async () => {
    if (!ready) return
    const res = await reset.mutateAsync({ email: email.trim(), code, password, password_confirmation: confirm }).catch(() => null)
    if (res) {
      toast('Password changed. Log in with your new password.')
      nav('/login', { replace: true })
    }
  }
  return (
    <AuthLayout
      back="/forgot-password"
      top={{ text: 'Remembered it?', label: 'Log in', to: '/login' }}
      eyebrow="Reset password"
      title="Set a new password"
      lead="Enter the code from your email and choose a new password. For your safety, withdrawals pause for 24 hours after a reset."
      onSubmit={submit}
      slide={2}
      actions={
        <Button type="submit" disabled={!ready} loading={reset.isPending}>
          Change password
        </Button>
      }
    >
      <div className={a.fields}>
        <TextField label="Email" type="email" sans value={email} onChange={(e) => setEmail(e.target.value)} error={fe('email')} />
        <div>
          <div className={u.fieldLabel}>Reset code</div>
          <PinInput value={code} onChange={setCode} reveal autoFocus={false} label="Reset code" />
          {fe('code') && <div className={u.fieldError}>{fe('code')}</div>}
        </div>
        <div>
          <TextField label="New password" type="password" sans autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fe('password')} />
          <div className={a.rules}>
            {rules.map((r) => (
              <span key={r.label} className={cx(r.test(password) && a.ruleOk)}>
                <Icon name={r.test(password) ? 'check' : 'personal'} size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                {r.label}
              </span>
            ))}
          </div>
        </div>
        <TextField label="Confirm new password" type="password" sans autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={confirm && confirm !== password ? 'The passwords do not match.' : undefined} />
        {formError(reset.error) && <Notice tone="flare" icon="info">{formError(reset.error)}</Notice>}
      </div>
    </AuthLayout>
  )
}
