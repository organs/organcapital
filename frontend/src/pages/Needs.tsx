import { useEffect, useState } from 'react'
import { api, Need } from '../api'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'

const fmt = (n: number) => {
  const abs = Math.abs(n)
  const str = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(2)}M` : `$${(abs / 1_000).toFixed(0)}K`
  return n < 0 ? `-${str}` : `+${str}`
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-700',
  settled: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
}

const TYPE_LABELS: Record<string, string> = {
  trade_settlement: 'Trade Settlement',
  margin_call: 'Margin Call',
  redemption: 'Redemption',
  subscription: 'Subscription',
  coupon_payment: 'Coupon Payment',
}

export default function Needs() {
  const [needs, setNeeds] = useState<Need[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [sortKey, setSortKey] = useState<'date_id' | 'amount'>('date_id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    setLoading(true)
    api.getNeeds(undefined, undefined, statusFilter || undefined).then((data) => {
      setNeeds(data)
      setLoading(false)
    })
  }, [statusFilter])

  const toggleSort = (key: 'date_id' | 'amount') => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = needs
    .filter((n) => !typeFilter || n.need_type === typeFilter)
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'amount') return mul * (a.amount - b.amount)
      return mul * a.date_id.localeCompare(b.date_id)
    })

  const totalOutflows = filtered.reduce((s, n) => s + Math.min(0, n.amount), 0)
  const totalInflows = filtered.reduce((s, n) => s + Math.max(0, n.amount), 0)

  if (loading) return <LoadingSpinner text="Loading obligations…" />

  return (
    <div className="pb-10">
      <PageHeader
        title="Cash Obligations"
        subtitle="Trade settlements, margin calls, redemptions & subscriptions"
      >
        <div className="flex items-center gap-2">
          {(['', 'pending', 'settled', 'failed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 px-8 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 uppercase">Total Obligations</p>
          <p className="text-2xl font-bold mt-1">{filtered.length}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <p className="text-xs text-red-400 uppercase">Total Outflows</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{fmt(totalOutflows)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <p className="text-xs text-emerald-400 uppercase">Total Inflows</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{fmt(totalInflows)}</p>
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex items-center gap-2 px-8 mt-4 flex-wrap">
        {['', ...Object.keys(TYPE_LABELS)].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              typeFilter === t
                ? 'bg-brand-900 text-white border-brand-900'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t === '' ? 'All Types' : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="px-8 mt-4">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th
                  className="text-left px-5 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => toggleSort('date_id')}
                >
                  Date {sortKey === 'date_id' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Description</th>
                <th className="text-left px-5 py-3">Custodian</th>
                <th
                  className="text-right px-5 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => toggleSort('amount')}
                >
                  Amount {sortKey === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-center px-5 py-3">Priority</th>
                <th className="text-center px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 200).map((n) => (
                <tr key={n.need_id} className="hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-mono text-xs">{n.date_id}</td>
                  <td className="px-5 py-2.5">
                    <span className="text-xs font-medium">{TYPE_LABELS[n.need_type] ?? n.need_type}</span>
                  </td>
                  <td className="px-5 py-2.5 text-slate-500 max-w-xs truncate">{n.description}</td>
                  <td className="px-5 py-2.5 text-slate-400 text-xs">{n.custodian_name ?? '—'}</td>
                  <td
                    className={`px-5 py-2.5 text-right font-semibold font-mono text-xs ${
                      n.amount < 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {fmt(n.amount)}
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[n.priority]}`}
                    >
                      {n.priority}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[n.status]}`}
                    >
                      {n.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <p className="text-center text-xs text-slate-400 py-3">
              Showing 200 of {filtered.length} records
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
