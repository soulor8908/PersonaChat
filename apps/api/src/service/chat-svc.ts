// ── 聊天业务逻辑层 ──
// TECH-API-004 D8: 模型选择从 contracts/modelRegistry SSOT 派生

import type { ChatMessage, ChatRecord, BranchRecord, PersonaStats, Rating } from '@personachat/contracts'
import { toOpenAITools } from '@personachat/contracts'
import { PersonaRepository } from '../repository/persona-repo.js'
import { ChatRepository } from '../repository/chat-repo.js'
import type { MemoryRepository } from '../repository/memory-repo.js'
import type { ToolContext } from '../domain/tool-executor.js'
import { runTool } from '../domain/tool-executor.js'
import { Errors } from '../errors.js'
import {
  getModelConfig,
  buildSystemMessage,
  callLLM,
  callLLMStream,
  sseStreamToDeltaStream,
  findModel,
  LLMResponse,
  DomainError,
  ModelNotFoundError,
  LLMConfigError,
  LLMApiError,
  type LLMLogFn,
} from '../domain/llm.js'
import { injectMemories } from '../domain/memory.js'
import { saveRecordAsync, extractMemoriesAsync } from './chat-helpers.js'

export interface ChatServiceOptions {
  env: Record<string, string | undefined>
  memoryRepo?: MemoryRepository
  toolCtx?: ToolContext
  onLog?: LLMLogFn
}

export class ChatService {
  private env: Record<string, string | undefined>
  private memoryRepo?: MemoryRepository
  private toolCtx?: ToolContext
  private onLog?: LLMLogFn

  constructor(
    private personaRepo: PersonaRepository,
    private chatRepo: ChatRepository,
    opts: ChatServiceOptions,
  ) { this.env = opts.env; this.memoryRepo = opts.memoryRepo; this.toolCtx = opts.toolCtx; this.onLog = opts.onLog }

  async chat(
    personaId: string,
    messages: ChatMessage[],
    model: string,
    userApiKey?: string,
    parentRecordId?: number,
  ): Promise<{ reply: string; model: string; recordId: number }> {
    // 1. 验证人格存在
    const persona = await this.personaRepo.findById(personaId)
    if (!persona) throw Errors.notFound('Persona')

    // 1.5 加载人格记忆并注入系统提示 (TECH-API-011 D12)
    const memories = this.memoryRepo
      ? await this.memoryRepo.findByUserAndPersona('anonymous', personaId)
      : []
    const systemPrompt = memories.length > 0
      ? injectMemories(persona.systemPrompt, memories)
      : persona.systemPrompt

    // 2. 构建完整消息列表
    const systemMsg = buildSystemMessage(systemPrompt)
    const fullMessages = [systemMsg, ...messages]

    // 3. 从 contracts SSOT 获取模型环境变量 key (AI-005)
    const modelEntry = findModel(model)
    if (!modelEntry) throw Errors.validation(`Unknown model: ${model}`)

    const envKey = modelEntry.envKey
    const config = getModelConfig(model, envKey ? this.env[envKey] : undefined, userApiKey)

    if (!config.apiKey) {
      throw Errors.unauthorized(`API key is required for model '${model}'`)
    }

    // 4. 准备工具定义 (TECH-API-015 D18)
    const tools = persona.tools && persona.tools.length > 0
      ? toOpenAITools(persona.tools)
      : undefined

    // 5. Tool Use 循环 — 最多 5 轮
    let replyText = ''
    let currentMessages = [...fullMessages]
    let iterations = 0

    try {
      while (iterations < 5) {
        const llmResult = await callLLM(currentMessages, config, tools, this.onLog)

        // 有内容回复 → 结束
        if (llmResult.content) {
          replyText = llmResult.content
          break
        }

        // 有工具调用 → 执行后继续
        if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
          // 添加 assistant tool_calls 消息
          currentMessages.push({
            role: 'assistant',
            content: null,
            tool_calls: llmResult.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.function.name, arguments: tc.function.arguments },
            })),
          })

          // 执行每个工具并添加 tool 结果消息
          for (const tc of llmResult.toolCalls) {
            const result = await runTool(tc.function.name, tc.function.arguments, this.toolCtx ?? {})
            currentMessages.push({ role: 'tool', content: result, tool_call_id: tc.id })
          }

          iterations++
          continue
        }

        // 无 content 也无 tool_calls → 异常，兜底
        replyText = '...'
        break
      }
    } catch (err) {
      if (err instanceof LLMApiError) throw Errors.llmApiError(err.message)
      if (err instanceof LLMConfigError || err instanceof DomainError) throw Errors.internal(err.message)
      throw err
    }
    const recordId = await this.chatRepo.save('anonymous', personaId, messages, replyText, model, parentRecordId)

    // 6. 异步提取记忆
    if (this.memoryRepo) {
      extractMemoriesAsync(this.memoryRepo!, this.personaRepo, this.env, personaId, messages, replyText, model, this.onLog)
    }

    return { reply: replyText, model, recordId }
  }

  // TECH-API-008 D9: 流式聊天 — 返回 SSE ReadableStream + 保存回调
  async prepareStream(
    personaId: string,
    messages: ChatMessage[],
    model: string,
    userApiKey?: string,
    parentRecordId?: number,
  ): Promise<{
    stream: ReadableStream<Uint8Array>
    modelUsed: string
    onComplete: (fullReply: string) => void
  }> {
    // 1. 验证人格存在
    const persona = await this.personaRepo.findById(personaId)
    if (!persona) throw Errors.notFound('Persona')

    // 1.5 加载人格记忆并注入系统提示 (TECH-API-011 D12)
    const memories = this.memoryRepo
      ? await this.memoryRepo.findByUserAndPersona('anonymous', personaId)
      : []
    const systemPrompt = memories.length > 0
      ? injectMemories(persona.systemPrompt, memories)
      : persona.systemPrompt

    // 2. 构建完整消息列表
    const systemMsg = buildSystemMessage(systemPrompt)
    const fullMessages = [systemMsg, ...messages]

    // 3. 从 contracts SSOT 获取模型配置 (AI-005)
    const modelEntry = findModel(model)
    if (!modelEntry) throw Errors.validation(`Unknown model: ${model}`)

    const envKey = modelEntry.envKey
    const config = getModelConfig(model, envKey ? this.env[envKey] : undefined, userApiKey)

    if (!config.apiKey) {
      throw Errors.unauthorized(`API key is required for model '${model}'`)
    }

    // 4. 调用 LLM 流式接口 — 领域错误翻译为 AppError (ARCH-001)
    let llmStreamResponse: Response
    try {
      llmStreamResponse = await callLLMStream(fullMessages, config)
    } catch (err) {
      if (err instanceof LLMApiError) throw Errors.llmApiError(err.message)
      if (err instanceof LLMConfigError || err instanceof DomainError) throw Errors.internal(err.message)
      throw err
    }
    const stream = sseStreamToDeltaStream(llmStreamResponse)

    // 6. 流结束后异步保存 — TECH-API-009 D10: 传入 parentRecordId
    const onComplete = (fullReply: string) => {
      saveRecordAsync(this.chatRepo, 'anonymous', personaId, messages, fullReply, model, parentRecordId)
      if (this.memoryRepo) {
        extractMemoriesAsync(this.memoryRepo, this.personaRepo, this.env, personaId, messages, fullReply, model)
      }
    }

    return { stream, modelUsed: model, onComplete }
  }

  async getHistory(
    userId: string,
    personaId?: string,
    limit = 50,
    offset = 0,
  ): Promise<ChatRecord[]> {
    return this.chatRepo.findByUserId(userId, personaId, limit, offset)
  }

  // TECH-API-006 D8: 删除聊天记录 — 先查存在性再原子删除
  async deleteRecord(id: string): Promise<void> {
    const record = await this.chatRepo.findById(id)
    if (!record) throw Errors.notFound('Chat record')
    await this.chatRepo.deleteById(id)
  }

  // TECH-API-009 D10: 查询某条记录的所有兄弟分支
  async getBranches(atRecordId: number): Promise<BranchRecord[]> {
    // 先查出该记录，获取其 parent_record_id
    const record = await this.chatRepo.findById(String(atRecordId))
    if (!record) throw Errors.notFound('Chat record')

    // 没有父记录的根节点，没有兄弟分支
    if (record.parentRecordId == null) {
      return [{
        id: Number(record.id),
        reply: record.reply,
        branchIndex: record.branchIndex ?? 0,
        model: record.model,
        createdAt: record.createdAt,
      }]
    }

    return this.chatRepo.findBranches(record.parentRecordId)
  }

  // TECH-API-010 D11: 消息评分
  async rateMessage(recordId: string, rating: Rating): Promise<void> {
    const record = await this.chatRepo.findById(recordId)
    if (!record) throw Errors.notFound('Chat record')
    await this.chatRepo.rateMessage(recordId, rating)
  }

  // TECH-API-010 D11: 人格统计
  async getPersonaStats(personaId: string): Promise<PersonaStats> {
    const raw = await this.chatRepo.getPersonaStats(personaId)
    const rated = raw.likeCount + raw.dislikeCount
    return {
      personaId: raw.personaId,
      totalMessages: raw.totalMessages,
      likeCount: raw.likeCount,
      dislikeCount: raw.dislikeCount,
      likeRate: rated > 0 ? raw.likeCount / rated : 0,
      totalSessions: raw.totalSessions,
    }
  }

  // TECH-API-014 D15: 人格预览 — 不保存人格，用传入 systemPrompt 即时对话
  async preview(
    systemPrompt: string,
    messages: ChatMessage[],
    model: string,
    userApiKey?: string,
  ): Promise<{ reply: string; model: string }> {
    const systemMsg = buildSystemMessage(systemPrompt)
    const fullMessages = [systemMsg, ...messages]

    const modelEntry = findModel(model)
    if (!modelEntry) throw Errors.validation(`Unknown model: ${model}`)

    const envKey = modelEntry.envKey
    const config = getModelConfig(model, envKey ? this.env[envKey] : undefined, userApiKey)
    if (!config.apiKey) {
      throw Errors.unauthorized(`API key is required for model '${model}'`)
    }

    let result: LLMResponse
    try {
      result = await callLLM(fullMessages, config, undefined, this.onLog)
    } catch (err) {
      if (err instanceof LLMApiError) throw Errors.llmApiError(err.message)
      if (err instanceof LLMConfigError || err instanceof DomainError) throw Errors.internal(err.message)
      throw err
    }
    return { reply: result.content ?? '...', model }
  }
}
