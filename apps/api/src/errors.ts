// ── 错误码 SSOT ──
// 从 contracts 派生，业务层只引用此处定义的错误，不直接引用数字

import { ErrorCode } from '@personachat/contracts'

export class AppError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// ── 工厂函数 ──
export const Errors = {
  notFound(resource: string = 'Resource') {
    return new AppError(ErrorCode.NOT_FOUND, `${resource} not found`, 404)
  },

  conflict(resource: string, field: string, value: string) {
    return new AppError(ErrorCode.VALIDATION_ERROR, `${resource} with ${field} '${value}' already exists`, 409)
  },

  validation(message: string) {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, 400)
  },

  unauthorized(message: string = 'Unauthorized') {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401)
  },

  llmApiError(detail: string) {
    return new AppError(ErrorCode.LLM_API_ERROR, `LLM API error: ${detail}`, 502)
  },

  rateLimited() {
    return new AppError(ErrorCode.RATE_LIMITED, 'Rate limit exceeded', 429)
  },

  internal(message: string = 'Internal error') {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, 500)
  },
}
