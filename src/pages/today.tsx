import { useMemo, useState } from 'react'
import { addDays, isSameDay, isToday, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { FeedingBanner } from '@/components/feeding-banner'
import { KIND_META } from '@/components/kind'
import { MemberChip } from '@/components/member-chip'
import { useRecordSheet } from '@/components/record-sheet'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { actions, useCurrent } from '@/data/store'
import type { BabyRecord, DiaperRecord, FeedRecord } from '@/data/types'
import { useNow } from '@/hooks/use-now'
import {
  ageLabel,
  babyAge,
  dayLabel,
  hhmm,
  minutes,
  nextMilestone,
  recordDetail,
  recordTitle,
  sinceParts,
} from '@/lib/format'
import { cn } from '@/lib/utils'

export function TodayPage() {
  const { baby, state } = useCurrent()
  const [day, setDay] = useState(() => startOfDay(new Date()))
  const now = useNow()

  const records = useMemo(
    () =>
      state.records
        .filter((r) => r.babyId === baby?.id)
        .sort((a, b) => b.at.localeCompare(a.at)),
    [state.records, baby?.id],
  )

  const dayRecords = useMemo(() => records.filter((r) => isSameDay(new Date(r.at), day)), [records, day])

  if (!baby) return null
  const age = babyAge(baby.birthDate)
  const milestone = nextMilestone(baby.birthDate)
  const label = dayLabel(day)

  return (
    <div className="flex flex-col gap-5 pb-40">
      {/* 머리말 */}
      <header className="flex items-end justify-between px-5 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">{baby.name}</h1>
          <p className="tnum mt-0.5 text-[14px] text-muted-foreground">
            <span className="font-semibold text-foreground">{age.dayCount}일째</span>
            <span className="mx-1.5 text-border">|</span>
            {ageLabel(baby.birthDate)}
            {milestone && (
              <>
                <span className="mx-1.5 text-border">|</span>
                {milestone.label}까지 {milestone.left}일
              </>
            )}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4">
        <FeedingBanner />
        <SinceStrip records={records} now={now} />
      </div>

      {/* 날짜 이동 */}
      <section className="flex flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-2 py-1.5 backdrop-blur-sm">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full active:bg-accent"
            onClick={() => setDay((d) => addDays(d, -1))}
            aria-label="이전 날"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" className="flex items-baseline gap-2" onClick={() => setDay(startOfDay(new Date()))}>
            <span className="text-[16px] font-semibold">{label.title}</span>
            <span className="text-[13px] text-muted-foreground">{label.sub}</span>
          </button>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full active:bg-accent disabled:opacity-30"
            onClick={() => setDay((d) => addDays(d, 1))}
            disabled={isToday(day)}
            aria-label="다음 날"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <DaySummary records={dayRecords} />
        <Timeline records={dayRecords} all={records} />
      </section>

      <QuickBar records={records} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────

function SinceStrip({ records, now }: { records: BabyRecord[]; now: number }) {
  const lastFeed = records.find((r) => r.kind === 'feed')
  const lastPee = records.find((r) => r.kind === 'diaper' && r.pee)
  const lastPoo = records.find((r) => r.kind === 'diaper' && r.poo)

  const cells = [
    { label: '수유', rec: lastFeed, kind: 'feed' as const },
    { label: '소변', rec: lastPee, kind: 'diaper' as const },
    { label: '대변', rec: lastPoo, kind: 'diaper' as const },
  ]

  return (
    <div className="grid grid-cols-3 divide-x rounded-xl border bg-card">
      {cells.map((c) => {
        const s = c.rec ? sinceParts(c.rec.at, now) : null
        return (
          <div key={c.label} className="flex flex-col gap-1 px-3.5 py-3">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span className={cn('size-1.5 rounded-full', KIND_META[c.kind].dot)} />
              마지막 {c.label}
            </span>
            {s ? (
              <span className="tnum flex items-baseline">
                {s.map(([n, u]) => (
                  <span key={u} className="flex items-baseline">
                    <span className="text-[22px] leading-none font-semibold tracking-tight">{n}</span>
                    <span className="mr-1 text-[12px] text-muted-foreground">{u}</span>
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-[15px] leading-6 text-muted-foreground">—</span>
            )}
            {c.rec && <span className="tnum text-[11px] text-muted-foreground">전 · {hhmm(c.rec.at)}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────

function DaySummary({ records }: { records: BabyRecord[] }) {
  const feeds = records.filter((r): r is FeedRecord => r.kind === 'feed')
  const diapers = records.filter((r): r is DiaperRecord => r.kind === 'diaper')
  const ml = feeds.reduce((s, r) => s + (r.method !== 'breast' && r.method !== 'solid' ? r.amountMl ?? 0 : 0), 0)
  const breastMin = minutes(feeds.reduce((s, r) => s + (r.leftSec ?? 0) + (r.rightSec ?? 0), 0))

  const items = [
    { k: '수유', v: feeds.length, u: '회' },
    { k: '분유·유축', v: ml, u: 'ml' },
    { k: '모유', v: breastMin, u: '분' },
    { k: '소변', v: diapers.filter((d) => d.pee).length, u: '회' },
    { k: '대변', v: diapers.filter((d) => d.poo).length, u: '회' },
  ]

  return (
    <dl className="grid grid-cols-5 border-b px-2 py-3">
      {items.map((i) => (
        <div key={i.k} className="flex flex-col items-center gap-0.5">
          <dt className="text-[11px] whitespace-nowrap text-muted-foreground">{i.k}</dt>
          <dd className="tnum flex items-baseline">
            <span className="text-[17px] font-semibold">{i.v}</span>
            <span className="text-[11px] text-muted-foreground">{i.u}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

// ─────────────────────────────────────────────────────────

function Timeline({ records, all }: { records: BabyRecord[]; all: BabyRecord[] }) {
  const { state } = useCurrent()
  const open = useRecordSheet()

  // 수유 간격 계산용: 각 수유의 바로 이전 수유
  const prevFeedAt = useMemo(() => {
    const map = new Map<string, string>()
    const feeds = all.filter((r) => r.kind === 'feed')
    feeds.forEach((r, i) => feeds[i + 1] && map.set(r.id, feeds[i + 1].at))
    return map
  }, [all])

  if (records.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-[15px] font-medium">아직 기록이 없어요</p>
        <p className="mt-1 text-[13px] text-muted-foreground">아래 버튼으로 첫 기록을 남겨 보세요</p>
      </div>
    )
  }

  return (
    <ol className="relative">
      {records.map((r) => {
        const member = state.members.find((m) => m.id === r.createdBy)
        const detail = recordDetail(r)
        const prev = prevFeedAt.get(r.id)
        const gapMin = prev ? Math.round((new Date(r.at).getTime() - new Date(prev).getTime()) / 60000) : null
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => open({ record: r })}
              className="grid w-full grid-cols-[52px_14px_1fr_auto] items-start gap-x-2 px-4 text-left active:bg-accent/60"
            >
              <span className="tnum pt-3.5 text-right text-[14px] font-medium text-muted-foreground">{hhmm(r.at)}</span>
              <span className="relative flex h-full justify-center">
                <span className="absolute inset-y-0 w-px bg-border" />
                <span className={cn('relative mt-[19px] size-2 rounded-full ring-4 ring-background', KIND_META[r.kind].dot)} />
              </span>
              <span className="flex min-w-0 flex-col py-3">
                <span className="flex items-baseline gap-2">
                  <span className="text-[15px] font-semibold">{recordTitle(r)}</span>
                  {detail && <span className="tnum truncate text-[14px] text-foreground/80">{detail}</span>}
                </span>
                {(r.memo || gapMin) && (
                  <span className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {gapMin !== null && gapMin > 0 && (
                      <span className="tnum">
                        {Math.floor(gapMin / 60)}시간 {gapMin % 60}분 만에
                      </span>
                    )}
                    {gapMin && r.memo ? ' · ' : ''}
                    {r.memo}
                  </span>
                )}
              </span>
              <span className="pt-3.5">
                <MemberChip member={member} />
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

// ─────────────────────────────────────────────────────────

function QuickBar({ records }: { records: BabyRecord[] }) {
  const open = useRecordSheet()
  const { state } = useCurrent()
  const [more, setMore] = useState(false)

  const lastBreast = records.find((r): r is FeedRecord => r.kind === 'feed' && r.method === 'breast')
  // 지난번에 덜 물린 쪽부터 권한다
  const nextSide: 'left' | 'right' =
    lastBreast && (lastBreast.leftSec ?? 0) > (lastBreast.rightSec ?? 0) ? 'right' : 'left'
  const lastFormula = records.find((r): r is FeedRecord => r.kind === 'feed' && r.method === 'formula')

  const quickDiaper = (type: 'pee' | 'poo') => {
    const rec = actions.addRecord({ kind: 'diaper', at: new Date().toISOString(), pee: type === 'pee', poo: type === 'poo' })
    toast(`${type === 'pee' ? '소변' : '대변'} ${hhmm(rec.at)} 기록`, {
      action: {
        label: type === 'poo' ? '상태 입력' : '되돌리기',
        onClick: () => (type === 'poo' ? open({ record: rec }) : actions.removeRecord(rec.id)),
      },
    })
  }

  const breast = () => {
    if (state.activeFeeding) {
      toast('이미 수유 타이머가 돌고 있어요')
      return
    }
    actions.startFeeding(nextSide)
  }

  const btn =
    'relative flex h-[60px] flex-col items-start justify-center rounded-lg border bg-card px-3 text-left transition-transform active:scale-[0.97] before:absolute before:top-2.5 before:bottom-2.5 before:left-0 before:w-[3px] before:rounded-r-full'

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+56px)] z-30 mx-auto max-w-md px-3 pb-2">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_44px] gap-1.5 rounded-xl border bg-background/95 p-1.5 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)] backdrop-blur">
          <button type="button" className={cn(btn, KIND_META.feed.bar)} onClick={breast}>
            <span className="text-[15px] font-semibold">모유</span>
            <span className="text-[11px] text-muted-foreground">{nextSide === 'left' ? '왼쪽' : '오른쪽'}부터</span>
          </button>
          <button
            type="button"
            className={cn(btn, KIND_META.feed.bar)}
            onClick={() => open({ kind: 'feed', preset: { method: 'formula', amountMl: lastFormula?.amountMl ?? 80 } })}
          >
            <span className="text-[15px] font-semibold">분유</span>
            <span className="tnum text-[11px] text-muted-foreground">{lastFormula?.amountMl ?? 80}ml</span>
          </button>
          <button type="button" className={cn(btn, KIND_META.diaper.bar)} onClick={() => quickDiaper('pee')}>
            <span className="text-[15px] font-semibold">소변</span>
            <span className="text-[11px] text-muted-foreground">바로 기록</span>
          </button>
          <button type="button" className={cn(btn, KIND_META.diaper.bar)} onClick={() => quickDiaper('poo')}>
            <span className="text-[15px] font-semibold">대변</span>
            <span className="text-[11px] text-muted-foreground">바로 기록</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded-lg bg-foreground text-background active:scale-[0.97]"
            onClick={() => setMore(true)}
            aria-label="다른 기록"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      <Drawer open={more} onOpenChange={setMore}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>무엇을 기록할까요?</DrawerTitle>
            <DrawerDescription className="sr-only">기록 종류 선택</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-1 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {(
              [
                ['feed', '수유', '모유 직접 입력, 유축, 이유식', { method: 'breast', amountMl: undefined }],
                ['diaper', '기저귀', '소변·대변, 대변 색과 상태', undefined],
                ['growth', '키 · 몸무게', '몸무게, 키, 머리둘레', undefined],
                ['hospital', '병원', '진료, 예방접종, 검진', undefined],
              ] as const
            ).map(([kind, title, desc, preset]) => (
              <DrawerClose asChild key={kind}>
                <button
                  type="button"
                  onClick={() => open({ kind, preset })}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-left active:bg-accent"
                >
                  <span className={cn('h-9 w-1 rounded-full', KIND_META[kind].dot)} />
                  <span className="flex flex-col">
                    <span className="text-[16px] font-semibold">{title}</span>
                    <span className="text-[13px] text-muted-foreground">{desc}</span>
                  </span>
                </button>
              </DrawerClose>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
