// ── middleware/cors 单元测试 ──

import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'

const createCorsApp = (allowedOrigins?: string) => {
  const app = new Hono()
  app.use('*', async (c, next) => {
    const origin = c.req.header('origin')
    const envOrigins = allowedOrigins

    if (envOrigins && origin) {
      const origins = envOrigins.split(',').map((o: string) => o.trim())
      if (origins.includes(origin)) {
        c.header('Access-Control-Allow-Origin', origin)
      }
    } else {
      c.header('Access-Control-Allow-Origin', origin || '*')
    }
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
    c.header('Access-Control-Max-Age', '86400')

    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204)
    }
    await next()
  })
  app.get('/test', (c) => c.json({ ok: true }))
  app.post('/test', (c) => c.json({ ok: true }))
  return app
}

describe('corsMiddleware', () => {
  it('sets wildcard origin when ALLOWED_ORIGINS is not configured', async () => {
    const app = createCorsApp(undefined)
    const res = await app.request('/test')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('sets CORS methods header', async () => {
    const app = createCorsApp()
    const res = await app.request('/test')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS')
  })

  it('sets allowed headers', async () => {
    const app = createCorsApp()
    const res = await app.request('/test')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
  })

  it('sets max-age header', async () => {
    const app = createCorsApp()
    const res = await app.request('/test')
    expect(res.headers.get('Access-Control-Max-Age')).toBe('86400')
  })

  it('handles OPTIONS preflight with 204', async () => {
    const app = createCorsApp()
    const res = await app.request('/test', { method: 'OPTIONS' })
    expect(res.status).toBe(204)
  })

  it('allows normal GET request through', async () => {
    const app = createCorsApp()
    const res = await app.request('/test', { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, any>
    expect(body.ok).toBe(true)
  })

  it('allows listed origin when ALLOWED_ORIGINS is configured', async () => {
    const app = createCorsApp('https://example.com')
    const res = await app.request('/test', {
      headers: { origin: 'https://example.com' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
  })

  it('does NOT set origin header for unlisted origin when ALLOWED_ORIGINS is configured', async () => {
    const app = createCorsApp('https://example.com')
    const res = await app.request('/test', {
      headers: { origin: 'https://evil.com' },
    })
    // Header was never set (only set for listed origins)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('supports comma-separated multiple origins', async () => {
    const app = createCorsApp('https://a.com, https://b.com')
    const res = await app.request('/test', {
      headers: { origin: 'https://b.com' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://b.com')
  })
})
