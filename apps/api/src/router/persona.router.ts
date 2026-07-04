// ── 人格 API 路由 ──
// TECH-API-005 D7: 所有路由入口通过 Zod schema 校验输入

import { Hono } from 'hono'
import {
  personaQuerySchema,
  personaCategorySchema,
  personaCreateSchema,
  personaUpdateSchema,
} from '@personachat/contracts'
import type { PersonaService } from '../service/persona-svc.js'

export function createPersonaRouter(personaService: PersonaService) {
  const router = new Hono()

  // GET /api/personas — 人格列表
  router.get('/', async (c) => {
    const query = personaQuerySchema.parse(c.req.query())
    const personas = await personaService.list(query)
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

  return router
}
