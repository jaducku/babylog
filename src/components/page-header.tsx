import type { ReactNode } from 'react'

export function PageHeader({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pt-[calc(env(safe-area-inset-top)+20px)]">
      <div>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-[14px] text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </header>
  )
}
