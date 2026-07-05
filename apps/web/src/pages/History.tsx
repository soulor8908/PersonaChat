import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatApi } from '../api/client'

interface ChatGroup {
  personaId: string
  personaName: string
  records: Array<{ id: number; reply: string; createdAt: number; personaId: string }>
}

export function History() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<ChatGroup[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ChatApi.getHistory({ userId: 'anonymous', limit: 200, offset: 0 })
      .then(r => {
        const data = r.data as Array<Record<string, unknown>>
        // 按 personaId 分组
        const map = new Map<string, ChatGroup>()
        for (const item of data) {
          const pid = item.persona_id as string
          if (!map.has(pid)) map.set(pid, { personaId: pid, personaName: pid, records: [] })
          map.get(pid)!.records.push({
            id: item.id as number,
            reply: (item.reply as string).slice(0, 50),
            createdAt: item.created_at as number,
            personaId: pid,
          })
        }
        setGroups(Array.from(map.values()))
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [])

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3">
      <h2 className="text-lg font-bold mb-3">对话历史</h2>
      {loading && <div className="text-center text-slate-500 py-10">加载中...</div>}
      {!loading && groups.length === 0 && <div className="text-center text-slate-500 py-10">暂无对话记录</div>}
      <div className="flex flex-col gap-2">
        {groups.map(g => (
          <div key={g.personaId} className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
            <button onClick={() => toggle(g.personaId)}
              className="w-full flex items-center gap-2 p-3 text-left hover:bg-surface-700/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-sm font-bold">{g.personaName[0] || '?'}</div>
              <div className="flex-1 text-sm font-medium">{g.personaName}</div>
              <div className="text-xs text-slate-400">{g.records.length} 条</div>
              <span className="text-slate-400 text-xs">{expanded.has(g.personaId) ? '▲' : '▼'}</span>
            </button>
            {expanded.has(g.personaId) && (
              <div className="border-t border-surface-700">
                {g.records.map(r => (
                  <button key={r.id} onClick={() => navigate(`/chat/${r.personaId}`)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-700/30 transition-colors text-left"
                  >
                    <span className="text-sm text-slate-300 flex-1 truncate">{r.reply || '(空)'}</span>
                    <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
