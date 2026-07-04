// ── 对话历史页 ──
import { ChatApi } from '../../api/client.js'

Page({
  data: {
    chatGroups: [],
    expandedGroup: '',
    loading: false,
  },

  onLoad() {
    this.loadChats()
  },

  async loadChats() {
    this.setData({ loading: true })
    const app = getApp()
    try {
      const res = await ChatApi.getHistory({ userId: app.globalData.userId })
      const groups = {}
      ;(res.data || []).forEach((chat) => {
        if (!groups[chat.personaId]) {
          groups[chat.personaId] = {
            personaId: chat.personaId,
            personaName: chat.personaId,
            count: 0,
            chats: [],
          }
        }
        groups[chat.personaId].count++
        groups[chat.personaId].chats.push({
          ...chat,
          createdAtFormatted: this.formatTime(chat.createdAt),
        })
      })
      this.setData({ chatGroups: Object.values(groups), loading: false })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  formatTime(ts) {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  onGroupTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ expandedGroup: this.data.expandedGroup === id ? '' : id })
  },

  onChatTap(e) {
    wx.navigateTo({ url: `/src/pages/chat/chat?personaId=${e.currentTarget.dataset.persona}` })
  },
})
