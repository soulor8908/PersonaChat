// ── 人格 API 路由 ──
// TECH-API-005 D7: 所有路由入口通过 Zod schema 校验输入

import { Hono } from 'hono'
import {
  personaQuerySchema,
  personaCategorySchema,
  personaCreateSchema,
  personaUpdateSchema,
  builtinModelIdSchema,
  chatMessageSchema,
} from '@personachat/contracts'
import { z } from 'zod'
import type { PersonaService } from '../service/persona-svc.js'
import type { ChatService } from '../service/chat-svc.js'

export function createPersonaRouter(personaService: PersonaService, chatService?: ChatService) {
  const router = new Hono()

  // GET /api/personas — 人格列表 (TECH-API-013 D14: 排序+统计)
  router.get('/', async (c) => {
    const raw = c.req.query()
    const query = personaQuerySchema.parse({ ...raw, sort: raw.sort || undefined })
    const personas = await personaService.list(query)
    return c.json({ ok: true, data: personas })
  })

  // TECH-API-013 D14: 热门推荐
  router.get('/hot', async (c) => {
    const personas = await personaService.listHot()
    return c.json({ ok: true, data: personas })
  })

  // GET /api/personas/:id — 人格详情
  router.get('/:id', async (c) => {
    const id = c.req.param('id')
    const persona = await personaService.getById(id)
    return c.json({ ok: true, data: persona })
  })

  // POST /api/personas — 创建人格
  router.post('/', async (c) => {
    const body = await c.req.json()
    const input = personaCreateSchema.parse(body)  // TECH-API-005 D7
    const persona = await personaService.create(input)
    c.status(201)
    return c.json({ ok: true, data: persona })
  })

  // PUT /api/personas/:id — 更新人格
  router.put('/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const input = personaUpdateSchema.parse(body)  // TECH-API-005 D7
    const persona = await personaService.update(id, input)
    return c.json({ ok: true, data: persona })
  })

  // DELETE /api/personas/:id — 删除人格
  router.delete('/:id', async (c) => {
    const id = c.req.param('id')
    await personaService.delete(id)
    return c.json({ ok: true, data: null })
  })

  // POST /api/personas/sync — 从 GitHub 同步人格
  router.post('/sync', async (c) => {
    const body = await c.req.json<{ owner: string; repo: string; category: string }>()
    const category = personaCategorySchema.parse(body.category)
    const persona = await personaService.syncFromSource({
      owner: body.owner,
      repo: body.repo,
      category,
    })
    return c.json({ ok: true, data: persona })
  })

  // TECH-API-010 D11: 人格统计数据
  if (chatService) {
    router.get('/:id/stats', async (c) => {
      const id = c.req.param('id')
      const stats = await chatService.getPersonaStats(id)
      return c.json({ ok: true, data: stats })
    })
  }

  // TECH-API-014 D15: 人格预览 — 不保存，即时测试对话
  if (chatService) {
    router.post('/preview', async (c) => {
      const body = await c.req.json()
      const parsed = z.object({
        systemPrompt: z.string().min(1).max(8000),
        messages: z.array(chatMessageSchema).min(1),
        model: builtinModelIdSchema.or(z.string()).optional(),
        apiKey: z.string().optional(),
      }).parse(body)
      const model = parsed.model || 'deepseek-v3'
      const result = await chatService.preview(parsed.systemPrompt, parsed.messages, model, parsed.apiKey)
      return c.json({ ok: true, reply: result.reply, model: result.model })
    })
  }

  return router
}
