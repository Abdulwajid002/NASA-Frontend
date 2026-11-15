import { Suspense, lazy, useCallback, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import api, { errorText } from '../services/api'
import { useCrew } from '../context/Crew'
import Brand from '../components/Brand'

const Scene = lazy(() => import('../components/scene/Scene'))   // three.js loads only where a scene is shown

const field = 'mt-1.5 w-full min-h-[48px] rounded-md border border-petrol/25 bg-white/60 px-3.5 text-base text-petrol outline-none transition placeholder:text-petrol/40 focus:border-petrol'
const labelCls = 't-caption block font-medium text-petrol/80'

export default function Login() {
  const { signIn, online, user, authReady } = useCrew()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/dashboard'
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', full_name: '', age: '', sex: '', staff_code: '' })
  const [staff, setStaff] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const still = useCallback(() => 0.5, [])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const signup = mode === 'signup'

  if (authReady && user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    setErr(null)
    if (signup && form.password.length < 8) return setErr('Password must be at least 8 characters.')
    setBusy(true)
    try {
      const body = signup
        ? { email: form.email, password: form.password, full_name: form.full_name,
            ...(staff ? { staff_code: form.staff_code } : { age: form.age ? Number(form.age) : null, sex: form.sex || null }) }
        : { email: form.email, password: form.password }
      signIn(await (signup ? api.signup(body) : api.login(body)))
      navigate(from, { replace: true })
    } catch (ex) { setErr(ex.response ? errorText(ex) : 'Cannot reach the server. Is the backend running?') }
    setBusy(false)
  }

  return (
    <div className="grid min-h-[100svh] bg-petrol text-ivory lg:grid-cols-12">
      {/* scene side: the model is held at the middle beat, where it sits left and leaves the lower edge open */}
      <div className="relative hidden overflow-hidden lg:col-span-7 lg:block">
        <Suspense fallback={null}><Scene getProgress={still} /></Suspense>
        <div className="absolute inset-0 flex flex-col justify-between p-[6vw] pr-10">
          <Brand />
          <div className="copy-scrim self-end text-right">
            <h1 className="t-section">Your record. <span className="block">Your baseline.</span></h1>
          </div>
        </div>
      </div>

      <div className="on-ivory flex flex-col bg-ivory text-petrol lg:col-span-5">
        <div className="gutter flex h-[72px] items-center bg-petrol text-ivory lg:hidden"><Brand /></div>
        <div className="flex flex-1 flex-col justify-center px-[var(--gutter)] py-12 lg:px-[4.5vw]">
          <p className="t-eyebrow opacity-70">Mission control</p>
          <h2 className="t-section mt-3">{signup ? 'Create account' : 'Sign in'}</h2>

          <div className="mt-8 flex gap-8" role="tablist" aria-label="Account">
            {[['login', 'Sign in'], ['signup', 'Create account']].map(([m, label]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErr(null) }}
                className={`link-line bg-transparent ${mode === m ? 'is-active' : 'opacity-60'}`}>{label}</button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-8 max-w-[26rem] space-y-5">
            {signup && (
              <label className={labelCls}>Full name
                <input required maxLength={80} value={form.full_name} onChange={set('full_name')} className={field} autoComplete="name" />
              </label>
            )}
            <label className={labelCls}>Email
              <input required type="email" value={form.email} onChange={set('email')} className={field} autoComplete="email" />
            </label>
            <label className={labelCls}>Password {signup && <span className="font-normal opacity-70">(at least 8 characters)</span>}
              <input required type="password" value={form.password} onChange={set('password')} className={field}
                autoComplete={signup ? 'new-password' : 'current-password'} />
            </label>

            {signup && !staff && (
              <div className="grid grid-cols-2 gap-4">
                <label className={labelCls}>Age <span className="font-normal opacity-70">(optional)</span>
                  <input type="number" min={18} max={80} value={form.age} onChange={set('age')} className={field} />
                </label>
                <label className={labelCls}>Sex <span className="font-normal opacity-70">(optional)</span>
                  <select value={form.sex} onChange={set('sex')} className={field}>
                    <option value="">Prefer not to say</option><option value="F">Female</option><option value="M">Male</option>
                  </select>
                </label>
              </div>
            )}
            {signup && (
              <label className="t-caption flex items-center gap-2.5 text-petrol/80">
                <input type="checkbox" checked={staff} onChange={(e) => setStaff(e.target.checked)} className="h-4 w-4 accent-[#142B2D]" />
                I am medical staff (flight surgeon) and have a staff code
              </label>
            )}
            {signup && staff && (
              <label className={labelCls}>Staff code
                <input required type="password" value={form.staff_code} onChange={set('staff_code')} className={field} />
              </label>
            )}

            {err && <p role="alert" className="t-caption rounded-md border border-[#9B2C1F]/40 bg-[#9B2C1F]/10 p-3 font-medium text-[#7A2117]">{err}</p>}
            {online === false && !err && <p className="t-caption font-medium text-[#7A2117]">The backend is not reachable right now.</p>}

            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}<ArrowRight size={18} /></button>
            <p className="t-caption text-petrol/70">
              {signup ? 'An astronaut account gets its own private health record.' : 'Astronauts see only their own record. Medical staff see the crew.'}
            </p>
          </form>
        </div>
        <p className="t-caption px-[var(--gutter)] pb-8 text-petrol/60 lg:px-[4.5vw]">Decision support only, not a medical diagnosis.</p>
      </div>
    </div>
  )
}
