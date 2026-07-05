// ── 请求上下文类型 ──
// 包装 CF Workers 的 Bindings，供各层使用

import type { D1Database } from '@cloudflare/workers-types'

export interface Env {
  DB: D1Database
  DEEPSEEK_API_KEY?: string
  GLM_API_KEY?: string
  OPENAI_API_KEY?: string
  WEB_SEARCH_API_KEY?: string  // TECH-API-015 D18
  API_KEY?: string
  ALLOWED_ORIGINS?: string
  ENVIRONMENT?: 'development' | 'production'
}

export interface ApiContext {
  env: Env
  userId: string
}
