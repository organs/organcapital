import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api, Asset, AssetSummary } from '../api'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'

const TYPE_COLORS: Record<string, string> = {
  bond: '#3b5bdb',
  cds: '#ef4444',
  interest_rate_swap: '#10b981',
  option: '#f59e0b',
}

const RATING_ORDER = ['BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-']

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`

const ASSET_TYPE_LABELS: Record<string, string> = {
  bond: 'Corporate Bond',
  cds: 'Credit Default Swap',
  interest_rate_swap: 'Interest Rate Swap',
  option: 'Option',
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [summary, setSummary] = useState<AssetSummary | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getAssets(), api.getAssetSummary()]).then(([a, s]) => {
      setAssets(a)
      setSummary(s)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner text="Loading portfolio…" />

  const pieData = summary
    ? Object.entries(summary.by_type).map(([name, value]) => ({ name, value }))
    : []

  const filtered = typeFilter ? assets.filter((a) => a.asset_type === typeFilter) : assets

  return (
    <div className="pb-10">
      <PageHeader
        title="Portfolio Holdings"
        subtitle={`${summary?.position_count} positions · AUM ${fmt(summary?.total_market_value ?? 0)} market value`}
      />

      <div className="grid grid-cols-3 gap-6 px-8 mt-6">
        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Portfolio by Asset Type</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={TYPE_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend
                formatter={(value) => ASSET_TYPE_LABELS[value] ?? value}
                iconSize={10}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Type breakdown */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Asset Type Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(summary?.by_type ?? {}).map(([type, mv]) => (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                  typeFilter === type
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: TYPE_COLORS[type] ?? '#94a3b8' }}
                  />
                  <span className="font-medium">{ASSET_TYPE_LABELS[type] ?? type}</span>
                </div>
                <span className="font-semibold">{fmt(mv)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="px-8 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              {typeFilter ? `${ASSET_TYPE_LABELS[typeFilter] ?? typeFilter} Positions` : 'All Positions'}
            </h2>
            {typeFilter && (
              <button
                onClick={() => setTypeFilter('')}
                className="text-xs text-brand-600 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Ticker</th>
                  <th className="text-left px-5 py-3">Issuer</th>
                  <th className="text-left px-5 py-3">Type</th>
                  <th className="text-left px-5 py-3">Rating</th>
                  <th className="text-left px-5 py-3">Sector</th>
                  <th className="text-right px-5 py-3">Face Value</th>
                  <th className="text-right px-5 py-3">Market Value</th>
                  <th className="text-left px-5 py-3">Counterparty</th>
                  <th className="text-left px-5 py-3">Settle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, 60).map((a) => (
                  <tr key={a.asset_id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-mono text-xs font-semibold text-brand-600">
                      {a.ticker}
                    </td>
                    <td className="px-5 py-2.5">{a.issuer}</td>
                    <td className="px-5 py-2.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: (TYPE_COLORS[a.asset_type] ?? '#94a3b8') + '20',
                          color: TYPE_COLORS[a.asset_type] ?? '#64748b',
                        }}
                      >
                        {ASSET_TYPE_LABELS[a.asset_type] ?? a.asset_type}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs">{a.rating}</td>
                    <td className="px-5 py-2.5 text-slate-500">{a.sector}</td>
                    <td className="px-5 py-2.5 text-right">{fmt(a.face_value)}</td>
                    <td className="px-5 py-2.5 text-right font-semibold">{fmt(a.market_value)}</td>
                    <td className="px-5 py-2.5 text-slate-500 text-xs">{a.counterparty}</td>
                    <td className="px-5 py-2.5 text-slate-400 text-xs">{a.settlement_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
