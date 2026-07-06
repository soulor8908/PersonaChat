// ── LLM 调用领域逻辑 ──
// 从 contracts SSOT 派生所有模型配置 (AI-005)
// TECH-API-002 D1: 模型配置从 contracts/modelRegistry 派生
//
// 错误约定: 领域层抛出命名 DomainError 子类，service 层负责翻译为 AppError。
// 领域层不直接依赖 errors.ts（ARCH-001）。

import { z } from 'zod'
import type { ChatMessage, ModelRegistryEntry } from '@personachat/contracts'
import { modelRegistry, builtinModelIds } from '@personachat/contracts'

// TECH-API-012 D13: LLM 调用日志回调（由 server.ts 注入）
export type LLMLogFn = (log: {
  model: string
  provider: string
  promptTokens?: number
  completionTokens?: number
  latencyMs: number
  status: 'success' | 'error' | 'timeout'
  errorMessage?: string
}) => void

// ── 领域错误（不依赖 errors.ts，给 service 层提供足够上下文）──
export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export class ModelNotFoundError extends DomainError {
  constructor(modelId: string) {
    super(`Unknown model: ${modelId}`, 'MODEL_NOT_FOUND')
  }
}

export class LLMConfigError extends DomainError {
  constructor(detail: string) {
    super(`LLM config error: ${detail}`, 'LLM_CONFIG_ERROR')
  }
}
export class LLMApiError extends DomainError {
  constructor(public readonly status: number, detail: string) {
    super(`LLM API error (${status}): ${detail}`, 'LLM_API_ERROR')
  }
}

// ── LLM API 响应解析（snake_case → camelCase 后 Zod 校验）──
const llmRawUsageSchema = z.object({
  prompt_tokens: z.number().int(),
  completion_tokens: z.number().int(),
}).optional()

// TECH-CONTRACT-004 D17: tool_calls 响应格式
const llmToolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({ name: z.string(), arguments: z.string() }),
})

const llmRawChoiceSchema = z.object({
  message: z.object({
    content: z.string().nullable().default(null),
    tool_calls: z.array(llmToolCallSchema).optional(),
  }),
  finish_reason: z.string().optional(),
})

const llmRawResponseSchema = z.object({
  choices: z.array(llmRawChoiceSchema).min(1),
  usage: llmRawUsageSchema,
})

// TECH-CONTRACT-004 D17: callLLM 返回类型（支持 tool_calls）
export interface LLMResponse {
  content: string | null
  toolCalls?: Array<{ id: string; function: { name: string; arguments: string } }>
  usage?: { promptTokens: number; completionTokens: number }
}

export interface ModelConfig {
  baseURL: string
  model: string
  apiKey: string
  free: boolean
  id: string
  name: string
}

export function findModel(modelId: string): ModelRegistryEntry | undefined {
  return modelRegistry.find(m => m.id === modelId)
}

export function getModelConfig(
  modelId: string,
  envApiKey?: string,
  userApiKey?: string,
): ModelConfig {
  const entry = findModel(modelId)
  if (!entry) throw new ModelNotFoundError(modelId)

  return {
    id: entry.id,
    name: entry.name,
    baseURL: entry.baseURL,
    model: entry.deployName,
    apiKey: envApiKey || userApiKey || '',
    free: entry.free,
  }
}

export function isBuiltinModel(modelId: string): boolean {
  return (builtinModelIds as readonly string[]).includes(modelId)
}

export function getDefaultModelId(): string {
  return modelRegistry[0].id
}

export function buildSystemMessage(systemPrompt: string): ChatMessage {
  return { role: 'system', content: systemPrompt }
}

export async function callLLM(
  messages: ChatMessage[],
  config: ModelConfig,
  tools?: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>,
  onLog?: LLMLogFn,
): Promise<LLMResponse> {
  if (!config.baseURL || !config.model || !config.apiKey) {
    throw new LLMConfigError('API key not configured. Run `wrangler secret put <KEY>`')
  }

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.7,
  }
  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const startTime = Date.now()
  try {
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      const errText = await response.text().catch(() => '(unable to read error body)')
      onLog?.({ model: config.id, provider: new URL(config.baseURL).hostname, latencyMs, status: 'error', errorMessage: errText.slice(0, 200) })
      throw new LLMApiError(response.status, errText.slice(0, 200))
    }

    const raw = await response.json()
    const data = llmRawResponseSchema.parse(raw)
    const choice = data.choices[0]

    onLog?.({
      model: config.id,
      provider: new URL(config.baseURL).hostname,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      latencyMs,
      status: 'success',
    })

    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls?.map(tc => ({
        id: tc.id,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens } : undefined,
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime
    if (err instanceof LLMApiError) throw err
    onLog?.({ model: config.id, provider: new URL(config.baseURL).hostname, latencyMs, status: 'error', errorMessage: (err as Error).message })
    throw err
  }
}

// TECH-API-008 D9: 流式 LLM 调用 — 返回 ReadableStream for SSE
// CF Workers 环境支持 Web Streams API
export async function callLLMStream(
  messages: ChatMessage[],
  config: ModelConfig,
): Promise<Response> {
  if (!config.baseURL || !config.model || !config.apiKey) {
    throw new LLMConfigError('API key not configured. Run `wrangler secret put <KEY>`')
  }

  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '(unable to read error body)')
    throw new LLMApiError(response.status, errText.slice(0, 200))
  }

  return response
}

// TECH-API-008 D9: 将 LLM 原生 SSE 流转换为结构化 delta 事件流
// 解析 OpenAI 兼容的 SSE chunk 格式: data: {"choices":[{"delta":{"content":"..."}}]}
export function sseStreamToDeltaStream(
  llmResponse: Response,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new ReadableStream({
    async start(controller) {
      if (!llmResponse.body) {
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'error',
          code: 'EMPTY_BODY',
          message: 'LLM returned no response body',
        }) + '\n'))
        controller.close()
        return
      }

      const reader = llmResponse.body.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          // 保留最后一个不完整的行
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            const dataStr = trimmed.slice(6)
            if (dataStr === '[DONE]') {
              controller.close()
              return
            }

            try {
              const chunk = JSON.parse(dataStr) as Record<string, unknown>
              const delta = (chunk?.choices as Array<Record<string, unknown>>)?.[0]?.delta
              const content = (delta as Record<string, unknown>)?.content
              if (typeof content === 'string' && content.length > 0) {
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: 'delta',
                  content,
                }) + '\n'))
              }
            } catch (_e) {
              void (_e as Error) // skip unparseable SSE chunks
            }
          }
        }
        // 流自然结束
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown stream error'
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'error',
          code: 'STREAM_ERROR',
          message,
        }) + '\n'))
        controller.close()
      }
    },
  })
}
