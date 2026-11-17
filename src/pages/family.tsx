import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Check, ChevronRight, Link2, X } from 'lucide-react'
import { toast } from 'sonner'

import { MemberMark } from '@/components/member-chip'
import { PageHeader } from '@/components/page-header'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { actions, useCurrent } from '@/data/store'
import type { Member, Sex } from '@/data/types'
import { babyAge } from '@/lib/format'
import { cn } from '@/lib/utils'

const ROLE_LABEL: Record<Member['role'], string> = {
  owner: '관리자',
  editor: '기록 가능',
  viewer: '보기만',
}

export function FamilyPage() {
  const { baby, me, state, prefs } = useCurrent()
  const [editBaby, setEditBaby] = useState(false)
  const [addMember, setAddMember] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!baby) return null

  const exportData = () => {
    const blob = new Blob([actions.exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `babylog-${format(new Date(), 'yyyyMMdd')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = async (file: File) => {
    try {
      actions.importJson(await file.text())
      toast('기록을 불러왔어요')
    } catch (e) {
      toast(e instanceof Error ? e.message : '불러오지 못했어요')
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      <PageHeader title={state.family?.name ?? '가족'} sub={`${state.members.length}명이 함께 기록하고 있어요`} />

      {/* 아기 */}
      <Section title="아기">
        <button type="button" onClick={() => setEditBaby(true)} className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-accent">
          <div className="flex flex-1 flex-col">
            <span className="text-[17px] font-semibold">{baby.name}</span>
            <span className="tnum text-[13px] text-muted-foreground">
              {format(new Date(baby.birthDate + 'T00:00:00'), 'yyyy년 M월 d일', { locale: ko })} 출생 ·{' '}
              {babyAge(baby.birthDate).dayCount}일째
              {baby.sex && ` · ${baby.sex === 'girl' ? '여아' : '남아'}`}
            </span>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </Section>

      {/* 가족 구성원 */}
      <Section title="가족" hint="이 기기를 쓰는 사람을 골라 주세요. 기록에 이름이 남아요.">
        {state.members.map((m) => {
          const isMe = m.id === me?.id
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <button type="button" onClick={() => actions.setCurrentMember(m.id)} className="flex flex-1 items-center gap-3 text-left">
                <MemberMark member={m} />
                <span className="flex flex-col">
                  <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                    {m.relation}
                    {isMe && <span className="rounded bg-foreground px-1.5 py-px text-[10px] font-medium text-background">이 기기</span>}
                  </span>
                  <span className="text-[12px] text-muted-foreground">{ROLE_LABEL[m.role]}</span>
                </span>
              </button>
              {isMe ? (
                <Check className="size-4" />
              ) : (
                m.role !== 'owner' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`${m.relation} 내보내기`}>
                        <X className="text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{m.relation}님을 가족에서 뺄까요?</AlertDialogTitle>
                        <AlertDialogDescription>지금까지 남긴 기록은 그대로 남아요.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={() => actions.removeMember(m.id)}>빼기</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )
              )}
            </div>
          )
        })}
        <button type="button" onClick={() => setAddMember(true)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium active:bg-accent">
          <span className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-dashed border-input text-muted-foreground">+</span>
          가족 추가
        </button>
      </Section>

      <Section title="초대">
        <div className="flex items-start gap-3 px-4 py-4">
          <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <span className="text-[15px] font-medium">초대 링크</span>
            <span className="text-[13px] leading-relaxed text-muted-foreground">
              서버에 연결하면 링크 하나로 할머니·할아버지 폰에서도 같은 기록을 볼 수 있어요. 지금은 이 기기에만 저장돼요.
            </span>
          </div>
        </div>
      </Section>

      <Section title="화면">
        <div className="px-4 py-3">
          <ToggleGroup type="single" value={prefs.theme} onValueChange={(v) => v && actions.setTheme(v as typeof prefs.theme)}>
            <ToggleGroupItem value="system" className="h-10 text-[14px]">시스템</ToggleGroupItem>
            <ToggleGroupItem value="light" className="h-10 text-[14px]">밝게</ToggleGroupItem>
            <ToggleGroupItem value="dark" className="h-10 text-[14px]">어둡게</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Section>

      <Section title="데이터">
        <Row onClick={exportData}>파일로 내보내기</Row>
        <Row onClick={() => fileRef.current?.click()}>파일에서 불러오기</Row>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importData(f)
            e.target.value = ''
          }}
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" className="w-full px-4 py-3.5 text-left text-[15px] text-destructive active:bg-accent">
              모든 기록 지우기
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정말 모두 지울까요?</AlertDialogTitle>
              <AlertDialogDescription>아기 정보와 모든 기록이 사라지고 되돌릴 수 없어요. 먼저 파일로 내보내 두는 걸 권해요.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => actions.reset()}>모두 지우기</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Section>

      <BabyDrawer open={editBaby} onOpenChange={setEditBaby} />
      <MemberDrawer open={addMember} onOpenChange={setAddMember} />
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 px-4">
      <h2 className="px-1 text-[13px] font-semibold text-muted-foreground">{title}</h2>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">{children}</div>
      {hint && <p className="px-1 text-[12px] text-muted-foreground">{hint}</p>}
    </section>
  )
}

function Row({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] active:bg-accent">
      {children}
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  )
}

function BabyDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { baby } = useCurrent()
  const [name, setName] = useState(baby?.name ?? '')
  const [birth, setBirth] = useState(baby?.birthDate ?? '')
  const [sex, setSex] = useState<Sex | ''>(baby?.sex ?? '')

  if (!baby) return null
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setName(baby.name)
          setBirth(baby.birthDate)
          setSex(baby.sex ?? '')
        }
        onOpenChange(o)
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>아기 정보</DrawerTitle>
          <DrawerDescription className="sr-only">이름, 생일, 성별</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-5 pt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="bname">이름 (태명도 좋아요)</Label>
            <Input id="bname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bbirth">태어난 날</Label>
            <Input id="bbirth" type="date" className="tnum" value={birth} onChange={(e) => setBirth(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>성별</Label>
            <ToggleGroup type="single" value={sex} onValueChange={(v) => setSex(v as Sex | '')}>
              <ToggleGroupItem value="girl">여아</ToggleGroupItem>
              <ToggleGroupItem value="boy">남아</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <DrawerFooter>
          <Button
            size="lg"
            className="flex-1"
            disabled={!name.trim() || !birth}
            onClick={() => {
              actions.updateBaby(baby.id, { name: name.trim(), birthDate: birth, sex: sex || null })
              onOpenChange(false)
            }}
          >
            저장
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

const RELATIONS = ['엄마', '아빠', '할머니', '할아버지', '외할머니', '외할아버지', '이모', '삼촌', '돌보미']

function MemberDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [relation, setRelation] = useState('')
  const [role, setRole] = useState<Member['role']>('editor')

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setRelation('')
          setRole('editor')
        }
        onOpenChange(o)
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>가족 추가</DrawerTitle>
          <DrawerDescription>아기와의 관계를 알려 주세요</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-5 pt-2">
          <div className="flex flex-wrap gap-1.5">
            {RELATIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRelation(r)}
                className={cn(
                  'h-9 rounded-full border px-3.5 text-[14px] font-medium',
                  relation === r ? 'border-foreground bg-foreground text-background' : 'bg-card',
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Input placeholder="직접 입력" value={relation} onChange={(e) => setRelation(e.target.value)} />
          <div className="grid gap-1.5">
            <Label>권한</Label>
            <ToggleGroup type="single" value={role} onValueChange={(v) => v && setRole(v as Member['role'])}>
              <ToggleGroupItem value="editor">기록 가능</ToggleGroupItem>
              <ToggleGroupItem value="viewer">보기만</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <DrawerFooter>
          <Button
            size="lg"
            className="flex-1"
            disabled={!relation.trim()}
            onClick={() => {
              actions.addMember(relation.trim(), role)
              toast(`${relation.trim()}님을 추가했어요`)
              onOpenChange(false)
            }}
          >
            추가
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
