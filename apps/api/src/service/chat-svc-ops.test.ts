// ── service/chat-svc 流式 + CRUD 操作测试 ──
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChatRecord } from '@personachat/contracts'

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

describe('ChatService ops', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('prepareStream', () => {
    it('returns stream and onComplete callback', async () => {
      const { service, personaRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona())
      vi.mocked(llmDomain.callLLMStream).mockResolvedValue(new Response('ok'))
      vi.mocked(llmDomain.sseStreamToDeltaStream).mockReturnValue(new ReadableStream({ start(c) { c.close() } }))
      const r = await service.prepareStream('test-persona', [{ role: 'user', content: 'Hi' }], 'deepseek-v3')
      expect(r.stream).toBeDefined()
      expect(r.modelUsed).toBe('deepseek-v3')
      expect(typeof r.onComplete).toBe('function')
    })

    it('throws notFound when persona missing', async () => {
      const { service, personaRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(null)
      await expect(service.prepareStream('missing', [{ role: 'user', content: 'Hi' }], 'deepseek-v3')).rejects.toThrow('Persona not found')
    })

    it('translates LLMApiError to AppError', async () => {
      const { service, personaRepo } = setupMocks()
      vi.mocked(personaRepo.findById).mockResolvedValue(makePersona())
      vi.mocked(llmDomain.callLLMStream).mockRejectedValue(new llmDomain.LLMApiError(429, 'Rate limited'))
      await expect(service.prepareStream('test-persona', [{ role: 'user', content: 'Hi' }], 'deepseek-v3')).rejects.toThrow(AppError)
    })
  })

  describe('getHistory', () => {
    it('returns records from repo with filters', async () => {
      const { service, chatRepo } = setupMocks()
      const records = [{ id: '1', userId: 'u1', personaId: 'p1', messages: [], reply: 'Hi', createdAt: 0, branchIndex: 0 } as ChatRecord]
      vi.mocked(chatRepo.findByUserId).mockResolvedValue(records)
      expect(await service.getHistory('anonymous')).toEqual(records)
    })
  })

  describe('deleteRecord', () => {
    it('deletes existing, throws notFound for missing', async () => {
      const { service, chatRepo } = setupMocks()
      vi.mocked(chatRepo.findById).mockResolvedValue(makeChatRecord())
      await expect(service.deleteRecord('1')).resolves.not.toThrow()
      vi.mocked(chatRepo.findById).mockResolvedValue(null)
      await expect(service.deleteRecord('missing')).rejects.toThrow('Chat record not found')
    })
  })

  describe('getBranches', () => {
    it('returns sibling branches for record with parent', async () => {
      const { service, chatRepo } = setupMocks()
      vi.mocked(chatRepo.findById).mockResolvedValue(makeChatRecord({ id: '100', parentRecordId: 50, branchIndex: 1 } as any))
      vi.mocked(chatRepo.findBranches).mockResolvedValue([{ id: 100, reply: 'R1', branchIndex: 0, model: 'm', createdAt: 0 }])
      expect((await service.getBranches(100))).toHaveLength(1)
    })

    it('returns self only for root record', async () => {
      const { service, chatRepo } = setupMocks()
      vi.mocked(chatRepo.findById).mockResolvedValue(makeChatRecord({ id: '1', parentRecordId: null, branchIndex: 0 } as any))
      const r = await service.getBranches(1)
      expect(r).toHaveLength(1)
      expect(r[0].id).toBe(1)
    })
  })

  describe('rateMessage', () => {
    it('rates message', async () => {
      const { service, chatRepo } = setupMocks()
      vi.mocked(chatRepo.findById).mockResolvedValue(makeChatRecord())
      await expect(service.rateMessage('1', 'like')).resolves.not.toThrow()
    })
  })

  describe('getPersonaStats', () => {
    it('computes likeRate', async () => {
      const { service, chatRepo } = setupMocks()
      vi.mocked(chatRepo.getPersonaStats).mockResolvedValue({ personaId: 'p1', totalMessages: 100, likeCount: 80, dislikeCount: 20, totalSessions: 10 })
      expect((await service.getPersonaStats('p1')).likeRate).toBe(0.8)
    })
  })

  describe('preview', () => {
    it('returns reply without saving', async () => {
      const { service } = setupMocks()
      vi.mocked(llmDomain.callLLM).mockResolvedValue({ content: 'Preview response' })
      expect((await service.preview('prompt', [{ role: 'user', content: 'Hi' }], 'deepseek-v3')).reply).toBe('Preview response')
    })
  })
})
