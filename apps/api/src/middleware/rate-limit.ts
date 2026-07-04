// ── 速率限制中间件 ──
// 基于 IP 的滑动窗口限制，CF Workers 内存级别（冷启动时重置）。
// 生产环境建议迁移到 CF Workers KV 或 Durable Objects。

import type { Context, Next } from 'hono'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// 每个 IP 的请求计数，CF Workers 实例级别共享
const store = new Map<string, RateLimitEntry>()

// 默认配置：每分钟 30 次请求（常规端点），聊天端点 10 次/分钟
const DEFAULT_LIMIT = 30
const DEFAULT_WINDOW_MS = 60_000

export function createRateLimiter(limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS) {
  return async function rateLimitMiddleware(c: Context, next: Next) {
    const ip = c.req.header('CF-Connecting-IP')
      || c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('x-real-ip')
      || 'unknown'

    const now = Date.now()
    const entry = store.get(ip)

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs })
      await next()
      return
    }

    entry.count++

    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      c.header('Retry-After', String(retryAfter))
      c.json({ ok: false, error: 'Too many requests', code: 2002 }, 429)
      return
    }

    await next()
  }
}

// 预配置的限制器
export const defaultRateLimiter = createRateLimiter(30)
export const chatRateLimiter = createRateLimiter(10)
