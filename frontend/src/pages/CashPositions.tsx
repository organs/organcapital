import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { api, CashPosition, CashHistoryPoint } from '../api'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'

const fmt = (n: number) => `$${(n / 1_000_000).toFixed(2)}M`

const COLORS: Record<string, string> = {
  'Goldman Sachs Prime': '#3b5bdb',
  'Morgan Stanley Prime': '#0ea5e9',
  'BNY Mellon Custody': '#10b981',
  'State Street Custody': '#f59e0b',
}

function Sparkline({ data }: { data: number[] }) {
  const chart = data.map((v, i) => ({ i, v: v / 1_000_000 }))
  return (
    <ResponsiveContainer width="100%" height={50}>
      <LineChart data={chart}>
        <Line type="monotone" dataKey="v" stroke="#3b5bdb" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function CashPositions() {
  const [positions, setPositions] = useState<CashPosition[]>([])
  const [history, setHistory] = useState<CashHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getCashPositions(), api.getCashHistory(14)]).then(([pos, hist]) => {
      setPositions(pos)
      setHistory(hist)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner text="Loading cash positions…" />

  const asOfDate = positions[0]?.date_id ?? '—'

  const sparklineByName = (name: string) =>
    history
      .filter((h) => h.custodian_name === name)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => h.closing_balance)

  const total = positions.reduce((s, p) => s + p.closing_balance, 0)

  return (
    <div className="pb-10">
      <PageHeader title="Cash Positions" subtitle={`End-of-day balances as of ${asOfDate}`} />

      <div className="grid grid-cols-2 gap-5 px-8 mt-6">
        {positions.map((p) => {
          const color = COLORS[p.custodian_name] ?? '#64748b'
          const spark = sparklineByName(p.custodian_name)
          const pctOfTotal = ((p.closing_balance / total) * 100).toFixed(1)

          return (
            <div
              key={p.settlement_id}
              className="bg-white rounded-xl border border-slate-200 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{p.custodian_name}</p>
                  <p className="text-xs text-slate-400 capitalize mt-0.5">
                    {p.custodian_type.replace('_', ' ')}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: color + '20', color }}
                >
                  {pctOfTotal}% of total
                </span>
              </div>

              <p className="mt-3 text-3xl font-bold" style={{ color }}>
                {fmt(p.closing_balance)}
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 rounded-lg py-2">
                  <p className="text-slate-400">Opening</p>
                  <p className="font-semibold mt-0.5">{fmt(p.opening_balance)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg py-2">
                  <p className="text-emerald-500">Inflows</p>
                  <p className="font-semibold text-emerald-700 mt-0.5">+{fmt(p.inflows)}</p>
                </div>
                <div className="bg-red-50 rounded-lg py-2">
                  <p className="text-red-400">Outflows</p>
                  <p className="font-semibold text-red-600 mt-0.5">-{fmt(p.outflows)}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-slate-400 mb-1">14-day balance trend</p>
                <Sparkline data={spark} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary bar */}
      <div className="mx-8 mt-6 bg-brand-900 text-white rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-blue-300 uppercase tracking-wide">Total Firm Cash</p>
          <p className="text-3xl font-bold mt-1">{fmt(total)}</p>
        </div>
        <div className="text-right text-sm text-blue-200">
          <p>{positions.length} custodians</p>
          <p className="mt-0.5">USD only</p>
        </div>
      </div>
    </div>
  )
}
