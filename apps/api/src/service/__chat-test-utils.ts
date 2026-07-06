// Shared test utilities for ChatService tests (no vi.mock — those go in test files)
import { vi } from 'vitest'
import type { Persona, ChatRecord } from '@personachat/contracts'
import { ChatService, type ChatServiceOptions } from './chat-svc.js'
import { PersonaRepository } from '../repository/persona-repo.js'
import { ChatRepository } from '../repository/chat-repo.js'
import type { MemoryRepository } from '../repository/memory-repo.js'
import * as llmDomain from '../domain/llm.js'

export { llmDomain }

export function makePersona(overrides: Partial<Persona> = {}): Persona {
  return { id: 'test-persona', name: 'Test Bot', description: 'A test bot', category: 'custom', systemPrompt: 'You are a helpful test bot.', stargazersCount: 0, tools: [], createdAt: Date.now(), updatedAt: Date.now(), ...overrides }
}

export function makeChatRecord(overrides: Partial<ChatRecord> = {}): ChatRecord {
  return { id: '1', userId: 'anonymous', personaId: 'test-persona', messages: [{ role: 'user', content: 'Hello' }], reply: 'Hi!', model: 'deepseek-v3', branchIndex: 0, createdAt: Date.now(), ...overrides } as ChatRecord
}

export function setupMocks() {
  const personaRepo = { findById: vi.fn() } as unknown as PersonaRepository
  const chatRepo = { findByUserId: vi.fn(), save: vi.fn(), findBranches: vi.fn(), findById: vi.fn(), deleteById: vi.fn(), rateMessage: vi.fn(), getPersonaStats: vi.fn() } as unknown as ChatRepository
  const memoryRepo = { findByUserAndPersona: vi.fn().mockResolvedValue([]), save: vi.fn(), deleteByUserAndPersona: vi.fn() } as unknown as MemoryRepository
  vi.mocked(llmDomain.findModel).mockReturnValue({ id: 'deepseek-v3', name: 'DeepSeek V3', baseURL: 'https://api.deepseek.com', deployName: 'deepseek-chat', free: true, envKey: 'DEEPSEEK_API_KEY' })
  vi.mocked(llmDomain.getModelConfig).mockReturnValue({ id: 'deepseek-v3', name: 'DeepSeek V3', baseURL: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: 'env-deepseek-key', free: true })
  const opts: ChatServiceOptions = { env: { DEEPSEEK_API_KEY: 'env-deepseek-key' }, memoryRepo, toolCtx: { webSearchApiKey: undefined } }
  const service = new ChatService(personaRepo, chatRepo, opts)
  return { service, personaRepo, chatRepo, memoryRepo }
}
