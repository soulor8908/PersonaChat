// ── CORS 配置 ──
// 开发模式允许所有 origin，生产模式限制为 ALLOWED_ORIGINS 环境变量（逗号分隔）。

import type { Context, Next } from 'hono'

const WILDCARD = '*'

export async function corsMiddleware(c: Context, next: Next) {
  const origin = c.req.header('origin')
  const env = c.env as Record<string, string | undefined>
  const allowedOrigins = env?.ALLOWED_ORIGINS

  if (allowedOrigins && origin) {
    const origins = allowedOrigins.split(',').map(o => o.trim())
    if (origins.includes(origin)) {
      c.header('Access-Control-Allow-Origin', origin)
    }
  } else {
    // 未配置 ALLOWED_ORIGINS — 允许所有（开发模式）
    c.header('Access-Control-Allow-Origin', origin || WILDCARD)
  }

  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
  c.header('Access-Control-Max-Age', '86400')

  if (c.req.method === 'OPTIONS') {
    c.body(null, 204)
    return
  }

  await next()
}
