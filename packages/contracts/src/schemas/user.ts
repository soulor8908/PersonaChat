import { z } from 'zod'
import { modelConfigSchema } from './common.js'

// ── 用户自定义模型 ──
export const userModelSchema = modelConfigSchema.extend({
  id: z.string().or(z.number()),
  modelName: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  createdAt: z.number().int().optional(),
})
export type UserModel = z.infer<typeof userModelSchema>

// ── 用户配置 ──
export const userProfileSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().max(50).optional(),
  models: z.array(userModelSchema).default([]),
  preferredModel: z.string().default('deepseek-v3'),
})
export type UserProfile = z.infer<typeof userProfileSchema>

// ── 模型保存请求 ──
export const saveModelRequestSchema = z.object({
  userId: z.string().min(1),
  model: userModelSchema.omit({ id: true }),
})
export type SaveModelRequest = z.infer<typeof saveModelRequestSchema>
