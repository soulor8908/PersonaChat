// ── 人格工坊 (TECH-API-014 D15) ──
import { PersonaApi, ChatApi } from '../../api/client.js'

Page({
  data: {
    name: '',
    description: '',
    category: 'custom',
    systemPrompt: '',
    promptLen: 0,
    // 工具选择 (TECH-API-015 D18)
    availableTools: [
      { key: 'calculator', label: '🧮 计算器', checked: false },
      { key: 'current_time', label: '🕐 当前时间', checked: false },
      { key: 'web_search', label: '🔍 网页搜索', checked: false },
    ],
    modelKeys: [],
    modelNames: [],
    currentModel: 0,
    // 预览
    previewMessages: [],
    previewInput: '',
    previewLoading: false,
    submitting: false,
  },

  onLoad() {
    this.loadModels()
  },

  async loadModels() {
    try {
      const res = await ChatApi.getModels()
      if (res.data?.length > 0) {
        this.setData({
          modelKeys: res.data.map(m => m.id),
          modelNames: res.data.map(m => m.name),
        })
      }
    } catch (_e) { void (_e as Error) }
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onDescInput(e) { this.setData({ description: e.detail.value }) },
  onCategoryChange(e) {
    this.setData({ category: this.data.categories?.[e.detail.value]?.key || 'custom' })
  },
  onPromptInput(e) {
    this.setData({ systemPrompt: e.detail.value, promptLen: e.detail.value.length })
  },
  onModelChange(e) {
    this.setData({ currentModel: e.detail.value })
  },

  onPreviewInput(e) {
    this.setData({ previewInput: e.detail.value })
  },

  async onPreviewSend() {
    const text = this.data.previewInput.trim()
    if (!text || this.data.previewLoading || !this.data.systemPrompt) return

    const userMsg = { role: 'user', content: text, id: 'p-' + Date.now() }
    const messages = [...this.data.previewMessages, userMsg]
    this.setData({ previewMessages: messages, previewInput: '', previewLoading: true })

    try {
      const res = await PersonaApi.preview({
        systemPrompt: this.data.systemPrompt,
        messages: [{ role: 'user', content: text }],
        model: this.data.modelKeys[this.data.currentModel],
      })
      const aiMsg = { role: 'assistant', content: res.reply, id: 'p-' + (Date.now() + 1) }
      this.setData({ previewMessages: [...this.data.previewMessages, aiMsg], previewLoading: false })
    } catch (err) {
      wx.showToast({ title: '预览失败', icon: 'none' })
      this.setData({ previewLoading: false })
    }
  },

  onToolToggle(e) {
    const { key } = e.currentTarget.dataset
    const tools = this.data.availableTools.map(t =>
      t.key === key ? { ...t, checked: !t.checked } : t
    )
    this.setData({ availableTools: tools })
  },

  async onSubmit() {
    const { name, description, category, systemPrompt, availableTools } = this.data
    if (!name || !systemPrompt) {
      wx.showToast({ title: '名称和系统提示为必填', icon: 'none' })
      return
    }
    const tools = availableTools.filter(t => t.checked).map(t => t.key)
    this.setData({ submitting: true })
    try {
      const res = await PersonaApi.create({ name, description, category, systemPrompt, tools })
      this.setData({ submitting: false })
      wx.showToast({ title: '创建成功!', icon: 'success' })
      setTimeout(() => {
        wx.navigateTo({ url: `/src/pages/chat/chat?personaId=${res.data.id}` })
      }, 1000)
    } catch (err) {
      wx.showToast({ title: '创建失败', icon: 'none' })
      this.setData({ submitting: false })
    }
  },
})
