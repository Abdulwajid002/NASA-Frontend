import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Award, Bone, Brain, Droplets, Flame, HeartPulse, Moon, Radiation, Satellite, Smile, Sparkles, Thermometer, Wind } from 'lucide-react'

import api from '../services/api'
import { useAstronautData, useCrew } from '../context/Crew'
import MetricChart from '../components/MetricChart'
import Markdown from '../components/Markdown'
import { AlertItem, Card, ErrorBox, LevelBadge, Loading, PageHeader, btnGhost, fmt, lvl, pretty } from '../components/ui'

const HAZARD_ICON = {
  'Space Radiation': Radiation, 'Isolation and Confinement': Brain, 'Distance from Earth': Satellite,
  'Gravity Fields': Bone, 'Hostile/Closed Environments': Wind,
}
const ACCENT = {
  red: 'bg-red-400/10 text-red-400', cyan: 'bg-cyan-400/10 text-cyan-400', amber: 'bg-amber-400/10 text-amber-400',
  blue: 'bg-blue-400/10 text-blue-400', purple: 'bg-purple-400/10 text-purple-400', green: 'bg-emerald-400/10 text-emerald-400',
}

function MetricCard({ title, value, unit, icon: Icon, accent, trend, level }) {
  const arrow = trend?.direction === 'up' ? '▲' : trend?.direction === 'down' ? '▼' : '•'
  return (
    <div className={`rounded-lg border bg-petrol-raised p-5 transition hover:border-slate-600 ${level ? lvl(level).border : 'border-slate-800'}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <div className={`rounded-md p-3 ${ACCENT[accent]}`}><Icon size={21} /></div>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <h3 className="text-3xl font-bold tracking-tight text-white">{value}</h3>
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {trend?.change != null ? <>{arrow} {fmt(Math.abs(trend.change), 1)} vs previous 7 days</> : 'Latest recorded measurement'}
        {level && <span className={`ml-2 font-semibold ${lvl(level).text}`}>· {lvl(level).label}</span>}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const { astronaut } = useCrew()
  const { data: d, loading, error } = useAstronautData(api.dashboard)
  const [brief, setBrief] = useState(null)
  const [briefing, setBriefing] = useState(false)

  if (loading && !d) return <Loading label="Loading dashboard…" />
  if (error) return <ErrorBox message={error} />
  if (!d?.latest_reading) {
    return (
      <div className="space-y-6">
        <PageHeader crumb="MISSION CONTROL / DASHBOARD" title={`Welcome, ${astronaut?.name || 'Astronaut'}`} subtitle="No readings logged yet." />
        <Card><p className="text-sm text-slate-400">Log your first daily assessment to start building your personal baseline.</p>
          <Link to="/assessment" className={`${btnGhost} mt-4`}>Go to Assessment</Link></Card>
      </div>
    )
  }

  const r = d.latest_reading, a = d.assessment || {}, t = d.trends || {}, L = lvl(d.overall_level)
  const alertLevel = (m) => d.alerts.find((x) => x.metric === m)?.level
  const getBrief = async () => {
    setBriefing(true)
    try { setBrief(await api.summary(d.astronaut.id)) } catch (e) { setBrief({ reply: `Briefing unavailable: ${e.message}`, source: 'offline' }) }
    setBriefing(false)
  }

  const cards = [
    { title: 'Heart Rate', value: fmt(r.heart_rate_bpm, 0), unit: 'bpm', icon: HeartPulse, accent: 'red', trend: t.heart_rate_bpm, level: alertLevel('heart_rate_bpm') },
    { title: 'Blood Pressure', value: `${fmt(r.systolic_bp, 0)}/${fmt(r.diastolic_bp, 0)}`, unit: 'mmHg', icon: Activity, accent: 'cyan', trend: t.systolic_bp, level: alertLevel('systolic_bp') || alertLevel('diastolic_bp') },
    { title: 'Body Temperature', value: fmt(r.body_temp_c, 1), unit: '°C', icon: Thermometer, accent: 'amber', trend: t.body_temp_c, level: alertLevel('body_temp_c') },
    { title: 'Blood Glucose', value: fmt(r.blood_glucose_mgdl, 0), unit: 'mg/dL', icon: Droplets, accent: 'blue', trend: t.blood_glucose_mgdl, level: alertLevel('blood_glucose_mgdl') },
    { title: 'Blood Oxygen', value: fmt(r.spo2_pct, 1), unit: '% SpO₂', icon: Wind, accent: 'cyan', trend: t.spo2_pct, level: alertLevel('spo2_pct') },
    { title: 'Sleep Duration', value: fmt(r.sleep_hours, 1), unit: 'hours', icon: Moon, accent: 'purple', trend: t.sleep_hours, level: alertLevel('sleep_hours') },
    { title: 'Mood', value: fmt(r.mood_score, 1), unit: '/ 10', icon: Smile, accent: 'green', trend: t.mood_score, level: alertLevel('mood_score') },
    { title: 'Stress', value: fmt(r.stress_level, 1), unit: '/ 10', icon: Flame, accent: 'amber', trend: t.stress_level, level: alertLevel('stress_level') },
  ]
  const bone = d.forecast?.bone_density, rad = d.forecast?.radiation

  return (
    <div className="space-y-8">
      <PageHeader crumb="MISSION CONTROL / DASHBOARD" title={`Welcome, ${d.astronaut.name}`}
        subtitle={`Mission day ${d.mission_day} · ${d.engagement.days_logged} days logged · ${d.engagement.logging_streak_days}-day logging streak`}
        right={<button onClick={getBrief} disabled={briefing} className={btnGhost}><Sparkles size={16} className="text-cyan-400" />{briefing ? 'Preparing briefing…' : 'AI daily briefing'}</button>} />

      {/* Overall status */}
      <div className={`grid gap-5 rounded-lg border p-6 md:grid-cols-[auto_1fr_auto] md:items-center ${L.border} ${L.bg}`}>
        <div className="flex items-center gap-4">
          <L.Icon size={40} className={L.text} />
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Overall status</p>
            <p className={`text-2xl font-bold ${L.text}`}>{L.label}</p>
          </div>
        </div>
        <div className="text-sm text-slate-300">
          <p>ML pattern: <span className="font-semibold capitalize text-white">{pretty(a.predicted_condition || 'normal')}</span></p>
          {a.top_deviations?.length > 0 && (
            <p className="mt-1 text-slate-400">Largest shifts from your personal baseline: {a.top_deviations.map((x) =>
              `${pretty(x.vital)} ${fmt(x.value, 1)} (usual ${fmt(x.personal_baseline, 1)})`).join(' · ')}</p>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400">ML risk score</p>
          <p className={`text-4xl font-bold ${lvl(a.risk_level).text}`}>{a.risk_score ?? '—'}<span className="text-base text-slate-500"> / 100</span></p>
        </div>
      </div>

      {brief && (
        <Card title="Daily briefing" subtitle={brief.source === 'llm' ? `Generated by ${brief.model}` : 'Offline guidance (no link to the AI service)'}>
          <Markdown text={brief.reply} sections={brief.sections} />
        </Card>
      )}

      <div>
        <h2 className="t-sub mb-4 text-ivory">Health Overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((c) => <MetricCard key={c.title} {...c} />)}</div>
      </div>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Heart Rate Trend" subtitle="Last 30 mission days · dots show that day's risk level"><MetricChart metric="heart_rate_bpm" days={30} /></Card>
        <Card title="ML Risk Score" subtitle="How unusual each day was for this astronaut"><MetricChart metric="risk_score" days={30} /></Card>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Active Alerts" subtitle={d.alerts.length ? `${d.alerts.length} item(s) need attention today` : 'Nothing needs attention today'}>
          <div className="space-y-3">
            {d.alerts.length === 0 && <p className="text-sm text-emerald-400">All logged values are within expected ranges.</p>}
            {d.alerts.map((al, i) => <AlertItem key={i} alert={al} />)}
          </div>
        </Card>
        <Card title="Reminders & Activities" subtitle="Generated from your own record">
          <div className="space-y-3">
            {d.reminders.slice(0, 6).map((rem) => (
              <div key={rem.id} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${rem.priority === 'high' ? 'bg-red-400' : rem.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-500'}`} />
                <div><p className="text-sm font-medium text-white">{rem.title}</p><p className="mt-0.5 text-xs text-slate-500">{rem.reason}</p></div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <div>
        <h2 className="t-sub mb-1 text-ivory">Five Hazards of Human Spaceflight</h2>
        <p className="mb-4 text-sm text-slate-500">NASA Human Research Program hazards, assessed from this astronaut's record</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {d.hazards.map((h) => {
            const Icon = HAZARD_ICON[h.hazard] || Activity, HL = lvl(h.status)
            return (
              <div key={h.hazard} className={`rounded-lg border bg-petrol-raised p-4 ${HL.border}`}>
                <div className="flex items-center justify-between"><Icon size={22} className={HL.text} /><LevelBadge level={h.status} /></div>
                <p className="mt-3 text-sm font-semibold text-white">{h.hazard}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{h.summary}</p>
              </div>
            )
          })}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Bone Density Forecast" subtitle="Gravity Fields">
          {bone ? (<>
            <p className="text-3xl font-bold text-white">{fmt(bone.current_pct, 1)}<span className="text-sm text-slate-400"> % of pre-flight</span></p>
            <p className="mt-3 text-sm text-slate-400">Losing <span className="text-white">{fmt(bone.loss_pct_per_month, 2)} %</span> per month</p>
            <p className="mt-1 text-sm text-slate-400">Projected at end of mission: <span className="text-white">{fmt(bone.projected_end_of_mission_pct, 1)} %</span></p>
          </>) : <p className="text-sm text-slate-500">Not enough bone-density scans logged yet.</p>}
        </Card>
        <Card title="Radiation Exposure" subtitle="Space Radiation">
          {rad ? (<>
            <p className="text-3xl font-bold text-white">{fmt(rad.cumulative_msv, 1)}<span className="text-sm text-slate-400"> mSv cumulative</span></p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, rad.pct_of_career_limit)}%` }} /></div>
            <p className="mt-2 text-sm text-slate-400">{fmt(rad.pct_of_career_limit, 1)} % of the {fmt(rad.career_limit_msv, 0)} mSv career limit</p>
            <p className="mt-1 text-sm text-slate-400">Projected at end of mission: <span className="text-white">{fmt(rad.projected_end_of_mission_msv, 0)} mSv</span></p>
          </>) : <p className="text-sm text-slate-500">No radiation dose logged yet.</p>}
        </Card>
        <Card title="Achievements" subtitle={`${d.engagement.logging_streak_days}-day logging streak`}>
          <div className="space-y-2">
            {d.engagement.badges.map((b) => (
              <div key={b.id} className={`flex items-center gap-2 text-sm ${b.earned ? 'text-white' : 'text-slate-600'}`}>
                <Award size={16} className={b.earned ? 'text-amber-400' : 'text-slate-700'} />{b.title}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
