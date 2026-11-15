import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/** Full-screen navigation for narrow screens. Closes on Escape, locks page scroll and keeps focus inside. */
export default function MobileMenu({ open, onClose, label = 'Menu', children, footer }) {
  const panel = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const prev = document.activeElement
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector('a, button')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const items = panel.current.querySelectorAll('a[href], button:not([disabled]), select')
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [open, onClose])

  if (!open) return null
  return (
    <div ref={panel} role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-50 flex flex-col bg-petrol text-ivory">
      <div className="gutter flex h-[72px] shrink-0 items-center justify-between rule-b">
        <span className="t-eyebrow text-slate-400">{label}</span>
        <button onClick={onClose} aria-label="Close menu" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full"><X size={24} /></button>
      </div>
      <nav className="gutter flex flex-1 flex-col justify-center gap-1 overflow-y-auto py-6" aria-label={label}>{children}</nav>
      {footer && <div className="gutter rule-t py-6">{footer}</div>}
    </div>
  )
}
