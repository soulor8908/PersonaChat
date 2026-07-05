// ── API 入口 ──
// 声明式路由表：注册中间件 → 初始化依赖 → 挂载路由

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { corsMiddleware } from './middleware/cors.js'
import { errorHandler } from './middleware/error-handler.js'
import { authMiddleware } from './middleware/auth.js'
import { chatRateLimiter, defaultRateLimiter } from './middleware/rate-limit.js'
import { bodySizeLimit } from './middleware/body-limit.js'
import { PersonaRepository } from './repository/persona-repo.js'
import { ChatRepository } from './repository/chat-repo.js'
import { PersonaService } from './service/persona-svc.js'
import { ChatService } from './service/chat-svc.js'
import { createPersonaRouter } from './router/persona.router.js'
import { createChatRouter } from './router/chat.router.js'
import { modelRegistry } from '@personachat/contracts'
import type { D1Database } from '@cloudflare/workers-types'
import type { Env } from './context.js'

// ── 自动建表（开发/部署时首次运行）──
async function ensureTables(db: D1Database): Promise<void> {
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS personas (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          category TEXT NOT NULL,
          system_prompt TEXT NOT NULL,
          source_url TEXT,
          stargazers_count INTEGER DEFAULT 0,
          created_at INTEGER,
          updated_at INTEGER
        )`,
      )
      .run()
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS chat_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          persona_id TEXT NOT NULL,
          messages TEXT NOT NULL,
          reply TEXT NOT NULL,
          model TEXT,
          created_at INTEGER NOT NULL
        )`,
      )
      .run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_records_user ON chat_records(user_id, created_at DESC)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_records_persona ON chat_records(persona_id)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_personas_category ON personas(category)').run()
    console.log('✅ Tables initialized')
  } catch (err) {
    // 表初始化失败不影响 API 响应，但记录错误
    console.error('Table init error:', (err as Error).message)
    return // 不阻断 fetch，但表可能不可用
  }
}

// ── App 工厂 ──
export function createApp(env: Env) {
  const app = new Hono<{ Bindings: Env }>()

  // 全局中间件
  app.use('*', logger())
  app.use('*', corsMiddleware)
  app.onError(errorHandler)

  // 安全基础: 请求体大小限制
  app.use('*', bodySizeLimit)

  // 安全中间件: 写操作需要 auth，所有路由需要 rate limit
  app.use('/api/personas', authMiddleware)
  app.use('/api/personas', defaultRateLimiter)
  app.use('/api/chats', authMiddleware)
  app.use('/api/chats', chatRateLimiter)  // 聊天端点限制更严格

  // 健康检查
  app.get('/api/health', (c) => {
    return c.json({ ok: true, ts: Date.now() })
  })

  // 模型列表 (SSOT 下发，供前端动态获取)
  app.get('/api/models', (c) => {
    const models = modelRegistry.map(m => ({
      id: m.id,
      name: m.name,
      free: m.free,
    }))
    return c.json({ ok: true, data: models })
  })

  // ── 依赖注入 ──
  const personaRepo = new PersonaRepository(env.DB)
  const chatRepo = new ChatRepository(env.DB)
  const personaService = new PersonaService(personaRepo)
  const chatService = new ChatService(personaRepo, chatRepo, env as unknown as Record<string, string | undefined>)

  // ── 挂载路由 ──
  app.route('/api/personas', createPersonaRouter(personaService))
  app.route('/api/chats', createChatRouter(chatService))

  return app
}

// ── CF Workers 入口 ──
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 首次请求时自动建表
    await ensureTables(env.DB)
    const app = createApp(env)
    return app.fetch(request, env)
  },
}
