import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PersonaApi } from '../api/client'

const TOOLS = [
  { key: 'calculator', label: '🧮 计算器' },
  { key: 'current_time', label: '🕐 当前时间' },
  { key: 'web_search', label: '🔍 网页搜索' },
]

export function Create() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [prompt, setPrompt] = useState('')
  const [tools, setTools] = useState<string[]>([])
  const [previewInput, setPreviewInput] = useState('')
  const [previewMsgs, setPreviewMsgs] = useState<Array<{ role: string; content: string }>>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const toggleTool = (key: string) => {
    setTools(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const preview = async () => {
    const text = previewInput.trim()
    if (!text || previewLoading || !prompt) return
    setPreviewMsgs(prev => [...prev, { role: 'user', content: text }])
    setPreviewInput('')
    setPreviewLoading(true)
    try {
      const res = await PersonaApi.preview({ systemPrompt: prompt, messages: [{ role: 'user', content: text }] })
      setPreviewMsgs(prev => [...prev, { role: 'assistant', content: res.reply }])
    } catch { /* ignore */ }
    setPreviewLoading(false)
  }

  const submit = async () => {
    if (!name || !prompt) return
    setSubmitting(true)
    try {
      const res = await PersonaApi.create({ name, description: desc, category: 'custom', systemPrompt: prompt, tools })
      navigate(`/chat/${res.data.id}`)
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">创建人格</h2>
        <div className="flex flex-col gap-3">
          <input className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm text-white border border-surface-700 focus:border-primary-500 outline-none" placeholder="名称 *" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
          <input className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm text-white border border-surface-700 focus:border-primary-500 outline-none" placeholder="描述" value={desc} onChange={e => setDesc(e.target.value)} maxLength={500} />
          <div>
            <textarea className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm text-white border border-surface-700 focus:border-primary-500 outline-none h-32 resize-none" placeholder="系统提示 * — 定义人格的说话方式..." value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={8000} />
            <div className="text-xs text-slate-500 text-right">{prompt.length}/8000</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1.5">可用工具</div>
            <div className="flex gap-2 flex-wrap">
              {TOOLS.map(t => (
                <button key={t.key} onClick={() => toggleTool(t.key)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${tools.includes(t.key) ? 'bg-primary-500 text-white' : 'bg-surface-800 text-slate-400 border border-surface-700'}`}
                >{t.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {prompt && (
        <div className="border-t border-surface-700 p-4">
          <div className="text-sm font-medium mb-2">💬 预览测试</div>
          <div className="bg-surface-800 rounded-xl p-3 max-h-40 overflow-y-auto mb-2 flex flex-col gap-2">
            {previewMsgs.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === 'user' ? 'text-primary-400' : 'text-slate-300'}`}>
                <span className="text-xs text-slate-500">{m.role === 'user' ? '你' : 'AI'}: </span>{m.content}
              </div>
            ))}
            {previewLoading && <div className="text-sm text-slate-500">...</div>}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 bg-surface-700 rounded-lg px-3 py-1.5 text-sm text-white border border-surface-600 outline-none" placeholder="测试一句话..." value={previewInput}
              onChange={e => setPreviewInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); preview() } }} />
            <button onClick={preview} className="px-3 py-1.5 bg-surface-700 text-sm text-white rounded-lg">发送</button>
          </div>
        </div>
      )}

      <div className="p-4 pt-0">
        <button onClick={submit} disabled={submitting || !name || !prompt}
          className="w-full py-2.5 bg-primary-500 text-white rounded-xl font-medium disabled:opacity-40 transition-opacity"
        >{submitting ? '创建中...' : '🚀 一键发布'}</button>
      </div>
    </div>
  )
}
