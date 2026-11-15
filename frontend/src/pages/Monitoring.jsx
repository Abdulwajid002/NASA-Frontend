import { useEffect, useState } from 'react'
import { Radio } from 'lucide-react'

import api, { errorText } from '../services/api'
import { useAstronautData, useCrew } from '../context/Crew'
import MetricChart from '../components/MetricChart'
import { Card, ErrorBox, LevelBadge, Loading, METRICS, PageHeader, btn, fmt, input, pretty } from '../components/ui'

const CHARTABLE = ['heart_rate_bpm', 'systolic_bp', 'diastolic_bp', 'body_temp_c', 'blood_glucose_mgdl', 'spo2_pct', 'resp_rate_bpm', 'hrv_ms',
  'sleep_hours', 'sleep_quality', 'mood_score', 'stress_level', 'exercise_min', 'body_mass_kg', 'bone_density_pct_baseline',
  'cabin_co2_mmhg', 'daily_radiation_msv', 'cum_radiation_msv', 'risk_score']
const SENSOR_FIELDS = ['heart_rate_bpm', 'spo2_pct', 'body_temp_c', 'systolic_bp', 'diastolic_bp', 'resp_rate_bpm']

export default function Monitoring() {
  const { selectedId, refresh } = useCrew()
  const [metric, setMetric] = useState('heart_rate_bpm')
  const [days, setDays] = useState(30)
  const [standards, setStandards] = useState({})
  const [sample, setSample] = useState({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)
  const { data: rows, loading, error } = useAstronautData((id) => api.readings(id, 14))

  useEffect(() => { api.standards().then(setStandards).catch(() => {}) }, [])

  const sendSample = async (e) => {
    e.preventDefault()
    const values = Object.fromEntries(Object.entries(sample).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, Number(v)]))
    if (!Object.keys(values).length) return setErr('Enter at least one sensor value.')
    setBusy(true); setErr(null)
    try {
      const out = await api.telemetry([{ astronaut_id: selectedId, timestamp: new Date().toISOString(), ...values }])
      setResult(out.latest[0]); setSample({}); refresh()
    } catch (ex) { setErr(errorText(ex)) }
    setBusy(false)
  }

  const m = METRICS[metric]
  return (
    <div className="space-y-8">
      <PageHeader crumb="MISSION CONTROL / MONITORING" title="Health Monitoring"
        subtitle="Follow any indicator over time. Dashed lines are the mission warning band; coloured dots mark days the system flagged." />

      <Card title={`${m.label} (${m.unit})`} subtitle={`Last ${days} mission days`}
        action={<div className="flex flex-wrap gap-2">
          <select value={metric} onChange={(e) => setMetric(e.target.value)} className={`${input} !w-56`} aria-label="Metric">
            {CHARTABLE.map((k) => <option key={k} value={k}>{METRICS[k].label}</option>)}
          </select>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${input} !w-32`} aria-label="Period">
            {[14, 30, 60, 120, 180].map((n) => <option key={n} value={n}>{n} days</option>)}
          </select>
        </div>}>
        <MetricChart metric={metric} days={days} height={340} band={standards[metric]} />
      </Card>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Live Sensor Sample" subtitle="Simulates a wearable reading. Samples are averaged into today's record and re-scored." className="xl:col-span-1">
          <form onSubmit={sendSample} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {SENSOR_FIELDS.map((k) => (
                <label key={k} className="text-xs text-slate-400">{METRICS[k].label} <span className="text-slate-600">({METRICS[k].unit})</span>
                  <input type="number" step={METRICS[k].step} value={sample[k] ?? ''} onChange={(e) => setSample({ ...sample, [k]: e.target.value })} className={`${input} mt-1`} />
                </label>
              ))}
            </div>
            <button className={btn} disabled={busy}><Radio size={16} />{busy ? 'Sending…' : 'Send sample'}</button>
            {err && <p className="text-sm text-red-400">{err}</p>}
            {result && (
              <div className="rounded-md border border-slate-700 p-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-300">Mission day {result.mission_day} · {result.samples_today} sample(s) today</span><LevelBadge level={result.overall_level} /></div>
                <p className="mt-2 text-slate-400">ML risk {result.assessment.risk_score}/100 · pattern <span className="capitalize text-white">{pretty(result.assessment.predicted_condition)}</span></p>
                {result.alerts.slice(0, 2).map((a, i) => <p key={i} className="mt-1 text-xs text-slate-400">• {a.message}</p>)}
              </div>
            )}
          </form>
        </Card>

        <Card title="Recent Daily Records" subtitle="Last 14 mission days" className="xl:col-span-2">
          {loading && !rows ? <Loading /> : error ? <ErrorBox message={error} /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>{['Day', 'HR', 'BP', 'Temp', 'SpO₂', 'Glucose', 'Sleep', 'Mood', 'Risk', 'Status'].map((h) => <th key={h} className="pb-3 pr-3 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {[...(rows || [])].reverse().map((r) => (
                    <tr key={r.mission_day} className="border-t border-slate-800 text-slate-300">
                      <td className="py-2.5 pr-3 font-medium text-white">{r.mission_day}</td>
                      <td className="pr-3">{fmt(r.heart_rate_bpm, 0)}</td>
                      <td className="pr-3">{fmt(r.systolic_bp, 0)}/{fmt(r.diastolic_bp, 0)}</td>
                      <td className="pr-3">{fmt(r.body_temp_c, 1)}</td>
                      <td className="pr-3">{fmt(r.spo2_pct, 1)}</td>
                      <td className="pr-3">{fmt(r.blood_glucose_mgdl, 0)}</td>
                      <td className="pr-3">{fmt(r.sleep_hours, 1)}</td>
                      <td className="pr-3">{fmt(r.mood_score, 1)}</td>
                      <td className="pr-3">{r.risk_score ?? '—'}</td>
                      <td><LevelBadge level={r.risk_level}>{r.predicted_condition && r.predicted_condition !== 'normal' ? pretty(r.predicted_condition) : undefined}</LevelBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}
