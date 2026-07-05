// ── API 入口 ──
// 声明式路由表：注册中间件 → 初始化依赖 → 挂载路由

import { Hono } from 'hono'
import { z } from 'zod'
import { logger } from 'hono/logger'
import { corsMiddleware } from './middleware/cors.js'
import { errorHandler } from './middleware/error-handler.js'
import { authMiddleware } from './middleware/auth.js'
import { chatRateLimiter, defaultRateLimiter } from './middleware/rate-limit.js'
import { bodySizeLimit } from './middleware/body-limit.js'
import { securityHeaders } from './middleware/security-headers.js'
import { PersonaRepository } from './repository/persona-repo.js'
import { ChatRepository } from './repository/chat-repo.js'
import { MemoryRepository } from './repository/memory-repo.js'
import { PersonaService } from './service/persona-svc.js'
import { ChatService } from './service/chat-svc.js'
import { createPersonaRouter } from './router/persona.router.js'
import { createChatRouter } from './router/chat.router.js'
import { modelRegistry } from '@personachat/contracts'
import { setLLMLogger } from './domain/llm.js'
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
          tools TEXT DEFAULT '[]',  -- TECH-CONTRACT-004 D17
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
          parent_record_id INTEGER,
          branch_index INTEGER DEFAULT 0,
          rating TEXT,
          created_at INTEGER NOT NULL
        )`,
      )
      .run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_records_user ON chat_records(user_id, created_at DESC)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_records_persona ON chat_records(persona_id)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_personas_category ON personas(category)').run()
    // TECH-API-011 D12: 人格记忆表
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS persona_memories (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          persona_id TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          category TEXT DEFAULT 'fact',
          importance INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`,
      )
      .run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_memories_user_persona ON persona_memories(user_id, persona_id)').run()
    // TECH-API-012 D13: LLM 调用日志表
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS llm_call_logs (
          id TEXT PRIMARY KEY,
          model TEXT NOT NULL,
          provider TEXT NOT NULL,
          prompt_tokens INTEGER,
          completion_tokens INTEGER,
          latency_ms INTEGER,
          status TEXT NOT NULL,
          error_message TEXT,
          created_at INTEGER NOT NULL
        )`,
      )
      .run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_llm_logs_created ON llm_call_logs(created_at)').run()
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

  // 安全基础: 安全头 + 请求体大小限制
  app.use('*', securityHeaders)
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
  const memoryRepo = new MemoryRepository(env.DB)
  const personaService = new PersonaService(personaRepo)
  const chatService = new ChatService(personaRepo, chatRepo, env as unknown as Record<string, string | undefined>, memoryRepo, {
    webSearchApiKey: env.WEB_SEARCH_API_KEY,
  })

  // TECH-API-012 D13: LLM 调用日志 + 指标查询
  setLLMLogger((log) => {
    env.DB.prepare(
      `INSERT INTO llm_call_logs (id, model, provider, prompt_tokens, completion_tokens, latency_ms, status, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        log.model,
        log.provider,
        log.promptTokens ?? null,
        log.completionTokens ?? null,
        log.latencyMs,
        log.status,
        log.errorMessage ?? null,
        Date.now(),
      )
      .run()
      .catch((_e) => {
        console.warn('LLM log insert failed:', (_e as Error).message)
      })
  })

  app.get('/api/admin/metrics', async (c) => {
    const periodHours = z.coerce.number().int().min(1).max(720).default(24).parse(c.req.query('period'))
    const since = Date.now() - periodHours * 3600_000

    const { results } = await env.DB
      .prepare(
        `SELECT
          COUNT(*) as total_calls,
          COALESCE(AVG(latency_ms), 0) as avg_latency,
          COALESCE(SUM(prompt_tokens), 0) + COALESCE(SUM(completion_tokens), 0) as total_tokens,
          CAST(SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS REAL) / MAX(1, COUNT(*)) as error_rate,
          model
         FROM llm_call_logs WHERE created_at >= ?
         GROUP BY model`,
      )
      .bind(since)
      .all()

    const models = (results as Array<Record<string, unknown>>).map(r => ({
      model: r.model as string,
      calls: r.total_calls as number,
      avgLatency: Math.round(r.avg_latency as number),
      errorRate: Math.round((r.error_rate as number) * 100) / 100,
    }))

    const totalCalls = models.reduce((s, m) => s + m.calls, 0)
    const totalTokens = (results as Array<Record<string, unknown>>).reduce((s, r) => s + (r.total_tokens as number), 0)

    return c.json({
      ok: true,
      data: {
        periodHours,
        totalCalls,
        totalTokens,
        models,
      },
    })
  })

  // ── 挂载路由 ──
  app.route('/api/personas', createPersonaRouter(personaService, chatService))
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
