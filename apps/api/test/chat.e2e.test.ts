// ── Chat Router E2E 测试 ──
// 直接构造最小 Hono app 挂载 chat router，绕过 server.ts 的 auth/rate-limit

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { ChatService } from '../src/service/chat-svc.js'
import { PersonaRepository } from '../src/repository/persona-repo.js'
import { ChatRepository } from '../src/repository/chat-repo.js'
import { createChatRouter } from '../src/router/chat.router.js'
import { errorHandler } from '../src/middleware/error-handler.js'

// Mock domain/llm
vi.mock('../src/domain/llm.js', async () => {
  const actual = await vi.importActual('../src/domain/llm.js') as Record<string, unknown>
  return {
    ...actual,
    callLLM: vi.fn(async () => ({ reply: 'Mock LLM response' })),
  }
})
const { callLLM } = vi.mocked(await import('../src/domain/llm.js'))

describe('Chat Router E2E', () => {
  let app: Hono
  let personaRepo: PersonaRepository
  let chatRepo: ChatRepository

  beforeEach(() => {
    vi.clearAllMocks()

    personaRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    } as unknown as PersonaRepository

    chatRepo = {
      findByUserId: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as ChatRepository

    const chatService = new ChatService(personaRepo, chatRepo, { DEEPSEEK_API_KEY: 'test-key' })

    app = new Hono()
    app.onError(errorHandler)
    app.route('/api/chats', createChatRouter(chatService))
  })

  it('R1: GIVEN valid persona + messages WHEN chat THEN return 200 + reply', async () => {
    (personaRepo.findById as any).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'You are Karpathy.', stargazersCount: 0,
    })

    const res = await app.request('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'karpathy',
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'deepseek-v3',
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.reply).toBe('Mock LLM response')
    expect(callLLM).toHaveBeenCalled()
  })

  it('R2: GIVEN missing messages WHEN chat THEN return 400', async () => {
    const res = await app.request('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: 'karpathy' }),
    })
    expect(res.status).toBe(400)
  })

  it('R3: GIVEN missing personaId WHEN chat THEN return 400', async () => {
    const res = await app.request('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] }),
    })
    expect(res.status).toBe(400)
  })

  it('R4: GIVEN persona not found WHEN chat THEN return 404', async () => {
    (personaRepo.findById as any).mockResolvedValue(null)

    const res = await app.request('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'bad-id',
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'deepseek-v3',
      }),
    })
    expect(res.status).toBe(404)
  })

  it('R5: GIVEN no model WHEN chat THEN uses default model', async () => {
    (personaRepo.findById as any).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'prompt', stargazersCount: 0,
    })

    const res = await app.request('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'karpathy',
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })
    expect(res.status).toBe(200)
  })

  it('R6: GIVEN invalid model WHEN chat THEN return 400', async () => {
    (personaRepo.findById as any).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'prompt', stargazersCount: 0,
    })

    const res = await app.request('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'karpathy',
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'invalid-model-xyz',
      }),
    })
    expect(res.status).toBe(400)
  })
})
