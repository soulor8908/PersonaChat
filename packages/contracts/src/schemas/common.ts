import { z } from 'zod'

// ── 错误码枚举 (SSOT) ──
export const ErrorCode = {
  OK: 0,
  NOT_FOUND: 1001,
  VALIDATION_ERROR: 1002,
  UNAUTHORIZED: 1003,
  LLM_API_ERROR: 2001,
  RATE_LIMITED: 2002,
  INTERNAL_ERROR: 5000,
} as const

export const errorCodeSchema = z.nativeEnum(ErrorCode)
export type ErrorCode = z.infer<typeof errorCodeSchema>

// ── API 响应包装 ──
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    code: errorCodeSchema.optional(),
  })

// ── 分页 ──
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type Pagination = z.infer<typeof paginationSchema>

// ── LLM 模型配置 SSOT ──
// TECH-CONTRACT-002 D1: 模型列表 + 元数据单一事实源
export const modelRegistry = [
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    baseURL: 'https://api.deepseek.com',
    deployName: 'deepseek-chat',
    free: true,
    envKey: 'DEEPSEEK_API_KEY',
  },
  {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    deployName: 'glm-4-flash',
    free: true,
    envKey: 'GLM_API_KEY',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    baseURL: 'https://api.openai.com/v1',
    deployName: 'gpt-4o-mini',
    free: false,
    envKey: 'OPENAI_API_KEY',
  },
] as const

export type ModelRegistryEntry = typeof modelRegistry[number]
export const builtinModelIds = modelRegistry.map(m => m.id)
export type BuiltinModelId = typeof builtinModelIds[number]

export const builtinModelIdSchema = z.enum(builtinModelIds as [string, ...string[]])

export const modelConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  baseURL: z.string().url(),
  apiKey: z.string().min(1),
  free: z.boolean().default(false),
})
export type ModelConfig = z.infer<typeof modelConfigSchema>

// ── 人格分类 ──
export const personaCategorySchema = z.enum([
  'tech_leader',
  'thinker',
  'educator',
  'artist',
  'custom',
])
export type PersonaCategory = z.infer<typeof personaCategorySchema>
