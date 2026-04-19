interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accent?: 'green' | 'red' | 'blue' | 'amber'
  icon?: React.ReactNode
}

const accentMap = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
}

export default function KpiCard({ label, value, sub, accent = 'blue', icon }: KpiCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${accentMap[accent]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {sub && <p className="mt-0.5 text-xs opacity-60">{sub}</p>}
        </div>
        {icon && <div className="opacity-60">{icon}</div>}
      </div>
    </div>
  )
}
