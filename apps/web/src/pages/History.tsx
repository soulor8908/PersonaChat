// TECH-WEB-007 D46 — History 时间分组 (今天/昨天/本周/更早)
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'

interface ChatRecord {
  id: number
  reply: string
  createdAt: number
  personaId: string
  personaName: string
}

interface TimeGroup {
  label: string
  records: ChatRecord[]
}

function getTimeGroups(records: ChatRecord[]): TimeGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const weekAgo = today - 7 * 86400000

  const groups: Record<string, ChatRecord[]> = {
    '今天': [],
    '昨天': [],
    '本周': [],
    '更早': [],
  }

  for (const r of records) {
    if (r.createdAt >= today) groups['今天'].push(r)
    else if (r.createdAt >= yesterday) groups['昨天'].push(r)
    else if (r.createdAt >= weekAgo) groups['本周'].push(r)
    else groups['更早'].push(r)
  }

  return Object.entries(groups)
    .filter(([, recs]) => recs.length > 0)
    .map(([label, recs]) => ({ label, records: recs }))
}

export function History() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<TimeGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ChatApi.getHistory({ userId: 'anonymous', limit: 200, offset: 0 })
      .then(r => {
        const data = r.data as Array<Record<string, unknown>>
        const records: ChatRecord[] = data.map(item => ({
          id: item.id as number,
          reply: (item.reply as string).slice(0, 50),
          createdAt: item.created_at as number,
          personaId: item.persona_id as string,
          personaName: (item.persona_name as string) || (item.persona_id as string),
        }))
        records.sort((a, b) => b.createdAt - a.createdAt)
        setGroups(getTimeGroups(records))
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      <h2 className="mb-3 text-lg font-bold">对话历史</h2>
      {loading && <SkeletonList count={3} />}
      {!loading && groups.length === 0 && <EmptyState text="暂无对话记录" icon="💬" />}
      <div className="flex flex-col gap-4">
        {groups.map(g => (
          <div key={g.label}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
              {g.label} <span className="font-normal">({g.records.length})</span>
            </div>
            <div className="flex flex-col gap-2">
              {g.records.map(r => (
                <button key={r.id} onClick={() => navigate(`/chat/${r.personaId}`)}
                  className="flex w-full items-center gap-2 rounded-xl border border-surface-200 bg-surface-50 p-3 text-left transition-colors hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:hover:bg-surface-700"
                >
                  <span className="flex-1 truncate text-sm text-surface-700 dark:text-surface-300">{r.reply || '(空)'}</span>
                  <span className="text-xs text-surface-400">{new Date(r.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
