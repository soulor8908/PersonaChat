// TECH-WEB-008 D47 — ThemeToggle 太阳/月亮图标切换
import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-pressed={isDark}
      aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
      className="flex items-center gap-2 rounded-lg border border-surface-300 px-3 py-1.5 text-sm text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
    >
      <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
      <span>{isDark ? '亮色' : '暗色'}</span>
    </button>
  )
}
