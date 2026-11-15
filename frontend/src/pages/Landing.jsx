import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowDown, Menu } from 'lucide-react'

import Brand from '../components/Brand'

const Scene = lazy(() => import('../components/scene/Scene'))   // three.js loads only where a scene is shown
import MobileMenu from '../components/MobileMenu'
import { useCrew } from '../context/Crew'

const NAV = [
  { id: 'overview', label: 'Overview', at: 0 },
  { id: 'hazards', label: 'Hazards', at: 0.5 },
  { id: 'autonomy', label: 'Autonomy', at: 1 },
  { id: 'method', label: 'Method' },
]
const HAZARDS = [
  ['Space radiation', 'Daily and cumulative dose against the career limit'],
  ['Isolation and confinement', 'Sleep, mood and stress, with a weekly check-in'],
  ['Distance from Earth', 'Records and guidance stay on board'],
  ['Gravity fields', 'Bone loss rate and exercise adherence'],
  ['Closed environments', 'Cabin CO₂ logged beside the vitals'],
]
const STEPS = [
  ['01', 'Log', 'Vitals, sleep, mood and symptoms go in by hand or from a wearable. Every field is optional, and each record keeps its source.'],
  ['02', 'Compare', 'Each value is checked against configured limits and against that astronaut’s own 14-day baseline. A heart rate of 96 can be fine for one person and a 30-point jump for another.'],
  ['03', 'Explain', 'The result is NORMAL, WARNING or CRITICAL, with every reason listed and one next step. It is decision support, never a diagnosis.'],
]
/* opacity of each beat's copy as a function of sequence progress */
const BEATS = [[-1, -1, 0.2, 0.3], [0.36, 0.46, 0.56, 0.66], [0.78, 0.9, 2, 2]]
const windowed = (p, [a, b, c, d]) => (p <= a || p >= d ? 0 : p < b ? (p - a) / (b - a) : p > c ? (d - p) / (d - c) : 1)

export default function Landing() {
  const { user } = useCrew()
  const seq = useRef(null)
  const beats = useRef([])
  const progress = useRef(0)
  const [active, setActive] = useState('overview')
  const [solid, setSolid] = useState(false)
  const [menu, setMenu] = useState(false)
  const getProgress = useCallback(() => progress.current, [])
  const enter = user ? '/dashboard' : '/login'

  useEffect(() => {
    const onScroll = () => {
      const el = seq.current
      if (!el) return
      const span = el.offsetHeight - window.innerHeight
      const raw = (window.scrollY - el.offsetTop) / span
      const p = Math.min(Math.max(raw, 0), 1)
      progress.current = p
      beats.current.forEach((node, i) => {
        if (!node) return
        const o = windowed(p, BEATS[i])
        node.style.opacity = o
        node.style.transform = `translate3d(0, ${(1 - o) * 18}px, 0)`
        node.style.visibility = o < 0.02 ? 'hidden' : 'visible'
        node.inert = o < 0.5
      })
      setSolid(raw > 1.02)
      setActive(raw > 1.02 ? 'method' : p < 0.33 ? 'overview' : p < 0.72 ? 'hazards' : 'autonomy')
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  const go = (item) => (e) => {
    e?.preventDefault()
    setMenu(false)
    const el = seq.current
    const top = item.at === undefined
      ? document.getElementById(item.id).offsetTop
      : el.offsetTop + item.at * (el.offsetHeight - window.innerHeight)
    window.scrollTo({ top, behavior: 'smooth' })
  }
  const beat = (i) => (node) => { beats.current[i] = node }

  return (
    <div className="bg-petrol text-ivory">
      <a href="#method" onClick={go(NAV[3])} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-ivory focus:px-4 focus:py-2 focus:text-petrol">Skip to content</a>

      <header className={`gutter fixed inset-x-0 top-0 z-40 flex h-[72px] items-center justify-between transition-colors duration-300 ${solid ? 'bg-petrol/95 backdrop-blur rule-b' : ''}`}>
        <Brand />
        <nav className="hidden items-center gap-9 md:flex" aria-label="Primary">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} onClick={go(n)} aria-current={active === n.id ? 'true' : undefined} className="link-line">{n.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to={enter} className="btn-quiet hidden !min-h-[44px] sm:inline-flex">{user ? 'Open dashboard' : 'Sign in'}</Link>
          <button onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full md:hidden"><Menu size={24} /></button>
        </div>
      </header>

      <MobileMenu open={menu} onClose={() => setMenu(false)} label="Menu"
        footer={<Link to={enter} className="btn-primary w-full">{user ? 'Open dashboard' : 'Enter mission control'}<ArrowRight size={18} /></Link>}>
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} onClick={go(n)} aria-current={active === n.id ? 'true' : undefined}
            className="link-line t-section !py-2 self-start">{n.label}</a>
        ))}
      </MobileMenu>

      {/* ---------------------------------------------------------------- 3D sequence */}
      <div ref={seq} id="overview" className="relative h-[320svh]">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <Suspense fallback={null}><Scene getProgress={getProgress} /></Suspense>

          {/* Beat 1 — model sits right (wide) / low (portrait); copy takes the open left / top */}
          <section ref={beat(0)} aria-labelledby="hero-title"
            className="gutter absolute inset-0 flex flex-col justify-start pt-[104px] portrait:pb-0 landscape:justify-end landscape:pb-[9vh] lg:landscape:pb-[11vh]">
            <div className="copy-scrim max-w-[min(100%,calc(var(--fs-hero)*8.4))]">
              <p className="t-eyebrow text-celadon">NASA Space Apps · Challenge 4</p>
              <h1 id="hero-title" className="t-hero mt-4">Know your normal. <span className="block">Catch the change.</span></h1>
              <p className="t-body mt-6 text-slate-200 landscape:max-w-[46ch]">
                ASTRA-HEALTH learns each astronaut’s own baseline, flags the day it shifts and says what to do next, on board and without a link to Earth.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link to={enter} className="btn-primary">{user ? 'Open dashboard' : 'Enter mission control'}<ArrowRight size={18} /></Link>
                <a href="#hazards" onClick={go(NAV[1])} className="link-line"><span className="inline-flex items-center gap-2">How it works <ArrowDown size={16} aria-hidden="true" /></span></a>
              </div>
            </div>
          </section>

          {/* Beat 2 — model moves left / high; copy on the right / bottom */}
          <section ref={beat(1)} id="hazards" aria-labelledby="hazards-title"
            className="gutter absolute inset-0 flex flex-col justify-end pb-[6vh] landscape:items-end landscape:justify-center landscape:pb-0">
            <div className="copy-scrim w-full landscape:w-[min(46vw,640px)]">
              <p className="t-eyebrow text-celadon">Five hazards of spaceflight</p>
              <h2 id="hazards-title" className="t-section mt-3">Five hazards. <span className="block">One record.</span></h2>
              <ul className="mt-6 lg:mt-8">
                {HAZARDS.map(([name, note]) => (
                  <li key={name} className="rule-t flex items-baseline justify-between gap-6 py-2.5 lg:py-3.5">
                    <span className="t-ui">{name}</span>
                    <span className="t-caption hidden text-right text-slate-400 sm:block">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Beat 3 — model recedes to the lower right; copy holds the upper left */}
          <section ref={beat(2)} id="autonomy" aria-labelledby="autonomy-title"
            className="gutter absolute inset-0 flex flex-col justify-start pt-[104px] lg:pt-[18vh]">
            <div className="copy-scrim max-w-[min(100%,calc(var(--fs-section)*10.5))]">
              <p className="t-eyebrow text-celadon">Autonomy</p>
              <h2 id="autonomy-title" className="t-section mt-3">Built for the quiet between signals.</h2>
              <p className="t-body mt-5 text-slate-200 landscape:max-w-[48ch]">
                The rule engine and the personal-baseline model run on the spacecraft. When the AI link drops, guidance continues from on-board rules, and missing data is never read as normal.
              </p>
              <div className="mt-7"><Link to={enter} className="btn-primary">{user ? 'Open dashboard' : 'Sign in'}<ArrowRight size={18} /></Link></div>
            </div>
          </section>

          <div className="gutter pointer-events-none absolute inset-x-0 bottom-5 hidden items-center justify-between text-slate-400 lg:flex" aria-hidden="true">
            <span className="t-caption">Scroll · simulated mission data, decision support only</span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- reading section (ivory) */}
      <section id="method" aria-labelledby="method-title" className="on-ivory gutter bg-ivory text-petrol" style={{ paddingBlock: 'var(--space-section)' }}>
        <div className="grid gap-x-[6vw] gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="t-eyebrow opacity-70">Method</p>
            <h2 id="method-title" className="t-section mt-3">How a day is read.</h2>
            <p className="t-body mt-6 opacity-85">
              Two checks run on every entry: fixed limits from a configurable medical protocol, and the change from the astronaut’s own recent normal. Both must have complete data before a day can be called normal.
            </p>
          </div>
          <ol className="lg:col-span-7 lg:pt-2">
            {STEPS.map(([n, title, text]) => (
              <li key={n} className="grid grid-cols-[3.5rem_1fr] gap-x-4 py-7 first:pt-0 sm:grid-cols-[5rem_1fr]" style={{ borderTop: n === '01' ? 0 : '1px solid var(--rule-dark)' }}>
                <span className="t-sub opacity-45" aria-hidden="true">{n}</span>
                <div>
                  <h3 className="t-sub">{title}</h3>
                  <p className="t-body mt-2 opacity-85">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-6 pt-8" style={{ borderTop: '1px solid var(--rule-dark)' }}>
          <p className="t-body">Limits shown in this prototype are demonstration defaults, not approved astronaut limits.</p>
          <Link to={enter} className="btn-primary !bg-petrol !text-ivory hover:!bg-petrol-raised">{user ? 'Open dashboard' : 'Enter mission control'}<ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="gutter flex flex-wrap items-end justify-between gap-6 py-10">
        <Brand />
        <p className="t-caption max-w-[60ch] text-slate-400">Decision support only, not a medical diagnosis. Vital-sign data in this prototype is simulated. Built for the NASA International Space Apps Challenge.</p>
      </footer>
    </div>
  )
}
