// TECH-WEB-004 D43 — EmptyState opacity-60 + 双主题 token
export function EmptyState({ text, icon = '📭' }: { text: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10">
      <div className="text-3xl opacity-60">{icon}</div>
      <div className="text-sm text-surface-500 dark:text-surface-400">{text}</div>
    </div>
  )
}
