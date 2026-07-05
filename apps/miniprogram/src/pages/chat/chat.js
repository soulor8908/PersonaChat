// ── 聊天页 ──
import { PersonaApi, ChatApi } from '../../api/client.js'
import { Storage } from '../../lib/storage.js'

Page({
  data: {
    persona: {},
    messages: [],
    inputText: '',
    loading: false,
    scrollToView: '',
    modelKeys: [],
    modelNames: [],
    currentModel: 0,
    currentModelName: '',
    userId: '',
  },

  onLoad(options) {
    const app = getApp()
    this.setData({ userId: app.globalData.userId })
    this.loadModels()
    this.loadPersona(options.personaId)
    this.loadHistory(options.personaId)
  },

  async loadModels() {
    try {
      const res = await ChatApi.getModels()
      if (res.data?.length > 0) {
        this.setData({
          modelKeys: res.data.map(m => m.id),
          modelNames: res.data.map(m => m.name),
          currentModelName: res.data[0].name,
        })
        return
      }
    } catch (_) {
      console.warn('无法从 API 获取模型列表，使用本地默认')
    }
    // 本地兜底（最小化：API 不可达时提示用户，不硬编码模型列表）
    wx.showToast({ title: '无法加载模型列表', icon: 'none' })
    this.setData({
      modelKeys: [],
      modelNames: [],
      currentModelName: '',
    })
  },

  async loadPersona(id) {
    try {
      const res = await PersonaApi.getById(id)
      this.setData({ persona: res.data })
      wx.setNavigationBarTitle({ title: res.data.name })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadHistory(personaId) {
    try {
      const res = await ChatApi.getHistory({
        userId: this.data.userId,
        personaId,
        limit: 50,
      })
      if (res.data?.length > 0) {
        const historyMessages = []
        res.data.reverse().forEach((record) => {
          const msgs = typeof record.messages === 'string'
            ? JSON.parse(record.messages) : record.messages
          historyMessages.push(...msgs)
          historyMessages.push({
            role: 'assistant',
            content: record.reply,
            id: 'hist-' + record.id,
          })
        })
        this.setData({ messages: historyMessages.slice(-50) })
      }
    } catch (err) {
      wx.showToast({ title: '加载历史失败', icon: 'none' })
      console.error('加载历史失败', err)
    }
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value })
  },

  onModelChange(e) {
    const idx = e.detail.value
    this.setData({ currentModel: idx, currentModelName: this.data.modelNames[idx] })
  },

  async onSend() {
    const text = this.data.inputText.trim()
    if (!text || this.data.loading) return

    const userMsg = { role: 'user', content: text, id: 'msg-' + Date.now() }
    // 预留 AI 占位消息，流式逐字填充
    const aiPlaceholderId = 'msg-' + (Date.now() + 1)
    const aiPlaceholder = { role: 'assistant', content: '', id: aiPlaceholderId, streaming: true }
    const messages = [...this.data.messages, userMsg, aiPlaceholder]
    this.setData({ messages, inputText: '', loading: true })
    this.scrollToBottom()

    // TECH-API-008 D9: 流式发送
    const streamTask = ChatApi.sendStream({
      personaId: this.data.persona.id,
      messages: messages
        .filter(m => m.role !== 'assistant' || !m.streaming) // 不把占位符发给 LLM
        .map(m => ({ role: m.role, content: m.content })),
      model: this.data.modelKeys[this.data.currentModel],
      onDelta: (content) => {
        const updated = this.data.messages.map(m => {
          if (m.id === aiPlaceholderId) {
            return { ...m, content: m.content + content }
          }
          return m
        })
        this.setData({ messages: updated })
        this.scrollToBottom()
      },
      onDone: () => {
        const updated = this.data.messages.map(m => {
          if (m.id === aiPlaceholderId) {
            return { ...m, streaming: false, toolStatus: undefined }
          }
          return m
        })
        this.setData({ messages: updated, loading: false })
      },
      onToolStart: (toolName) => {
        const labels = { calculator: '计算中...', current_time: '获取时间...', web_search: '搜索中...' }
        const updated = this.data.messages.map(m => {
          if (m.id === aiPlaceholderId) {
            return { ...m, toolStatus: `🔧 ${labels[toolName] || toolName}` }
          }
          return m
        })
        this.setData({ messages: updated })
      },
      onToolEnd: () => {
        const updated = this.data.messages.map(m => {
          if (m.id === aiPlaceholderId) {
            return { ...m, toolStatus: undefined }
          }
          return m
        })
        this.setData({ messages: updated })
      },
      onError: (err) => {
        const msg = err.message || ''
        if (msg.includes('API key')) {
          wx.showToast({ title: '请先设置 API Key', icon: 'none' })
        } else {
          wx.showToast({ title: '发送失败: ' + msg.slice(0, 30), icon: 'none' })
        }
        // 保留已接收的部分内容
        const updated = this.data.messages.map(m => {
          if (m.id === aiPlaceholderId) {
            return m.content ? { ...m, streaming: false } : null
          }
          return m
        }).filter(Boolean)
        this.setData({ messages: updated, loading: false })
      },
    })

    // 保存 streamTask 以便后续取消
    this._streamTask = streamTask
  },

  // TECH-API-009 D10: 重新生成（分支）
  async onRegenerate(e) {
    const { recordId } = e.currentTarget.dataset
    if (!recordId || this.data.loading) return

    // 找到该消息在列表中的位置，移除该消息及之后的内容
    const idx = this.data.messages.findIndex(m => String(m.recordId) === String(recordId))
    if (idx < 0) return

    // 保留该消息之前的内容，以及该消息对应的用户输入作为分支起点
    const truncatedMessages = this.data.messages.slice(0, idx)
    // 回溯找到上一个用户消息
    const userMessages = truncatedMessages.filter(m => m.role === 'user')

    const aiPlaceholderId = 'msg-' + (Date.now() + 1)
    const aiPlaceholder = { role: 'assistant', content: '', id: aiPlaceholderId, streaming: true }
    this.setData({
      messages: [...truncatedMessages, aiPlaceholder],
      loading: true,
    })
    this.scrollToBottom()

    const streamTask = ChatApi.sendStream({
      personaId: this.data.persona.id,
      messages: userMessages.map(m => ({ role: m.role, content: m.content })),
      model: this.data.modelKeys[this.data.currentModel],
      parentRecordId: Number(recordId),
      onDelta: (content) => {
        const updated = this.data.messages.map(m => {
          if (m.id === aiPlaceholderId) return { ...m, content: m.content + content }
          return m
        })
        this.setData({ messages: updated })
        this.scrollToBottom()
      },
      onDone: () => {
        const updated = this.data.messages.map(m => {
          if (m.id === aiPlaceholderId) return { ...m, streaming: false }
          return m
        })
        this.setData({ messages: updated, loading: false })
      },
      onError: (err) => {
        wx.showToast({ title: '重新生成失败', icon: 'none' })
        const updated = this.data.messages.map(m => {
          if (m.id === aiPlaceholderId) return m.content ? { ...m, streaming: false } : null
          return m
        }).filter(Boolean)
        this.setData({ messages: updated, loading: false })
      },
    })
  },

  // TECH-API-010 D11: 消息评分
  async onRate(e) {
    const { recordId, rating } = e.currentTarget.dataset
    if (!recordId) return

    try {
      await ChatApi.rateMessage(recordId, rating)
      const updated = this.data.messages.map(m => {
        if (String(m.recordId) === String(recordId)) {
          return { ...m, userRating: rating }
        }
        return m
      })
      this.setData({ messages: updated })
      wx.showToast({ title: rating === 'like' ? '已点赞' : '已点踩', icon: 'none', duration: 1000 })
    } catch (err) {
      wx.showToast({ title: '评分失败', icon: 'none' })
    }
  },

  scrollToBottom() {
    const lastMsg = this.data.messages[this.data.messages.length - 1]
    if (lastMsg) this.setData({ scrollToView: lastMsg.id })
  },

  onUploadTap() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: () => wx.showToast({ title: '文件上传功能开发中', icon: 'none' }),
    })
  },
})
