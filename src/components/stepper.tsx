import { Minus, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

/** 큰 숫자 + 좌우 버튼. 새벽에 한 손으로 조절하기 쉽게. */
export function Stepper({
  value,
  onChange,
  step = 10,
  min = 0,
  max = 999,
  unit,
  className,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  unit: string
  className?: string
}) {
  const btn =
    'flex size-12 items-center justify-center rounded-full border bg-card active:bg-accent disabled:opacity-40'
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        aria-label={`${step} 줄이기`}
      >
        <Minus className="size-5" />
      </button>
      <div className="flex items-baseline gap-1">
        <span className="tnum text-[44px] leading-none font-semibold tracking-tight">{value}</span>
        <span className="text-base text-muted-foreground">{unit}</span>
      </div>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        aria-label={`${step} 늘리기`}
      >
        <Plus className="size-5" />
      </button>
    </div>
  )
}
