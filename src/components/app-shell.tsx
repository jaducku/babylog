import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, HeartPulse, LineChart, Users } from 'lucide-react'

import { cn } from '@/lib/utils'

const TABS = [
  { to: '/', label: '오늘', icon: CalendarDays },
  { to: '/growth', label: '성장', icon: LineChart },
  { to: '/hospital', label: '병원', icon: HeartPulse },
  { to: '/family', label: '가족', icon: Users },
]

export function AppShell() {
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <main>
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t bg-background/95 pb-safe backdrop-blur">
        <ul className="grid h-14 grid-cols-4">
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  cn(
                    'flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground/70',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="size-[22px]" strokeWidth={isActive ? 2.2 : 1.7} />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
