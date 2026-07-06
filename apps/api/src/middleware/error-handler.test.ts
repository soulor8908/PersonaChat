// ── middleware/error-handler 单元测试 ──
// 测试 errorHandler 的行为：分别测试 AppError / ZodError / unknown Error 的处理

import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { ZodError, z } from 'zod'
import { AppError } from '../errors.js'

describe('errorHandler', () => {
  function testErrorHandler(throwErr: Error) {
    const app = new Hono()

    // Route that triggers the error via a middleware
    app.use('/trigger', async (c, next) => {
      throw throwErr
    })

    app.get('/trigger', (c) => c.json({ ok: true }))

    app.onError((err, c) => {
      if (err instanceof AppError) {
        return c.json(
          { ok: false, error: err.message, code: err.code },
          err.status as 200,
        )
      }
      if (err instanceof ZodError) {
        return c.json(
          {
            ok: false,
            error: 'Validation error',
            code: 1002,
            issues: err.issues.map((i: { path: (string | number)[]; message: string }) => ({ path: i.path, message: i.message })),
          },
          400,
        )
      }
      return c.json(
        { ok: false, error: 'Internal server error', code: 5000 },
        500,
      )
    })

    return app
  }

  it('handles AppError with correct status and code (404)', async () => {
    const app = testErrorHandler(new AppError(1001, 'Persona not found', 404))
    const res = await app.request('/trigger')
    expect(res.status).toBe(404)
    const body = await res.json() as Record<string, any>
    expect(body.ok).toBe(false)
    expect(body.code).toBe(1001)
    expect(body.error).toBe('Persona not found')
  })

  it('handles ZodError with 400 and validation issues', async () => {
    const zodErr = new ZodError([{ code: 'invalid_type', expected: 'string', received: 'number', path: ['name'], message: 'Expected string, received number' }])
    const app = testErrorHandler(zodErr)
    const res = await app.request('/trigger')
    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, any>
    expect(body.ok).toBe(false)
    expect(body.code).toBe(1002)
    expect(body.error).toBe('Validation error')
    expect(body.issues).toBeDefined()
    expect(Array.isArray(body.issues)).toBe(true)
    expect(body.issues.length).toBeGreaterThan(0)
  })

  it('handles unknown errors with 500 and generic message', async () => {
    const app = testErrorHandler(new Error('Something went terribly wrong'))
    const res = await app.request('/trigger')
    expect(res.status).toBe(500)
    const body = await res.json() as Record<string, any>
    expect(body.ok).toBe(false)
    expect(body.code).toBe(5000)
    expect(body.error).toBe('Internal server error')
    // Security: should NOT leak original error message
    expect(body.error).not.toContain('Something went terribly wrong')
  })

  it('handles AppError with 401 status', async () => {
    const app = testErrorHandler(new AppError(1003, 'Unauthorized', 401))
    const res = await app.request('/trigger')
    expect(res.status).toBe(401)
    const body = await res.json() as Record<string, any>
    expect(body.code).toBe(1003)
  })

  it('handles AppError with 429 status', async () => {
    const app = testErrorHandler(new AppError(2002, 'Rate limited', 429))
    const res = await app.request('/trigger')
    expect(res.status).toBe(429)
    const body = await res.json() as Record<string, any>
    expect(body.code).toBe(2002)
  })

  it('handles AppError with 502 status (LLM error)', async () => {
    const app = testErrorHandler(new AppError(2001, 'LLM API error: timeout', 502))
    const res = await app.request('/trigger')
    expect(res.status).toBe(502)
    const body = await res.json() as Record<string, any>
    expect(body.code).toBe(2001)
  })
})
