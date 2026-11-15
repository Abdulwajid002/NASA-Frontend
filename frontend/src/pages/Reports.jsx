import { useEffect, useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'

import api from '../services/api'
import { useAstronautData, useCrew } from '../context/Crew'
import { Card, ErrorBox, LevelBadge, Loading, PageHeader, btnGhost, fmt, input, pretty } from '../components/ui'

const FILTERS = ['All', 'red', 'amber', 'green']

export default function Reports() {
  const { selectedId, version, select } = useCrew()
  const { data: rows, loading, error } = useAstronautData((id) => api.readings(id, 1000))
  const [crew, setCrew] = useState([])
  const [ml, setMl] = useState(null)
  const [study, setStudy] = useState(null)
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => { api.crewOverview().then(setCrew).catch(() => {}) }, [version])
  useEffect(() => { api.mlMetrics().then(setMl).catch(() => {}); api.nasaStudy().then(setStudy).catch(() => {}) }, [])
  useEffect(() => { setOpen(null) }, [selectedId])

  const shown = useMemo(() => [...(rows || [])].reverse().filter((r) =>
    (filter === 'All' || r.risk_level === filter)
    && (!query || String(r.mission_day).includes(query) || (r.predicted_condition || '').replaceAll('_', ' ').includes(query.toLowerCase()))), [rows, filter, query])
  const counts = useMemo(() => (rows || []).reduce((c, r) => ({ ...c, [r.risk_level]: (c[r.risk_level] || 0) + 1 }), {}), [rows])

  return (
    <div className="space-y-8">
      <PageHeader crumb="MISSION CONTROL / REPORTS" title="Health Reports"
        subtitle="Complete on-board health record, crew overview and export for the flight surgeon."
        right={<div className="flex gap-2">
          <button onClick={() => api.downloadExport(selectedId, 'csv')} className={btnGhost}><Download size={16} />CSV</button>
          <button onClick={() => api.downloadExport(selectedId, 'json')} className={btnGhost}><Download size={16} />Full record (JSON)</button>
        </div>} />

      <Card title="Crew Overview" subtitle="Most urgent first — click a row to open that crew member">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500"><tr>{['Crew member', 'Mission day', 'Status', 'ML risk', 'Top alert'].map((h) => <th key={h} className="pb-3 pr-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {crew.map((c) => (
                <tr key={c.astronaut_id} onClick={() => select(c.astronaut_id)} className={`cursor-pointer border-t border-slate-800 hover:bg-slate-800/40 ${c.astronaut_id === selectedId ? 'bg-cyan-400/5' : ''}`}>
                  <td className="py-2.5 pr-3 font-medium text-white">{c.astronaut_id} · {c.name}</td>
                  <td className="pr-3 text-slate-300">{c.mission_day}</td>
                  <td className="pr-3"><LevelBadge level={c.overall_level} /></td>
                  <td className="pr-3 text-slate-300">{c.risk_score ?? '—'}</td>
                  <td className="text-xs text-slate-400">{c.top_alert || 'No alerts'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Health Record History" subtitle={rows ? `${rows.length} days logged · ${counts.red || 0} red · ${counts.amber || 0} amber · ${counts.green || 0} green` : ''}
        action={<div className="flex flex-wrap gap-2">
          <div className="relative"><Search size={15} className="absolute left-3 top-3 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Day or pattern" className={`${input} !w-44 pl-9`} aria-label="Search records" /></div>
          {FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-lg border px-3 py-2 text-xs capitalize ${filter === f ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400' : 'border-slate-700 text-slate-400'}`}>{f}</button>)}
        </div>}>
        {loading && !rows ? <Loading /> : error ? <ErrorBox message={error} /> : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-petrol-raised text-xs uppercase tracking-wider text-slate-500">
                <tr>{['Day', 'Status', 'Pattern', 'Risk', 'HR', 'BP', 'Temp', 'SpO₂', 'Sleep', 'Mood', 'CO₂', 'Rad.'].map((h) => <th key={h} className="pb-3 pr-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <FragmentRow key={r.mission_day} r={r} open={open === r.mission_day} onToggle={() => setOpen(open === r.mission_day ? null : r.mission_day)} />
                ))}
                {shown.length === 0 && <tr><td colSpan={12} className="py-6 text-center text-slate-500">No records match.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="ML Engine Performance" subtitle="Measured on astronauts held out of training (simulated data)">
          {ml?.classifier ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-3">
                {[['ROC-AUC', ml.classifier.anomaly_roc_auc], ['Macro F1', ml.classifier.macro_f1], ['Unsupervised AUC', ml.isolation_forest.anomaly_roc_auc]].map(([k, v]) => (
                  <div key={k} className="rounded-md border border-slate-800 p-3 text-center"><p className="text-xs text-slate-500">{k}</p><p className="mt-1 text-2xl font-bold text-cyan-400">{fmt(v, 2)}</p></div>
                ))}
              </div>
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500"><tr><th className="py-1">Pattern</th><th>Precision</th><th>Recall</th><th>F1</th><th>Days</th></tr></thead>
                <tbody>{Object.entries(ml.classifier.per_class).map(([k, v]) => (
                  <tr key={k} className="border-t border-slate-800 text-slate-300"><td className="py-1.5 capitalize">{pretty(k)}</td><td>{fmt(v.precision, 2)}</td><td>{fmt(v.recall, 2)}</td><td>{fmt(v['f1-score'], 2)}</td><td>{v.support}</td></tr>
                ))}</tbody>
              </table>
              <p className="text-xs text-slate-500">{ml.caveat}</p>
            </div>
          ) : <Loading />}
        </Card>
        <Card title="NASA Research Reference" subtitle={study?.accession ? `${study.source} · ${study.accession}` : ''}>
          {study?.title ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-white">{study.title}</p>
              <p className="text-slate-400">{study.flight_program} · {study.mission} · {(study.organisms || []).join(', ')}</p>
              <p className="text-xs leading-relaxed text-slate-400">{study.how_it_is_used}</p>
              {study.doi && <p className="text-xs text-slate-500">DOI: {study.doi}</p>}
            </div>
          ) : <p className="text-sm text-slate-500">No study metadata bundled.</p>}
        </Card>
      </section>
    </div>
  )
}

function FragmentRow({ r, open, onToggle }) {
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-t border-slate-800 text-slate-300 hover:bg-slate-800/40">
        <td className="py-2.5 pr-3 font-medium text-white">{r.mission_day}</td>
        <td className="pr-3"><LevelBadge level={r.risk_level} /></td>
        <td className="pr-3 capitalize">{pretty(r.predicted_condition || '—')}</td>
        <td className="pr-3">{r.risk_score ?? '—'}</td>
        <td className="pr-3">{fmt(r.heart_rate_bpm, 0)}</td>
        <td className="pr-3">{fmt(r.systolic_bp, 0)}/{fmt(r.diastolic_bp, 0)}</td>
        <td className="pr-3">{fmt(r.body_temp_c, 1)}</td>
        <td className="pr-3">{fmt(r.spo2_pct, 1)}</td>
        <td className="pr-3">{fmt(r.sleep_hours, 1)}</td>
        <td className="pr-3">{fmt(r.mood_score, 1)}</td>
        <td className="pr-3">{fmt(r.cabin_co2_mmhg, 1)}</td>
        <td>{fmt(r.daily_radiation_msv, 2)}</td>
      </tr>
      {open && (
        <tr className="bg-petrol-deep"><td colSpan={12} className="p-4 text-xs text-slate-400">
          <p>Glucose {fmt(r.blood_glucose_mgdl, 0)} mg/dL · Resp. rate {fmt(r.resp_rate_bpm, 0)} · HRV {fmt(r.hrv_ms, 0)} ms · Stress {fmt(r.stress_level, 1)} · Exercise {fmt(r.exercise_min, 0)} min · Bone {fmt(r.bone_density_pct_baseline, 1)} % · Cumulative radiation {fmt(r.cum_radiation_msv, 1)} mSv</p>
          {r.assessment?.top_deviations?.length > 0 && <p className="mt-2">Shifts from personal baseline: {r.assessment.top_deviations.map((d) => `${pretty(d.vital)} ${fmt(d.value, 1)} (usual ${fmt(d.personal_baseline, 1)})`).join(' · ')}</p>}
          {r.notes && <p className="mt-2 text-slate-300">Notes: {r.notes}</p>}
        </td></tr>
      )}
    </>
  )
}
