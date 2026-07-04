// ── 人格库首页 ──
import { PersonaApi } from '../../api/client.js'

const CATEGORY_LABELS = {
  tech_leader: '科技领袖',
  thinker: '思想家',
  educator: '教育者',
  artist: '艺术家',
  custom: '自定义',
}

Page({
  data: {
    personas: [],
    categories: [
      { key: '', label: '全部' },
      { key: 'tech_leader', label: '科技领袖' },
      { key: 'thinker', label: '思想家' },
      { key: 'educator', label: '教育者' },
    ],
    activeCategory: '',
    searchText: '',
    loading: false,
  },

  onLoad() {
    this.loadPersonas()
  },

  onPullDownRefresh() {
    this.loadPersonas().then(() => wx.stopPullDownRefresh())
  },

  async loadPersonas() {
    this.setData({ loading: true })
    try {
      const res = await PersonaApi.list({
        category: this.data.activeCategory || undefined,
        search: this.data.searchText || undefined,
      })
      const personas = (res.data || []).map((p) => ({
        ...p,
        categoryLabel: CATEGORY_LABELS[p.category] || p.category,
      }))
      this.setData({ personas, loading: false })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value })
    clearTimeout(this._searchTimer)
    this._searchTimer = setTimeout(() => this.loadPersonas(), 500)
  },

  onCategoryTap(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.key })
    this.loadPersonas()
  },

  onPersonaTap(e) {
    wx.navigateTo({ url: `/src/pages/chat/chat?personaId=${e.currentTarget.dataset.id}` })
  },
})
