// ── 对话历史页 ──
import { ChatApi } from '../../api/client.js'

const PAGE_SIZE = 20

Page({
  data: {
    chatGroups: [],
    expandedGroup: '',
    loading: false,
    hasMore: true,
    offset: 0,
  },

  onLoad() {
    this.loadChats()
  },

  onPullDownRefresh() {
    this.setData({ offset: 0, chatGroups: [], hasMore: true })
    this.loadChats().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadChats()
    }
  },

  async loadChats() {
    if (this.data.loading) return
    this.setData({ loading: true })
    const app = getApp()
    try {
      const res = await ChatApi.getHistory({
        userId: app.globalData.userId,
        limit: PAGE_SIZE,
        offset: this.data.offset,
      })
      const newChats = res.data || []
      const groups = { ...this._buildGroups(this.data.chatGroups) }

      newChats.forEach((chat) => {
        const key = chat.personaId
        if (!groups[key]) {
          // R11-D6: personaName || personaId 降级 (TECH-API-003 D4)
          groups[key] = { personaId: key, personaName: chat.personaName || key, count: 0, chats: [] }
        }
        groups[key].count++
        groups[key].chats.push({
          ...chat,
          createdAtFormatted: this.formatTime(chat.createdAt),
        })
      })

      this.setData({
        chatGroups: Object.values(groups),
        loading: false,
        offset: this.data.offset + newChats.length,
        hasMore: newChats.length === PAGE_SIZE,
      })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  _buildGroups(existingGroups) {
    const groups = {}
    existingGroups.forEach((g) => {
      groups[g.personaId] = { ...g }
    })
    return groups
  },

  async deleteChat(id) {
    try {
      await ChatApi.deleteRecord(id)
      // 从本地状态移除
      const groups = this.data.chatGroups.map((group) => ({
        ...group,
        chats: group.chats.filter((c) => c.id !== id),
        count: group.chats.length - 1,
      })).filter((g) => g.chats.length > 0)
      this.setData({ chatGroups: groups })
      wx.showToast({ title: '已删除', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' })
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
