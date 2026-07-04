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
    modelKeys: ['deepseek-v3', 'glm-4-flash', 'gpt-4o-mini'],
    modelNames: ['DeepSeek V3', 'GLM-4-Flash', 'GPT-4o Mini'],
    currentModel: 0,
    currentModelName: 'DeepSeek V3',
    userId: '',
  },

  onLoad(options) {
    const app = getApp()
    this.setData({ userId: app.globalData.userId })
    this.loadPersona(options.personaId)
    this.loadHistory(options.personaId)
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
    const messages = [...this.data.messages, userMsg]
    this.setData({ messages, inputText: '', loading: true })
    this.scrollToBottom()

    try {
      const res = await ChatApi.send({
        personaId: this.data.persona.id,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        model: this.data.modelKeys[this.data.currentModel],
      })

      const aiMsg = { role: 'assistant', content: res.reply, id: 'msg-' + (Date.now() + 1) }
      this.setData({ messages: [...this.data.messages, aiMsg], loading: false })
      this.scrollToBottom()
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('API key')) {
        wx.showToast({ title: '请先设置 API Key', icon: 'none' })
      } else {
        wx.showToast({ title: '发送失败: ' + msg.slice(0, 30), icon: 'none' })
      }
      this.setData({ loading: false })
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
