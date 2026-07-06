// TECH-WEB-005 D44 — Home 页 token 替换硬编码 slate 色
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PersonaApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'tech_leader', label: '科技领袖' },
  { key: 'thinker', label: '思想家' },
  { key: 'educator', label: '教育者' },
]

const SORTS = [
  { key: 'popular', label: '热门' },
  { key: 'recent', label: '最新' },
  { key: 'rated', label: '好评' },
]

interface PersonaItem {
  id: string; name: string; description: string; category: string
  likeRate: number; messageCount: number; tools?: string[]
}

export function Home() {
  const navigate = useNavigate()
  const [hot, setHot] = useState<PersonaItem[]>([])
  const [list, setList] = useState<PersonaItem[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('popular')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await PersonaApi.list({ category: category || undefined, search: search || undefined, sort })
      setList(res.data as unknown as PersonaItem[])
    } catch { /* ignore */ }
    setLoading(false)
  }, [category, search, sort])

  useEffect(() => {
    PersonaApi.listHot().then(r => setHot(r.data as unknown as PersonaItem[])).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex h-full flex-col">
      {/* 搜索 */}
      <div className="p-3">
        <input
          className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 placeholder-surface-400 outline-none focus:border-primary-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
          placeholder="搜索人格..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* 热门推荐 */}
      {hot.length > 0 && (
        <div className="px-3 pb-2">
          <div className="mb-2 text-xs text-surface-500 dark:text-surface-400">🔥 热门推荐</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {hot.map(p => (
              <button key={p.id} onClick={() => navigate(`/chat/${p.id}`)}
                className="w-28 flex-shrink-0 rounded-xl border border-surface-200 bg-surface-50 p-3 text-left transition-colors hover:border-primary-500/50 dark:border-surface-700 dark:bg-surface-800"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">{p.name[0]}</div>
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="mt-1 text-xs text-surface-400">{p.messageCount} 对话 · {Math.round(p.likeRate * 100)}% 好评</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 分类筛选 */}
      <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
        {CATEGORIES.map(c => (
          <button key={c.key}
            onClick={() => { setCategory(c.key); load() }}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors ${category === c.key ? 'bg-primary-500 text-white' : 'border border-surface-200 bg-surface-50 text-surface-400 dark:border-surface-700 dark:bg-surface-800'}`}
          >{c.label}</button>
        ))}
      </div>

      {/* 排序 */}
      <div className="flex gap-1.5 px-3 pb-2">
        {SORTS.map(s => (
          <button key={s.key}
            onClick={() => { setSort(s.key); load() }}
            className={`rounded-full px-2 py-0.5 text-xs transition-colors ${sort === s.key ? 'bg-primary-500/10 text-primary-500' : 'text-surface-500'}`}
          >{s.label}</button>
        ))}
      </div>

      {/* 人格列表 */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {loading && list.length === 0 && (
          <SkeletonList count={3} />
        )}
        {!loading && list.length === 0 && (
          <EmptyState text="暂无数据" icon="🔍" />
        )}
        <div className="flex flex-col gap-2">
          {list.map(p => (
            <button key={p.id} onClick={() => navigate(`/chat/${p.id}`)}
              className="flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-50 p-3 text-left transition-colors hover:border-primary-500/30 dark:border-surface-700 dark:bg-surface-800"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">{p.name[0]}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="truncate text-xs text-surface-400">{p.description || '暂无简介'}</div>
                <div className="mt-1 flex gap-3 text-xs text-surface-500">
                  <span>💬 {p.messageCount}</span>
                  <span>👍 {Math.round(p.likeRate * 100)}%</span>
                  {p.tools && p.tools.length > 0 && <span>🔧 {p.tools.length} 工具</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
