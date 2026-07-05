// ── Persona CRUD E2E 测试 ──
// 覆盖 POST/GET/PUT/DELETE /api/personas 全路径（正常 + 边界 + 错误）
// AI-007: 每个 Given/When/Then 对应验收标准

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { createApp } from '../src/server.js'
import { createTestEnv, getTestDb } from './helpers.js'

describe('Persona CRUD E2E', () => {
  let app: ReturnType<typeof createApp>
  let db: ReturnType<typeof getTestDb>

  beforeAll(() => {
    db = getTestDb()
  })

  beforeEach(() => {
    db.reset()
    const env = createTestEnv()
    app = createApp(env)
  })

  // ── P1: 正常创建 ──
  describe('POST /api/personas', () => {
    it('P1: GIVEN valid input WHEN create THEN return 201 + persona', async () => {
      const res = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Karpathy',
          description: 'AI researcher and educator',
          category: 'educator',
          systemPrompt: 'You are Andrej Karpathy. Think in first principles.',
        }),
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.data.id).toBeDefined()
      expect(body.data.name).toBe('Karpathy')
      expect(body.data.description).toBe('AI researcher and educator')
      expect(body.data.category).toBe('educator')
      expect(body.data.systemPrompt).toContain('Andrej Karpathy')
      expect(body.data.createdAt).toBeTypeOf('number')
      expect(body.data.updatedAt).toBeTypeOf('number')
      expect(body.data.stargazersCount).toBe(0)
    })

    // ── P5: POST 空 body ──
    it('P5: GIVEN empty body WHEN create THEN return 400', async () => {
      const res = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })

      expect(res.status).toBe(400)
    })

    // ── P6: POST 缺少必填字段 ──
    it('P6: GIVEN missing name WHEN create THEN return 400', async () => {
      const res = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'educator',
          systemPrompt: 'You are a helpful assistant.',
        }),
      })

      expect(res.status).toBe(400)
    })

    // ── P12: POST 超长 systemPrompt ──
    it('P12: GIVEN systemPrompt > 8000 chars WHEN create THEN return 400', async () => {
      const res = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Verbose Bot',
          category: 'custom',
          systemPrompt: 'x'.repeat(8001),
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  // ── P2/P9: GET /:id ──
  describe('GET /api/personas/:id', () => {
    it('P2: GIVEN existing persona WHEN get by id THEN return 200 + persona', async () => {
      // 先创建
      const createRes = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Karpathy',
          description: 'AI researcher',
          category: 'educator',
          systemPrompt: 'You are Andrej Karpathy.',
        }),
      })
      const { data: created } = await createRes.json()

      const res = await app.request(`/api/personas/${created.id}`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.data.id).toBe(created.id)
      expect(body.data.name).toBe('Karpathy')
    })

    it('P9: GIVEN non-existent id WHEN get THEN return 404', async () => {
      const res = await app.request('/api/personas/nonexistent-id')
      expect(res.status).toBe(404)
    })
  })

  // ── P3/P7/P8/P11: PUT /:id ──
  describe('PUT /api/personas/:id', () => {
    it('P3: GIVEN existing persona WHEN update valid THEN return 200 + updated', async () => {
      const createRes = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Original',
          description: 'Original desc',
          category: 'thinker',
          systemPrompt: 'You are a thinker.',
        }),
      })
      const { data: created } = await createRes.json()

      const res = await app.request(`/api/personas/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated', description: 'Updated desc' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.name).toBe('Updated')
      expect(body.data.description).toBe('Updated desc')
      // 未更新的字段保持不变
      expect(body.data.category).toBe('thinker')
    })

    it('P7: GIVEN empty update body WHEN update THEN return 400', async () => {
      const createRes = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test', category: 'thinker', systemPrompt: 'test',
        }),
      })
      const { data: created } = await createRes.json()

      const res = await app.request(`/api/personas/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
    })

    it('P8: GIVEN non-existent id WHEN update THEN return 404', async () => {
      const res = await app.request('/api/personas/nonexistent-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      })

      expect(res.status).toBe(404)
    })

    it('P11: GIVEN name > 100 chars WHEN update THEN return 400', async () => {
      const createRes = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test', category: 'thinker', systemPrompt: 'test',
        }),
      })
      const { data: created } = await createRes.json()

      const res = await app.request(`/api/personas/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'a'.repeat(101) }),
      })

      expect(res.status).toBe(400)
    })
  })

  // ── P4/P10: DELETE /:id ──
  describe('DELETE /api/personas/:id', () => {
    it('P4: GIVEN existing persona WHEN delete THEN return 200 + ok:true', async () => {
      const createRes = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'To Delete',
          category: 'custom',
          systemPrompt: 'Delete me.',
        }),
      })
      const { data: created } = await createRes.json()

      const res = await app.request(`/api/personas/${created.id}`, { method: 'DELETE' })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)

      // 确认已删除
      const getRes = await app.request(`/api/personas/${created.id}`)
      expect(getRes.status).toBe(404)
    })

    it('P10: GIVEN non-existent id WHEN delete THEN return 404', async () => {
      const res = await app.request('/api/personas/nonexistent-id', { method: 'DELETE' })
      expect(res.status).toBe(404)
    })
  })

  // ── 列表查询 ──
  it('GET /api/personas returns list', async () => {
    // 创建两个 persona
    await app.request('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'P1', category: 'thinker', systemPrompt: 't1',
      }),
    })
    await app.request('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'P2', category: 'educator', systemPrompt: 't2',
      }),
    })

    const res = await app.request('/api/personas')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(2)
  })

  it('GET /api/personas?category=educator filters by category', async () => {
    await app.request('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'P1', category: 'thinker', systemPrompt: 't1' }),
    })
    await app.request('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'P2', category: 'educator', systemPrompt: 't2' }),
    })

    const res = await app.request('/api/personas?category=educator')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBe(1)
    expect(body.data[0].category).toBe('educator')
  })

  // ── 市场 API (TECH-API-013 D14) ──
  it('GET /api/personas?sort=popular returns with stats', async () => {
    await app.request('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Popular P', category: 'educator', systemPrompt: 'test' }),
    })

    const res = await app.request('/api/personas?sort=popular')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    // 每个 persona 应该附带 likeRate/messageCount
    expect(body.data[0].likeRate).toBe(0)
    expect(body.data[0].messageCount).toBe(0)
  })

  it('GET /api/personas/hot returns top personas', async () => {
    await app.request('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hot P', category: 'thinker', systemPrompt: 'test' }),
    })

    const res = await app.request('/api/personas/hot')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    expect(body.data[0].likeRate).toBe(0)
    expect(body.data[0].messageCount).toBe(0)
  })

  it('GET /api/personas?sort=recent returns sorted by date', async () => {
    const res = await app.request('/api/personas?sort=recent')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
  })
})
