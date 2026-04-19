import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { DollarSign, TrendingDown, AlertCircle, Shield } from 'lucide-react'
import { api, CashSummary, CashHistoryPoint, ForecastDay } from '../api'
import KpiCard from '../components/KpiCard'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'

const CUSTODIAN_COLORS = ['#3b5bdb', '#0ea5e9', '#10b981', '#f59e0b']

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${(n / 1_000).toFixed(0)}K`

function AlertBanner({ message }: { message: string }) {
  return (
    <div className="mx-8 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState<CashSummary | null>(null)
  const [history, setHistory] = useState<CashHistoryPoint[]>([])
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getCashSummary(),
      api.getCashHistory(30),
      api.getNeedsForecast(7),
    ]).then(([s, h, f]) => {
      setSummary(s)
      setHistory(h)
      setForecast(f)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner text="Loading treasury data…" />

  // Build history chart data grouped by date
  const historyByDate: Record<string, Record<string, number>> = {}
  const custodianNames = [...new Set(history.map((h) => h.custodian_name))]
  history.forEach((h) => {
    if (!historyByDate[h.date]) historyByDate[h.date] = { date: h.date }
    historyByDate[h.date][h.custodian_name] = h.closing_balance / 1_000_000
  })
  const historyData = Object.values(historyByDate).slice(-30)

  // Forecast chart data
  const forecastData = forecast.map((f) => ({
    date: f.date.slice(5),
    inflows: f.inflows / 1_000_000,
    outflows: Math.abs(f.outflows) / 1_000_000,
    net: f.net_amount / 1_000_000,
  }))

  const hasCoverageAlert =
    summary && summary.cash_coverage_ratio < 1.5

  const largestObligation = summary
    ? Math.min(...(summary.positions.map((p) => p.outflows)))
    : 0

  return (
    <div className="pb-10">
      <PageHeader
        title="Treasury Dashboard"
        subtitle={`As of ${summary?.as_of_date} · Organ Capital`}
      />

      {hasCoverageAlert && (
        <AlertBanner message="Cash coverage ratio below 1.5x — review upcoming obligations immediately." />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 px-8 mt-6">
        <KpiCard
          label="Total Firm Cash"
          value={fmt(summary?.total_cash ?? 0)}
          sub="Across all custodians"
          accent="blue"
          icon={<DollarSign className="w-6 h-6" />}
        />
        <KpiCard
          label="T+1 Net Need"
          value={fmt(Math.abs(summary?.t1_net_need ?? 0))}
          sub={summary && summary.t1_net_need < 0 ? 'Net outflow tomorrow' : 'Net inflow tomorrow'}
          accent={summary && summary.t1_net_need < -5_000_000 ? 'red' : 'green'}
          icon={<TrendingDown className="w-6 h-6" />}
        />
        <KpiCard
          label="Cash Coverage"
          value={`${summary?.cash_coverage_ratio.toFixed(1)}x`}
          sub="Cash vs 7-day obligations"
          accent={
            summary && summary.cash_coverage_ratio < 1.5
              ? 'red'
              : summary && summary.cash_coverage_ratio < 3
              ? 'amber'
              : 'green'
          }
          icon={<Shield className="w-6 h-6" />}
        />
        <KpiCard
          label="T+2 Net Need"
          value={fmt(Math.abs(summary?.t2_net_need ?? 0))}
          sub={summary && summary.t2_net_need < 0 ? 'Net outflow in 2 days' : 'Net inflow in 2 days'}
          accent={summary && summary.t2_net_need < -8_000_000 ? 'red' : 'amber'}
          icon={<AlertCircle className="w-6 h-6" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 px-8 mt-6">
        {/* 30-day cash history */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            30-Day Cash Balance by Custodian ($M)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}M`} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(1)}M`]} />
              <Legend />
              {custodianNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={CUSTODIAN_COLORS[i % CUSTODIAN_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 7-day cash needs forecast */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            7-Day Cash Needs Forecast ($M)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}M`} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(1)}M`]} />
              <Legend />
              <Bar dataKey="inflows" name="Inflows" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="outflows" name="Outflows" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Custodian breakdown table */}
      <div className="px-8 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Custodian Positions — EOD</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Custodian</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-right px-5 py-3">Opening</th>
                <th className="text-right px-5 py-3">Inflows</th>
                <th className="text-right px-5 py-3">Outflows</th>
                <th className="text-right px-5 py-3">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary?.positions.map((p) => (
                <tr key={p.settlement_id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">{p.custodian_name}</td>
                  <td className="px-5 py-3 text-slate-500 capitalize">
                    {p.custodian_type.replace('_', ' ')}
                  </td>
                  <td className="px-5 py-3 text-right">{fmt(p.opening_balance)}</td>
                  <td className="px-5 py-3 text-right text-emerald-600">+{fmt(p.inflows)}</td>
                  <td className="px-5 py-3 text-right text-red-500">-{fmt(p.outflows)}</td>
                  <td className="px-5 py-3 text-right font-semibold">{fmt(p.closing_balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold text-sm">
              <tr>
                <td className="px-5 py-3" colSpan={5}>Total</td>
                <td className="px-5 py-3 text-right">{fmt(summary?.total_cash ?? 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
