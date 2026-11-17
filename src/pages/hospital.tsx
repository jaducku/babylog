import { useMemo } from 'react'
import { differenceInCalendarDays, format, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Check, Plus } from 'lucide-react'

import { MemberChip } from '@/components/member-chip'
import { PageHeader } from '@/components/page-header'
import { useRecordSheet } from '@/components/record-sheet'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrent } from '@/data/store'
import type { HospitalRecord } from '@/data/types'
import { VACCINES, dueDate, monthGroupLabel, type VaccineDose } from '@/data/vaccines'
import { VISIT_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'

export function HospitalPage() {
  const { baby, state } = useCurrent()
  const open = useRecordSheet()

  const visits = useMemo(
    () =>
      state.records
        .filter((r): r is HospitalRecord => r.kind === 'hospital' && r.babyId === baby?.id)
        .sort((a, b) => b.at.localeCompare(a.at)),
    [state.records, baby?.id],
  )

  if (!baby) return null
  const today = startOfDay(new Date())

  const upcoming = visits
    .filter((v) => v.nextAt && new Date(v.nextAt) >= today)
    .sort((a, b) => a.nextAt!.localeCompare(b.nextAt!))

  return (
    <div className="flex flex-col gap-5 pb-28">
      <PageHeader
        title="병원"
        action={
          <Button size="sm" variant="outline" onClick={() => open({ kind: 'hospital' })}>
            <Plus /> 기록
          </Button>
        }
      />

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-2 px-4">
          {upcoming.map((v) => {
            const d = differenceInCalendarDays(new Date(v.nextAt!), today)
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => open({ record: v })}
                className="flex items-center gap-4 rounded-xl border border-hospital/30 bg-hospital-soft/60 px-4 py-3.5 text-left dark:bg-hospital-soft"
              >
                <div className="tnum flex w-12 flex-col items-center">
                  <span className="text-[11px] text-hospital">{d === 0 ? '오늘' : 'D-'}</span>
                  {d > 0 && <span className="text-[24px] leading-none font-bold text-hospital">{d}</span>}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold">다음 예약 · {v.place ?? VISIT_LABEL[v.visitType]}</span>
                  <span className="tnum text-[13px] text-muted-foreground">
                    {format(new Date(v.nextAt!), 'M월 d일 (EEE) HH:mm', { locale: ko })}
                  </span>
                </div>
              </button>
            )
          })}
        </section>
      )}

      <Tabs defaultValue="vaccine" className="px-4">
        <TabsList>
          <TabsTrigger value="vaccine">예방접종</TabsTrigger>
          <TabsTrigger value="visits">진료 기록</TabsTrigger>
        </TabsList>
        <TabsContent value="vaccine">
          <VaccineSchedule visits={visits} birthDate={baby.birthDate} />
        </TabsContent>
        <TabsContent value="visits">
          <VisitList visits={visits} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function VaccineSchedule({ visits, birthDate }: { visits: HospitalRecord[]; birthDate: string }) {
  const open = useRecordSheet()
  const done = new Map<string, HospitalRecord>()
  visits.forEach((v) => v.vaccines?.forEach((id) => done.set(id, v)))

  const today = startOfDay(new Date())
  const groups = new Map<number, VaccineDose[]>()
  VACCINES.forEach((v) => groups.set(v.month, [...(groups.get(v.month) ?? []), v]))

  const doneCount = VACCINES.filter((v) => done.has(v.id)).length

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 px-1 pb-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground" style={{ width: `${(doneCount / VACCINES.length) * 100}%` }} />
        </div>
        <span className="tnum text-[12px] text-muted-foreground">
          {doneCount}/{VACCINES.length}
        </span>
      </div>

      {[...groups.entries()].map(([month, doses]) => {
        const due = dueDate(birthDate, doses[0])
        const daysLeft = differenceInCalendarDays(due, today)
        const allDone = doses.every((d) => done.has(d.id))
        const isNext = !allDone && daysLeft <= 30
        return (
          <section key={month} className={cn('rounded-xl', isNext && 'border bg-card')}>
            <div className="flex items-baseline justify-between px-3 pt-3 pb-1.5">
              <h3 className={cn('text-[14px] font-semibold', allDone && 'text-muted-foreground')}>{monthGroupLabel(month)}</h3>
              <span className="tnum text-[12px] text-muted-foreground">
                {format(due, 'yyyy.M.d')}
                {!allDone && daysLeft > 0 && daysLeft <= 60 && ` · ${daysLeft}일 남음`}
                {!allDone && daysLeft <= 0 && <span className="text-hospital"> · 접종 시기</span>}
              </span>
            </div>
            <ul className="pb-1.5">
              {doses.map((d) => {
                const rec = done.get(d.id)
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() =>
                        rec
                          ? open({ record: rec })
                          : open({ kind: 'hospital', preset: { visitType: 'vaccine', vaccines: [d.id] } })
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left active:bg-accent"
                    >
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                          rec ? 'border-foreground bg-foreground text-background' : 'border-input',
                        )}
                      >
                        {rec && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className={cn('flex-1 text-[15px]', rec && 'text-muted-foreground')}>
                        {d.name} <span className="text-[13px] text-muted-foreground">{d.dose}</span>
                      </span>
                      <span className="tnum text-[12px] text-muted-foreground">
                        {rec ? format(new Date(rec.at), 'M.d 접종') : d.note}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      <p className="px-3 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        질병관리청 국가예방접종 표준 일정을 바탕으로 한 참고용 일정이에요. 정확한 시기는 소아과와 상의하세요.
      </p>
    </div>
  )
}

function VisitList({ visits }: { visits: HospitalRecord[] }) {
  const { state } = useCurrent()
  const open = useRecordSheet()
  if (visits.length === 0) {
    return <p className="py-14 text-center text-[14px] text-muted-foreground">아직 병원 기록이 없어요</p>
  }
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {visits.map((v) => {
        const names = v.vaccines?.map((id) => {
          const d = VACCINES.find((x) => x.id === id)
          return d ? `${d.name} ${d.dose}` : id
        })
        return (
          <li key={v.id}>
            <button type="button" onClick={() => open({ record: v })} className="flex w-full gap-4 px-4 py-3.5 text-left active:bg-accent">
              <div className="tnum flex w-10 shrink-0 flex-col items-center pt-0.5">
                <span className="text-[11px] text-muted-foreground">{format(new Date(v.at), 'M월')}</span>
                <span className="text-[20px] leading-tight font-bold">{format(new Date(v.at), 'd')}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-hospital">{VISIT_LABEL[v.visitType]}</span>
                  {v.place && <span className="truncate text-[12px] text-muted-foreground">{v.place}</span>}
                  <MemberChip member={state.members.find((m) => m.id === v.createdBy)} className="ml-auto" />
                </div>
                <span className="text-[15px] font-semibold">{names?.join(', ') || v.title || VISIT_LABEL[v.visitType]}</span>
                {v.memo && <span className="line-clamp-2 text-[13px] text-muted-foreground">{v.memo}</span>}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
