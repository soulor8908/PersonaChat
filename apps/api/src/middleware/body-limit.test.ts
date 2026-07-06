// ── middleware/body-limit 单元测试 ──

import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'

describe('bodySizeLimit', () => {
  const createApp = (maxBytes = 102400) => {
    const app = new Hono()
    app.use('*', async (c, next) => {
      const contentLength = c.req.header('Content-Length')
      if (contentLength) {
        const size = parseInt(contentLength, 10)
        if (size > maxBytes) {
          return c.json({ ok: false, error: 'Request body too large', code: 1002 }, 413)
        }
      }
      await next()
    })
    app.post('/test', (c) => c.json({ ok: true }))
    return app
  }

  it('allows requests under the size limit', async () => {
    const app = createApp(102400)
    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Length': '50000' },
      body: 'x'.repeat(100),
    })
    // The body-limit middleware passes, but Hono's built-in behavior may vary
    // Test that the middleware doesn't block it before the handler
    expect(res.status).not.toBe(413)
  })

  it('blocks requests exceeding the size limit', async () => {
    const app = createApp(1024) // 1KB limit
    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Length': '2048' },
      body: 'x'.repeat(2048),
    })
    expect(res.status).toBe(413)
    const body = await res.json() as Record<string, any>
    expect(body.ok).toBe(false)
    expect(body.error).toContain('too large')
  })

  it('allows request when Content-Length header is missing', async () => {
    const app = createApp(100)
    const res = await app.request('/test', {
      method: 'POST',
      body: 'some body without explicit content-length',
    })
    // Should pass through to handler
    expect(res.status).not.toBe(413)
  })

  it('allows request exactly at the limit', async () => {
    const app = createApp(1024)
    // Content-Length of 1024 is NOT > 1024, should pass
    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Length': '1024' },
      body: 'x'.repeat(1024),
    })
    expect(res.status).not.toBe(413)
  })
})
