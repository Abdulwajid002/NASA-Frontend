import { useState } from 'react'
import { MapPin } from 'lucide-react'

import api, { errorText } from '../services/api'
import { useAstronautData, useCrew } from '../context/Crew'
import HumanBodyMap from '../components/HumanBody/HumanBodyMap'
import { Card, ErrorBox, Loading, PageHeader, btn, input, pretty } from '../components/ui'

const SYMPTOMS = ['Pain', 'Stiffness', 'Swelling', 'Numbness', 'Weakness', 'Headache', 'Dizziness', 'Nausea', 'Pressure', 'Skin irritation', 'Vision change', 'Shortness of breath']
const sevColor = (s) => (s >= 7 ? 'text-red-400' : s >= 4 ? 'text-amber-400' : 'text-emerald-400')

export default function HumanBody() {
  const { selectedId, refresh } = useCrew()
  const [region, setRegion] = useState('')
  const [picked, setPicked] = useState([])
  const [severity, setSeverity] = useState(3)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const { data: history, loading, error } = useAstronautData(api.symptoms)

  const toggle = (s) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))

  const save = async () => {
    if (!region) return setErr('Select a body region on the diagram first.')
    if (!picked.length && !notes.trim()) return setErr('Choose at least one symptom or add a note.')
    setBusy(true); setErr(null)
    try {
      await api.addSymptom({ astronaut_id: selectedId, body_part: region.toLowerCase().replace(' ', '_'), severity,
        description: [picked.join(', '), notes.trim()].filter(Boolean).join(' — ') })
      setPicked([]); setNotes(''); setSeverity(3); setRegion(''); refresh()
    } catch (ex) { setErr(errorText(ex)) }
    setBusy(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader crumb="MISSION CONTROL / HUMAN BODY" title="Interactive Body Map"
        subtitle="Select a body region, describe what you feel and rate it. Entries are stored in your on-board record and shared with the AI assistant." />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Select a region" subtitle={region ? `Selected: ${region}` : 'Click or press Enter on a body part'}>
          <HumanBodyMap selectedRegion={region} onSelect={setRegion} />
        </Card>

        <Card title="Record a symptom" subtitle={region || 'No region selected'}>
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Symptoms</p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <button key={s} type="button" onClick={() => toggle(s)} aria-pressed={picked.includes(s)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${picked.includes(s) ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>{s}</button>
            ))}
          </div>

          <label className="mt-6 block text-xs uppercase tracking-wider text-slate-500">Severity: <span className={`text-base font-bold ${sevColor(severity)}`}>{severity}</span> / 10
            <input type="range" min={1} max={10} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="mt-2 w-full accent-cyan-400" />
          </label>

          <label className="mt-5 block text-xs uppercase tracking-wider text-slate-500">Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={400} placeholder="When did it start? What makes it better or worse?" className={`${input} mt-2 normal-case`} />
          </label>

          <div className="mt-5 flex items-center gap-4">
            <button onClick={save} disabled={busy} className={btn}><MapPin size={16} />{busy ? 'Saving…' : 'Save symptom'}</button>
            {err && <p className="text-sm text-red-400">{err}</p>}
          </div>
          {severity >= 8 && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/5 p-3 text-xs text-red-300">Severe symptoms: tell a crewmate and contact the flight surgeon / mission control.</p>}
        </Card>
      </section>

      <Card title="Symptom History" subtitle="Most recent first">
        {loading && !history ? <Loading /> : error ? <ErrorBox message={error} /> : history.length === 0 ? <p className="text-sm text-slate-500">No symptoms recorded.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {history.map((s) => (
              <div key={s.id} className="rounded-md border border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold capitalize text-white">{pretty(s.body_part)}</h3>
                  <span className={`text-sm font-semibold ${sevColor(s.severity)}`}>Severity {s.severity}/10</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{s.description || 'No description'}</p>
                <p className="mt-2 text-xs text-slate-500">Mission day {s.mission_day ?? '—'}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
