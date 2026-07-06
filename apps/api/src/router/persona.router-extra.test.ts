// ── router/persona.router 扩展测试 (Stats + Preview) ──
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createPersonaRouter } from './persona.router.js'
import type { PersonaService } from '../service/persona-svc.js'
import type { ChatService } from '../service/chat-svc.js'
import { AppError } from '../errors.js'

function createTestApp() {
  const mockPersonaService = {
    list: vi.fn(), listHot: vi.fn(), getById: vi.fn(),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(),
    syncFromSource: vi.fn(),
  } as unknown as PersonaService

  const mockChatService = {
    chat: vi.fn(), prepareStream: vi.fn(), getHistory: vi.fn(),
    deleteRecord: vi.fn(), getBranches: vi.fn(),
    rateMessage: vi.fn(), getPersonaStats: vi.fn(), preview: vi.fn(),
  } as unknown as ChatService

  const app = new Hono()
  app.onError((err, c) => {
    if (err instanceof AppError) return c.json({ ok: false, error: err.message, code: err.code }, err.status as 200)
    return c.json({ ok: false, error: 'Validation error', code: 1002 }, 400)
  })
  app.route('/api/personas', createPersonaRouter(mockPersonaService, mockChatService))
  return { app, mockChatService }
}

describe('personaRouter stats + preview', () => {
  let app: Hono, mockChatService: ReturnType<typeof createTestApp>['mockChatService']
  beforeEach(() => { const r = createTestApp(); app = r.app; mockChatService = r.mockChatService })

  describe('GET /:id/stats', () => {
    it('returns persona stats', async () => {
      vi.mocked(mockChatService.getPersonaStats).mockResolvedValue({
        personaId: 'p1', totalMessages: 100, likeCount: 80, dislikeCount: 20, likeRate: 0.8, totalSessions: 10,
      })
      const res = await app.request('/api/personas/p1/stats')
      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.personaId).toBe('p1')
    })
  })

  describe('POST /preview', () => {
    it('returns preview reply', async () => {
      vi.mocked(mockChatService.preview).mockResolvedValue({ reply: 'Preview response', model: 'deepseek-v3' })
      const res = await app.request('/api/personas/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: 'You are a test bot.', messages: [{ role: 'user', content: 'Hello' }] }),
      })
      expect(res.status).toBe(200)
    })

    it('rejects empty systemPrompt', async () => {
      const res = await app.request('/api/personas/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: '', messages: [{ role: 'user', content: 'Hi' }] }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects systemPrompt exceeding 8000 chars', async () => {
      const res = await app.request('/api/personas/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: 'x'.repeat(8001), messages: [{ role: 'user', content: 'Hi' }] }),
      })
      expect(res.status).toBe(400)
    })
  })
})
