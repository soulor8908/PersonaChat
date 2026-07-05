import { z } from 'zod'
import { personaCategorySchema } from './common.js'

// ── 人格实体 (SSOT) ──
// TECH-CONTRACT-001 D1: personaSchema 为 Persona 实体的 SSOT
export const personaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  category: personaCategorySchema,
  systemPrompt: z.string().min(1).max(8000),
  sourceUrl: z.string().url().optional(),
  stargazersCount: z.number().int().min(0).default(0),
  tools: z.array(z.string()).default([]), // TECH-CONTRACT-004 D17
  createdAt: z.number().int().optional(),
  updatedAt: z.number().int().optional(),
})
export type Persona = z.infer<typeof personaSchema>

// ── 创建输入 ──
// TECH-CONTRACT-001 D2: create 输入不包含 id/createdAt/updatedAt/stargazersCount
export const personaCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  category: personaCategorySchema,
  systemPrompt: z.string().min(1).max(8000),
  sourceUrl: z.string().url().optional(),
  tools: z.array(z.string()).default([]), // TECH-CONTRACT-004 D17
})
export type PersonaCreate = z.infer<typeof personaCreateSchema>

// ── 更新输入 ──
// TECH-CONTRACT-001 D3: update 全部字段可选，至少提供一个
export const personaUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: personaCategorySchema.optional(),
  systemPrompt: z.string().min(1).max(8000).optional(),
  sourceUrl: z.string().url().optional().nullable(),
  tools: z.array(z.string()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: '至少提供一个要更新的字段',
})
export type PersonaUpdate = z.infer<typeof personaUpdateSchema>

// ── 查询参数 ──
export const personaSortSchema = z.enum(['popular', 'recent', 'rated'])
export type PersonaSort = z.infer<typeof personaSortSchema>

export const personaQuerySchema = z.object({
  category: personaCategorySchema.optional(),
  search: z.string().max(100).optional(),
  sort: personaSortSchema.optional(),
})
export type PersonaQuery = z.infer<typeof personaQuerySchema>

// ── 同步源 ──
export const personaSourceSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  category: personaCategorySchema,
})
export type PersonaSource = z.infer<typeof personaSourceSchema>

// ── 人格统计 (TECH-API-010 D11) ──
export const personaStatsSchema = z.object({
  personaId: z.string(),
  totalMessages: z.number().int().min(0),
  likeCount: z.number().int().min(0),
  dislikeCount: z.number().int().min(0),
  likeRate: z.number().min(0).max(1),
  totalSessions: z.number().int().min(0),
})
export type PersonaStats = z.infer<typeof personaStatsSchema>

// ── 人格摘要 (列表页用, TECH-API-013 D14) ──
export const personaSummarySchema = personaSchema.extend({
  likeRate: z.number().min(0).max(1),
  messageCount: z.number().int().min(0),
})
export type PersonaSummary = z.infer<typeof personaSummarySchema>
