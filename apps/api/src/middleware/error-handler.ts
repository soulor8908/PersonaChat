// ── 全局错误处理中间件 ──
// AppError/ZodError 返回结构化错误，未知错误返回 500 不泄露内部信息

import type { Context } from 'hono'
import { ZodError } from 'zod'
import { AppError } from '../errors.js'

export function errorHandler(err: Error, c: Context) {
  // AppError: 业务层可控错误 — 消息安全，可直接返回
  if (err instanceof AppError) {
    return c.json(
      { ok: false, error: err.message, code: err.code },
      err.status as 200,
    )
  }

  // ZodError: 输入校验失败 — 返回 issues 帮助前端调试
  if (err instanceof ZodError) {
    return c.json(
      {
        ok: false,
        error: 'Validation error',
        code: 1002,
        issues: err.issues.map(i => ({ path: i.path, message: i.message })),
      },
      400,
    )
  }

  // 未知错误: 生产环境不泄露内部信息
  console.error('Unhandled error:', err.message)
  return c.json(
    { ok: false, error: 'Internal server error', code: 5000 },
    500,
  )
}
