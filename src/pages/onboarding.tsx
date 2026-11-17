import { useState } from 'react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { actions } from '@/data/store'
import { buildSample } from '@/data/sample'
import type { Sex } from '@/data/types'
import { cn } from '@/lib/utils'

const RELATIONS = ['엄마', '아빠', '할머니', '할아버지']

export function OnboardingPage() {
  const [name, setName] = useState('')
  const [birth, setBirth] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [sex, setSex] = useState<Sex | ''>('')
  const [relation, setRelation] = useState('')

  const ready = name.trim() && birth && relation.trim()

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+48px)] pb-[max(24px,env(safe-area-inset-bottom))]">
      <p className="text-[13px] font-semibold tracking-wide text-muted-foreground">BABYLOG</p>
      <h1 className="mt-3 text-[28px] leading-[1.25] font-bold tracking-tight">
        우리 아기의 하루를
        <br />
        가족이 함께 적어요
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        수유, 기저귀, 몸무게, 병원 기록을 한곳에.
      </p>

      <div className="mt-10 flex flex-col gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="name">아기 이름</Label>
          <Input id="name" placeholder="이름이나 태명" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="birth">태어난 날</Label>
            <Input id="birth" type="date" className="tnum" value={birth} onChange={(e) => setBirth(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>성별</Label>
            <ToggleGroup type="single" value={sex} onValueChange={(v) => setSex(v as Sex | '')} className="w-auto">
              <ToggleGroupItem value="girl" className="w-14 flex-none">여아</ToggleGroupItem>
              <ToggleGroupItem value="boy" className="w-14 flex-none">남아</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>나는 아기의</Label>
          <div className="flex gap-1.5">
            {RELATIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRelation(r)}
                className={cn(
                  'h-11 flex-1 rounded-md border text-[15px] font-medium transition-colors',
                  relation === r ? 'border-foreground bg-foreground text-background' : 'bg-card',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-10">
        <Button
          size="lg"
          disabled={!ready}
          onClick={() =>
            actions.setupFamily({ babyName: name.trim(), birthDate: birth, sex: sex || null, relation: relation.trim() })
          }
        >
          시작하기
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="text-muted-foreground"
          onClick={() => {
            const { state, prefs } = buildSample()
            actions.loadState(state, prefs)
          }}
        >
          샘플 기록으로 먼저 둘러보기
        </Button>
      </div>
    </div>
  )
}
