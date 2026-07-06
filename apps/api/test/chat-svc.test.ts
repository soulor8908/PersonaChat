// ── Chat Service 单元测试 ──
// Mock PersonaRepository / ChatRepository + callLLM
// 验证业务逻辑：鉴权/错误翻译/异步保存

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChatService } from '../src/service/chat-svc.js'
import { PersonaRepository } from '../src/repository/persona-repo.js'
import { ChatRepository } from '../src/repository/chat-repo.js'

// Mock domain/llm
vi.mock('../src/domain/llm.js', () => ({
  getModelConfig: vi.fn((id: string, envApiKey?: string, userApiKey?: string) => ({
    id,
    name: 'DeepSeek V3',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    apiKey: envApiKey || userApiKey || '',
    free: true,
  })),
  buildSystemMessage: vi.fn((prompt: string) => ({ role: 'system', content: prompt })),
  callLLM: vi.fn(async () => ({ content: 'Hello from LLM' })),
  findModel: vi.fn((id: string) => {
    if (id === 'unknown-model') return undefined
    return { id: 'deepseek-v3', name: 'DeepSeek V3', baseURL: '', deployName: 'deepseek-chat', free: true, envKey: 'DEEPSEEK_API_KEY' }
  }),
  getDefaultModelId: vi.fn(() => 'deepseek-v3'),
  DomainError: class extends Error { constructor(m: string, public code: string) { super(m) } },
  ModelNotFoundError: class extends Error { constructor(m: string) { super(m) } },
  LLMConfigError: class extends Error { constructor(m: string) { super(m) } },
  LLMApiError: class extends Error { constructor(public status: number, m: string) { super(m) } },
}))

const { callLLM, getModelConfig } = vi.mocked(await import('../src/domain/llm.js'))

describe('ChatService', () => {
  let personaRepo: PersonaRepository
  let chatRepo: ChatRepository
  let chatService: ChatService
  const mockEnv = { DEEPSEEK_API_KEY: 'test-key' }

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
      findByUserId: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as ChatRepository

    chatService = new ChatService(personaRepo, chatRepo, { env: mockEnv })
  })

  // C1: 正常聊天
  it('C1: GIVEN persona exists WHEN chat THEN return reply + model', async () => {
    (personaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'You are Karpathy.', stargazersCount: 0,
    })

    const result = await chatService.chat(
      'karpathy',
      [{ role: 'user', content: 'Hi' }],
      'deepseek-v3',
    )

    expect(result.reply).toBe('Hello from LLM')
    expect(result.model).toBe('deepseek-v3')
    expect(callLLM).toHaveBeenCalled()
    expect(chatRepo.save).toHaveBeenCalled()
  })

  // C2: persona 不存在
  it('C2: GIVEN persona not found WHEN chat THEN throw NOT_FOUND', async () => {
    (personaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await expect(
      chatService.chat('bad-id', [{ role: 'user', content: 'Hi' }], 'deepseek-v3'),
    ).rejects.toThrow('Persona not found')
  })

  // C3: 模型无 API key
  it('C3: GIVEN model has no apiKey WHEN chat THEN throw UNAUTHORIZED', async () => {
    (personaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'prompt', stargazersCount: 0,
    })
    const noKeyEnv = {}
    const svc = new ChatService(personaRepo, chatRepo, { env: noKeyEnv })

    await expect(
      svc.chat('karpathy', [{ role: 'user', content: 'Hi' }], 'deepseek-v3'),
    ).rejects.toThrow('API key')
  })

  // C4: 异步保存聊天记录
  it('C4: GIVEN valid chat WHEN called THEN save chat record async', async () => {
    (personaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'prompt', stargazersCount: 0,
    })

    await chatService.chat(
      'karpathy',
      [{ role: 'user', content: 'Hi' }],
      'deepseek-v3',
    )

    expect(chatRepo.save).toHaveBeenCalledWith(
      'anonymous', 'karpathy',
      [{ role: 'user', content: 'Hi' }],
      'Hello from LLM',
      'deepseek-v3',
      undefined, // parentRecordId
    )
  })

  // C5: userApiKey 优先
  it('C5: GIVEN userApiKey WHEN chat THEN config uses userApiKey', async () => {
    (personaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'prompt', stargazersCount: 0,
    })
    const noKeyEnv = {}
    const svc = new ChatService(personaRepo, chatRepo, { env: noKeyEnv })

    // 提供 userApiKey
    await expect(
      svc.chat('karpathy', [{ role: 'user', content: 'Hi' }], 'deepseek-v3', 'user-sk-xxx'),
    ).resolves.toBeDefined()

    expect(getModelConfig).toHaveBeenCalledWith('deepseek-v3', undefined, 'user-sk-xxx')
  })

  // C6: LLM 调用错误翻译
  it('C6: GIVEN LLM api error WHEN chat THEN throw AppError', async () => {
    (personaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'karpathy', name: 'Karpathy', description: '', category: 'educator',
      systemPrompt: 'prompt', stargazersCount: 0,
    })
    const { LLMApiError } = await import('../src/domain/llm.js')
    ;(callLLM as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new (LLMApiError as any)(500, 'Internal error'))

    await expect(
      chatService.chat('karpathy', [{ role: 'user', content: 'Hi' }], 'deepseek-v3'),
    ).rejects.toThrow('LLM API error')
  })

  // getHistory 委托
  it('getHistory delegates to chatRepo.findByUserId', async () => {
    (chatRepo.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '1', userId: 'u1', personaId: 'p1', messages: [], reply: 'hi', createdAt: 0 },
    ])

    const records = await chatService.getHistory('u1', 'p1')
    expect(records).toHaveLength(1)
    expect(chatRepo.findByUserId).toHaveBeenCalledWith('u1', 'p1', 50, 0)
  })
})
