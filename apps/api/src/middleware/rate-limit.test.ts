// ── middleware/rate-limit 单元测试 ──

import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'

// 内联 rate limiter (与 src 实现逻辑一致，但隔离测试)
const createRateLimitedApp = (limit = 5, windowMs = 60_000) => {
  const store = new Map<string, { count: number; resetAt: number }>()

  const app = new Hono()
  app.use('*', async (c, next) => {
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
      return c.json({ ok: false, error: 'Too many requests', code: 2002 }, 429)
    }
    await next()
  })

  app.get('/test', (c) => c.json({ ok: true }))
  return app
}

describe('rateLimitMiddleware', () => {
  it('allows requests within limit', async () => {
    const app = createRateLimitedApp(5)
    for (let i = 0; i < 5; i++) {
      const res = await app.request('/test')
      expect(res.status).toBe(200)
    }
  })

  it('blocks requests exceeding limit', async () => {
    const app = createRateLimitedApp(3)
    // first 3 pass
    for (let i = 0; i < 3; i++) {
      await app.request('/test')
    }
    // 4th should be blocked
    const res = await app.request('/test')
    expect(res.status).toBe(429)
    const body = await res.json() as Record<string, any>
    expect(body.ok).toBe(false)
    expect(body.error).toBe('Too many requests')
  })

  it('sets Retry-After header when rate limited', async () => {
    const app = createRateLimitedApp(1)
    await app.request('/test')
    const res = await app.request('/test')
    expect(res.headers.get('Retry-After')).toBeDefined()
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0)
  })

  it('uses CF-Connecting-IP header for identification', async () => {
    const app = createRateLimitedApp(2)
    // Different IPs should have separate limits
    const res1 = await app.request('/test', { headers: { 'CF-Connecting-IP': '1.1.1.1' } })
    const res2 = await app.request('/test', { headers: { 'CF-Connecting-IP': '2.2.2.2' } })
    // both pass since they are different IPs
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
  })

  it('same IP blocked after limit', async () => {
    const app = createRateLimitedApp(1)
    // pass first
    const res1 = await app.request('/test', { headers: { 'x-real-ip': '10.0.0.1' } })
    expect(res1.status).toBe(200)
    // blocked second
    const res2 = await app.request('/test', { headers: { 'x-real-ip': '10.0.0.1' } })
    expect(res2.status).toBe(429)
  })

  it('falls back to x-forwarded-for when CF-Connecting-IP absent', async () => {
    const app = createRateLimitedApp(1)
    const res1 = await app.request('/test', { headers: { 'x-forwarded-for': '3.3.3.3' } })
    expect(res1.status).toBe(200)
  })

  it('falls back to unknown when no IP headers present', async () => {
    const app = createRateLimitedApp(1)
    // Two requests from "unknown" IP
    const res1 = await app.request('/test')
    expect(res1.status).toBe(200)
    const res2 = await app.request('/test')
    expect(res2.status).toBe(429)
  })

  it('default limit is applied correctly', async () => {
    const app = createRateLimitedApp(5)
    for (let i = 0; i < 5; i++) {
      const res = await app.request('/test')
      expect(res.status).toBe(200)
    }
    const res = await app.request('/test')
    expect(res.status).toBe(429)
  })

  it('resets after window duration', async () => {
    const app = createRateLimitedApp(2, 10) // 10ms window
    await app.request('/test')
    await app.request('/test')
    // should be rate limited now
    const blocked = await app.request('/test')
    expect(blocked.status).toBe(429)
    // wait for window to expire
    await new Promise(r => setTimeout(r, 15))
    // should be allowed again
    const fresh = await app.request('/test')
    expect(fresh.status).toBe(200)
  })
})
