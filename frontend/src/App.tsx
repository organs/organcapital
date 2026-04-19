import { Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Landmark, BarChart3, ListChecks, Bot, TrendingUp } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import CashPositions from './pages/CashPositions'
import Assets from './pages/Assets'
import Needs from './pages/Needs'
import Chatbot from './pages/Chatbot'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/cash', label: 'Cash Positions', icon: Landmark },
  { to: '/assets', label: 'Portfolio', icon: BarChart3 },
  { to: '/needs', label: 'Obligations', icon: ListChecks },
  { to: '/chat', label: 'AI Assistant', icon: Bot },
]

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-brand-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-brand-700">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-300" />
            <div>
              <p className="font-bold text-sm tracking-wide">ORGAN CAPITAL</p>
              <p className="text-xs text-blue-300">Treasury Management</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-blue-200 hover:bg-brand-700 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-brand-700">
          <p className="text-xs text-blue-400">Systematic Credit Fund</p>
          <p className="text-xs text-blue-500">AUM ~$500M USD</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cash" element={<CashPositions />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/needs" element={<Needs />} />
          <Route path="/chat" element={<Chatbot />} />
        </Routes>
      </main>
    </div>
  )
}
