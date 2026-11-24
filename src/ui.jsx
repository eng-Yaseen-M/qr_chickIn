import { CATEGORIES } from './categories'

export const inputCls =
  'h-10 w-full rounded-control border border-line bg-surface px-3 text-sm'

export const compactCls =
  'h-10 rounded-control border border-line bg-surface px-3 text-sm'

export function Card({ className = '', children }) {
  return <div className={`bg-surface border border-line rounded-card ${className}`}>{children}</div>
}

const VARIANTS = {
  primary: 'bg-ink text-white hover:bg-ink-2',
  secondary: 'bg-surface text-ink border border-line hover:bg-fog',
  danger: 'text-danger hover:bg-fog',
  ghost: 'text-ink-2 hover:bg-fog',
}

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 h-10 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
    />
  )
}

export function CategoryChip({ cat }) {
  const c = CATEGORIES[cat]
  return (
    <span className={`${c.soft} inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-ink`}>
      <span className={`${c.bg} size-2 rounded-full`} />
      {c.label}
    </span>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm text-ink-2 mb-1">{label}</span>
      {children}
    </label>
  )
}

export function PageHeader({ title, hint, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {hint && <p className="text-sm text-muted mt-0.5">{hint}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
