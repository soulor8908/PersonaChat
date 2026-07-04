// ── API Key 鉴权中间件 ──
// 若环境变量 API_KEY 已配置，则要求请求携带匹配的 x-api-key 头或 Bearer token。
// 未配置 API_KEY 时允许所有请求（开发模式）。
// SEC-001: 所有非 GET 路由默认需要验证。

import type { Context, Next } from 'hono'

export async function authMiddleware(c: Context, next: Next) {
  const env = c.env as Record<string, string | undefined>
  const apiKey = env?.API_KEY

  // 未配置 API_KEY — 开发模式，跳过验证
  if (!apiKey) {
    await next()
    return
  }

  // 检查 Authorization: Bearer <token>
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token === apiKey) {
      await next()
      return
    }
  }

  // 检查 x-api-key header
  const xApiKey = c.req.header('x-api-key')
  if (xApiKey === apiKey) {
    await next()
    return
  }

  c.json({ ok: false, error: 'Unauthorized', code: 1003 }, 401)
}
