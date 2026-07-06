// TECH-WEB-015 D-2 — 测试环境扩展（Spec 偏离 D-2：scrollTo mock 是 Create sticky 测试依赖）
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// matchMedia mock — ThemeProvider 媒体查询依赖
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// scrollTo mock — jsdom 无原生 scrollTo，Create sticky 测试依赖
HTMLElement.prototype.scrollTo = vi.fn() as unknown as typeof HTMLElement.prototype.scrollTo

// IntersectionObserver mock — R10 引入
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn()
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})
