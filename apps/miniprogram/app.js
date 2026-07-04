// ── 小程序入口 ──
import { Storage } from './src/lib/storage.js'

App({
  globalData: {
    apiBase: 'https://persona-chat-api.470033918.workers.dev',
    userId: 'user_' + Date.now(),
    currentPersona: null,
  },

  onLaunch() {
    const savedModels = Storage.getModels()
    if (savedModels.length > 0) {
      this.globalData.customModels = savedModels
    }
  },
})
