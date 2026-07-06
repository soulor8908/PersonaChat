// TECH-WEB-005 D44 — Chat 输入区色调 token 替换硬编码
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PersonaApi, ChatApi, sendStream } from '../api/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  recordId?: string
  userRating?: string
  toolStatus?: string
}

export function ChatPage() {
  const { personaId } = useParams<{ personaId: string }>()
  const navigate = useNavigate()
  const [persona, setPersona] = useState<Record<string, unknown>>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([])
  const [model, setModel] = useState('deepseek-v3')
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (personaId) {
      PersonaApi.getById(personaId).then(r => setPersona(r.data))
      ChatApi.getHistory({ userId: 'anonymous', persona_id: personaId, limit: 50 })
        .then(r => {
          const msgs: Message[] = []
          ;(r.data || []).reverse().forEach((rec: Record<string, unknown>) => {
            const raw: Array<{ role: string; content: string }> = typeof rec.messages === 'string'
              ? JSON.parse(rec.messages as string)
              : (rec.messages as Array<{ role: string; content: string }>) || []
            msgs.push(...raw.map(m => ({ id: 'h-' + rec.id, role: m.role as Message['role'], content: m.content })))
            msgs.push({ id: 'h-' + rec.id, role: 'assistant', content: rec.reply as string, recordId: String(rec.id) })
          })
          setMessages(msgs.slice(-50))
        }).catch(() => {})
    }
    ChatApi.getModels().then(r => {
      setModels(r.data); if (r.data[0]) setModel(r.data[0].id)
    }).catch(() => {})
  }, [personaId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading || !personaId) return
    const userMsg: Message = { id: 'u-' + Date.now(), role: 'user', content: text }
    const aiId = 'a-' + Date.now() + 1
    const aiPlaceholder: Message = { id: aiId, role: 'assistant', content: '', streaming: true }
    setMessages(prev => [...prev, userMsg, aiPlaceholder])
    setInput('')
    setLoading(true)

    const allMsgs = [...messages, userMsg]
    const controller = await sendStream(
      {
        personaId,
        messages: allMsgs.map(m => ({ role: m.role, content: m.content })),
        model,
      },
      {
        onDelta: (content) => {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content + content } : m))
        },
        onDone: () => {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false, toolStatus: undefined } : m))
          setLoading(false)
          abortRef.current = null
        },
        onError: () => {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content || '(发送失败)', streaming: false } : m))
          setLoading(false)
        },
        onToolStart: (toolName) => {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, toolStatus: `🔧 ${toolName}...` } : m))
        },
        onToolEnd: () => {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, toolStatus: undefined } : m))
        },
      }
    )
    abortRef.current = controller
  }, [input, loading, personaId, messages, model])

  const stop = () => { abortRef.current?.abort(); setLoading(false) }

  const rateMessage = async (msgId: string, rating: string) => {
    try { await ChatApi.rateMessage(msgId, rating) } catch { /* ignore */ }
    setMessages(prev => prev.map(m => m.recordId === msgId ? { ...m, userRating: rating } : m))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-900">
        <button onClick={() => navigate(-1)} className="text-lg text-surface-400">←</button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">{String(persona.name || '?')[0]}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{persona.name as string}</div>
        </div>
        <select value={model} onChange={e => setModel(e.target.value)} className="rounded border border-surface-300 bg-surface-100 px-2 py-1 text-xs text-surface-700 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300">
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.length === 0 && <div className="py-10 text-center text-surface-500">开始对话吧</div>}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${m.role === 'user' ? 'bg-primary-500 text-white' : 'border border-surface-200 bg-surface-100 text-surface-800 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200'}`}>
              <div className="whitespace-pre-wrap break-words text-sm">{m.content || (m.streaming ? '...' : '')}</div>
              {m.toolStatus && <div className="mt-1 text-xs text-semantic-warning">{m.toolStatus}</div>}
              {m.role === 'assistant' && !m.streaming && m.recordId && (
                <div className="mt-1.5 flex gap-1 border-t border-surface-200 pt-1 dark:border-surface-700">
                  <button onClick={() => rateMessage(m.recordId!, m.userRating === 'like' ? 'dislike' : 'like')}
                    className={`px-1.5 text-xs ${m.userRating === 'like' ? 'text-primary-400' : 'text-surface-500 hover:text-surface-300'}`}>👍</button>
                  <button onClick={() => rateMessage(m.recordId!, m.userRating === 'dislike' ? 'like' : 'dislike')}
                    className={`px-1.5 text-xs ${m.userRating === 'dislike' ? 'text-semantic-danger' : 'text-surface-500 hover:text-surface-300'}`}>👎</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-900">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            className="flex-1 rounded-lg border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-900 placeholder-surface-400 outline-none focus:border-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
            placeholder="输入消息... (Enter 发送)" disabled={loading}
          />
          {loading ? (
            <button onClick={stop} className="rounded-lg bg-semantic-danger px-4 py-2 text-sm font-medium text-white hover:opacity-80">停止</button>
          ) : (
            <button onClick={send} disabled={!input.trim()} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40">发送</button>
          )}
        </div>
      </div>
    </div>
  )
}
