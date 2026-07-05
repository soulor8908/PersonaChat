// ── 人格库首页 (TECH-API-013 D14: 市场版) ──
import { PersonaApi } from '../../api/client.js'

const CATEGORY_LABELS = {
  tech_leader: '科技领袖',
  thinker: '思想家',
  educator: '教育者',
  artist: '艺术家',
  custom: '自定义',
}

const SORT_OPTIONS = [
  { key: 'popular', label: '热门' },
  { key: 'recent', label: '最新' },
  { key: 'rated', label: '最多互动' },
]

Page({
  data: {
    personas: [],
    hotPersonas: [],          // 热门推荐
    categories: [
      { key: '', label: '全部' },
      { key: 'tech_leader', label: '科技领袖' },
      { key: 'thinker', label: '思想家' },
      { key: 'educator', label: '教育者' },
    ],
    sortOptions: SORT_OPTIONS,
    activeCategory: '',
    activeSort: 'popular',
    searchText: '',
    loading: false,
  },

  onLoad() {
    this.loadPersonas()
    this.loadHot()
  },

  onPullDownRefresh() {
    Promise.all([this.loadPersonas(), this.loadHot()]).then(() => wx.stopPullDownRefresh())
  },

  // R11-D1: 热门推荐 — wx:if 守卫提升性能
  async loadHot() {
    try {
      const res = await PersonaApi.listHot()
      this.setData({ hotPersonas: res.data || [] })
    } catch (_e) { /* catch silently */ }
  },

  async loadPersonas() {
    this.setData({ loading: true })
    try {
      const res = await PersonaApi.list({
        category: this.data.activeCategory || undefined,
        search: this.data.searchText || undefined,
        sort: this.data.activeSort,
      })
      const personas = (res.data || []).map((p) => ({
        ...p,
        categoryLabel: CATEGORY_LABELS[p.category] || p.category,
        likePercent: Math.round((p.likeRate || 0) * 100),
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

  // R11-D2: 排序 — 活动态高亮
  onSortTap(e) {
    this.setData({ activeSort: e.currentTarget.dataset.key })
    this.loadPersonas()
  },

  onPersonaTap(e) {
    wx.navigateTo({ url: `/src/pages/chat/chat?personaId=${e.currentTarget.dataset.id}` })
  },

  // R11-D1: 创建入口 — 全宽渐变按钮
  onCreateTap() {
    wx.navigateTo({ url: '/src/pages/create/create' })
  },
})
