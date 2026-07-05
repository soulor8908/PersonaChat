// ── 安全头中间件 ──
// CSP + XSS 防护 + HTTPS 强制

import type { Context, Next } from 'hono'

export async function securityHeaders(c: Context, next: Next) {
  // 防止 XSS
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')

  // CSP — 仅允许同源脚本和 API 调用
  c.header('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; connect-src 'self' https://api.deepseek.com https://open.bigmodel.cn https://api.openai.com")

  // 强制 HTTPS（生产环境）
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  await next()
}
