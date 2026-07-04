// ── 个人设置页 ──
import { Storage } from '../../lib/storage.js'

Page({
  data: {
    builtinModels: [
      { id: 'deepseek-v3', name: 'DeepSeek V3', free: true },
      { id: 'glm-4-flash', name: 'GLM-4-Flash', free: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', free: false },
    ],
    customModels: [],
    showAddModal: false,
    newModel: { name: '', baseUrl: '', apiKey: '' },
  },

  onLoad() {
    this.setData({ customModels: Storage.getModels() })
  },

  onAddModelTap() {
    this.setData({ showAddModal: true, newModel: { name: '', baseUrl: '', apiKey: '' } })
  },

  onCloseModal() {
    this.setData({ showAddModal: false })
  },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`newModel.${field}`]: e.detail.value })
  },

  onSaveModel() {
    const { name, baseUrl, apiKey } = this.data.newModel
    if (!name || !baseUrl || !apiKey) {
      wx.showToast({ title: '请填写完整', icon: 'none' })
      return
    }

    const model = { id: Date.now(), modelName: name, baseUrl, apiKey }
    const models = [...this.data.customModels, model]
    Storage.saveModels(models)
    this.setData({ customModels: models, showAddModal: false })
    wx.showToast({ title: '保存成功', icon: 'success' })
  },

  onDeleteModel(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个模型配置吗？',
      success: (res) => {
        if (res.confirm) {
          const models = this.data.customModels.filter((m) => m.id !== id)
          Storage.saveModels(models)
          this.setData({ customModels: models })
        }
      },
    })
  },
})
