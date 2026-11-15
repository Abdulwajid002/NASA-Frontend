import { useCallback, useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, BellRing, Check, ClipboardList, FlaskConical, HeartPulse, Stethoscope, Thermometer, Wind } from 'lucide-react'

import api, { errorText } from '../services/api'
import { useCrew } from '../context/Crew'
import { Card, ErrorBox, Loading, PageHeader, btn, btnGhost, fmt, input, lvl } from '../components/ui'

const RISK = { NORMAL: 'green', WARNING: 'amber', CRITICAL: 'red' }
const STATUS_LEVEL = { ok: 'green', warning: 'amber', critical: 'red', invalid: 'no_data', missing: 'no_data' }
const STATUS_TEXT = { ok: 'Within limits', warning: 'Outside limit', critical: 'Critical limit', invalid: 'Unusable reading', missing: 'Not measured' }
const SOURCE = { manual: ['Manual entry', 'border-cyan-400/40 text-cyan-300'], simulated: ['Simulated', 'border-purple-400/50 text-purple-300'], wearable: ['Wearable', 'border-emerald-400/40 text-emerald-300'] }
const FIELDS = [
  ['heart_rate', 'Heart rate', 'bpm', 1], ['systolic_bp', 'Systolic BP', 'mmHg', 1], ['diastolic_bp', 'Diastolic BP', 'mmHg', 1],
  ['body_temperature', 'Body temperature', '°C', 0.1], ['spo2', 'SpO₂', '%', 0.1], ['respiratory_rate', 'Respiratory rate', '/min', 1],
]
const when = (t) => (t ? new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const label = (s) => String(s).replaceAll('_', ' ')

function SourceBadge({ source }) {
  const [text, cls] = SOURCE[source] || [source, 'border-slate-600 text-slate-300']
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{text}</span>
}

function VitalCard({ title, value, unit, icon: Icon, status }) {
  const L = lvl(STATUS_LEVEL[status] || 'no_data')
  return (
    <div className={`rounded-lg border bg-petrol-raised p-4 ${status && status !== 'ok' ? L.border : 'border-slate-800'}`}>
      <div className="flex items-center justify-between"><p className="text-sm text-slate-400">{title}</p><Icon size={19} className={L.text} /></div>
      <p className="mt-3 text-2xl font-bold text-white">{value}<span className="ml-1 text-sm font-normal text-slate-400">{unit}</span></p>
      <p className={`mt-2 text-xs font-medium ${L.text}`}>{STATUS_TEXT[status] || 'No reading yet'}</p>
    </div>
  )
}

function RiskPanel({ risk, title }) {
  if (!risk) return null
  const L = lvl(RISK[risk.risk_level]), reasons = risk.reasons || []
  return (
    <div className={`rounded-lg border p-5 ${L.border} ${L.bg}`} role="status">
      {risk.is_simulated && (
        <p className="mb-3 rounded-lg border border-purple-400/40 bg-purple-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-purple-200">
          Simulated data — demonstration only. No hardware sensor is connected.</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <L.Icon size={34} className={L.text} />
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">{title}</p>
            <p className={`text-2xl font-bold ${L.text}`}>{risk.risk_level}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400">Generated {when(risk.generated_at || risk.created_at)}<br />Protocol {risk.protocol_version}</p>
      </div>
      {risk.summary && <p className="mt-3 text-sm text-slate-200">{risk.summary}</p>}

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Reasons</h3>
      {reasons.length === 0 ? <p className="mt-1 text-sm text-slate-300">No findings. All readings are within configured limits and no concerning symptoms were reported.</p> : (
        <ul className="mt-2 space-y-2">
          {reasons.map((r) => {
            const RL = lvl({ critical: 'red', warning: 'amber', minor: 'green', data: 'no_data' }[r.severity])
            return (
              <li key={r.code} className="flex items-start gap-2 text-sm text-slate-200">
                <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${RL.border} ${RL.text}`}>{r.severity === 'data' ? 'data' : r.severity}</span>
                <span>{r.message}</span>
              </li>
            )
          })}
        </ul>
      )}
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Recommended next steps</h3>
      <p className="mt-1 text-sm text-white">{risk.recommended_action}</p>
      {risk.baseline_source && <p className="mt-3 text-xs text-slate-500">Individual baseline taken from the astronaut's {risk.baseline_source}.</p>}
      <p className="mt-3 text-xs text-slate-500">{risk.disclaimer || 'Software risk classification based on configured rules. It is not a medical diagnosis.'}</p>
    </div>
  )
}

export default function HealthCheck() {
  const { selectedId, astronaut, isStaff } = useCrew()
  const [protocol, setProtocol] = useState(null)
  const [scenarios, setScenarios] = useState([])
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [source, setSource] = useState('real')
  const [metric, setMetric] = useState('heart_rate')
  const [risk, setRisk] = useState(null)
  const [sim, setSim] = useState(null)
  const [vitals, setVitals] = useState({})
  const [answers, setAnswers] = useState({})
  const [extra, setExtra] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState({})
  const [loadErr, setLoadErr] = useState(null)

  const reload = useCallback(async () => {
    try {
      const [st, hi, al] = await Promise.all([api.healthStatus(selectedId), api.healthHistory(selectedId, source), api.healthAlerts(selectedId, source)])
      setStatus(st); setHistory(hi); setAlerts(al); setLoadErr(null)
    } catch (e) { setLoadErr(errorText(e)) }
  }, [selectedId, source])

  useEffect(() => { api.healthProtocol().then(setProtocol).catch(() => {}); api.healthScenarios().then(setScenarios).catch(() => {}) }, [])
  useEffect(() => { setRisk(null); setSim(null); setMsg({}); setVitals({}); setAnswers({}) }, [selectedId])
  useEffect(() => { reload() }, [reload])

  const act = async (key, fn, okText) => {
    setBusy(key); setMsg({})
    try { await fn(); setMsg({ [key]: { ok: true, text: okText } }); await reload() }
    catch (e) { setMsg({ [key]: { ok: false, text: errorText(e) } }) }
    setBusy('')
  }

  const saveVitals = (e) => {
    e.preventDefault()
    const body = Object.fromEntries(Object.entries(vitals).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, Number(v)]))
    if (!Object.keys(body).length) return setMsg({ vitals: { ok: false, text: 'Enter at least one reading.' } })
    act('vitals', async () => { await api.postVitals({ astronaut_id: selectedId, data_source: 'manual', ...body }); setVitals({}); setRisk(await api.analyze(selectedId)) },
      'Vital signs saved and analysed.')
  }
  const saveQuestionnaire = (e) => {
    e.preventDefault()
    const missing = (protocol?.questionnaire || []).filter((q) => !answers[q.id])
    if (missing.length) return setMsg({ q: { ok: false, text: `Please answer: ${missing.map((q) => q.label).join(', ')}.` } })
    act('q', async () => { await api.postQuestionnaire({ astronaut_id: selectedId, ...answers, additional_symptoms: extra || null }); setRisk(await api.analyze(selectedId)) },
      'Questionnaire saved and analysed.')
  }
  const runScenario = (id) => act('sim', async () => setSim(await api.simulate(selectedId, id)), 'Simulated scenario generated.')
  const acknowledge = (id) => act('ack', () => api.acknowledgeAlert(id), 'Alert acknowledged.')
  const Note = ({ k }) => (msg[k] ? <p role={msg[k].ok ? 'status' : 'alert'} className={`text-sm ${msg[k].ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg[k].text}</p> : null)

  if (loadErr) return <ErrorBox message={loadErr} />
  if (!status || !history || !protocol) return <Loading label="Loading health check…" />

  const v = status.latest_vitals, st = v?.status || {}
  const shown = risk || (status.latest_risk && { ...status.latest_risk })
  const band = protocol.vitals[metric]
  const series = [...history.vitals].reverse().map((r) => ({ t: new Date(r.recorded_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), value: r[metric], source: r.data_source }))
  const bpStatus = ['critical', 'warning', 'invalid'].find((s) => st.systolic_bp === s || st.diastolic_bp === s) || st.systolic_bp

  return (
    <div className="space-y-8">
      <PageHeader crumb="MISSION CONTROL / HEALTH CHECK" title="Vital Signs & Risk Assessment"
        subtitle={`Rule-based assessment for ${astronaut?.name}. Readings are entered manually or generated as labelled simulations; no biomedical hardware is connected in this prototype.`} />

      <RiskPanel risk={shown} title="Health risk assessment" />
      {!shown && <Card><p className="text-sm text-slate-400">No risk assessment yet. Enter vital signs and complete today's questionnaire to generate one.</p></Card>}

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="t-sub text-ivory">Latest Vital Signs</h2>
          <p className="flex items-center gap-2 text-xs text-slate-400">{v ? <>Measured {when(v.recorded_at)} <SourceBadge source={v.data_source} /></> : 'No real readings recorded yet'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <VitalCard title="Heart Rate" value={fmt(v?.heart_rate, 0)} unit="bpm" icon={HeartPulse} status={v && st.heart_rate} />
          <VitalCard title="Blood Pressure" value={`${fmt(v?.systolic_bp, 0)}/${fmt(v?.diastolic_bp, 0)}`} unit="mmHg" icon={Activity} status={v && bpStatus} />
          <VitalCard title="Body Temperature" value={fmt(v?.body_temperature, 1)} unit="°C" icon={Thermometer} status={v && st.body_temperature} />
          <VitalCard title="SpO₂" value={fmt(v?.spo2, 1)} unit="%" icon={Stethoscope} status={v && st.spo2} />
          <VitalCard title="Respiratory Rate" value={fmt(v?.respiratory_rate, 0)} unit="/min" icon={Wind} status={v && st.respiratory_rate} />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Enter Vital Signs" subtitle="Manual entry. Leave a field empty if it was not measured.">
          <form onSubmit={saveVitals} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {FIELDS.map(([k, name, unit, step]) => (
                <label key={k} className="text-xs text-slate-400">{name} <span className="text-slate-600">({unit})</span>
                  <input type="number" step={step} min={0} value={vitals[k] ?? ''} onChange={(e) => setVitals({ ...vitals, [k]: e.target.value })} className={`${input} mt-1`} />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button className={btn} disabled={busy === 'vitals'}><HeartPulse size={16} />{busy === 'vitals' ? 'Saving…' : 'Save and analyse'}</button>
              <Note k="vitals" />
            </div>
          </form>
        </Card>

        <Card title="Demonstration Scenarios" subtitle="Generates clearly labelled simulated readings and runs them through the rule engine. Simulated data is stored separately from real readings.">
          <div className="flex flex-wrap gap-2">
            {scenarios.map((s) => (
              <button key={s.id} onClick={() => runScenario(s.id)} disabled={busy === 'sim'} title={s.description}
                className={`${btnGhost} ${lvl(RISK[s.title.toUpperCase()]).text}`}><FlaskConical size={15} />{s.title}</button>
            ))}
          </div>
          <div className="mt-2"><Note k="sim" /></div>
          {sim && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-400">Scenario: <span className="text-white">{sim.scenario.title}</span> — {sim.scenario.description}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {FIELDS.map(([k, name, unit]) => (
                  <div key={k} className="rounded-lg border border-slate-800 p-2"><p className="text-slate-500">{name}</p>
                    <p className={`font-semibold ${lvl(STATUS_LEVEL[sim.vitals.status[k]]).text}`}>{fmt(sim.vitals[k], 1)} {unit}</p></div>
                ))}
              </div>
              <RiskPanel risk={sim} title="Simulated result" />
            </div>
          )}
        </Card>
      </section>

      <Card title="Daily Health Assessment"
        subtitle={status.questionnaire_today ? `Submitted today at ${when(status.questionnaire_today.submitted_at)}. Submitting again replaces today's answers.` : 'Not submitted today.'}
        action={status.questionnaire_today ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400"><Check size={14} />Done today</span> : <span className="text-xs font-semibold text-amber-400">Pending</span>}>
        <form onSubmit={saveQuestionnaire} className="space-y-4">
          <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
            {protocol.questionnaire.map((q, i) => (
              <fieldset key={q.id} className="border-b border-slate-800 pb-4">
                <legend className="mb-2 text-sm text-slate-200">{i + 1}. {q.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o) => (
                    <label key={o} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs capitalize transition ${answers[q.id] === o ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                      <input type="radio" name={q.id} value={o} checked={answers[q.id] === o} onChange={() => setAnswers({ ...answers, [q.id]: o })} className="sr-only" />
                      {label(o)}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <label className="block text-sm text-slate-200">{protocol.questionnaire.length + 1}. Additional symptoms <span className="text-slate-500">(optional)</span>
            <textarea value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={1000} rows={2} className={`${input} mt-2`} placeholder="Anything else you have noticed" />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button className={btn} disabled={busy === 'q'}><ClipboardList size={16} />{busy === 'q' ? 'Submitting…' : 'Submit and analyse'}</button>
            <Note k="q" />
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="t-sub text-ivory">Alerts and History</h2>
        <div className="flex gap-1 rounded-md bg-petrol-deep p-1" role="tablist" aria-label="Data shown">
          {[['real', 'Real data'], ['simulated', 'Simulated data']].map(([s, t]) => (
            <button key={s} role="tab" aria-selected={source === s} onClick={() => setSource(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${source === s ? 'bg-cyan-400/10 text-cyan-400' : 'text-slate-400'}`}>{t}</button>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Health Alerts" subtitle={`${alerts.filter((a) => a.status === 'open').length} open · ${alerts.length} total`}>
          <Note k="ack" />
          {alerts.length === 0 ? <p className="text-sm text-slate-500">No {source === 'simulated' ? 'simulated ' : ''}alerts.</p> : (
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {alerts.map((a) => {
                const L = lvl(RISK[a.risk_level])
                return (
                  <div key={a.id} className={`rounded-md border p-4 ${L.border} ${a.status === 'open' ? L.bg : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={`flex items-center gap-2 text-sm font-bold ${L.text}`}><BellRing size={15} />{a.risk_level}{a.is_simulated && <SourceBadge source="simulated" />}</p>
                      <p className="text-xs text-slate-400">{when(a.created_at)}</p>
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-200">{a.alert_reasons.map((r) => <li key={r.code}>{r.message}</li>)}</ul>
                    <p className="mt-2 text-xs text-slate-400">{a.recommended_action}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-xs font-semibold uppercase ${a.status === 'open' ? 'text-amber-400' : 'text-slate-500'}`}>
                        {a.status === 'open' ? 'Open' : `Acknowledged ${when(a.acknowledged_at)}`}</span>
                      {a.status === 'open' && (isStaff
                        ? <button onClick={() => acknowledge(a.id)} disabled={busy === 'ack'} className={`${btnGhost} !min-h-[44px]`}><Check size={14} />Acknowledge</button>
                        : <span className="text-xs text-slate-500">Awaiting flight surgeon</span>)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card title="Vital Sign History" subtitle={`${history.vitals.length} ${source} reading(s) · dashed lines are the configured warning limits`}
          action={<select value={metric} onChange={(e) => setMetric(e.target.value)} className={`${input} !w-44`} aria-label="Vital sign">
            {FIELDS.map(([k, name]) => <option key={k} value={k}>{name}</option>)}</select>}>
          {series.filter((p) => p.value != null).length < 2 ? <p className="py-10 text-center text-sm text-slate-500">At least two readings are needed to draw a trend.</p> : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#2B4649" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="t" stroke="#A3B0A8" tickLine={false} axisLine={false} fontSize={11} minTickGap={30} />
                  <YAxis stroke="#A3B0A8" tickLine={false} axisLine={false} fontSize={12} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A3639', border: '1px solid #3A5558', borderRadius: 12, color: '#fff' }}
                    formatter={(val, _n, p) => [`${fmt(val, 1)} ${band.unit} (${p.payload.source})`, band.label]} />
                  <ReferenceLine y={band.warning[0]} stroke="#F0C36B" strokeDasharray="4 4" />
                  {band.warning[1] < 100 || metric !== 'spo2' ? <ReferenceLine y={band.warning[1]} stroke="#F0C36B" strokeDasharray="4 4" /> : null}
                  <Line type="monotone" dataKey="value" stroke="#B6D4C4" strokeWidth={2.5} dot={{ r: 3, fill: '#B6D4C4' }} connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      <Card title="Measurement Log" subtitle="Compare previous measurements. Colours follow the configured limits.">
        {history.vitals.length === 0 ? <p className="text-sm text-slate-500">No {source} readings yet.</p> : (
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-petrol-raised text-xs uppercase tracking-wider text-slate-500">
                <tr>{['Recorded', 'Source', 'HR', 'BP', 'Temp', 'SpO₂', 'Resp.'].map((h) => <th key={h} className="pb-3 pr-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {history.vitals.map((r) => {
                  const c = (k) => lvl(STATUS_LEVEL[r.status[k]]).text
                  return (
                    <tr key={r.id} className="border-t border-slate-800">
                      <td className="py-2.5 pr-3 text-slate-300">{when(r.recorded_at)}</td>
                      <td className="pr-3"><SourceBadge source={r.data_source} /></td>
                      <td className={`pr-3 ${c('heart_rate')}`}>{fmt(r.heart_rate, 0)}</td>
                      <td className={`pr-3 ${c('systolic_bp')}`}>{fmt(r.systolic_bp, 0)}/{fmt(r.diastolic_bp, 0)}</td>
                      <td className={`pr-3 ${c('body_temperature')}`}>{fmt(r.body_temperature, 1)}</td>
                      <td className={`pr-3 ${c('spo2')}`}>{fmt(r.spo2, 1)}</td>
                      <td className={c('respiratory_rate')}>{fmt(r.respiratory_rate, 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">Limits: {protocol.approval_status}. Protocol {protocol.protocol_version}. Limits are read from a configuration file and must be replaced by an approved medical protocol.</p>
      </Card>
    </div>
  )
}
