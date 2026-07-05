/// <reference types="vite/client" />
// ── 类型安全 API 客户端 (复用 @personachat/contracts) ──

const BASE_URL = import.meta.env.PROD
  ? 'https://persona-chat-api.470033918.workers.dev'
  : ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('api_key')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> ?? {}),
  }
  if (token) headers['x-api-key'] = token

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── SSE 流式发送 ──
export interface SSECallbacks {
  onDelta: (content: string) => void
  onDone?: (messageId: string) => void
  onError?: (error: Error) => void
  onToolStart?: (toolName: string) => void
  onToolArgs?: (toolName: string, args: string) => void
  onToolEnd?: (toolName: string, result: string) => void
}

export async function sendStream(
  body: Record<string, unknown>,
  callbacks: SSECallbacks,
): Promise<AbortController> {
  const controller = new AbortController()
  const token = localStorage.getItem('api_key')

  try {
    const res = await fetch(`${BASE_URL}/api/chats/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-api-key': token } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      callbacks.onError?.(new Error(err.error || `HTTP ${res.status}`))
      return controller
    }

    const reader = res.body?.getReader()
    if (!reader) { callbacks.onError?.(new Error('No response body')); return controller }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const event = JSON.parse(trimmed)
          switch (event.type) {
            case 'delta': callbacks.onDelta(event.content); break
            case 'done': callbacks.onDone?.(event.messageId); break
            case 'error': callbacks.onError?.(new Error(event.message)); break
            case 'tool_start': callbacks.onToolStart?.(event.toolName); break
            case 'tool_args': callbacks.onToolArgs?.(event.toolName, event.args); break
            case 'tool_end': callbacks.onToolEnd?.(event.toolName, event.result); break
          }
        } catch (_e) {
          void (_e as Error) // skip unparseable SSE lines
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      callbacks.onError?.(err as Error)
    }
  }
  return controller
}

// ── Persona API ──
export const PersonaApi = {
  list(params: Record<string, string | undefined> = {}) {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) { if (v) q.set(k, v) }
    const qs = q.toString()
    return request<{ ok: boolean; data: Array<Record<string, unknown>> }>(`/api/personas${qs ? '?' + qs : ''}`)
  },
  listHot() {
    return request<{ ok: boolean; data: Array<Record<string, unknown>> }>('/api/personas/hot')
  },
  getById(id: string) {
    return request<{ ok: boolean; data: Record<string, unknown> }>(`/api/personas/${id}`)
  },
  create(data: Record<string, unknown>) {
    return request<{ ok: boolean; data: Record<string, unknown> }>('/api/personas', {
      method: 'POST', body: JSON.stringify(data),
    })
  },
  preview(data: Record<string, unknown>) {
    return request<{ ok: boolean; reply: string }>('/api/personas/preview', {
      method: 'POST', body: JSON.stringify(data),
    })
  },
  getStats(id: string) {
    return request<{ ok: boolean; data: Record<string, unknown> }>(`/api/personas/${id}/stats`)
  },
}

// ── Chat API ──
export const ChatApi = {
  send(data: Record<string, unknown>) {
    return request<{ ok: boolean; reply: string; recordId: number; model: string }>('/api/chats', {
      method: 'POST', body: JSON.stringify(data),
    })
  },
  getHistory(params: Record<string, string | number | undefined>) {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) { if (v != null) q.set(k, String(v)) }
    return request<{ ok: boolean; data: Array<Record<string, unknown>> }>(`/api/chats/anon?${q.toString()}`)
  },
  getModels() {
    return request<{ ok: boolean; data: Array<{ id: string; name: string; free: boolean }> }>('/api/models')
  },
  rateMessage(id: string, rating: string) {
    return request<{ ok: boolean }>(`/api/chats/${id}/rate`, {
      method: 'PUT', body: JSON.stringify({ rating }),
    })
  },
}
