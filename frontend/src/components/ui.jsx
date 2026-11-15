import { AlertTriangle, CheckCircle2, CircleAlert, Loader2 } from 'lucide-react'

export const LEVEL = {
  green: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', dot: 'bg-emerald-400', hex: '#B6D4C4', label: 'Nominal', Icon: CheckCircle2 },
  amber: { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', dot: 'bg-amber-400', hex: '#F0C36B', label: 'Caution', Icon: CircleAlert },
  red: { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/40', dot: 'bg-red-400', hex: '#F0857A', label: 'Attention', Icon: AlertTriangle },
  no_data: { text: 'text-slate-400', bg: 'bg-slate-700/30', border: 'border-slate-700', dot: 'bg-slate-500', hex: '#A3B0A8', label: 'No data', Icon: CircleAlert },
}
export const lvl = (level) => LEVEL[level] || LEVEL.no_data

export const METRICS = {
  heart_rate_bpm: { label: 'Heart Rate', unit: 'bpm', step: 1 },
  hrv_ms: { label: 'Heart Rate Variability', unit: 'ms', step: 1 },
  resp_rate_bpm: { label: 'Respiratory Rate', unit: '/min', step: 1 },
  systolic_bp: { label: 'Systolic BP', unit: 'mmHg', step: 1 },
  diastolic_bp: { label: 'Diastolic BP', unit: 'mmHg', step: 1 },
  body_temp_c: { label: 'Body Temperature', unit: '°C', step: 0.1 },
  blood_glucose_mgdl: { label: 'Blood Glucose', unit: 'mg/dL', step: 1 },
  spo2_pct: { label: 'Blood Oxygen (SpO₂)', unit: '%', step: 0.1 },
  sleep_hours: { label: 'Sleep Duration', unit: 'h', step: 0.1 },
  sleep_quality: { label: 'Sleep Quality', unit: '/10', step: 0.5 },
  mood_score: { label: 'Mood', unit: '/10', step: 0.5 },
  stress_level: { label: 'Stress', unit: '/10', step: 0.5 },
  exercise_min: { label: 'Exercise', unit: 'min', step: 5 },
  body_mass_kg: { label: 'Body Mass', unit: 'kg', step: 0.1 },
  bone_density_pct_baseline: { label: 'Bone Density', unit: '% of pre-flight', step: 0.1 },
  cabin_co2_mmhg: { label: 'Cabin CO₂', unit: 'mmHg', step: 0.1 },
  cabin_temp_c: { label: 'Cabin Temperature', unit: '°C', step: 0.1 },
  cabin_humidity_pct: { label: 'Cabin Humidity', unit: '%', step: 1 },
  daily_radiation_msv: { label: 'Radiation Dose (today)', unit: 'mSv', step: 0.1 },
  cum_radiation_msv: { label: 'Cumulative Radiation', unit: 'mSv', step: 0.1 },
  risk_score: { label: 'ML Risk Score', unit: '/100', step: 1 },
}
export const metricLabel = (m) => METRICS[m]?.label || String(m).replaceAll('_', ' ')
export const pretty = (s) => String(s ?? '').replaceAll('_', ' ')
export const fmt = (v, digits = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(digits).replace(/\.0+$/, ''))

export function Card({ title, subtitle, action, className = '', children }) {
  return (
    <div className={`rounded-lg border border-slate-800 bg-petrol-raised p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="t-sub text-ivory">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function LevelBadge({ level, children }) {
  const L = lvl(level)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${L.bg} ${L.text} ${L.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${L.dot}`} />
      {children || L.label}
    </span>
  )
}

export function PageHeader({ crumb, title, subtitle, right }) {
  return (
    <section className="rule-b flex flex-wrap items-end justify-between gap-6 pb-8">
      <div>
        <p className="t-eyebrow text-celadon">{crumb}</p>
        <h1 className="t-section mt-3 text-ivory">{title}</h1>
        {subtitle && <p className="t-body mt-4 text-slate-300">{subtitle}</p>}
      </div>
      {right}
    </section>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 p-6 text-sm text-slate-400">
      <Loader2 className="animate-spin text-cyan-400" size={18} /> {label}
    </div>
  )
}

export function ErrorBox({ message }) {
  return (
    <div className="rounded-md border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-300">
      <span className="font-semibold">Could not load data:</span> {String(message)}
    </div>
  )
}

export function AlertItem({ alert, day }) {
  const L = lvl(alert.level)
  return (
    <div className={`rounded-md border p-4 ${L.border} ${L.bg}`}>
      <div className="flex items-start gap-3">
        <L.Icon size={18} className={`mt-0.5 shrink-0 ${L.text}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-white">{alert.message}</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300"><span className="font-semibold text-slate-200">Next step:</span> {alert.guidance}</p>
          <p className="mt-2 text-[11px] uppercase tracking-wider text-slate-500">
            {alert.source === 'ml' ? 'ML engine · personal baseline' : 'Threshold check'}{day ? ` · mission day ${day}` : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

export const btn = 'btn-primary'
export const btnGhost = 'btn-quiet'
export const input = 'w-full min-h-[44px] rounded-md border border-slate-700 bg-petrol-deep px-3 py-2.5 text-base text-ivory outline-none transition placeholder:text-slate-600 focus:border-celadon'
