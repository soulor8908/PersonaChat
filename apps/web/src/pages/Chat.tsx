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
            const raw = typeof rec.messages === 'string' ? JSON.parse(rec.messages as string) : rec.messages as Array<{ role: string; content: string }>
            msgs.push(...(raw || []))
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
        onError: (err) => {
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 bg-surface-800 border-b border-surface-700 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-lg">←</button>
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-sm font-bold">{String(persona.name || '?')[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{persona.name as string}</div>
        </div>
        <select value={model} onChange={e => setModel(e.target.value)} className="bg-surface-700 text-xs rounded px-2 py-1 border border-surface-600 text-slate-300">
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.length === 0 && <div className="text-center text-slate-500 py-10">开始对话吧</div>}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${m.role === 'user' ? 'bg-primary-500 text-white' : 'bg-surface-800 border border-surface-700 text-slate-200'}`}>
              <div className="text-sm whitespace-pre-wrap break-words">{m.content || (m.streaming ? '...' : '')}</div>
              {m.toolStatus && <div className="text-xs text-yellow-400 mt-1">{m.toolStatus}</div>}
              {m.role === 'assistant' && !m.streaming && m.recordId && (
                <div className="flex gap-1 mt-1.5 pt-1 border-t border-surface-700">
                  <button onClick={() => rateMessage(m.recordId!, m.userRating === 'like' ? 'dislike' : 'like')}
                    className={`text-xs px-1.5 ${m.userRating === 'like' ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'}`}>👍</button>
                  <button onClick={() => rateMessage(m.recordId!, m.userRating === 'dislike' ? 'like' : 'dislike')}
                    className={`text-xs px-1.5 ${m.userRating === 'dislike' ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'}`}>👎</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 bg-surface-800 border-t border-surface-700 flex-shrink-0">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            className="flex-1 bg-surface-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 border border-surface-600 focus:border-primary-500 outline-none"
            placeholder="输入消息... (Enter 发送)" disabled={loading}
          />
          {loading ? (
            <button onClick={stop} className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg font-medium">停止</button>
          ) : (
            <button onClick={send} disabled={!input.trim()} className="px-4 py-2 bg-primary-500 text-white text-sm rounded-lg font-medium disabled:opacity-40">发送</button>
          )}
        </div>
      </div>
    </div>
  )
}
