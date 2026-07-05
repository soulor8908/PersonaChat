// ── ChatService 辅助函数 (拆分出 chat-svc.ts 以保持 ≤300 行) ──

import type { ChatMessage } from '@personachat/contracts'
import type { ChatRepository } from '../repository/chat-repo.js'
import type { PersonaRepository } from '../repository/persona-repo.js'
import type { MemoryRepository } from '../repository/memory-repo.js'
import { getModelConfig, callLLM, findModel } from '../domain/llm.js'
import { buildMemoryExtractionPrompt, summarizeConversation } from '../domain/memory.js'

// 异步保存聊天记录，最多重试 2 次
export function saveRecordAsync(
  chatRepo: ChatRepository,
  userId: string,
  personaId: string,
  messages: ChatMessage[],
  reply: string,
  model: string,
  parentRecordId?: number,
  retries = 2,
): void {
  chatRepo.save(userId, personaId, messages, reply, model, parentRecordId)
    .catch(err => {
      if (retries > 0) {
        console.warn(`Failed to save chat record (retries left: ${retries}):`, err)
        saveRecordAsync(chatRepo, userId, personaId, messages, reply, model, parentRecordId, retries - 1)
      } else {
        console.error('Failed to save chat record after retries:', err)
      }
    })
}

// TECH-API-011 D12: 异步提取对话中的关键事实
export async function extractMemoriesAsync(
  memoryRepo: MemoryRepository,
  personaRepo: PersonaRepository,
  env: Record<string, string | undefined>,
  personaId: string,
  messages: ChatMessage[],
  reply: string,
  model: string,
): Promise<void> {
  try {
    const persona = await personaRepo.findById(personaId)
    if (!persona) return

    const summary = summarizeConversation(messages, reply)
    const extractMessages = buildMemoryExtractionPrompt(persona.name, summary)
    const config = getModelConfig(model, env[findModel(model)?.envKey ?? ''], undefined)
    if (!config.apiKey) return

    const result = await callLLM(extractMessages, config)
    const replyText = result.content ?? ''
    const jsonMatch = replyText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return
    const facts = JSON.parse(jsonMatch[0]) as Array<{
      key: string; value: string; category?: string; importance?: number
    }>

    for (const fact of facts) {
      if (!fact.key || !fact.value) continue
      await memoryRepo.save({
        id: `mem-${personaId}-${fact.key.replace(/[^a-z0-9]/gi, '_')}`,
        userId: 'anonymous',
        personaId,
        key: fact.key,
        value: fact.value,
        category: fact.category ?? 'fact',
        importance: fact.importance ?? 1,
      })
    }
  } catch (_e) {
    console.warn('Memory extraction failed:', (_e as Error).message)
  }
}
