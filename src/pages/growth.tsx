import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format, startOfDay, subDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { useRecordSheet } from '@/components/record-sheet'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrent } from '@/data/store'
import type { Baby, FeedRecord, GrowthRecord } from '@/data/types'
import { WHO_WEIGHT, whoAt } from '@/data/who'
import { cn } from '@/lib/utils'

export function GrowthPage() {
  const { baby, state } = useCurrent()
  const open = useRecordSheet()

  const growth = useMemo(
    () =>
      state.records
        .filter((r): r is GrowthRecord => r.kind === 'growth' && r.babyId === baby?.id)
        .sort((a, b) => a.at.localeCompare(b.at)),
    [state.records, baby?.id],
  )

  if (!baby) return null
  const weights = growth.filter((g) => g.weightKg)
  const last = weights.at(-1)
  const prev = weights.at(-2)
  const delta = last && prev ? Math.round((last.weightKg! - prev.weightKg!) * 1000) : null
  const deltaDays = last && prev ? differenceInCalendarDays(new Date(last.at), new Date(prev.at)) : null
  const birthW = weights[0]

  return (
    <div className="flex flex-col gap-5 pb-28">
      <PageHeader
        title="성장"
        action={
          <Button size="sm" variant="outline" onClick={() => open({ kind: 'growth' })}>
            <Plus /> 기록
          </Button>
        }
      />

      <Tabs defaultValue="weight" className="px-4">
        <TabsList>
          <TabsTrigger value="weight">몸무게</TabsTrigger>
          <TabsTrigger value="feeding">수유량</TabsTrigger>
        </TabsList>

        <TabsContent value="weight" className="flex flex-col gap-4">
          {last ? (
            <div className="flex items-end justify-between px-1">
              <div>
                <p className="text-[13px] text-muted-foreground">
                  {format(new Date(last.at), 'M월 d일', { locale: ko })} 기준
                </p>
                <p className="tnum flex items-baseline gap-1">
                  <span className="text-[44px] leading-none font-bold tracking-tight">{last.weightKg!.toFixed(2)}</span>
                  <span className="text-lg text-muted-foreground">kg</span>
                </p>
              </div>
              <div className="tnum flex flex-col items-end gap-0.5 pb-1 text-[13px]">
                {delta !== null && (
                  <span className={cn('font-semibold', delta >= 0 ? 'text-growth' : 'text-hospital')}>
                    {delta >= 0 ? '+' : ''}
                    {delta}g <span className="font-normal text-muted-foreground">/ {deltaDays}일</span>
                  </span>
                )}
                {birthW && birthW !== last && (
                  <span className="text-muted-foreground">
                    출생 {birthW.weightKg!.toFixed(2)}kg 대비 {last.weightKg! - birthW.weightKg! >= 0 ? '+' : ''}
                    {Math.round((last.weightKg! - birthW.weightKg!) * 1000)}g
                  </span>
                )}
              </div>
            </div>
          ) : (
            <EmptyGrowth onAdd={() => open({ kind: 'growth' })} />
          )}

          {weights.length > 0 && <WeightChart baby={baby} weights={weights} />}

          {growth.length > 0 && (
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="tnum w-full text-[14px]">
                <thead>
                  <tr className="border-b text-[12px] text-muted-foreground">
                    <th className="py-2 pl-4 text-left font-normal">날짜</th>
                    <th className="py-2 text-right font-normal">몸무게</th>
                    <th className="py-2 text-right font-normal">키</th>
                    <th className="py-2 pr-4 text-right font-normal">머리</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...growth].reverse().map((g) => (
                    <tr key={g.id} onClick={() => open({ record: g })} className="active:bg-accent">
                      <td className="py-2.5 pl-4">
                        {format(new Date(g.at), 'M.d')}
                        <span className="ml-1.5 text-[12px] text-muted-foreground">
                          {differenceInCalendarDays(new Date(g.at), new Date(baby.birthDate + 'T00:00:00')) + 1}일째
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-medium">{g.weightKg ? `${g.weightKg.toFixed(2)}kg` : '—'}</td>
                      <td className="py-2.5 text-right">{g.heightCm ? `${g.heightCm}` : '—'}</td>
                      <td className="py-2.5 pr-4 text-right">{g.headCm ? `${g.headCm}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="feeding">
          <FeedingWeek />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyGrowth({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-10 text-center">
      <p className="text-[15px] font-medium">아직 잰 기록이 없어요</p>
      <p className="mt-1 text-[13px] text-muted-foreground">출생 체중부터 적어 두면 성장 곡선을 그려 드려요</p>
      <Button className="mt-4" variant="outline" onClick={onAdd}>
        몸무게 기록하기
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 몸무게 곡선: 아기 기록(실선) + WHO 3~97 백분위 범위(면) + 중앙값(점선)
// ─────────────────────────────────────────────────────────

const W = 340
const H = 220
const PAD = { l: 34, r: 12, t: 12, b: 26 }

function WeightChart({ baby, weights }: { baby: Baby; weights: GrowthRecord[] }) {
  const [active, setActive] = useState<string | null>(weights.at(-1)?.id ?? null)
  const birth = new Date(baby.birthDate + 'T00:00:00')
  const who = WHO_WEIGHT[baby.sex ?? 'girl']

  const pts = weights.map((g) => ({
    id: g.id,
    month: differenceInCalendarDays(new Date(g.at), birth) / 30.4375,
    kg: g.weightKg!,
    at: g.at,
  }))

  const maxMonth = Math.max(2, Math.ceil((pts.at(-1)?.month ?? 0) + 1))
  const yMin = Math.floor(Math.min(whoAt(who.p3, 0), ...pts.map((p) => p.kg)) - 0.3)
  const yMax = Math.ceil(Math.max(whoAt(who.p97, maxMonth), ...pts.map((p) => p.kg)) + 0.2)

  const x = (m: number) => PAD.l + (m / maxMonth) * (W - PAD.l - PAD.r)
  const y = (kg: number) => PAD.t + (1 - (kg - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b)

  const steps = Array.from({ length: maxMonth * 4 + 1 }, (_, i) => i / 4)
  const band =
    steps.map((m, i) => `${i ? 'L' : 'M'}${x(m)},${y(whoAt(who.p97, m))}`).join(' ') +
    ' ' +
    [...steps].reverse().map((m) => `L${x(m)},${y(whoAt(who.p3, m))}`).join(' ') +
    ' Z'
  const median = steps.map((m, i) => `${i ? 'L' : 'M'}${x(m)},${y(whoAt(who.p50, m))}`).join(' ')
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.month)},${y(p.kg)}`).join(' ')

  const yTicks: number[] = []
  for (let v = yMin; v <= yMax; v += yMax - yMin > 4 ? 2 : 1) yTicks.push(v)

  const sel = pts.find((p) => p.id === active)

  return (
    <figure className="rounded-xl border bg-card p-3 pb-2">
      <figcaption className="flex items-center justify-between px-1 pb-1 text-[12px] text-muted-foreground">
        <span>몸무게 (kg)</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-muted-foreground/15" />
            WHO 3~97%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-[1.5px] border-dashed border-muted-foreground/60" />
            중앙값
          </span>
        </span>
      </figcaption>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y" role="img" aria-label="몸무게 성장 곡선">
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
              <text x={PAD.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tnum">
                {v}
              </text>
            </g>
          ))}
          {Array.from({ length: maxMonth + 1 }, (_, m) => (
            <text key={m} x={x(m)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[10px] tnum">
              {m === 0 ? '출생' : `${m}개월`}
            </text>
          ))}

          <path d={band} className="fill-muted-foreground/12" />
          <path d={median} fill="none" className="stroke-muted-foreground/60" strokeWidth={1.5} strokeDasharray="4 4" />

          <path d={line} fill="none" className="stroke-growth" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p) => (
            <circle
              key={p.id}
              cx={x(p.month)}
              cy={y(p.kg)}
              r={p.id === active ? 5.5 : 4}
              className="fill-growth stroke-card"
              strokeWidth={2}
            />
          ))}
          {/* 넉넉한 터치 영역 */}
          {pts.map((p) => (
            <rect
              key={`hit-${p.id}`}
              x={x(p.month) - 14}
              y={PAD.t}
              width={28}
              height={H - PAD.t - PAD.b}
              fill="transparent"
              onClick={() => setActive(p.id)}
              onPointerEnter={() => setActive(p.id)}
            />
          ))}
          {sel && (
            <line x1={x(sel.month)} x2={x(sel.month)} y1={PAD.t} y2={H - PAD.b} className="stroke-foreground/25" strokeWidth={1} />
          )}
        </svg>

        {sel && (
          <div
            className="tnum pointer-events-none absolute top-1 rounded-md bg-foreground px-2 py-1 text-[12px] whitespace-nowrap text-background"
            style={{
              left: `${(x(sel.month) / W) * 100}%`,
              transform: `translateX(${x(sel.month) / W > 0.6 ? '-105%' : '5%'})`,
            }}
          >
            <span className="font-semibold">{sel.kg.toFixed(2)}kg</span>
            <span className="ml-1.5 opacity-70">{format(new Date(sel.at), 'M.d')}</span>
          </div>
        )}
      </div>
      <p className="px-1 pt-1 text-[11px] text-muted-foreground">
        WHO 성장 기준 참고용이에요. {baby.sex ? '' : '성별을 입력하면 더 정확해져요.'}
      </p>
    </figure>
  )
}

// ─────────────────────────────────────────────────────────
// 최근 7일 수유량
// ─────────────────────────────────────────────────────────

function FeedingWeek() {
  const { baby, state } = useCurrent()
  const [active, setActive] = useState(6)

  const days = useMemo(() => {
    const today = startOfDay(new Date())
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i)
      const feeds = state.records.filter(
        (r): r is FeedRecord =>
          r.kind === 'feed' && r.babyId === baby?.id && startOfDay(new Date(r.at)).getTime() === d.getTime(),
      )
      return {
        d,
        count: feeds.length,
        ml: feeds.reduce((s, f) => s + (f.method === 'formula' || f.method === 'pumped' ? f.amountMl ?? 0 : 0), 0),
        breastMin: Math.round(feeds.reduce((s, f) => s + (f.leftSec ?? 0) + (f.rightSec ?? 0), 0) / 60),
      }
    })
  }, [state.records, baby?.id])

  const max = Math.max(200, ...days.map((d) => d.ml))
  const sel = days[active]
  const avg = Math.round(days.slice(0, 6).reduce((s, d) => s + d.ml, 0) / 6)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 divide-x rounded-xl border bg-card py-3">
        {[
          { k: '수유', v: sel.count, u: '회' },
          { k: '분유·유축', v: sel.ml, u: 'ml' },
          { k: '모유', v: sel.breastMin, u: '분' },
        ].map((i) => (
          <div key={i.k} className="flex flex-col items-center">
            <span className="text-[12px] text-muted-foreground">{i.k}</span>
            <span className="tnum">
              <span className="text-[22px] font-semibold">{i.v}</span>
              <span className="text-[12px] text-muted-foreground">{i.u}</span>
            </span>
          </div>
        ))}
      </div>

      <figure className="rounded-xl border bg-card px-3 pt-3 pb-2">
        <figcaption className="flex justify-between px-1 text-[12px] text-muted-foreground">
          <span>하루 분유·유축량 (ml)</span>
          <span className="tnum">지난 6일 평균 {avg}ml</span>
        </figcaption>
        <div className="relative mt-3 flex h-40 items-end gap-2 px-1">
          <div
            className="pointer-events-none absolute inset-x-1 border-t border-dashed border-muted-foreground/40"
            style={{ bottom: `${(avg / max) * 100}%` }}
          />
          {days.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              aria-label={`${format(d.d, 'M월 d일')} ${d.ml}ml`}
            >
              {i === active && <span className="tnum text-[11px] font-semibold">{d.ml}</span>}
              <span
                className={cn('w-full max-w-7 rounded-t', i === active ? 'bg-feed' : 'bg-feed/35')}
                style={{ height: `${Math.max(2, (d.ml / max) * 100)}%` }}
              />
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex gap-2 px-1">
          {days.map((d, i) => (
            <span
              key={i}
              className={cn('flex-1 text-center text-[11px]', i === active ? 'font-semibold text-foreground' : 'text-muted-foreground')}
            >
              {i === 6 ? '오늘' : format(d.d, 'EEEEE', { locale: ko })}
            </span>
          ))}
        </div>
      </figure>
    </div>
  )
}
