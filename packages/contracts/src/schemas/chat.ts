import { z } from 'zod'
import { builtinModelIdSchema } from './common.js'

// ── 消息角色 ──
export const messageRoleSchema = z.enum(['system', 'user', 'assistant'])
export type MessageRole = z.infer<typeof messageRoleSchema>

// ── 单条消息 ──
export const chatMessageSchema = z.object({
  role: messageRoleSchema,
  content: z.string().min(1),
})
export type ChatMessage = z.infer<typeof chatMessageSchema>

// ── 聊天请求 ──
export const chatRequestSchema = z.object({
  personaId: z.string().min(1),
  messages: z.array(chatMessageSchema).min(1),
  model: builtinModelIdSchema.or(z.string()).optional(),
  apiKey: z.string().optional(),
})
export type ChatRequest = z.infer<typeof chatRequestSchema>

// ── 聊天响应 ──
export const chatResponseSchema = z.object({
  ok: z.literal(true),
  reply: z.string(),
  model: z.string().optional(),
  usage: z.object({
    promptTokens: z.number().int().optional(),
    completionTokens: z.number().int().optional(),
  }).optional(),
})
export type ChatResponse = z.infer<typeof chatResponseSchema>

// ── 聊天记录 ──
export const chatRecordSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1),
  personaId: z.string().min(1),
  messages: z.array(chatMessageSchema),
  reply: z.string(),
  model: z.string().optional(),
  createdAt: z.number().int(),
})
export type ChatRecord = z.infer<typeof chatRecordSchema>

// ── 历史查询 ──
export const chatHistoryQuerySchema = z.object({
  userId: z.string().min(1),
  personaId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ChatHistoryQuery = z.infer<typeof chatHistoryQuerySchema>
