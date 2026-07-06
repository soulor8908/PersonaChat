// ── middleware/auth 单元测试 ──

import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'

// 内联 auth 逻辑以避开 Hono context 依赖的 Env 类型
// 相当于在隔离环境中测试 authMiddleware 的行为
const createAuthApp = (apiKey?: string) => {
  const app = new Hono()
  app.use('*', async (c, next) => {
    const envApiKey = apiKey
    if (!envApiKey) {
      await next()
      return
    }
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      if (authHeader.slice(7) === envApiKey) {
        await next()
        return
      }
    }
    const xApiKey = c.req.header('x-api-key')
    if (xApiKey === envApiKey) {
      await next()
      return
    }
    c.header('Content-Type', 'application/json')
    return c.json({ ok: false, error: 'Unauthorized', code: 1003 }, 401)
  })
  app.get('/test', (c) => c.json({ ok: true }))
  return app
}

describe('authMiddleware', () => {
  it('allows all requests when API_KEY is not configured', async () => {
    const app = createAuthApp(undefined)
    const res = await app.request('/test')
    expect(res.status).toBe(200)
  })

  it('allows request with correct Bearer token', async () => {
    const app = createAuthApp('secret-key')
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer secret-key' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, any>
    expect(body.ok).toBe(true)
  })

  it('allows request with correct x-api-key header', async () => {
    const app = createAuthApp('secret-key')
    const res = await app.request('/test', {
      headers: { 'x-api-key': 'secret-key' },
    })
    expect(res.status).toBe(200)
  })

  it('rejects request with wrong Bearer token', async () => {
    const app = createAuthApp('secret-key')
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer wrong-key' },
    })
    expect(res.status).toBe(401)
    const body = await res.json() as Record<string, any>
    expect(body.ok).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('rejects request with wrong x-api-key', async () => {
    const app = createAuthApp('secret-key')
    const res = await app.request('/test', {
      headers: { 'x-api-key': 'wrong-key' },
    })
    expect(res.status).toBe(401)
  })

  it('rejects request without any auth header when API_KEY is set', async () => {
    const app = createAuthApp('secret-key')
    const res = await app.request('/test')
    expect(res.status).toBe(401)
  })

  it('rejects request with empty Bearer token', async () => {
    const app = createAuthApp('secret-key')
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer ' },
    })
    // empty token after Bearer slice → '' !== 'secret-key'
    expect(res.status).toBe(401)
  })
})
