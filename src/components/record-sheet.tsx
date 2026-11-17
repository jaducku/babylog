import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Stepper } from '@/components/stepper'
import { MemberChip } from '@/components/member-chip'
import { KIND_META } from '@/components/kind'
import { actions, useCurrent, type NewRecord } from '@/data/store'
import type {
  BabyRecord,
  DiaperRecord,
  FeedMethod,
  FeedRecord,
  GrowthRecord,
  HospitalRecord,
  PooColor,
  PooTexture,
  RecordKind,
  VisitType,
} from '@/data/types'
import { VACCINES, dueDate } from '@/data/vaccines'
import { POO_COLORS, POO_TEXTURES, fromLocalInput, toLocalInput } from '@/lib/format'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────
// 어디서든 기록 시트를 열 수 있게 하는 컨텍스트
// ─────────────────────────────────────────────────────────

type OpenArgs =
  | { kind: RecordKind; record?: undefined; preset?: Partial<NewRecord> }
  | { kind?: undefined; record: BabyRecord; preset?: undefined }

const Ctx = createContext<(args: OpenArgs) => void>(() => {})

export function useRecordSheet() {
  return useContext(Ctx)
}

export function RecordSheetProvider({ children }: { children: ReactNode }) {
  const [args, setArgs] = useState<OpenArgs | null>(null)
  const [open, setOpen] = useState(false)
  // 시트가 열릴 때마다 폼을 새로 만들기 위한 키
  const [nonce, setNonce] = useState(0)

  const openSheet = useCallback((a: OpenArgs) => {
    setArgs(a)
    setNonce((n) => n + 1)
    setOpen(true)
  }, [])

  return (
    <Ctx.Provider value={openSheet}>
      {children}
      <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
        <DrawerContent>
          {args && <SheetBody key={nonce} args={args} onDone={() => setOpen(false)} />}
        </DrawerContent>
      </Drawer>
    </Ctx.Provider>
  )
}

// ─────────────────────────────────────────────────────────

const TITLES: Record<RecordKind, string> = {
  feed: '수유',
  diaper: '기저귀',
  growth: '키 · 몸무게',
  hospital: '병원',
}

function SheetBody({ args, onDone }: { args: OpenArgs; onDone: () => void }) {
  const { state } = useCurrent()
  const kind = args.record?.kind ?? args.kind!
  const editing = args.record
  const author = editing && state.members.find((m) => m.id === editing.createdBy)

  const [draft, setDraft] = useState<NewRecord>(() => {
    if (editing) {
      const { id: _id, babyId: _b, createdBy: _c, createdAt: _ca, updatedAt: _u, ...rest } = editing
      return rest as NewRecord
    }
    return { ...defaults(kind), ...args.preset } as NewRecord
  })

  const patch = (p: Partial<NewRecord>) => setDraft((d) => ({ ...d, ...p }) as NewRecord)
  const valid = isValid(draft)

  const save = () => {
    if (!valid) return
    if (editing) {
      actions.updateRecord(editing.id, draft)
      toast('수정했어요')
    } else {
      actions.addRecord(draft)
    }
    onDone()
  }

  const remove = () => {
    if (!editing) return
    const removed = actions.removeRecord(editing.id)
    onDone()
    toast('삭제했어요', {
      action: removed ? { label: '되돌리기', onClick: () => actions.restoreRecord(removed) } : undefined,
    })
  }

  return (
    <>
      <DrawerHeader>
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', KIND_META[kind].dot)} />
          <DrawerTitle>
            {TITLES[kind]} {editing ? '기록 수정' : '기록'}
          </DrawerTitle>
        </div>
        <DrawerDescription className={cn(!editing && 'sr-only')}>
          {editing ? (
            <span className="inline-flex items-center gap-1.5">
              <MemberChip member={author} />
              {format(new Date(editing.createdAt), 'M월 d일 HH:mm', { locale: ko })} 작성
            </span>
          ) : (
            `${TITLES[kind]} 기록을 남겨요`
          )}
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex flex-col gap-5 overflow-y-auto px-5 pt-2 pb-2">
        {draft.kind === 'feed' && <FeedFields value={draft} onChange={patch} onDone={onDone} isNew={!editing} />}
        {draft.kind === 'diaper' && <DiaperFields value={draft} onChange={patch} />}
        {draft.kind === 'growth' && <GrowthFields value={draft} onChange={patch} />}
        {draft.kind === 'hospital' && <HospitalFields value={draft} onChange={patch} />}

        <div className="grid gap-1.5">
          <Label htmlFor="memo">메모</Label>
          <Textarea
            id="memo"
            rows={2}
            placeholder={draft.kind === 'hospital' ? '의사 소견, 처방약, 주의사항' : '남기고 싶은 말'}
            value={draft.memo ?? ''}
            onChange={(e) => patch({ memo: e.target.value || undefined })}
          />
        </div>
      </div>

      <DrawerFooter>
        {editing && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="lg" className="px-4" aria-label="삭제">
                <Trash2 className="size-[18px]" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>이 기록을 지울까요?</AlertDialogTitle>
                <AlertDialogDescription>가족 모두의 기록에서 사라져요.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>삭제</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button size="lg" className="flex-1" disabled={!valid} onClick={save}>
          {editing ? '저장' : '기록하기'}
        </Button>
      </DrawerFooter>
    </>
  )
}

function defaults(kind: RecordKind): NewRecord {
  const at = new Date().toISOString()
  switch (kind) {
    case 'feed':
      return { kind, at, method: 'formula', amountMl: 80 }
    case 'diaper':
      return { kind, at, pee: true, poo: false }
    case 'growth':
      return { kind, at }
    case 'hospital':
      return { kind, at, visitType: 'clinic' }
  }
}

function isValid(d: NewRecord) {
  switch (d.kind) {
    case 'feed':
      return d.method === 'breast' ? (d.leftSec ?? 0) + (d.rightSec ?? 0) > 0 : (d.amountMl ?? 0) > 0
    case 'diaper':
      return d.pee || d.poo
    case 'growth':
      return !!(d.weightKg || d.heightCm || d.headCm)
    case 'hospital':
      return d.visitType !== 'vaccine' || (d.vaccines?.length ?? 0) > 0 || !!d.title
  }
}

// ─────────────────────────────────────────────────────────
// 공통 필드
// ─────────────────────────────────────────────────────────

function TimeField({ value, onChange, label = '시각' }: { value: string; onChange: (iso: string) => void; label?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="at">{label}</Label>
      <Input
        id="at"
        type="datetime-local"
        className="tnum"
        value={toLocalInput(value)}
        onChange={(e) => e.target.value && onChange(fromLocalInput(e.target.value))}
      />
    </div>
  )
}

function Chips<T extends string | number>({
  options,
  value,
  onSelect,
  render = (v) => String(v),
}: {
  options: T[]
  value?: T
  onSelect: (v: T) => void
  render?: (v: T) => ReactNode
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          onClick={() => onSelect(o)}
          className={cn(
            'tnum h-8 rounded-full border px-3 text-[13px] font-medium transition-colors',
            value === o ? 'border-foreground bg-foreground text-background' : 'bg-card active:bg-accent',
          )}
        >
          {render(o)}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 수유
// ─────────────────────────────────────────────────────────

function FeedFields({
  value,
  onChange,
  onDone,
  isNew,
}: {
  value: Omit<FeedRecord, 'id' | 'babyId' | 'createdBy' | 'createdAt' | 'updatedAt'>
  onChange: (p: Partial<NewRecord>) => void
  onDone: () => void
  isNew: boolean
}) {
  const { state, baby } = useCurrent()
  const lastAmount = useMemo(() => {
    const prev = state.records
      .filter((r): r is FeedRecord => r.kind === 'feed' && r.babyId === baby?.id && r.method === value.method && !!r.amountMl)
      .sort((a, b) => b.at.localeCompare(a.at))[0]
    return prev?.amountMl
  }, [state.records, baby?.id, value.method])

  const setMethod = (m: FeedMethod) => {
    if (!m) return
    if (m === 'breast') onChange({ method: m, amountMl: undefined })
    else onChange({ method: m, leftSec: undefined, rightSec: undefined, amountMl: value.amountMl ?? lastAmount ?? 80 })
  }

  const startTimer = (side: 'left' | 'right') => {
    actions.startFeeding(side)
    onDone()
  }

  return (
    <>
      <ToggleGroup type="single" value={value.method} onValueChange={(v) => setMethod(v as FeedMethod)}>
        <ToggleGroupItem value="breast">모유</ToggleGroupItem>
        <ToggleGroupItem value="formula">분유</ToggleGroupItem>
        <ToggleGroupItem value="pumped">유축</ToggleGroupItem>
        <ToggleGroupItem value="solid">이유식</ToggleGroupItem>
      </ToggleGroup>

      {value.method === 'breast' ? (
        <>
          {isNew && !state.activeFeeding && (
            <div className="grid gap-2">
              <p className="text-[13px] text-muted-foreground">지금 시작한다면 타이머를 켜 두세요</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" onClick={() => startTimer('left')}>
                  왼쪽부터 시작
                </Button>
                <Button variant="outline" size="lg" onClick={() => startTimer('right')}>
                  오른쪽부터 시작
                </Button>
              </div>
              <div className="my-1 flex items-center gap-3 text-[12px] text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                이미 끝났다면 직접 입력
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {(['left', 'right'] as const).map((side) => {
              const key = side === 'left' ? 'leftSec' : 'rightSec'
              const min = Math.round((value[key] ?? 0) / 60)
              return (
                <div key={side} className="grid gap-1.5">
                  <Label htmlFor={side}>{side === 'left' ? '왼쪽' : '오른쪽'} (분)</Label>
                  <Input
                    id={side}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="tnum text-lg"
                    placeholder="0"
                    value={min || ''}
                    onChange={(e) => {
                      const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
                      onChange({ [key]: Number.isFinite(n) ? n * 60 : undefined })
                    }}
                  />
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="grid gap-4 rounded-xl border bg-card px-4 py-5">
          <Stepper
            value={value.amountMl ?? 0}
            onChange={(v) => onChange({ amountMl: v })}
            unit={value.method === 'solid' ? 'g' : 'ml'}
            step={value.method === 'solid' ? 5 : 10}
          />
          <div className="flex justify-center">
            <Chips
              options={value.method === 'solid' ? [20, 30, 50, 80] : [60, 80, 100, 120, 160]}
              value={value.amountMl}
              onSelect={(v) => onChange({ amountMl: v })}
            />
          </div>
          {lastAmount && (
            <p className="text-center text-[12px] text-muted-foreground">지난번 {lastAmount}{value.method === 'solid' ? 'g' : 'ml'}</p>
          )}
        </div>
      )}

      <TimeField value={value.at} onChange={(at) => onChange({ at })} label="시작 시각" />
    </>
  )
}

// ─────────────────────────────────────────────────────────
// 기저귀
// ─────────────────────────────────────────────────────────

function DiaperFields({
  value,
  onChange,
}: {
  value: Omit<DiaperRecord, 'id' | 'babyId' | 'createdBy' | 'createdAt' | 'updatedAt'>
  onChange: (p: Partial<NewRecord>) => void
}) {
  const selected = [value.pee && 'pee', value.poo && 'poo'].filter(Boolean) as string[]
  const warn = POO_COLORS.find((c) => c.id === value.pooColor)?.warn

  return (
    <>
      <ToggleGroup
        type="multiple"
        value={selected}
        onValueChange={(v) => onChange({ pee: v.includes('pee'), poo: v.includes('poo') })}
      >
        <ToggleGroupItem value="pee" className="h-14 text-base">소변</ToggleGroupItem>
        <ToggleGroupItem value="poo" className="h-14 text-base">대변</ToggleGroupItem>
      </ToggleGroup>

      {value.poo && (
        <>
          <div className="grid gap-2">
            <Label>색</Label>
            <div className="grid grid-cols-7 gap-1">
              {POO_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChange({ pooColor: value.pooColor === c.id ? undefined : (c.id as PooColor) })}
                  className="flex flex-col items-center gap-1.5 py-1"
                  aria-pressed={value.pooColor === c.id}
                >
                  <span
                    className={cn(
                      'size-9 rounded-full ring-offset-2 ring-offset-background transition-shadow',
                      value.pooColor === c.id ? 'ring-2 ring-foreground' : 'ring-1 ring-black/10 dark:ring-white/10',
                    )}
                    style={{ background: c.swatch }}
                  />
                  <span className="text-[11px] whitespace-nowrap text-muted-foreground">{c.label}</span>
                </button>
              ))}
            </div>
            {warn && (
              <p className="rounded-md bg-hospital-soft px-3 py-2 text-[13px] text-hospital">
                이 색은 소아과 상담이 필요할 수 있어요. 사진을 찍어 두면 진료에 도움이 돼요.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>상태</Label>
            <Chips
              options={POO_TEXTURES.map((t) => t.id)}
              value={value.pooTexture}
              onSelect={(v) => onChange({ pooTexture: value.pooTexture === v ? undefined : (v as PooTexture) })}
              render={(v) => POO_TEXTURES.find((t) => t.id === v)!.label}
            />
          </div>
        </>
      )}

      <TimeField value={value.at} onChange={(at) => onChange({ at })} />
    </>
  )
}

// ─────────────────────────────────────────────────────────
// 성장
// ─────────────────────────────────────────────────────────

function GrowthFields({
  value,
  onChange,
}: {
  value: Omit<GrowthRecord, 'id' | 'babyId' | 'createdBy' | 'createdAt' | 'updatedAt'>
  onChange: (p: Partial<NewRecord>) => void
}) {
  const { state, baby } = useCurrent()
  const prev = useMemo(() => {
    const list = state.records
      .filter((r): r is GrowthRecord => r.kind === 'growth' && r.babyId === baby?.id && r.at < value.at)
      .sort((a, b) => b.at.localeCompare(a.at))
    return {
      weightKg: list.find((r) => r.weightKg),
      heightCm: list.find((r) => r.heightCm),
      headCm: list.find((r) => r.headCm),
    }
  }, [state.records, baby?.id, value.at])

  const fields = [
    { key: 'weightKg' as const, label: '몸무게', unit: 'kg', placeholder: '3.45', digits: 2 },
    { key: 'heightCm' as const, label: '키', unit: 'cm', placeholder: '52.0', digits: 1 },
    { key: 'headCm' as const, label: '머리둘레', unit: 'cm', placeholder: '35.0', digits: 1 },
  ]

  return (
    <>
      <div className="divide-y rounded-xl border bg-card">
        {fields.map((f) => {
          const p = prev[f.key]
          return (
            <label key={f.key} className="flex items-center gap-3 px-4 py-3">
              <span className="w-16 shrink-0 text-[15px] font-medium">{f.label}</span>
              <span className="flex flex-1 flex-col items-end">
                <span className="flex items-baseline gap-1">
                  <input
                    inputMode="decimal"
                    placeholder={f.placeholder}
                    className="tnum w-24 bg-transparent text-right text-2xl font-semibold outline-none placeholder:text-muted-foreground/40"
                    defaultValue={value[f.key] ?? ''}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value.replace(',', '.'))
                      onChange({ [f.key]: Number.isFinite(n) && n > 0 ? n : undefined })
                    }}
                  />
                  <span className="w-6 text-sm text-muted-foreground">{f.unit}</span>
                </span>
                {p && (
                  <span className="tnum text-[11px] text-muted-foreground">
                    지난번 {p[f.key]!.toFixed(f.digits)}
                    {f.unit} · {format(new Date(p.at), 'M/d')}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
      <TimeField value={value.at} onChange={(at) => onChange({ at })} label="잰 날" />
    </>
  )
}

// ─────────────────────────────────────────────────────────
// 병원
// ─────────────────────────────────────────────────────────

function HospitalFields({
  value,
  onChange,
}: {
  value: Omit<HospitalRecord, 'id' | 'babyId' | 'createdBy' | 'createdAt' | 'updatedAt'>
  onChange: (p: Partial<NewRecord>) => void
}) {
  const { state, baby } = useCurrent()

  const places = useMemo(() => {
    const set = new Set<string>()
    state.records.forEach((r) => r.kind === 'hospital' && r.place && set.add(r.place))
    return [...set].slice(0, 4)
  }, [state.records])

  const doneVaccines = useMemo(() => {
    const s = new Set<string>()
    state.records.forEach((r) => {
      if (r.kind === 'hospital' && r.babyId === baby?.id) r.vaccines?.forEach((v) => s.add(v))
    })
    return s
  }, [state.records, baby?.id])

  // 접종 안 한 것 중 시기가 가까운 순, 이미 선택된 건 항상 보이게
  const vaccineOptions = useMemo(() => {
    if (!baby) return []
    const chosen = new Set(value.vaccines ?? [])
    return VACCINES.filter((v) => chosen.has(v.id) || !doneVaccines.has(v.id))
      .sort((a, b) => dueDate(baby.birthDate, a).getTime() - dueDate(baby.birthDate, b).getTime())
      .slice(0, 10)
  }, [baby, doneVaccines, value.vaccines])

  const toggleVaccine = (id: string) => {
    const cur = new Set(value.vaccines ?? [])
    if (cur.has(id)) cur.delete(id)
    else cur.add(id)
    onChange({ vaccines: [...cur] })
  }

  return (
    <>
      <ToggleGroup type="single" value={value.visitType} onValueChange={(v) => v && onChange({ visitType: v as VisitType })}>
        <ToggleGroupItem value="clinic">진료</ToggleGroupItem>
        <ToggleGroupItem value="vaccine">예방접종</ToggleGroupItem>
        <ToggleGroupItem value="checkup">검진</ToggleGroupItem>
      </ToggleGroup>

      <TimeField value={value.at} onChange={(at) => onChange({ at })} label="방문 일시" />

      <div className="grid gap-1.5">
        <Label htmlFor="place">병원</Label>
        <Input id="place" placeholder="○○소아과" value={value.place ?? ''} onChange={(e) => onChange({ place: e.target.value || undefined })} />
        {places.length > 0 && !value.place && (
          <Chips options={places} onSelect={(p) => onChange({ place: p })} />
        )}
      </div>

      {value.visitType === 'vaccine' ? (
        <div className="grid gap-2">
          <Label>접종한 백신</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {vaccineOptions.map((v) => {
              const on = value.vaccines?.includes(v.id)
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVaccine(v.id)}
                  className={cn(
                    'flex items-baseline justify-between gap-2 rounded-md border px-3 py-2.5 text-left transition-colors',
                    on ? 'border-foreground bg-foreground text-background' : 'bg-card',
                  )}
                >
                  <span className="truncate text-[14px] font-medium">{v.name}</span>
                  <span className={cn('shrink-0 text-[12px]', on ? 'text-background/70' : 'text-muted-foreground')}>{v.dose}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor="title">{value.visitType === 'checkup' ? '검진 이름' : '증상 · 진단'}</Label>
          <Input
            id="title"
            placeholder={value.visitType === 'checkup' ? '영유아 건강검진 1차' : '콧물, 미열 37.8'}
            value={value.title ?? ''}
            onChange={(e) => onChange({ title: e.target.value || undefined })}
          />
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="next">다음 예약 (선택)</Label>
        <Input
          id="next"
          type="datetime-local"
          className="tnum"
          value={value.nextAt ? toLocalInput(value.nextAt) : ''}
          onChange={(e) => onChange({ nextAt: e.target.value ? fromLocalInput(e.target.value) : undefined })}
        />
      </div>
    </>
  )
}
