// ── 类型安全的 API 客户端 ──
// 微信小程序 HTTP 封装，所有端点集中在此

const BASE_URL = 'https://persona-chat-api.470033918.workers.dev'  // 生产环境

async function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${path}`,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
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
}

// ── 聊天 API ──
export const ChatApi = {
  send({ personaId, messages, model, apiKey }) {
    return request('POST', '/api/chats', { personaId, messages, model, apiKey })
  },

  getHistory({ userId, personaId, limit = 50, offset = 0 }) {
    let path = `/api/chats/${userId}?limit=${limit}&offset=${offset}`
    if (personaId) path += `&persona_id=${personaId}`
    return request('GET', path)
  },
}
