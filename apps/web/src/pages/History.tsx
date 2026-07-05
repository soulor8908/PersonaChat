import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatApi } from '../api/client'
import { LoadingSkeleton, EmptyState } from '../components/LoadingSkeleton'

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
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      <h2 className="mb-3 text-lg font-bold">对话历史</h2>
      {loading && <LoadingSkeleton />}
      {!loading && groups.length === 0 && <EmptyState text="暂无对话记录" icon="💬" />}
      <div className="flex flex-col gap-2">
        {groups.map(g => (
          <div key={g.personaId} className="overflow-hidden rounded-xl border border-surface-700 bg-surface-800">
            <button onClick={() => toggle(g.personaId)}
              className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-surface-700/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-bold">{g.personaName[0] || '?'}</div>
              <div className="flex-1 text-sm font-medium">{g.personaName}</div>
              <div className="text-xs text-slate-400">{g.records.length} 条</div>
              <span className="text-xs text-slate-400">{expanded.has(g.personaId) ? '▲' : '▼'}</span>
            </button>
            {expanded.has(g.personaId) && (
              <div className="border-t border-surface-700">
                {g.records.map(r => (
                  <button key={r.id} onClick={() => navigate(`/chat/${r.personaId}`)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-700/30"
                  >
                    <span className="flex-1 truncate text-sm text-slate-300">{r.reply || '(空)'}</span>
                    <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
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
