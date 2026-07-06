// TECH-WEB-002 D41 — ThemeProvider + localStorage 降级 + SSR 安全
import { createContext, useContext, useState, useLayoutEffect, useCallback, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
})

function getInitialTheme(): Theme {
  // SSR 安全检查
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
    // 无 localStorage 时使用 prefers-color-scheme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
  } catch {
    // localStorage 访问异常（隐私模式等），降级到 light
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  // useLayoutEffect 在 paint 前同步执行，避免 FOUC
  useLayoutEffect(() => {
    const initial = getInitialTheme()
    setThemeState(initial)
    if (initial === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try {
      localStorage.setItem('theme', t)
    } catch {
      // QuotaExceededError 或隐私模式 — 降级到内存 state，主题仍切换成功
    }
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
