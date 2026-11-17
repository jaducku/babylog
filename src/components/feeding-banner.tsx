import { Square } from 'lucide-react'
import { toast } from 'sonner'

import { MemberChip } from '@/components/member-chip'
import { actions, liveFeedingSec, useCurrent } from '@/data/store'
import { useNow } from '@/hooks/use-now'
import { duration, hhmm, minutes } from '@/lib/format'
import { cn } from '@/lib/utils'

/** 진행 중인 모유 수유. 가족 누구의 화면에도 똑같이 보인다. */
export function FeedingBanner() {
  const { state } = useCurrent()
  const af = state.activeFeeding
  const now = useNow(1000)
  if (!af) return null

  const live = liveFeedingSec(af, now)
  const total = live.left + live.right
  const starter = state.members.find((m) => m.id === af.startedBy)

  const stop = () => {
    const rec = actions.stopFeeding()
    if (rec && rec.kind === 'feed') {
      toast(`모유 ${minutes((rec.leftSec ?? 0) + (rec.rightSec ?? 0))}분 기록했어요`)
    } else {
      toast('너무 짧아서 기록하지 않았어요')
    }
  }

  return (
    <section className="relative overflow-hidden rounded-xl border border-feed/40 bg-feed-soft/60 dark:bg-feed-soft">
      <div className="flex items-center justify-between px-4 pt-3.5">
        <div className="flex items-center gap-2 text-[13px] font-medium text-feed">
          <span className="relative flex size-2">
            {af.side && <span className="absolute inline-flex size-full animate-ping rounded-full bg-feed opacity-60" />}
            <span className="relative inline-flex size-2 rounded-full bg-feed" />
          </span>
          {af.side ? '모유 수유 중' : '잠시 멈춤'}
          <span className="font-normal text-muted-foreground">· {hhmm(af.startedAt)} 시작</span>
        </div>
        <MemberChip member={starter} />
      </div>

      <div className="tnum px-4 pt-1 text-[40px] leading-tight font-semibold tracking-tight">
        {duration(total)}
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 p-3 pt-2">
        {(['left', 'right'] as const).map((side) => {
          const on = af.side === side
          return (
            <button
              key={side}
              type="button"
              onClick={() => actions.toggleFeedingSide(side)}
              className={cn(
                'flex h-14 flex-col items-start justify-center rounded-lg border px-3 text-left transition-colors',
                on ? 'border-foreground bg-foreground text-background' : 'border-transparent bg-card',
              )}
            >
              <span className="text-[12px] opacity-75">
                {side === 'left' ? '왼쪽' : '오른쪽'}
                {on ? ' · 누르면 멈춤' : ''}
              </span>
              <span className="tnum text-[17px] font-semibold">{duration(side === 'left' ? live.left : live.right)}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={stop}
          className="flex h-14 w-16 flex-col items-center justify-center gap-0.5 rounded-lg bg-card text-[12px] font-medium"
        >
          <Square className="size-4 fill-current" />
          끝
        </button>
      </div>
    </section>
  )
}
