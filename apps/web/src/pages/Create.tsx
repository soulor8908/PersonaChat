// TECH-WEB-006 D45 — Create sticky 双栏布局
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
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row">
      {/* 左栏：表单（桌面端 sticky） */}
      <div className="lg:sticky lg:top-0 lg:h-full lg:overflow-y-auto lg:w-1/2">
        <div className="p-3">
          <h2 className="mb-4 text-lg font-bold">创建人格</h2>
          <div className="flex flex-col gap-3">
            <input className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 placeholder-surface-400 outline-none focus:border-primary-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" placeholder="名称 *" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
            <input className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 placeholder-surface-400 outline-none focus:border-primary-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" placeholder="描述" value={desc} onChange={e => setDesc(e.target.value)} maxLength={500} />
            <div>
              <textarea className="h-32 w-full resize-none rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 placeholder-surface-400 outline-none focus:border-primary-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" placeholder="系统提示 * — 定义人格的说话方式..." value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={8000} />
              <div className="text-right text-xs text-surface-500">{prompt.length}/8000</div>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-surface-500 dark:text-surface-400">可用工具</div>
              <div className="flex flex-wrap gap-2">
                {TOOLS.map(t => (
                  <button key={t.key} onClick={() => toggleTool(t.key)}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${tools.includes(t.key) ? 'bg-primary-500 text-white' : 'border border-surface-300 bg-surface-50 text-surface-400 dark:border-surface-700 dark:bg-surface-800'}`}
                  >{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-3 pt-0">
          <button onClick={submit} disabled={submitting || !name || !prompt}
            className="w-full rounded-xl bg-primary-600 py-2.5 font-medium text-white transition-opacity hover:bg-primary-700 disabled:opacity-40"
          >{submitting ? '创建中...' : '🚀 一键发布'}</button>
        </div>
      </div>

      {/* 右栏：预览（桌面端独立滚动） */}
      {prompt && (
        <div className="border-t border-surface-200 p-3 lg:flex-1 lg:overflow-y-auto lg:border-l lg:border-t-0 dark:border-surface-700">
          <div className="mb-2 text-sm font-medium">💬 预览测试</div>
          <div className="mb-2 flex max-h-60 flex-col gap-2 overflow-y-auto rounded-xl bg-surface-100 p-3 dark:bg-surface-800">
            {previewMsgs.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === 'user' ? 'text-primary-500' : 'text-surface-700 dark:text-surface-300'}`}>
                <span className="text-xs text-surface-400">{m.role === 'user' ? '你' : 'AI'}: </span>{m.content}
              </div>
            ))}
            {previewLoading && <div className="text-sm text-surface-500">...</div>}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 rounded-lg border border-surface-300 bg-surface-100 px-3 py-1.5 text-sm text-surface-900 placeholder-surface-400 outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100" placeholder="测试一句话..." value={previewInput}
              onChange={e => setPreviewInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); preview() } }} />
            <button onClick={preview} className="rounded-lg bg-surface-200 px-3 py-1.5 text-sm text-surface-700 dark:bg-surface-700 dark:text-surface-300">发送</button>
          </div>
        </div>
      )}
    </div>
  )
}
