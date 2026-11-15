import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Wifi, WifiOff } from 'lucide-react'

import api, { errorText } from '../services/api'
import { useAstronautData, useCrew } from '../context/Crew'
import Markdown from '../components/Markdown'
import { AlertItem, Card, ErrorBox, Loading, PageHeader, btn, btnGhost, input } from '../components/ui'

const STARTERS = ['Give me a summary of my last few days.', 'What should I do today?', 'How are my sleep and mood trending?', 'Am I at risk from radiation or bone loss?']

export default function Guidance() {
  const { selectedId, astronaut } = useCrew()
  const { data: d, loading, error } = useAstronautData(api.dashboard)
  const [status, setStatus] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { api.assistantStatus().then(setStatus).catch(() => setStatus({ reachable: false })) }, [])
  useEffect(() => { setMessages([]) }, [selectedId])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, busy])

  const send = async (msg) => {
    const message = (msg ?? text).trim()
    if (!message || busy) return
    const history = messages.map(({ role, content }) => ({ role, content })).slice(-8)
    setMessages((m) => [...m, { role: 'user', content: message }]); setText(''); setBusy(true)
    try {
      const out = await api.chat({ astronaut_id: selectedId, message, history })
      setMessages((m) => [...m, { role: 'assistant', content: out.reply, sections: out.sections, source: out.source, model: out.model }])
    } catch (ex) {
      setMessages((m) => [...m, { role: 'assistant', content: `Sorry, the assistant could not answer: ${errorText(ex)}`, source: 'error' }])
    }
    setBusy(false)
  }

  const online = status?.reachable
  return (
    <div className="space-y-8">
      <PageHeader crumb="MISSION CONTROL / GUIDANCE" title="Guidance & AI Assistant"
        subtitle="Plain-language next steps for every alert, reminders for your routine, and an assistant grounded in your own record."
        right={status && (
          <div className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm ${online ? 'border-emerald-400/30 text-emerald-400' : 'border-amber-400/30 text-amber-400'}`}>
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}{online ? 'AI link online' : 'Offline mode — on-board guidance'}
          </div>
        )} />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Card title="Health Assistant" subtitle={`Answers use ${astronaut?.name}'s readings, alerts, trends and symptoms`} className="xl:col-span-3">
          <div className="flex h-[440px] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">Ask a question, or start with one of these:</p>
                  <div className="flex flex-wrap gap-2">{STARTERS.map((s) => <button key={s} onClick={() => send(s)} className={`${btnGhost} !min-h-[44px] !whitespace-normal !justify-start !rounded-md py-2 text-left`}>{s}</button>)}</div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-cyan-400/15 text-cyan-50' : 'border border-slate-800 bg-petrol-deep text-slate-200'}`}>
                    {m.role === 'assistant' && <p className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500"><Bot size={13} />{m.source === 'llm' ? m.model : m.source === 'offline' ? 'Offline guidance' : 'Assistant'}</p>}
                    {m.role === 'assistant' && m.source !== 'error' ? <Markdown text={m.content} sections={m.sections} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
                  </div>
                </div>
              ))}
              {busy && <p className="text-sm text-slate-500">Assistant is thinking…</p>}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send() }} className="mt-4 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Ask about your health data…" className={input} aria-label="Message" />
              <button className={btn} disabled={busy || !text.trim()} aria-label="Send"><Send size={16} /></button>
            </form>
            <p className="mt-2 text-[11px] text-slate-600">Decision support only — not a medical diagnosis. Contact the flight surgeon for any red alert.</p>
          </div>
        </Card>

        <div className="space-y-5 xl:col-span-2">
          <Card title="Reminders" subtitle="Generated from your record — no ground contact needed">
            {loading && !d ? <Loading /> : error ? <ErrorBox message={error} /> : (
              <div className="space-y-3">
                {d.reminders.map((rem) => (
                  <div key={rem.id} className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${rem.priority === 'high' ? 'bg-red-400' : rem.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-500'}`} />
                    <div><p className="text-sm font-medium text-white">{rem.title}</p><p className="mt-0.5 text-xs text-slate-500">{rem.reason}</p></div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </section>

      <Card title="Guidance for Today's Alerts" subtitle="What each alert means and what to do next">
        {loading && !d ? <Loading /> : error ? null : d.alerts.length === 0
          ? <p className="text-sm text-emerald-400">No active alerts. Keep to your exercise, hydration and sleep routine.</p>
          : <div className="grid gap-3 lg:grid-cols-2">{d.alerts.map((al, i) => <AlertItem key={i} alert={al} day={d.mission_day} />)}</div>}
      </Card>
    </div>
  )
}
