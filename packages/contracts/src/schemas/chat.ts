import { z } from 'zod'
import { builtinModelIdSchema } from './common.js'

// ── 消息角色 (TECH-CONTRACT-004 D17: 新增 tool 角色) ──
export const messageRoleSchema = z.enum(['system', 'user', 'assistant', 'tool'])
export type MessageRole = z.infer<typeof messageRoleSchema>

// ── Tool Call 子结构 ──
export const toolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({ name: z.string(), arguments: z.string() }),
})
export type ToolCall = z.infer<typeof toolCallSchema>

// ── 单条消息 ──
export const chatMessageSchema = z.object({
  role: messageRoleSchema,
  content: z.string().nullable().default(null),
  tool_calls: z.array(toolCallSchema).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
})
export type ChatMessage = z.infer<typeof chatMessageSchema>

// ── 聊天请求 ──
export const chatRequestSchema = z.object({
  personaId: z.string().min(1),
  messages: z.array(chatMessageSchema).min(1),
  model: builtinModelIdSchema.or(z.string()).optional(),
  apiKey: z.string().optional(),
  parentRecordId: z.number().int().optional(), // TECH-API-009 D10: 对话分支
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
  parentRecordId: z.number().int().nullable().optional(), // TECH-API-009 D10
  branchIndex: z.number().int().default(0),              // TECH-API-009 D10
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

// ── SSE 流式事件 (TECH-API-008 D9) ──
export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), content: z.string() }),
  z.object({ type: z.literal('done'), messageId: z.string() }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
  // TECH-CONTRACT-004 D17: tool 事件
  z.object({ type: z.literal('tool_start'), toolName: z.string() }),
  z.object({ type: z.literal('tool_args'), toolName: z.string(), args: z.string() }),
  z.object({ type: z.literal('tool_end'), toolName: z.string(), result: z.string() }),
])
export type StreamEvent = z.infer<typeof streamEventSchema>

// ── 流式聊天请求（复用 chatRequestSchema 的非流式请求结构）──
export const chatStreamRequestSchema = chatRequestSchema
export type ChatStreamRequest = z.infer<typeof chatStreamRequestSchema>

// ── 对话分支查询 (TECH-API-009 D10) ──
export const branchListQuerySchema = z.object({
  atRecordId: z.coerce.number().int().min(1),
})
export type BranchListQuery = z.infer<typeof branchListQuerySchema>

export const branchRecordSchema = z.object({
  id: z.number().int(),
  reply: z.string(),
  branchIndex: z.number().int(),
  model: z.string().optional(),
  createdAt: z.number().int(),
})
export type BranchRecord = z.infer<typeof branchRecordSchema>

// ── 评价反馈 (TECH-API-010 D11) ──
export const ratingSchema = z.enum(['like', 'dislike'])
export type Rating = z.infer<typeof ratingSchema>

export const rateMessageSchema = z.object({
  rating: ratingSchema,
})
export type RateMessage = z.infer<typeof rateMessageSchema>
