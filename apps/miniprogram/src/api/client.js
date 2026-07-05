// ── 类型安全的 API 客户端 ──
// 微信小程序 HTTP 封装，所有端点集中在此

const BASE_URL = 'https://persona-chat-api.470033918.workers.dev'  // 生产环境

async function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' }
    // 附加 API Key（如果有）
    const apiKey = wx.getStorageSync('api_key')
    if (apiKey) header['x-api-key'] = apiKey
    wx.request({
      url: `${BASE_URL}${path}`,
      method,
      data,
      header,
      success: (res) => {
        if (res.statusCode >= 400) {
          reject(new Error(res.data?.error || `HTTP ${res.statusCode}`))
        } else {
          resolve(res.data)
        }
      },
      fail: (err) => reject(new Error(err.errMsg || 'Network error')),
    })
  })
}

// ── 健康检查 ──
export function healthCheck() {
  return request('GET', '/api/health')
}

// ── 人格 API ──
export const PersonaApi = {
  list(params = {}) {
    const query = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
    return request('GET', `/api/personas${query ? '?' + query : ''}`)
  },

  getById(id) {
    return request('GET', `/api/personas/${id}`)
  },

  // TECH-API-013 D14: 热门推荐
  listHot() {
    return request('GET', '/api/personas/hot')
  },

  // TECH-API-014 D15: 人格预览
  preview({ systemPrompt, messages, model, apiKey }) {
    return request('POST', '/api/personas/preview', { systemPrompt, messages, model, apiKey })
  },

  create({ name, description, category, systemPrompt, tools }) {
    return request('POST', '/api/personas', { name, description, category, systemPrompt, tools })
  },
}

// ── 聊天 API ──
export const ChatApi = {
  send({ personaId, messages, model, apiKey }) {
    return request('POST', '/api/chats', { personaId, messages, model, apiKey })
  },

  // TECH-API-008 D9: 流式发送 — 使用 enableChunked 逐块接收
  sendStream({ personaId, messages, model, apiKey, parentRecordId, onDelta, onDone, onError, onToolStart, onToolArgs, onToolEnd }) {
    const task = wx.request({
      url: `${BASE_URL}/api/chats/stream`,
      method: 'POST',
      data: { personaId, messages, model, apiKey, parentRecordId },
      header: (() => {
        const h = { 'Content-Type': 'application/json' }
        const apiKey = wx.getStorageSync('api_key')
        if (apiKey) h['x-api-key'] = apiKey
        return h
      })(),
      enableChunked: true,
      success: () => {}, // 由 onChunkReceived 处理
      fail: (err) => {
        if (onError) onError(new Error(err.errMsg || 'Stream request failed'))
      },
    })

    let buffer = ''

    task.onChunkReceived((res) => {
      // 将 ArrayBuffer 转为文本
      const text = arrayBufferToString(res.data)
      buffer += text
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        try {
          const event = JSON.parse(trimmed)
          if (event.type === 'delta') {
            if (onDelta) onDelta(event.content)
          } else if (event.type === 'done') {
            if (onDone) onDone(event.messageId)
          } else if (event.type === 'error') {
            if (onError) onError(new Error(event.message))
          } else if (event.type === 'tool_start') {
            if (onToolStart) onToolStart(event.toolName)
          } else if (event.type === 'tool_args') {
            if (onToolArgs) onToolArgs(event.toolName, event.args)
          } else if (event.type === 'tool_end') {
            if (onToolEnd) onToolEnd(event.toolName, event.result)
          }
        } catch (_) {
          // 跳过无法解析的行
        }
      }
    })

    // 返回 abort 方法供取消使用
    return {
      abort: () => {
        if (task && task.abort) task.abort()
      },
    }
  },

  getHistory({ userId, personaId, limit = 50, offset = 0 }) {
    let path = `/api/chats/${userId}?limit=${limit}&offset=${offset}`
    if (personaId) path += `&persona_id=${personaId}`
    return request('GET', path)
  },

  getModels() {
    return request('GET', '/api/models')
  },

  deleteRecord(id) {
    return request('DELETE', `/api/chats/${id}`)
  },

  // TECH-API-010 D11: 消息评分
  rateMessage(id, rating) {
    return request('PUT', `/api/chats/${id}/rate`, { rating })
  },

  // TECH-API-010 D11: 人格统计
  getPersonaStats(personaId) {
    return request('GET', `/api/personas/${personaId}/stats`)
  },
}

// ArrayBuffer → 字符串（兼容微信小程序环境）
function arrayBufferToString(buffer) {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(new Uint8Array(buffer))
  }
  // 兜底：手动转换
  const bytes = new Uint8Array(buffer)
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i])
  }
  return result
}
