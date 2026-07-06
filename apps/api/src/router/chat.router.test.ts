import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createChatRouter } from './chat.router.js'
import type { ChatService } from '../service/chat-svc.js'
import { AppError } from '../errors.js'

function createTestApp() {
  const mockChatService = {
    chat: vi.fn(), prepareStream: vi.fn(), getHistory: vi.fn(),
    deleteRecord: vi.fn(), getBranches: vi.fn(), rateMessage: vi.fn(),
    getPersonaStats: vi.fn(), preview: vi.fn(),
  } as unknown as ChatService
  const app = new Hono()
  app.onError((err, c) => {
    if (err instanceof AppError) return c.json({ ok: false, error: err.message, code: err.code }, err.status as 200)
    return c.json({ ok: false, error: 'Validation error', code: 1002 }, 400)
  })
  app.route('/api/chats', createChatRouter(mockChatService))
  return { app, mockChatService }
}

describe('chatRouter', () => {
  let app: Hono, mockChatService: ReturnType<typeof createTestApp>['mockChatService']
  beforeEach(() => { const r = createTestApp(); app = r.app; mockChatService = r.mockChatService })

  describe('POST /', () => {
    it('returns reply for valid chat request', async () => {
      vi.mocked(mockChatService.chat).mockResolvedValue({ reply: 'Hello there!', model: 'deepseek-v3', recordId: 42 })
      const res = await app.request('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: 'test-persona', messages: [{ role: 'user', content: 'Hi' }] }) })
      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.ok).toBe(true)
      expect(body.reply).toBe('Hello there!')
    })
    it('returns 400 for missing personaId', async () => {
      const res = await app.request('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] }) })
      expect(res.status).toBe(400)
    })
    it('returns 400 for empty messages', async () => {
      const res = await app.request('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: 'test', messages: [] }) })
      expect(res.status).toBe(400)
    })
    it('accepts optional model parameter', async () => {
      vi.mocked(mockChatService.chat).mockResolvedValue({ reply: 'Hi', model: 'gpt-4o-mini', recordId: 1 })
      const res = await app.request('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: 'test-persona', messages: [{ role: 'user', content: 'Hi' }], model: 'gpt-4o-mini' }) })
      expect(res.status).toBe(200)
      expect(mockChatService.chat).toHaveBeenCalledWith('test-persona', expect.any(Array), 'gpt-4o-mini', undefined, undefined)
    })
    it('accepts parentRecordId for branching', async () => {
      vi.mocked(mockChatService.chat).mockResolvedValue({ reply: 'Branched', model: 'deepseek-v3', recordId: 43 })
      const res = await app.request('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: 'test-persona', messages: [{ role: 'user', content: 'Try again' }], parentRecordId: 42 }) })
      expect(res.status).toBe(200)
      expect(mockChatService.chat).toHaveBeenCalledWith('test-persona', expect.any(Array), 'deepseek-v3', undefined, 42)
    })
  })

  describe('POST /stream', () => {
    it('returns SSE response', async () => {
      const testStream = new ReadableStream({ start(c) { const e = new TextEncoder(); c.enqueue(e.encode(JSON.stringify({ type: 'delta', content: 'Hi' }) + '\n')); c.close() } })
      vi.mocked(mockChatService.prepareStream).mockResolvedValue({ stream: testStream, modelUsed: 'deepseek-v3', onComplete: vi.fn() })
      const res = await app.request('/api/chats/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: 'test-persona', messages: [{ role: 'user', content: 'Hi' }] }) })
      expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    })
    it('returns 400 for empty messages', async () => {
      const res = await app.request('/api/chats/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: 'test', messages: [] }) })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /:userId', () => {
    it('returns chat history', async () => {
      vi.mocked(mockChatService.getHistory).mockResolvedValue([{ id: '1', userId: 'user1', personaId: 'p1', messages: [], reply: 'Hi', createdAt: 0, branchIndex: 0 }])
      const res = await app.request('/api/chats/user1')
      expect(res.status).toBe(200)
      expect(((await res.json()) as Record<string, any>).data).toHaveLength(1)
    })
    it('rejects invalid limit >100', async () => { expect((await app.request('/api/chats/user1?limit=200')).status).toBe(400) })
    it('rejects negative limit', async () => { expect((await app.request('/api/chats/user1?limit=-1')).status).toBe(400) })
    it('rejects negative offset', async () => { expect((await app.request('/api/chats/user1?offset=-5')).status).toBe(400) })
  })

  describe('GET /branches/:recordId', () => {
    it('returns branches', async () => {
      vi.mocked(mockChatService.getBranches).mockResolvedValue([{ id: 100, reply: 'R1', branchIndex: 0, model: 'm', createdAt: 0 }, { id: 101, reply: 'R2', branchIndex: 1, model: 'm', createdAt: 0 }])
      const res = await app.request('/api/chats/branches/100')
      expect(res.status).toBe(200)
      expect(((await res.json()) as Record<string, any>).data).toHaveLength(2)
    })
    it('rejects non-numeric ID', async () => { expect((await app.request('/api/chats/branches/abc')).status).toBe(400) })
    it('rejects zero ID', async () => { expect((await app.request('/api/chats/branches/0')).status).toBe(400) })
  })

  describe('DELETE /:id', () => {
    it('deletes record', async () => {
      vi.mocked(mockChatService.deleteRecord).mockResolvedValue(undefined)
      const res = await app.request('/api/chats/42', { method: 'DELETE' })
      expect(res.status).toBe(200)
    })
  })

  describe('PUT /:id/rate', () => {
    it('rates with like/dislike and rejects invalid', async () => {
      vi.mocked(mockChatService.rateMessage).mockResolvedValue(undefined)
      expect((await app.request('/api/chats/42/rate', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 'like' }) })).status).toBe(200)
      expect((await app.request('/api/chats/42/rate', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 'dislike' }) })).status).toBe(200)
      expect((await app.request('/api/chats/42/rate', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 'neutral' }) })).status).toBe(400)
    })
  })

  describe('error propagation', () => {
    it('returns 404 on notFound', async () => {
      vi.mocked(mockChatService.deleteRecord).mockRejectedValue(new AppError(1001, 'Chat record not found', 404))
      const res = await app.request('/api/chats/999', { method: 'DELETE' })
      expect(res.status).toBe(404)
    })
  })
})
