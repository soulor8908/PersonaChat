// ── 请求体大小限制中间件 ──
// 防止恶意请求消耗 Worker 资源

import type { Context, Next } from 'hono'

const MAX_BODY_SIZE = 100 * 1024 // 100KB

export async function bodySizeLimit(c: Context, next: Next) {
  const contentLength = parseInt(c.req.header('content-length') || '0', 10)

  if (contentLength > MAX_BODY_SIZE) {
    return c.json({ ok: false, error: 'Request body too large', code: 1002 }, 413)
  }

  await next()
}
