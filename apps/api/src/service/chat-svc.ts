// ── 聊天业务逻辑层 ──
// TECH-API-004 D8: 模型选择从 contracts/modelRegistry SSOT 派生

import type { ChatMessage, ChatRecord } from '@personachat/contracts'
import { PersonaRepository } from '../repository/persona-repo.js'
import { ChatRepository } from '../repository/chat-repo.js'
import { Errors } from '../errors.js'
import {
  getModelConfig,
  buildSystemMessage,
  callLLM,
  findModel,
  DomainError,
  ModelNotFoundError,
  LLMConfigError,
  LLMApiError,
} from '../domain/llm.js'

export class ChatService {
  constructor(
    private personaRepo: PersonaRepository,
    private chatRepo: ChatRepository,
    private env: Record<string, string | undefined>,
  ) {}

  async chat(
    personaId: string,
    messages: ChatMessage[],
    model: string,
    userApiKey?: string,
  ): Promise<{ reply: string; model: string }> {
    // 1. 验证人格存在
    const persona = await this.personaRepo.findById(personaId)
    if (!persona) throw Errors.notFound('Persona')

    // 2. 构建完整消息列表
    const systemMsg = buildSystemMessage(persona.systemPrompt)
    const fullMessages = [systemMsg, ...messages]

    // 3. 从 contracts SSOT 获取模型环境变量 key (AI-005)
    const modelEntry = findModel(model)
    if (!modelEntry) throw Errors.validation(`Unknown model: ${model}`)

    const envKey = modelEntry.envKey
    const config = getModelConfig(model, envKey ? this.env[envKey] : undefined, userApiKey)

    if (!config.apiKey) {
      throw Errors.unauthorized(`API key is required for model '${model}'`)
    }

    // 4. 调用 LLM — 领域错误翻译为 AppError (ARCH-001)
    let result: { reply: string; usage?: { promptTokens: number; completionTokens: number } }
    try {
      result = await callLLM(fullMessages, config)
    } catch (err) {
      if (err instanceof LLMApiError) {
        throw Errors.llmApiError(err.message)
      }
      if (err instanceof LLMConfigError) {
        throw Errors.internal(err.message)
      }
      if (err instanceof DomainError) {
        throw Errors.internal(err.message)
      }
      throw err
    }

    // 5. 异步保存记录（不阻塞响应）
    this.chatRepo
      .save('anonymous', personaId, messages, result.reply, model)
      .catch(err => console.error('Failed to save chat record:', err))

    return { reply: result.reply, model }
  }

  async getHistory(
    userId: string,
    personaId?: string,
    limit = 50,
    offset = 0,
  ): Promise<ChatRecord[]> {
    return this.chatRepo.findByUserId(userId, personaId, limit, offset)
  }
}
