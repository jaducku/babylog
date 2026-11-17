import { differenceInCalendarDays, format, isToday, isYesterday } from 'date-fns'
import { ko } from 'date-fns/locale'

import type { BabyRecord, PooColor, PooTexture } from '@/data/types'

/** 태어난 날을 1일째로 센다 (백일 계산과 같은 방식) */
export function babyAge(birthDate: string, on = new Date()) {
  const birth = new Date(birthDate + 'T00:00:00')
  const diff = differenceInCalendarDays(on, birth)
  const dayCount = diff + 1
  const weeks = Math.floor(diff / 7)
  const restDays = diff % 7
  let months = (on.getFullYear() - birth.getFullYear()) * 12 + on.getMonth() - birth.getMonth()
  if (on.getDate() < birth.getDate()) months -= 1
  return { diff, dayCount, weeks, restDays, months: Math.max(0, months) }
}

/** 다음 기념일 (50일, 100일, 200일, 돌) */
export function nextMilestone(birthDate: string, on = new Date()) {
  const { dayCount } = babyAge(birthDate, on)
  const birth = new Date(birthDate + 'T00:00:00')
  const firstBirthday = new Date(birth)
  firstBirthday.setFullYear(birth.getFullYear() + 1)
  const toFirst = differenceInCalendarDays(firstBirthday, on)
  for (const d of [50, 100, 200, 300]) {
    if (dayCount < d) return { label: `${d}일`, left: d - dayCount }
  }
  if (toFirst > 0) return { label: '첫 돌', left: toFirst }
  return null
}

export function ageLabel(birthDate: string, on = new Date()) {
  const a = babyAge(birthDate, on)
  if (a.diff < 0) return '출산 예정'
  if (a.months < 3) return `${a.weeks}주 ${a.restDays}일`
  return `${a.months}개월`
}

export function hhmm(iso: string) {
  return format(new Date(iso), 'HH:mm')
}

export function dayLabel(d: Date) {
  const base = format(d, 'M월 d일 (EEE)', { locale: ko })
  if (isToday(d)) return { title: '오늘', sub: base }
  if (isYesterday(d)) return { title: '어제', sub: base }
  return { title: format(d, 'M월 d일', { locale: ko }), sub: format(d, 'EEEE', { locale: ko }) }
}

/** 경과 시간을 [숫자, 단위] 조각으로: [[2,'시간'],[10,'분']] / [[35,'분']] / 방금 */
export function sinceParts(iso: string, nowMs = Date.now()): [string, string][] {
  const mins = Math.floor((nowMs - new Date(iso).getTime()) / 60000)
  if (mins < 1) return [['방금', '']]
  if (mins < 60) return [[`${mins}`, '분']]
  const h = Math.floor(mins / 60)
  if (h >= 48) return [[`${Math.floor(h / 24)}`, '일']]
  const m = mins % 60
  return m ? [[`${h}`, '시간'], [`${m}`, '분']] : [[`${h}`, '시간']]
}

export function duration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function minutes(sec: number) {
  return Math.round(sec / 60)
}

/** datetime-local input 값 <-> ISO */
export function toLocalInput(iso: string) {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
}
export function fromLocalInput(v: string) {
  return new Date(v).toISOString()
}

export const POO_COLORS: { id: PooColor; label: string; swatch: string; warn?: boolean }[] = [
  { id: 'yellow', label: '노랑', swatch: '#e2b93b' },
  { id: 'mustard', label: '겨자', swatch: '#c49a2c' },
  { id: 'green', label: '초록', swatch: '#6f8a3a' },
  { id: 'brown', label: '갈색', swatch: '#8a5a2b' },
  { id: 'black', label: '검정', swatch: '#2a2420', warn: true },
  { id: 'red', label: '붉은', swatch: '#a8392c', warn: true },
  { id: 'white', label: '흰/회색', swatch: '#d9d4c7', warn: true },
]

export const POO_TEXTURES: { id: PooTexture; label: string }[] = [
  { id: 'watery', label: '물 같음' },
  { id: 'loose', label: '묽음' },
  { id: 'soft', label: '보통' },
  { id: 'firm', label: '단단함' },
]

export const FEED_METHOD_LABEL = {
  breast: '모유',
  formula: '분유',
  pumped: '유축 모유',
  solid: '이유식',
} as const

export const VISIT_LABEL = {
  clinic: '진료',
  vaccine: '예방접종',
  checkup: '영유아 검진',
} as const

export function recordTitle(r: BabyRecord): string {
  switch (r.kind) {
    case 'feed':
      return FEED_METHOD_LABEL[r.method]
    case 'diaper':
      return r.pee && r.poo ? '소변 + 대변' : r.poo ? '대변' : '소변'
    case 'growth':
      return '성장 기록'
    case 'hospital':
      return VISIT_LABEL[r.visitType]
  }
}

export function recordDetail(r: BabyRecord): string {
  switch (r.kind) {
    case 'feed': {
      if (r.method === 'breast') {
        const parts = []
        if (r.leftSec) parts.push(`왼쪽 ${minutes(r.leftSec)}분`)
        if (r.rightSec) parts.push(`오른쪽 ${minutes(r.rightSec)}분`)
        return parts.join(' · ')
      }
      return r.amountMl ? `${r.amountMl}ml` : ''
    }
    case 'diaper': {
      if (!r.poo) return ''
      const c = POO_COLORS.find((p) => p.id === r.pooColor)?.label
      const t = POO_TEXTURES.find((p) => p.id === r.pooTexture)?.label
      return [c, t].filter(Boolean).join(' · ')
    }
    case 'growth': {
      const parts = []
      if (r.weightKg) parts.push(`${r.weightKg.toFixed(2)}kg`)
      if (r.heightCm) parts.push(`${r.heightCm}cm`)
      if (r.headCm) parts.push(`머리 ${r.headCm}cm`)
      return parts.join(' · ')
    }
    case 'hospital':
      return [r.place, r.title].filter(Boolean).join(' · ')
  }
}
