// ── LLM 调用领域逻辑 ──
// 从 contracts SSOT 派生所有模型配置 (AI-005)
// TECH-API-002 D1: 模型配置从 contracts/modelRegistry 派生
//
// 错误约定: 领域层抛出命名 DomainError 子类，service 层负责翻译为 AppError。
// 领域层不直接依赖 errors.ts（ARCH-001）。

import { z } from 'zod'
import type { ChatMessage, ModelRegistryEntry } from '@personachat/contracts'
import { modelRegistry, builtinModelIds } from '@personachat/contracts'

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

const llmRawResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string() }),
  })).min(1),
  usage: llmRawUsageSchema,
})

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
): Promise<{ reply: string; usage?: { promptTokens: number; completionTokens: number } }> {
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
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '(unable to read error body)')
    throw new LLMApiError(response.status, errText.slice(0, 200))
  }

  const raw = await response.json()
  const data = llmRawResponseSchema.parse(raw)
  return {
    reply: data.choices[0].message.content,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
        }
      : undefined,
  }
}
