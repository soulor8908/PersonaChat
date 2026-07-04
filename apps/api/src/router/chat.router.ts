// ── 聊天 API 路由 ──

import { z } from 'zod'
import { Hono } from 'hono'
import { chatRequestSchema, builtinModelIdSchema } from '@personachat/contracts'
import type { ChatService } from '../service/chat-svc.js'
import { getDefaultModelId } from '../domain/llm.js'

export function createChatRouter(chatService: ChatService) {
  const router = new Hono()

  // POST /api/chat — 发送聊天消息
  router.post('/', async (c) => {
    const body = await c.req.json()
    const parsed = chatRequestSchema.parse(body)
    const model = parsed.model ? builtinModelIdSchema.parse(parsed.model) : getDefaultModelId()
    const result = await chatService.chat(
      parsed.personaId,
      parsed.messages,
      model,
      parsed.apiKey,
    )
    return c.json({ ok: true, reply: result.reply, model: result.model })
  })

  // GET /api/chats/:userId — 获取聊天历史
  router.get('/:userId', async (c) => {
    const userId = c.req.param('userId')
    const query = c.req.query()
    // TECH-API-005 D7: query 参数经 Zod 校验
    const parsed = z.object({
      persona_id: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(query)
    const records = await chatService.getHistory(
      userId,
      parsed.persona_id,
      parsed.limit,
      parsed.offset,
    )
    return c.json({ ok: true, data: records })
  })

  return router
}
