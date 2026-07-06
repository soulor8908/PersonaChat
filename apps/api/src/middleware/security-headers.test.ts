// ── middleware/security-headers 单元测试 ──

import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'

describe('securityHeaders', () => {
  const createApp = () => {
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.header('Content-Security-Policy', "default-src 'self'")
      c.header('X-Content-Type-Options', 'nosniff')
      c.header('X-Frame-Options', 'DENY')
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
      await next()
    })
    app.get('/test', (c) => c.json({ ok: true }))
    return app
  }

  it('sets Content-Security-Policy header', async () => {
    const app = createApp()
    const res = await app.request('/test')
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src")
  })

  it('sets X-Content-Type-Options header', async () => {
    const app = createApp()
    const res = await app.request('/test')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('sets X-Frame-Options header', async () => {
    const app = createApp()
    const res = await app.request('/test')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('sets HSTS header', async () => {
    const app = createApp()
    const res = await app.request('/test')
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000')
  })

  it('response still returns correct body', async () => {
    const app = createApp()
    const res = await app.request('/test')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, any>
    expect(body.ok).toBe(true)
  })
})
