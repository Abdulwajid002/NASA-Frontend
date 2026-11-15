import axios from 'axios'

// Same origin by default (FastAPI serves the UI). Set VITE_API_BASE_URL to point at another host.
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// ---- session token (kept in localStorage when available, otherwise in memory)
let token = null
try { token = localStorage.getItem('astra.token') } catch { /* storage unavailable */ }
export const session = {
  get token() { return token },
  set(t) { token = t; try { t ? localStorage.setItem('astra.token', t) : localStorage.removeItem('astra.token') } catch { /* ignore */ } },
  onExpired: () => {},
}
http.interceptors.request.use((cfg) => { if (token) cfg.headers.Authorization = `Bearer ${token}`; return cfg })
http.interceptors.response.use((r) => r, (err) => {
  if (err?.response?.status === 401 && token && !err.config.url.includes('/auth/')) { session.set(null); session.onExpired() }
  return Promise.reject(err)
})

const get = (url, params) => http.get(url, { params }).then((r) => r.data)
const post = (url, body) => http.post(url, body).then((r) => r.data)
const v1 = '/api/v1'

export const api = {
  baseURL: http.defaults.baseURL,
  health: () => get('/health'),
  astronauts: () => get(`${v1}/astronauts`),
  createAstronaut: (body) => post(`${v1}/astronauts`, body),
  crewOverview: () => get(`${v1}/crew/overview`),
  dashboard: (id) => get(`${v1}/astronauts/${id}/dashboard`),
  series: (id, metric, days = 30) => get(`${v1}/astronauts/${id}/series/${metric}`, { days }),
  readings: (id, days = 1000) => get(`${v1}/astronauts/${id}/readings`, { days }),
  alerts: (id, days = 7) => get(`${v1}/astronauts/${id}/alerts`, { days }),
  logReading: (body) => post(`${v1}/readings`, body),
  telemetry: (samples) => post(`${v1}/telemetry`, { samples }),
  symptoms: (id) => get(`${v1}/astronauts/${id}/symptoms`),
  addSymptom: (body) => post(`${v1}/symptoms`, body),
  wellbeingQuestions: () => get(`${v1}/wellbeing/questions`),
  addWellbeing: (body) => post(`${v1}/wellbeing`, body),
  chat: (body) => post(`${v1}/assistant/chat`, body),
  summary: (id) => get(`${v1}/astronauts/${id}/summary`),
  assistantStatus: () => get(`${v1}/assistant/status`),
  mlMetrics: () => get(`${v1}/ml/metrics`),
  standards: () => get(`${v1}/reference/standards`),
  nasaStudy: () => get(`${v1}/reference/nasa-study`),
  // authenticated file download (a plain link cannot send the token)
  downloadExport: async (id, format) => {
    const r = await http.get(`${v1}/astronauts/${id}/export`, { params: { format }, responseType: 'blob' })
    const url = URL.createObjectURL(r.data)
    const a = Object.assign(document.createElement('a'), { href: url, download: `${id}_health_record.${format}` })
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  },
  // auth
  signup: (body) => post(`${v1}/auth/signup`, body),
  login: (body) => post(`${v1}/auth/login`, body),
  me: () => get(`${v1}/auth/me`),
  // rule-based monitoring
  healthStatus: (id) => get(`${v1}/health/status`, { astronaut_id: id }),
  healthProtocol: () => get(`${v1}/health/protocol`),
  healthScenarios: () => get(`${v1}/health/scenarios`),
  postVitals: (body) => post(`${v1}/vitals`, body),
  postQuestionnaire: (body) => post(`${v1}/assessment`, body),
  analyze: (id) => post(`${v1}/health/analyze`, { astronaut_id: id }),
  simulate: (id, scenario) => post(`${v1}/health/simulate`, { astronaut_id: id, scenario }),
  healthHistory: (id, source = 'real', limit = 60) => get(`${v1}/health/history`, { astronaut_id: id, source, limit }),
  healthAlerts: (id, source = 'real') => get(`${v1}/health/alerts`, { astronaut_id: id, source }),
  acknowledgeAlert: (alertId) => post(`${v1}/health/alerts/${alertId}/acknowledge`),
}

export const errorText = (e) => {
  const d = e?.response?.data?.detail
  if (Array.isArray(d)) return d.map((x) => `${x.loc?.slice(-1)[0]}: ${x.msg}`).join('; ')
  return d || e?.message || 'Request failed'
}

export default api
