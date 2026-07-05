// ── Models API E2E 测试 ──

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createApp } from '../src/server.js'
import { createTestEnv, getTestDb } from './helpers.js'
import { vi } from 'vitest'

vi.mock('../src/middleware/rate-limit.js', () => ({
  defaultRateLimiter: vi.fn(async (_c: any, next: any) => { await next() }),
  chatRateLimiter: vi.fn(async (_c: any, next: any) => { await next() }),
  createRateLimiter: () => vi.fn(async (_c: any, next: any) => { await next() }),
}))

describe('Models API E2E', () => {
  let app: ReturnType<typeof createApp>

  beforeAll(() => { getTestDb().reset() })

  beforeEach(() => {
    const env = createTestEnv()
    app = createApp(env)
  })

  it('GET /api/models returns model list with id, name, free', async () => {
    const res = await app.request('/api/models')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(2)
    body.data.forEach(m => {
      expect(m.id).toBeDefined()
      expect(m.name).toBeDefined()
      expect(typeof m.free).toBe('boolean')
    })
  })

  it('GET /api/models includes at least one free model', async () => {
    const res = await app.request('/api/models')
    const body = await res.json()
    const hasFree = body.data.some(m => m.free)
    expect(hasFree).toBe(true)
  })
})
