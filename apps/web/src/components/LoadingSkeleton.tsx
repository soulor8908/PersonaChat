// ── 加载骨架屏 + 空状态组件 ──

export function LoadingSkeleton({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      <div className="text-sm text-slate-500">{text}</div>
    </div>
  )
}

export function EmptyState({ text, icon = '📭' }: { text: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10">
      <div className="text-3xl opacity-30">{icon}</div>
      <div className="text-sm text-slate-500">{text}</div>
    </div>
  )
}
