import { Link } from 'react-router-dom'

/** Wordmark. The celadon rule under it is the same line used by the navigation. */
export default function Brand({ to = '/', className = '' }) {
  return (
    <Link to={to} className={`group inline-flex flex-col leading-none text-inherit no-underline ${className}`} aria-label="ASTRA-HEALTH home">
      <span className="font-display text-[1.375rem] tracking-[0.14em]">ASTRA<span className="text-celadon">HEALTH</span></span>
      <span className="mt-1.5 h-px w-8 bg-celadon transition-[width] duration-500 group-hover:w-full" />
    </Link>
  )
}
