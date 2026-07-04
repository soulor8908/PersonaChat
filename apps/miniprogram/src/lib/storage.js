// ── 本地存储封装 ──

const KEYS = {
  USER_MODELS: 'user_models',
  PREFERRED_MODEL: 'preferred_model',
  CHAT_HISTORY_CACHE: 'chat_history_cache',
}

export const Storage = {
  getModels() {
    return wx.getStorageSync(KEYS.USER_MODELS) || []
  },

  saveModels(models) {
    wx.setStorageSync(KEYS.USER_MODELS, models)
  },

  getPreferredModel() {
    return wx.getStorageSync(KEYS.PREFERRED_MODEL) || 'deepseek-v3'
  },

  setPreferredModel(model) {
    wx.setStorageSync(KEYS.PREFERRED_MODEL, model)
  },
}
