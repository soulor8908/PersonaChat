// ── router/persona.router 单元测试 ──
// Mock PersonaService + ChatService，验证 Zod 输入校验 + HTTP 响应格式

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createPersonaRouter } from './persona.router.js'
import type { PersonaService } from '../service/persona-svc.js'
import type { ChatService } from '../service/chat-svc.js'
import { AppError } from '../errors.js'

function createTestApp(withChatService = true) {
  const mockPersonaService = {
    list: vi.fn(),
    listHot: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    syncFromSource: vi.fn(),
  } as unknown as PersonaService

  const mockChatService = {
    chat: vi.fn(),
    prepareStream: vi.fn(),
    getHistory: vi.fn(),
    deleteRecord: vi.fn(),
    getBranches: vi.fn(),
    rateMessage: vi.fn(),
    getPersonaStats: vi.fn(),
    preview: vi.fn(),
  } as unknown as ChatService

  const app = new Hono()

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ ok: false, error: err.message, code: err.code }, err.status as 200)
    }
    return c.json({ ok: false, error: 'Validation error', code: 1002 }, 400)
  })

  app.route('/api/personas', createPersonaRouter(
    mockPersonaService,
    withChatService ? mockChatService : undefined,
  ))

  return { app, mockPersonaService, mockChatService }
}

describe('personaRouter', () => {
  let app: Hono
  let mockPersonaService: ReturnType<typeof createTestApp>['mockPersonaService']
  let mockChatService: ReturnType<typeof createTestApp>['mockChatService']

  beforeEach(() => {
    const result = createTestApp()
    app = result.app
    mockPersonaService = result.mockPersonaService
    mockChatService = result.mockChatService
  })

  describe('GET /', () => {
    it('returns persona list', async () => {
      vi.mocked(mockPersonaService.list).mockResolvedValue([
        {
          id: 'p1', name: 'Bot 1', description: 'A bot', category: 'custom',
          systemPrompt: 'prompt', stargazersCount: 0, tools: [],
          createdAt: 0, updatedAt: 0, likeRate: 0.9, messageCount: 100,
        },
      ])

      const res = await app.request('/api/personas')
      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.ok).toBe(true)
      expect(body.data).toHaveLength(1)
    })

    it('filters by category', async () => {
      vi.mocked(mockPersonaService.list).mockResolvedValue([])
      await app.request('/api/personas?category=tech_leader')
      expect(mockPersonaService.list).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'tech_leader' }),
      )
    })

    it('searches by keyword', async () => {
      vi.mocked(mockPersonaService.list).mockResolvedValue([])
      await app.request('/api/personas?search=karpathy')
      expect(mockPersonaService.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'karpathy' }),
      )
    })

    it('rejects search > 100 chars', async () => {
      const res = await app.request('/api/personas?search=' + 'x'.repeat(101))
      expect(res.status).toBe(400)
    })
  })

  // ── GET /api/personas/hot — 热门推荐 ──
  describe('GET /hot', () => {
    it('returns hot personas', async () => {
      vi.mocked(mockPersonaService.listHot).mockResolvedValue([
        {
          id: 'hot1', name: 'Hot Bot', description: 'Popular', category: 'tech_leader',
          systemPrompt: 'prompt', stargazersCount: 100, tools: [],
          createdAt: 0, updatedAt: 0, likeRate: 0.95, messageCount: 500,
        },
      ])

      const res = await app.request('/api/personas/hot')
      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.ok).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].name).toBe('Hot Bot')
    })
  })

  // ── GET /api/personas/:id — 人格详情 ──
  describe('GET /:id', () => {
    it('returns persona by id', async () => {
      vi.mocked(mockPersonaService.getById).mockResolvedValue({
        id: 'p1', name: 'Test', description: 'Desc', category: 'custom',
        systemPrompt: 'prompt', stargazersCount: 0, tools: [],
        createdAt: 0, updatedAt: 0,
      })

      const res = await app.request('/api/personas/p1')
      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.id).toBe('p1')
    })
  })

  // ── POST /api/personas — 创建人格 ──
  describe('POST /', () => {
    it('creates persona and returns 201', async () => {
      const created = {
        id: 'new-id', name: 'New Bot', description: 'New', category: 'custom' as const,
        systemPrompt: 'prompt', stargazersCount: 0, tools: [],
        createdAt: Date.now(), updatedAt: Date.now(),
      }
      vi.mocked(mockPersonaService.create).mockResolvedValue(created)

      const res = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Bot',
          description: 'New',
          category: 'custom',
          systemPrompt: 'Be helpful.',
        }),
      })

      expect(res.status).toBe(201)
      const body = await res.json() as Record<string, any>
      expect(body.ok).toBe(true)
      expect(body.data.name).toBe('New Bot')
    })

    it('rejects missing required fields', async () => {
      const res = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Incomplete',
        }),
      })

      expect(res.status).toBe(400)
    })

    it('rejects invalid category', async () => {
      const res = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bot',
          description: 'Desc',
          category: 'invalid_category',
          systemPrompt: 'prompt',
        }),
      })

      expect(res.status).toBe(400)
    })

    it('accepts optional tools field', async () => {
      vi.mocked(mockPersonaService.create).mockResolvedValue({
        id: 'tool-bot', name: 'Tool Bot', description: 'With tools', category: 'custom',
        systemPrompt: 'prompt', stargazersCount: 0, tools: ['calculator'],
        createdAt: Date.now(), updatedAt: Date.now(),
      })

      const res = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Tool Bot',
          description: 'With tools',
          category: 'custom',
          systemPrompt: 'prompt',
          tools: ['calculator'],
        }),
      })

      expect(res.status).toBe(201)
    })
  })

  // ── PUT /api/personas/:id — 更新人格 ──
  describe('PUT /:id', () => {
    it('updates persona successfully', async () => {
      vi.mocked(mockPersonaService.update).mockResolvedValue({
        id: 'p1', name: 'Updated', description: 'Updated desc', category: 'custom',
        systemPrompt: 'Updated prompt', stargazersCount: 0, tools: [],
        createdAt: 0, updatedAt: Date.now(),
      })

      const res = await app.request('/api/personas/p1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.name).toBe('Updated')
    })

    it('rejects empty update body', async () => {
      const res = await app.request('/api/personas/p1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
    })
  })

  // ── DELETE /api/personas/:id — 删除人格 ──
  describe('DELETE /:id', () => {
    it('deletes persona successfully', async () => {
      vi.mocked(mockPersonaService.delete).mockResolvedValue(undefined)

      const res = await app.request('/api/personas/p1', { method: 'DELETE' })
      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.ok).toBe(true)
    })
  })

  // ── POST /api/personas/sync — GitHub 同步 ──
  describe('POST /sync', () => {
    it('syncs from GitHub source', async () => {
      vi.mocked(mockPersonaService.syncFromSource).mockResolvedValue({
        id: 'synced-bot', name: 'Synced Bot', description: 'From GitHub', category: 'tech_leader',
        systemPrompt: 'prompt', stargazersCount: 0, tools: [],
        createdAt: 0, updatedAt: 0,
      })

      const res = await app.request('/api/personas/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: 'karpathy',
          repo: 'karpathy-skill',
          category: 'tech_leader',
        }),
      })

      expect(res.status).toBe(200)
      expect(mockPersonaService.syncFromSource).toHaveBeenCalledWith({
        owner: 'karpathy',
        repo: 'karpathy-skill',
        category: 'tech_leader',
      })
    })

    it('rejects invalid category in sync', async () => {
      const res = await app.request('/api/personas/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: 'test',
          repo: 'test-skill',
          category: 'bad_category',
        }),
      })

      expect(res.status).toBe(400)
    })
  })

})
