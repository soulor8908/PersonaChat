import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PersonaApi } from '../api/client'

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'tech_leader', label: '科技领袖' },
  { key: 'thinker', label: '思想家' },
  { key: 'educator', label: '教育者' },
]

const SORTS = [
  { key: 'popular', label: '热门' },
  { key: 'recent', label: '最新' },
  { key: 'rated', label: '最多互动' },
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
    <div className="flex flex-col h-full">
      {/* 搜索 */}
      <div className="p-3">
        <input
          className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 border border-surface-700 focus:border-primary-500 outline-none"
          placeholder="搜索人格..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* 热门推荐 */}
      {hot.length > 0 && (
        <div className="px-3 pb-2">
          <div className="text-xs text-slate-400 mb-2">🔥 热门推荐</div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {hot.map(p => (
              <button key={p.id} onClick={() => navigate(`/chat/${p.id}`)}
                className="flex-shrink-0 w-28 bg-surface-800 rounded-xl p-3 border border-surface-700 hover:border-primary-500/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center text-lg font-bold mb-2">{p.name[0]}</div>
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-xs text-slate-400 mt-1">{p.messageCount} 对话 · {Math.round(p.likeRate * 100)}% 好评</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 分类筛选 */}
      <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto">
        {CATEGORIES.map(c => (
          <button key={c.key}
            onClick={() => { setCategory(c.key); load() }}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${category === c.key ? 'bg-primary-500 text-white' : 'bg-surface-800 text-slate-400 border border-surface-700'}`}
          >{c.label}</button>
        ))}
      </div>

      {/* 排序 */}
      <div className="flex gap-1.5 px-3 pb-2">
        {SORTS.map(s => (
          <button key={s.key}
            onClick={() => { setSort(s.key); load() }}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${sort === s.key ? 'text-primary-500' : 'text-slate-500'}`}
          >{s.label}</button>
        ))}
      </div>

      {/* 人格列表 */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {loading && list.length === 0 && (
          <div className="text-center text-slate-500 py-10">加载中...</div>
        )}
        {!loading && list.length === 0 && (
          <div className="text-center text-slate-500 py-10">暂无数据</div>
        )}
        <div className="flex flex-col gap-2">
          {list.map(p => (
            <button key={p.id} onClick={() => navigate(`/chat/${p.id}`)}
              className="flex items-center gap-3 bg-surface-800 rounded-xl p-3 border border-surface-700 hover:border-primary-500/30 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">{p.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-xs text-slate-400 truncate">{p.description || '暂无简介'}</div>
                <div className="flex gap-3 mt-1 text-xs text-slate-500">
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
