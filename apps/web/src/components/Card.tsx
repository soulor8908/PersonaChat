// TECH-WEB-D50 — Card 通用容器（children 可选，Spec 偏离 D-3）
import { type ReactNode } from 'react'

interface CardProps {
  children?: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800 ${className}`}
    >
      {children}
    </div>
  )
}
