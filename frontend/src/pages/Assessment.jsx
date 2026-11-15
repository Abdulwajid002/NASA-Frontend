import { useEffect, useState } from 'react'
import { ClipboardCheck, HeartHandshake } from 'lucide-react'

import api, { errorText } from '../services/api'
import { useCrew } from '../context/Crew'
import { AlertItem, Card, LevelBadge, METRICS, PageHeader, btn, btnGhost, fmt, input, lvl, pretty } from '../components/ui'

const GROUPS = [
  { title: 'Vital signs', fields: ['heart_rate_bpm', 'systolic_bp', 'diastolic_bp', 'body_temp_c', 'blood_glucose_mgdl', 'spo2_pct', 'resp_rate_bpm', 'hrv_ms'] },
  { title: 'Sleep, mood and activity', fields: ['sleep_hours', 'sleep_quality', 'mood_score', 'stress_level', 'exercise_min', 'body_mass_kg'] },
  { title: 'Environment and long-term', fields: ['cabin_co2_mmhg', 'cabin_temp_c', 'cabin_humidity_pct', 'daily_radiation_msv', 'bone_density_pct_baseline'] },
]
const NORMAL = { heart_rate_bpm: 64, systolic_bp: 116, diastolic_bp: 74, body_temp_c: 36.6, blood_glucose_mgdl: 88, spo2_pct: 98, resp_rate_bpm: 14, hrv_ms: 58,
  sleep_hours: 7.2, sleep_quality: 7.5, mood_score: 7, stress_level: 3.5, exercise_min: 115, cabin_co2_mmhg: 2.6, cabin_temp_c: 22.5, cabin_humidity_pct: 45, daily_radiation_msv: 0.6 }
const PRESETS = {
  'Normal day': {},
  'Fever': { body_temp_c: 38.9, heart_rate_bpm: 82, resp_rate_bpm: 18, sleep_hours: 5.6, mood_score: 5, exercise_min: 20 },
  'Cabin CO₂ event': { cabin_co2_mmhg: 6.8, spo2_pct: 92.5, resp_rate_bpm: 18.5, heart_rate_bpm: 72 },
  'Solar particle event': { daily_radiation_msv: 12.5, stress_level: 6.5 },
  'Poor sleep, low mood': { sleep_hours: 2.8, sleep_quality: 2, mood_score: 3, stress_level: 7.5 },
}
const SCALE = ['Not at all', 'Some days', 'Most days', 'Every day']

export default function Assessment() {
  const { selectedId, astronaut, refresh } = useCrew()
  const [form, setForm] = useState({})
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)
  const [questions, setQuestions] = useState({})
  const [answers, setAnswers] = useState({})
  const [wb, setWb] = useState(null)
  const [wbErr, setWbErr] = useState(null)

  useEffect(() => { api.wellbeingQuestions().then((q) => setQuestions(q.items)).catch(() => {}) }, [])
  useEffect(() => { setResult(null); setWb(null); setErr(null) }, [selectedId])

  const preset = (name) => setForm(Object.fromEntries(Object.entries({ ...NORMAL, ...PRESETS[name] }).map(([k, v]) => [k, String(v)])))

  const submit = async (e) => {
    e.preventDefault()
    const values = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, Number(v)]))
    if (!Object.keys(values).length) return setErr('Enter at least one measurement.')
    setBusy(true); setErr(null)
    try {
      setResult(await api.logReading({ astronaut_id: selectedId, ...values, notes: notes || null }))
      setForm({}); setNotes(''); refresh()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (ex) { setErr(errorText(ex)) }
    setBusy(false)
  }

  const submitWb = async () => {
    if (Object.keys(answers).length < Object.keys(questions).length) return setWbErr('Please answer every question.')
    setWbErr(null)
    try { setWb(await api.addWellbeing({ astronaut_id: selectedId, ...answers })); setAnswers({}); refresh() } catch (ex) { setWbErr(errorText(ex)) }
  }

  const a = result?.assessment
  return (
    <div className="space-y-8">
      <PageHeader crumb="MISSION CONTROL / ASSESSMENT" title="Daily Health Assessment"
        subtitle={`Log today's measurements for ${astronaut?.name}. Every field is optional. The ML engine compares the entry with this astronaut's own 14-day baseline.`} />

      {result && (
        <Card className={`${lvl(result.overall_level).border}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Mission day {result.mission_day} recorded</p>
              <p className="mt-1 text-xl font-semibold text-white">Pattern: <span className="capitalize">{pretty(a.predicted_condition)}</span></p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center"><p className="text-xs text-slate-500">ML RISK</p><p className={`text-3xl font-bold ${lvl(a.risk_level).text}`}>{a.risk_score}<span className="text-sm text-slate-500">/100</span></p></div>
              <LevelBadge level={result.overall_level} />
            </div>
          </div>
          {a.top_deviations.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {a.top_deviations.map((d) => (
                <div key={d.vital} className="rounded-md border border-slate-800 p-3">
                  <p className="text-xs capitalize text-slate-500">{pretty(d.vital)}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{fmt(d.value, 1)} <span className="text-xs font-normal text-slate-500">usual {fmt(d.personal_baseline, 1)}</span></p>
                  <p className="text-xs text-slate-500">{d.z_score > 0 ? '+' : ''}{fmt(d.z_score, 1)} σ from personal baseline</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-3">
            {result.alerts.length === 0 ? <p className="text-sm text-emerald-400">No alerts. All values are in expected ranges for you.</p>
              : result.alerts.map((al, i) => <AlertItem key={i} alert={al} />)}
          </div>
        </Card>
      )}

      <form onSubmit={submit} className="space-y-5">
        <Card title="Quick fill" subtitle="Demo scenarios — fills the form with example values you can edit">
          <div className="flex flex-wrap gap-2">
            {Object.keys(PRESETS).map((p) => <button type="button" key={p} onClick={() => preset(p)} className={btnGhost}>{p}</button>)}
            <button type="button" onClick={() => setForm({})} className={`${btnGhost} text-slate-400`}>Clear</button>
          </div>
        </Card>

        {GROUPS.map((g) => (
          <Card key={g.title} title={g.title}>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {g.fields.map((k) => (
                <label key={k} className="text-xs text-slate-400">{METRICS[k].label} <span className="text-slate-600">({METRICS[k].unit})</span>
                  <input type="number" step={METRICS[k].step} value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={`${input} mt-1`} />
                </label>
              ))}
            </div>
          </Card>
        ))}

        <Card title="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} placeholder="Anything else worth recording today (optional)" className={input} />
          <div className="mt-4 flex items-center gap-4">
            <button className={btn} disabled={busy}><ClipboardCheck size={16} />{busy ? 'Analysing…' : 'Submit assessment'}</button>
            {err && <p className="text-sm text-red-400">{err}</p>}
          </div>
        </Card>
      </form>

      <Card title="Weekly Well-being Check-in" subtitle="Over the last 7 days, how often have you… (a simple self-report, not a clinical scale)">
        <div className="space-y-4">
          {Object.entries(questions).map(([key, text]) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <p className="text-sm text-slate-200">{text}</p>
              <div className="flex gap-2" role="radiogroup" aria-label={text}>
                {SCALE.map((label, v) => (
                  <button type="button" key={v} role="radio" aria-checked={answers[key] === v} onClick={() => setAnswers({ ...answers, [key]: v })}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${answers[key] === v ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>{label}</button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4">
            <button type="button" onClick={submitWb} className={btn}><HeartHandshake size={16} />Save check-in</button>
            {wbErr && <p className="text-sm text-red-400">{wbErr}</p>}
          </div>
          {wb && (
            <div className={`rounded-md border p-4 ${lvl(wb.level).border} ${lvl(wb.level).bg}`}>
              <div className="flex items-center justify-between"><p className="font-semibold text-white">Score {wb.score} / {wb.max_score}</p><LevelBadge level={wb.level} /></div>
              <p className="mt-2 text-sm text-slate-300">{wb.guidance}</p>
              {wb.main_concerns.length > 0 && <p className="mt-2 text-xs text-slate-400">Main concerns: {wb.main_concerns.join(' · ')}</p>}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
