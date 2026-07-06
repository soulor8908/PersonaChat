// ── service/chat-svc 核心聊天测试 (Chat + Tool Use loop) ──
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChatMessage } from '@personachat/contracts'

vi.mock('../domain/llm.js', () => ({
  getModelConfig: vi.fn(),
  buildSystemMessage: vi.fn((p: string) => ({ role: 'system', content: p })),
  callLLM: vi.fn(),
  callLLMStream: vi.fn(),
  sseStreamToDeltaStream: vi.fn(),
  findModel: vi.fn(),
  DomainError: class extends Error { code: string; constructor(m: string, c: string) { super(m); this.code = c } },
  ModelNotFoundError: class extends Error { code = 'MODEL_NOT_FOUND'; constructor(m: string) { super('Unknown model: ' + m) } },
  LLMConfigError: class extends Error { code = 'LLM_CONFIG_ERROR'; constructor(d: string) { super('LLM config error: ' + d) } },
  LLMApiError: class extends Error { code = 'LLM_API_ERROR'; status: number; constructor(s: number, d: string) { super('LLM API error (' + s + '): ' + d); this.status = s } },
}))
vi.mock('./chat-helpers.js', () => ({ saveRecordAsync: vi.fn(), extractMemoriesAsync: vi.fn() }))

import * as llmDomain from '../domain/llm.js'
import { makePersona, makeChatRecord, setupMocks } from './__chat-test-utils.js'
import { AppError } from '../errors.js'

describe('ChatService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('chat', () => {
    it('throws notFound when persona does not exist', async () => {
      const { service, personaRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(null)
      await expect(service.chat('missing', [{ role: 'user', content: 'Hi' }], 'deepseek-v3')).rejects.toThrow('Persona not found')
    })

    it('returns reply for simple conversation (no tool calls)', async () => {
      const { service, personaRepo, chatRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona())
      vi.mocked(chatRepo.save).mockResolvedValue(42)
      vi.mocked(llmDomain.callLLM).mockResolvedValue({ content: 'Hello! How can I help you?', usage: { promptTokens: 10, completionTokens: 5 } })
      const result = await service.chat('test-persona', [{ role: 'user', content: 'Hi' }], 'deepseek-v3')
      expect(result.reply).toBe('Hello! How can I help you?')
      expect(result.model).toBe('deepseek-v3')
      expect(result.recordId).toBe(42)
      expect(llmDomain.callLLM).toHaveBeenCalledTimes(1)
      expect(chatRepo.save).toHaveBeenCalled()
    })

    it('injects memories into system prompt when available', async () => {
      const { service, personaRepo, chatRepo, memoryRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona())
      vi.mocked(memoryRepo.findByUserAndPersona).mockResolvedValue([
        { id: 'm1', userId: 'anonymous', personaId: 'test-persona', key: 'name', value: '小明', category: 'personal', importance: 5, createdAt: Date.now() },
      ])
      vi.mocked(chatRepo.save).mockResolvedValue(1)
      vi.mocked(llmDomain.callLLM).mockResolvedValue({ content: 'Hi 小明!' })
      await service.chat('test-persona', [{ role: 'user', content: 'Hi' }], 'deepseek-v3')
      const callArgs = vi.mocked(llmDomain.callLLM).mock.calls[0] as any[]
      const sysMsg = (callArgs[0] as ChatMessage[]).find(m => m.role === 'system')
      expect(sysMsg?.content).toContain('小明')
    })

    it('works without memoryRepo', async () => {
      const { personaRepo, chatRepo } = setupMocks()
      const svc = new (await import('./chat-svc.js')).ChatService(personaRepo, chatRepo, { env: { DEEPSEEK_API_KEY: 'env-key' } })
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona())
      vi.mocked(chatRepo.save).mockResolvedValue(1)
      vi.mocked(llmDomain.callLLM).mockResolvedValue({ content: 'Hello!' })
      await svc.chat('test-persona', [{ role: 'user', content: 'Hi' }], 'deepseek-v3')
      expect(llmDomain.callLLM).toHaveBeenCalled()
    })

    it('passes parentRecordId to save', async () => {
      const { service, personaRepo, chatRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona())
      vi.mocked(chatRepo.save).mockResolvedValue(42)
      vi.mocked(llmDomain.callLLM).mockResolvedValue({ content: 'OK' })
      await service.chat('test-persona', [{ role: 'user', content: 'Hi' }], 'deepseek-v3', undefined, 99)
      expect(chatRepo.save).toHaveBeenCalledWith('anonymous', 'test-persona', expect.any(Array), 'OK', 'deepseek-v3', 99)
    })

    it('throws unauthorized when no api key available', async () => {
      const { personaRepo, chatRepo } = setupMocks()
      const svc = new (await import('./chat-svc.js')).ChatService(personaRepo, chatRepo, { env: {} })
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona())
      vi.mocked(llmDomain.findModel).mockReturnValue({ id: 'gpt-4o-mini' as const, name: 'GPT-4o Mini' as const, baseURL: 'https://api.openai.com/v1' as const, deployName: 'gpt-4o-mini' as const, free: false as const, envKey: 'OPENAI_API_KEY' as const })
      vi.mocked(llmDomain.getModelConfig).mockReturnValue({ id: 'gpt-4o-mini' as const, name: 'GPT-4o Mini' as const, baseURL: 'https://api.openai.com/v1' as const, model: 'gpt-4o-mini' as const, apiKey: '' as const, free: false as const })
      await expect(svc.chat('test-persona', [{ role: 'user', content: 'Hi' }], 'gpt-4o-mini')).rejects.toThrow(AppError)
    })

    // Tool Use loop
    it('executes single tool call then returns content (1 round)', async () => {
      const { service, personaRepo, chatRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona({ tools: ['calculator'] }))
      vi.mocked(chatRepo.save).mockResolvedValue(1)
      vi.mocked(llmDomain.callLLM)
        .mockResolvedValueOnce({ content: null, toolCalls: [{ id: 'tc1', function: { name: 'calculator', arguments: '{"expression":"2+2"}' } }] })
        .mockResolvedValueOnce({ content: 'The answer is 4.' })
      const result = await service.chat('test-persona', [{ role: 'user', content: 'What is 2+2?' }], 'deepseek-v3')
      expect(result.reply).toBe('The answer is 4.')
      expect(llmDomain.callLLM).toHaveBeenCalledTimes(2)
    })

    it('executes multiple tool call rounds up to limit', async () => {
      const { service, personaRepo, chatRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona({ tools: ['calculator'] }))
      vi.mocked(chatRepo.save).mockResolvedValue(1)
      for (let i = 0; i < 5; i++)
        vi.mocked(llmDomain.callLLM).mockResolvedValueOnce({ content: null, toolCalls: [{ id: `tc${i}`, function: { name: 'calculator', arguments: `{"expression":"${i}+${i}"}` } }] })
      const result = await service.chat('test-persona', [{ role: 'user', content: 'Keep calculating' }], 'deepseek-v3')
      expect(result.reply).toBe('')
      expect(llmDomain.callLLM).toHaveBeenCalledTimes(5)
    })

    it('handles LLM response with no content and no tool_calls gracefully', async () => {
      const { service, personaRepo, chatRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona())
      vi.mocked(chatRepo.save).mockResolvedValue(1)
      vi.mocked(llmDomain.callLLM).mockResolvedValue({ content: null })
      expect((await service.chat('test-persona', [{ role: 'user', content: 'Hi' }], 'deepseek-v3')).reply).toBe('...')
    })

    it('translates LLMApiError to AppError', async () => {
      const { service, personaRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona())
      vi.mocked(llmDomain.callLLM).mockRejectedValue(new llmDomain.LLMApiError(500, 'ISE'))
      await expect(service.chat('test-persona', [{ role: 'user', content: 'Hi' }], 'deepseek-v3')).rejects.toThrow(AppError)
    })

    it('translates LLMConfigError to AppError', async () => {
      const { service, personaRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona())
      vi.mocked(llmDomain.callLLM).mockRejectedValue(new llmDomain.LLMConfigError('Missing key'))
      await expect(service.chat('test-persona', [{ role: 'user', content: 'Hi' }], 'deepseek-v3')).rejects.toThrow(AppError)
    })

    it('throws validation error for unknown model', async () => {
      const { service, personaRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona())
      vi.mocked(llmDomain.findModel).mockReturnValue(undefined)
      await expect(service.chat('test-persona', [{ role: 'user', content: 'Hi' }], 'unknown-model')).rejects.toThrow('Unknown model')
    })
  })
})
