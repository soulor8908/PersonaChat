// TECH-WEB-009 D48 — Layout TabBar 双主题适配
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { path: '/', label: '人格库', icon: '🧠' },
  { path: '/history', label: '对话', icon: '💬' },
  { path: '/create', label: '创建', icon: '➕' },
  { path: '/profile', label: '设置', icon: '⚙️' },
]

export function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col bg-surface-50 dark:bg-surface-900">
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <nav className="flex border-t border-surface-200 bg-surface-50 pb-safe dark:border-surface-700 dark:bg-surface-900">
        {TABS.map(t => {
          const active = pathname === t.path || (t.path !== '/' && pathname.startsWith(t.path))
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${active ? 'text-primary-500' : 'text-surface-400'}`}
            >
              <span className="text-lg">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
