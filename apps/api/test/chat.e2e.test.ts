// ── Chat Router E2E 测试 ──
// 直接构造最小 Hono app 挂载 chat router，绕过 server.ts 的 auth/rate-limit

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { ChatService } from '../src/service/chat-svc.js'
import { PersonaRepository } from '../src/repository/persona-repo.js'
import { ChatRepository } from '../src/repository/chat-repo.js'
import { createChatRouter } from '../src/router/chat.router.js'
import { errorHandler } from '../src/middleware/error-handler.js'

// 构造 LLM SSE 流模拟数据
function makeMockLlmStream(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const sseBody = chunks.map(c =>
    `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`
  ).join('') + 'data: [DONE]\n\n'

  return new Response(sseBody, {
    headers: { 'content-type': 'text/event-stream' },
  })
}

// Mock domain/llm
vi.mock('../src/domain/llm.js', async () => {
  const actual = await vi.importActual('../src/domain/llm.js') as Record<string, unknown>
  return {
    ...actual,
    callLLM: vi.fn(async () => ({ content: 'Mock LLM response' })),
    callLLMStream: vi.fn(async () => makeMockLlmStream(['Hello', ' World'])),
    // 保留真实的 sseStreamToDeltaStream（不 mock，让转换逻辑真实运行）
  }
})
const { callLLM, callLLMStream } = vi.mocked(await import('../src/domain/llm.js'))

describe('Chat Router E2E', () => {
  let app: Hono
  let personaRepo: PersonaRepository
  let chatRepo: ChatRepository
  let chatService: ChatService

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
      save: vi.fn().mockResolvedValue(1),
      findById: vi.fn(),
      deleteById: vi.fn(),
      findBranches: vi.fn().mockResolvedValue([]),
      rateMessage: vi.fn().mockResolvedValue(undefined),
      getPersonaStats: vi.fn().mockResolvedValue({ personaId: '', totalMessages: 0, likeCount: 0, dislikeCount: 0, totalSessions: 0 }),
    } as unknown as ChatRepository

    chatService = new ChatService(personaRepo, chatRepo, { DEEPSEEK_API_KEY: 'test-key' })

    app = new Hono()
    app.onError(errorHandler)
    app.route('/api/chats', createChatRouter(chatService))
  })

  // ── 非流式 POST（已有测试）──
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

  // ── 流式 POST /stream (TECH-API-008 D9) ──
  it('R7: GIVEN valid persona + messages WHEN stream THEN return 200 + text/event-stream', async () => {
    (personaRepo.findById as any).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'You are Karpathy.', stargazersCount: 0,
    })

    const res = await app.request('/api/chats/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'karpathy',
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'deepseek-v3',
      }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    expect(callLLMStream).toHaveBeenCalled()
  })

  it('R8: GIVEN stream WHEN read body THEN contains delta + done events', async () => {
    (personaRepo.findById as any).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'You are Karpathy.', stargazersCount: 0,
    })

    const res = await app.request('/api/chats/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'karpathy',
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'deepseek-v3',
      }),
    })

    const text = await res.text()
    const lines = text.split('\n').filter(l => l.trim())

    // 应该有 delta 事件（从 mock 的 "Hello" + " World" 两个 chunk）
    const deltaEvents = lines.filter(l => {
      try { return JSON.parse(l).type === 'delta' }
      catch (_e) {
        void (_e as Error)
        return false
      }
    })
    expect(deltaEvents.length).toBe(2)

    // 应该有 done 事件
    const doneEvent = lines.find(l => {
      try { return JSON.parse(l).type === 'done' }
      catch (_e) {
        void (_e as Error)
        return false
      }
    })
    expect(doneEvent).toBeTruthy()

    // 拼接 delta 内容
    const fullContent = deltaEvents.map(l => JSON.parse(l).content).join('')
    expect(fullContent).toBe('Hello World')
  })

  it('R9: GIVEN missing messages WHEN stream THEN return 400', async () => {
    const res = await app.request('/api/chats/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: 'karpathy' }),
    })
    expect(res.status).toBe(400)
  })

  it('R10: GIVEN persona not found WHEN stream THEN return 404', async () => {
    (personaRepo.findById as any).mockResolvedValue(null)

    const res = await app.request('/api/chats/stream', {
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

  // ── DELETE /:id ──
  it('R11: GIVEN existing chat record WHEN delete THEN return 200 + ok:true', async () => {
    (chatRepo.findById as any).mockResolvedValue({
      id: 'chat-123', userId: 'user1', personaId: 'p1',
      messages: [], reply: 'hi', model: 'deepseek-v3', createdAt: 1,
    })
    ;(chatRepo.deleteById as any).mockResolvedValue(undefined)

    const res = await app.request('/api/chats/chat-123', { method: 'DELETE' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('R12: GIVEN non-existent id WHEN delete THEN return 404', async () => {
    (chatRepo.findById as any).mockResolvedValue(null)

    const res = await app.request('/api/chats/nonexistent', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  // ── 对话分支 (TECH-API-009 D10) ──
  it('R13: GIVEN valid chat WHEN send with parentRecordId THEN pass to service', async () => {
    (personaRepo.findById as any).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'You are Karpathy.', stargazersCount: 0,
    })
    ;(chatRepo.save as any).mockResolvedValue(42)

    const res = await app.request('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: 'karpathy',
        messages: [{ role: 'user', content: 'Regenerate this' }],
        model: 'deepseek-v3',
        parentRecordId: 5,
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('R14: GIVEN record with branches WHEN get branches THEN return sibling list', async () => {
    (chatRepo.findById as any).mockResolvedValue({
      id: '10', userId: 'u1', personaId: 'p1',
      messages: [], reply: 'base reply', model: 'deepseek-v3',
      parentRecordId: 5, branchIndex: 0, createdAt: 1,
    })
    ;(chatRepo.findBranches as any).mockResolvedValue([
      { id: 10, reply: 'First reply', branchIndex: 0, model: 'deepseek-v3', createdAt: 1000 },
      { id: 11, reply: 'Second reply', branchIndex: 1, model: 'glm-4-flash', createdAt: 2000 },
    ])

    const res = await app.request('/api/chats/branches/10')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].branchIndex).toBe(0)
    expect(body.data[1].branchIndex).toBe(1)
  })

  it('R15: GIVEN non-existent record WHEN get branches THEN return 404', async () => {
    (chatRepo.findById as any).mockResolvedValue(null)

    const res = await app.request('/api/chats/branches/999')
    expect(res.status).toBe(404)
  })

  // ── 评价反馈 (TECH-API-010 D11) ──
  it('R16: GIVEN valid record WHEN rate like THEN return 200', async () => {
    (chatRepo.findById as any).mockResolvedValue({
      id: '10', userId: 'u1', personaId: 'p1',
      messages: [], reply: 'hi', model: 'deepseek-v3',
      parentRecordId: null, branchIndex: 0, createdAt: 1,
    })
    ;(chatRepo.rateMessage as any).mockResolvedValue(undefined)

    const res = await app.request('/api/chats/10/rate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 'like' }),
    })
    expect(res.status).toBe(200)
  })

  it('R17: GIVEN non-existent record WHEN rate THEN return 404', async () => {
    (chatRepo.findById as any).mockResolvedValue(null)

    const res = await app.request('/api/chats/999/rate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 'like' }),
    })
    expect(res.status).toBe(404)
  })

  it('R18: GIVEN invalid rating WHEN rate THEN return 400', async () => {
    const res = await app.request('/api/chats/1/rate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 'invalid' }),
    })
    expect(res.status).toBe(400)
  })

  // ── 人格统计 (TECH-API-010 D11) ──
  it('R19: GIVEN persona with messages WHEN get stats THEN return aggregated data', async () => {
    (chatRepo.getPersonaStats as any).mockResolvedValue({
      personaId: 'karpathy',
      totalMessages: 100,
      likeCount: 80,
      dislikeCount: 20,
      totalSessions: 10,
    })
    ;(personaRepo.findById as any).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'You are Karpathy.', stargazersCount: 0,
    })

    // 创建带 chatService 的 persona router 来测试 stats
    const { createPersonaRouter } = await import('../src/router/persona.router.js')
    const { PersonaService } = await import('../src/service/persona-svc.js')
    const personaSvc = new PersonaService(personaRepo)
    const personaApp = new Hono()
    personaApp.onError(errorHandler)
    personaApp.route('/api/personas', createPersonaRouter(personaSvc, chatService))

    const res = await personaApp.request('/api/personas/karpathy/stats')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.likeRate).toBe(0.8)
    expect(body.data.totalMessages).toBe(100)
  })

  // ── 人格预览 (TECH-API-014 D15) ──
  it('R20: GIVEN systemPrompt + messages WHEN preview THEN return reply', async () => {
    const { createPersonaRouter } = await import('../src/router/persona.router.js')
    const { PersonaService } = await import('../src/service/persona-svc.js')
    const personaSvc = new PersonaService(personaRepo)
    const personaApp = new Hono()
    personaApp.onError(errorHandler)
    personaApp.route('/api/personas', createPersonaRouter(personaSvc, chatService))

    const res = await personaApp.request('/api/personas/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: 'You are a helpful cat.',
        messages: [{ role: 'user', content: 'Meow?' }],
        model: 'deepseek-v3',
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.reply).toBe('Mock LLM response')
  })

  it('R21: GIVEN empty systemPrompt WHEN preview THEN return 400', async () => {
    const { createPersonaRouter } = await import('../src/router/persona.router.js')
    const { PersonaService } = await import('../src/service/persona-svc.js')
    const personaSvc = new PersonaService(personaRepo)
    const personaApp = new Hono()
    personaApp.onError(errorHandler)
    personaApp.route('/api/personas', createPersonaRouter(personaSvc, chatService))

    const res = await personaApp.request('/api/personas/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt: '' }),
    })
    expect(res.status).toBe(400)
  })
})
