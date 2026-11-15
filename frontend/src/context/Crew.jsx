import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { session } from '../services/api'

const CrewContext = createContext(null)
export const useCrew = () => useContext(CrewContext)

const remember = {
  get: () => { try { return localStorage.getItem('astra.astronaut') } catch { return null } },
  set: (v) => { try { localStorage.setItem('astra.astronaut', v) } catch { /* storage unavailable */ } },
}

export function CrewProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [crew, setCrew] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [online, setOnline] = useState(null)   // null = checking
  const [version, setVersion] = useState(0)    // bump to make pages refetch

  const loadCrew = useCallback(async () => {
    try {
      const list = await api.astronauts()
      setCrew(list)
      setOnline(true)
      setSelectedId((cur) => {
        const saved = cur || remember.get()
        return list.some((a) => a.id === saved) ? saved : list[0]?.id ?? null
      })
    } catch {
      setOnline(false)
    }
  }, [])

  // restore the session on page load
  useEffect(() => {
    session.onExpired = () => { setUser(null); setCrew([]); setSelectedId(null) }
    if (!session.token) { setAuthReady(true); api.health().then(() => setOnline(true)).catch(() => setOnline(false)); return }
    api.me().then(setUser).catch((e) => { if (!e.response) setOnline(false); session.set(null) }).finally(() => setAuthReady(true))
  }, [])
  useEffect(() => { if (user) loadCrew() }, [user, loadCrew])

  const signIn = ({ access_token, user: u }) => { session.set(access_token); setOnline(true); setUser(u) }
  const signOut = () => { session.set(null); setUser(null); setCrew([]); setSelectedId(null) }
  const isStaff = user?.role === 'flight_surgeon' || user?.role === 'admin'

  const select = (id) => { remember.set(id); setSelectedId(id) }
  const refresh = () => { setVersion((v) => v + 1); loadCrew() }
  const astronaut = crew.find((a) => a.id === selectedId) || null

  return (
    <CrewContext.Provider value={{ crew, astronaut, selectedId, select, refresh, version, online, user, authReady, signIn, signOut, isStaff }}>
      {children}
    </CrewContext.Provider>
  )
}

/** Fetch helper: reruns when the astronaut changes or data is refreshed. */
export function useAstronautData(fetcher, deps = []) {
  const { selectedId, version } = useCrew()
  const [state, setState] = useState({ data: null, loading: true, error: null })
  useEffect(() => {
    if (!selectedId) return
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher(selectedId)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((e) => alive && setState({ data: null, loading: false, error: e?.response?.data?.detail || e.message }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, version, ...deps])
  return state
}
