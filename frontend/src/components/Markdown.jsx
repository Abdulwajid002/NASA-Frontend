/** Renders an assistant answer as real headings, paragraphs and bullet lists (never raw ** or --- symbols). */
function toSections(text) {
  const out = []
  let cur = { heading: null, level: 2, text: '', bullets: [] }
  const push = () => { if (cur.heading || cur.text || cur.bullets.length) out.push(cur) }
  for (const raw of String(text || '').split('\n')) {
    const line = raw.replace(/\*\*|__|`/g, '').trim()
    if (!line || /^([-*_=]\s*){3,}$/.test(line)) continue
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    const b = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/)
    if (h) { push(); cur = { heading: h[2], level: Math.min(h[1].length, 3), text: '', bullets: [] } }
    else if (b) cur.bullets.push(b[1])
    else cur.text += (cur.text ? ' ' : '') + line
  }
  push()
  return out
}

export default function Markdown({ text, sections }) {
  const parts = sections?.length ? sections : toSections(text)
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-200">
      {parts.map((s, i) => (
        <section key={i}>
          {s.heading && (s.level <= 2
            ? <h3 className="text-base font-semibold text-white">{s.heading}</h3>
            : <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{s.heading}</h4>)}
          {s.text && <p className="mt-1">{s.text}</p>}
          {s.bullets?.length > 0 && (
            <ul className="mt-1 list-disc space-y-1 pl-5 marker:text-slate-500">{s.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
          )}
        </section>
      ))}
    </div>
  )
}
