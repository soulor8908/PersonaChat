// TECH-WEB-008 D47 — Profile ThemeToggle + API Key 表单 token
import { useState, useEffect } from 'react'
import { ChatApi } from '../api/client'
import { ThemeToggle } from '../components/ThemeToggle'

export function Profile() {
  const [apiKey, setApiKey] = useState('')
  const [models, setModels] = useState<Array<{ id: string; name: string; free: boolean }>>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setApiKey(localStorage.getItem('api_key') || '')
    ChatApi.getModels().then(r => setModels(r.data)).catch(() => {})
  }, [])

  const saveKey = () => {
    localStorage.setItem('api_key', apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      <h2 className="mb-4 text-lg font-bold">设置</h2>

      {/* 主题切换 */}
      <div className="mb-5">
        <div className="mb-2 text-sm font-medium">外观主题</div>
        <ThemeToggle />
      </div>

      <div className="mb-5">
        <div className="mb-2 text-sm font-medium">API Key</div>
        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
          className="mb-2 w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 placeholder-surface-400 outline-none focus:border-primary-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
          placeholder="输入 API Key (x-api-key)"
        />
        <button onClick={saveKey}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${saved ? 'bg-semantic-success text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
        >{saved ? '已保存 ✓' : '保存'}</button>
        <div className="mt-1 text-xs text-surface-500">用于访问 PersonaChat API 的认证密钥</div>
      </div>

      <div className="mb-5">
        <div className="mb-2 text-sm font-medium">可用模型</div>
        <div className="flex flex-col gap-2">
          {models.map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 dark:border-surface-700 dark:bg-surface-800">
              <div>
                <div className="text-sm">{m.name}</div>
                <div className="text-xs text-surface-500">{m.id}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${m.free ? 'bg-semantic-success/20 text-semantic-success' : 'bg-semantic-warning/20 text-semantic-warning'}`}>{m.free ? '免费' : '付费'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto py-4 text-center text-xs text-surface-500">
        PersonaChat v2.0 — AI Native 聊天系统模板
      </div>
    </div>
  )
}
