import { useState, useEffect } from 'react'
import { ChatApi } from '../api/client'

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

      <div className="mb-5">
        <div className="mb-2 text-sm font-medium">API Key</div>
        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
          className="mb-2 w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-primary-500"
          placeholder="输入 API Key (x-api-key)"
        />
        <button onClick={saveKey}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-primary-500 text-white'}`}
        >{saved ? '已保存 ✓' : '保存'}</button>
        <div className="mt-1 text-xs text-slate-500">用于访问 PersonaChat API 的认证密钥</div>
      </div>

      <div className="mb-5">
        <div className="mb-2 text-sm font-medium">可用模型</div>
        <div className="flex flex-col gap-2">
          {models.map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-surface-700 bg-surface-800 px-3 py-2">
              <div>
                <div className="text-sm">{m.name}</div>
                <div className="text-xs text-slate-500">{m.id}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${m.free ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{m.free ? '免费' : '付费'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto py-4 text-center text-xs text-slate-500">
        PersonaChat v2.0 — AI Native 聊天系统模板
      </div>
    </div>
  )
}
