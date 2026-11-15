import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../services/api'
import { useCrew } from '../context/Crew'
import { LEVEL, METRICS, fmt } from './ui'

/** Line chart of one metric; dots are coloured by that day's overall risk level. */
export default function MetricChart({ metric, days = 30, height = 280, band }) {
  const { selectedId, version } = useCrew()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (!selectedId) return
    let alive = true
    setRows(null)
    api.series(selectedId, metric, days)
      .then((s) => alive && setRows(s.mission_days.map((d, i) => ({ day: d, value: s.values[i], level: s.risk_levels[i] }))))
      .catch(() => alive && setRows([]))
    return () => { alive = false }
  }, [selectedId, metric, days, version])

  const m = METRICS[metric] || { label: metric, unit: '' }
  if (!rows) return <div style={{ height }} className="flex items-center justify-center text-sm text-slate-500">Loading chart…</div>
  if (!rows.some((r) => r.value !== null)) return <div style={{ height }} className="flex items-center justify-center text-sm text-slate-500">No {m.label.toLowerCase()} data logged yet.</div>

  const Dot = ({ cx, cy, payload }) => (payload.value === null || cx == null ? null
    : <circle cx={cx} cy={cy} r={payload.level && payload.level !== 'green' ? 4.5 : 2.5} fill={(LEVEL[payload.level] || LEVEL.green).hex} stroke="#1A3639" strokeWidth={1} />)

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#2B4649" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" stroke="#A3B0A8" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(d) => `D${d}`} minTickGap={24} />
          <YAxis stroke="#A3B0A8" tickLine={false} axisLine={false} fontSize={12} domain={['auto', 'auto']} tickFormatter={(v) => fmt(v, 1)} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1A3639', border: '1px solid #3A5558', borderRadius: 12, color: '#fff' }}
            labelFormatter={(d) => `Mission day ${d}`}
            formatter={(v) => [`${fmt(v, 2)} ${m.unit}`, m.label]}
          />
          {band?.warning_low > 0 && <ReferenceLine y={band.warning_low} stroke="#F0C36B" strokeDasharray="4 4" />}
          {band && band.warning_high < 1000 && metric !== 'spo2_pct' && metric !== 'mood_score' && metric !== 'sleep_hours'
            && <ReferenceLine y={band.warning_high} stroke="#F0C36B" strokeDasharray="4 4" />}
          <Line type="monotone" dataKey="value" stroke="#B6D4C4" strokeWidth={2.5} dot={<Dot />} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
